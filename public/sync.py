#!/usr/bin/env python3
"""
Local AI coding usage sync script.

This collector is intentionally dumb about leaderboard scoring:
it only extracts finalized usage events and uploads raw facts.
The server computes streaks, totals, sessions, and model breakdowns.
"""

import argparse
import hashlib
import json
import os
import re
import shutil
import sqlite3
import socket
import ssl
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import date, datetime
from pathlib import Path

CLAUDE_DIR = Path.home() / ".claude"
CONFIG_FILE = CLAUDE_DIR / "sync_config.json"
CACHE_FILE = CLAUDE_DIR / "sync_cache.json"
SETTINGS_FILE = CLAUDE_DIR / "settings.json"
EXPECTED_SCRIPT_PATH = CLAUDE_DIR / "sync.py"
CODEX_DIR = Path.home() / ".codex"
CODEX_LOG_DB = CODEX_DIR / "logs_2.sqlite"
OPENCODE_DEFAULT_DB = Path.home() / ".local" / "share" / "opencode" / "opencode.db"
SCHEMA_VERSION = 2
SCRIPT_VERSION = "2.3.0"
MAX_EVENTS_PER_BATCH = 5000
CLAUDE_USAGE_FIELDS = (
    "input_tokens",
    "output_tokens",
    "cache_creation_input_tokens",
    "cache_read_input_tokens",
)

CODEX_FIELD_PATTERNS = {
    "thread_id": re.compile(r"(?:thread\.id|thread_id)=([0-9a-f-]{8,})"),
    "turn_id": re.compile(r"turn\.id=([0-9a-f-]{8,})"),
    "model": re.compile(r"\bmodel=([A-Za-z0-9._:-]+)"),
    "input_tokens": re.compile(r"codex\.turn\.token_usage\.input_tokens=(\d+)"),
    "cached_input_tokens": re.compile(r"codex\.turn\.token_usage\.cached_input_tokens=(\d+)"),
    "output_tokens": re.compile(r"codex\.turn\.token_usage\.output_tokens=(\d+)"),
    "reasoning_output_tokens": re.compile(r"codex\.turn\.token_usage\.reasoning_output_tokens=(\d+)"),
    "total_tokens": re.compile(r"codex\.turn\.token_usage\.total_tokens=(\d+)"),
    "op": re.compile(r'codex\.op="([^"]+)"'),
}


def stderr(message: str):
    print(message, file=sys.stderr)


def fresh_diagnostics():
    return {
        "suspicious_claude_usage_events": 0,
        "zero_token_claude_events": 0,
    }


def merge_diagnostics(into, extra):
    for key, value in extra.items():
        into[key] = into.get(key, 0) + int(value or 0)
    return into


def fresh_cache(sync_generation=None):
    cache = {"schema_version": SCHEMA_VERSION, "files": {}, "codex": {}, "opencode": {}}
    if sync_generation is not None:
        cache["sync_generation"] = sync_generation
    return cache


def load_json(path: Path, missing_message: str, invalid_message: str):
    if not path.exists():
        raise SystemExit(missing_message)
    try:
        with path.open(encoding="utf-8") as handle:
            return json.load(handle)
    except (OSError, json.JSONDecodeError) as exc:
        raise SystemExit(f"{invalid_message}: {exc}") from exc


def load_config():
    config = load_json(
        CONFIG_FILE,
        "sync_config.json not found. Run the install script first.",
        "sync_config.json is not valid JSON",
    )
    if "sync_token" not in config:
        raise SystemExit("sync_config.json is missing sync_token.")
    return config


def load_cache():
    if not CACHE_FILE.exists():
        return fresh_cache()
    try:
        with CACHE_FILE.open(encoding="utf-8") as handle:
            cache = json.load(handle)
    except (OSError, json.JSONDecodeError):
        return fresh_cache()

    if cache.get("schema_version") != SCHEMA_VERSION:
        return fresh_cache()
    if not isinstance(cache.get("files"), dict):
        cache["files"] = {}
    if not isinstance(cache.get("codex"), dict):
        cache["codex"] = {}
    if not isinstance(cache.get("opencode"), dict):
        cache["opencode"] = {}
    if "sync_generation" in cache and not isinstance(cache.get("sync_generation"), int):
        cache.pop("sync_generation", None)
    return cache


def save_cache(cache):
    CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with CACHE_FILE.open("w", encoding="utf-8") as handle:
        json.dump(cache, handle)


def parse_timestamp(ts: str):
    if not ts:
        return None
    normalized = ts.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(normalized)
    except ValueError:
        return None


def to_activity_date(ts: str):
    parsed = parse_timestamp(ts)
    if parsed is None:
        return str(date.today()), None
    if parsed.tzinfo is not None:
        parsed = parsed.astimezone()
    return parsed.date().isoformat(), parsed.isoformat()


def build_event_id(session_id, msg_id, timestamp, model, usage):
    if msg_id:
        return msg_id

    fingerprint = json.dumps(
        {
            "session_id": session_id,
            "timestamp": timestamp,
            "model": model,
            "usage": usage,
        },
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return "synthetic_" + hashlib.sha1(fingerprint).hexdigest()


def usage_contains_token_like_keys(usage):
    if not isinstance(usage, dict):
        return False

    for key in usage.keys():
        normalized = str(key).strip().lower()
        if "token" in normalized or "cache" in normalized:
            return True

    return False


def parse_claude_usage(usage):
    diagnostics = fresh_diagnostics()
    extracted = {field: 0 for field in CLAUDE_USAGE_FIELDS}

    if not isinstance(usage, dict):
        return extracted, diagnostics

    for field in CLAUDE_USAGE_FIELDS:
        extracted[field] = int(usage.get(field, 0) or 0)

    if sum(extracted.values()) == 0 and usage_contains_token_like_keys(usage):
        diagnostics["zero_token_claude_events"] += 1
        diagnostics["suspicious_claude_usage_events"] += 1

    return extracted, diagnostics


def iter_events(path: Path, state):
    events = {}
    diagnostics = fresh_diagnostics()
    file_key = str(path)
    try:
        stat = path.stat()
    except OSError:
        return events, None, diagnostics

    cached = state.get(file_key, {})
    offset = cached.get("offset", 0)

    if not isinstance(offset, int) or offset < 0 or cached.get("size", 0) > stat.st_size:
        offset = 0

    if offset > stat.st_size:
        offset = 0

    with path.open("r", encoding="utf-8", errors="replace") as handle:
        handle.seek(offset)
        while True:
            raw_line = handle.readline()
            if not raw_line:
                break

            line = raw_line.strip()
            if not line:
                continue

            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue

            if obj.get("type") != "assistant":
                continue

            msg = obj.get("message", {})
            usage = msg.get("usage")
            if not usage:
                continue

            model = msg.get("model", "unknown")
            if model == "<synthetic>":
                continue

            session_id = obj.get("sessionId") or path.stem
            timestamp = obj.get("timestamp", "")
            activity_date, normalized_ts = to_activity_date(timestamp)
            stop_reason = msg.get("stop_reason")
            if stop_reason is None:
                continue
            msg_id = msg.get("id")
            event_id = build_event_id(session_id, msg_id, normalized_ts or timestamp, model, usage)
            usage_parts, usage_diagnostics = parse_claude_usage(usage)
            merge_diagnostics(diagnostics, usage_diagnostics)

            events[event_id] = {
                "event_id": event_id,
                "message_id": msg_id,
                "session_id": session_id,
                "event_timestamp": normalized_ts or datetime.now().astimezone().isoformat(),
                "activity_date": activity_date,
                "model": model,
                "input_tokens": usage_parts["input_tokens"],
                "output_tokens": usage_parts["output_tokens"],
                "cache_creation_input_tokens": usage_parts["cache_creation_input_tokens"],
                "cache_read_input_tokens": usage_parts["cache_read_input_tokens"],
                "stop_reason": stop_reason,
                "source_path": file_key,
                "source": "claude",
            }

        end_offset = handle.tell()

    next_state = {
        "offset": end_offset,
        "size": stat.st_size,
        "mtime_ns": stat.st_mtime_ns,
    }
    return events, next_state, diagnostics


def build_ssl_context():
    ssl_ctx = ssl.create_default_context()
    if ssl_ctx.get_ca_certs():
        return ssl_ctx

    for ca_path in ("/etc/ssl/cert.pem", "/etc/ssl/certs/ca-certificates.crt"):
        if os.path.exists(ca_path):
            ssl_ctx.load_verify_locations(ca_path)
            break
    return ssl_ctx


def post_events(api_url, sync_token, events):
    payload = {
        "client": {
            "script_version": SCRIPT_VERSION,
            "schema_version": SCHEMA_VERSION,
            "hostname": socket.gethostname(),
        },
        "events": events,
    }

    req = urllib.request.Request(
        api_url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {sync_token}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=30, context=build_ssl_context()) as resp:
            body = resp.read()
            if body:
                return json.loads(body.decode("utf-8"))
            return {"ok": True}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"Sync failed: HTTP {exc.code} {detail}") from exc
    except urllib.error.URLError as exc:
        raise SystemExit(f"Sync failed: {exc.reason}") from exc


def chunked(items, size):
    for index in range(0, len(items), size):
        yield items[index:index + size]


def extract_codex_field(name, text, default=None):
    pattern = CODEX_FIELD_PATTERNS[name]
    match = pattern.search(text)
    if not match:
        return default
    return match.group(1)


def discover_opencode_db_paths():
    candidates = []
    opencode_cli = shutil.which("opencode")
    if opencode_cli:
        try:
            result = subprocess.run(
                [opencode_cli, "db", "path"],
                capture_output=True,
                check=True,
                text=True,
                timeout=10,
            )
            candidate = Path(result.stdout.strip()).expanduser()
            if candidate.exists():
                candidates.append(candidate)
        except (OSError, subprocess.SubprocessError):
            pass

    if OPENCODE_DEFAULT_DB.exists() and OPENCODE_DEFAULT_DB not in candidates:
        candidates.append(OPENCODE_DEFAULT_DB)

    return candidates


def parse_opencode_model(value):
    if not value:
        return "unknown"

    if isinstance(value, str):
        try:
            value = json.loads(value)
        except json.JSONDecodeError:
            return value.strip() or "unknown"

    if not isinstance(value, dict):
        return "unknown"

    model_id = str(value.get("id") or "").strip()
    provider_id = str(value.get("providerID") or "").strip()

    if not model_id:
        return provider_id or "unknown"

    if provider_id and "/" not in model_id:
        return f"{provider_id}/{model_id}"

    return model_id


def iter_opencode_events_from_db(db_path, state):
    last_time = state.get("last_time", 0)
    last_id = state.get("last_id", "")
    if not isinstance(last_time, int) or last_time < 0:
        last_time = 0
    if not isinstance(last_id, str):
        last_id = ""

    query = """
        select
            id,
            model,
            time_created,
            time_updated,
            tokens_input,
            tokens_output,
            tokens_reasoning,
            tokens_cache_read,
            tokens_cache_write
        from session
        where coalesce(time_updated, time_created, 0) > ?
           or (coalesce(time_updated, time_created, 0) = ? and id > ?)
        order by coalesce(time_updated, time_created, 0) asc, id asc
    """

    events = {}
    max_time = last_time
    max_id = last_id
    tzinfo = datetime.now().astimezone().tzinfo

    with sqlite3.connect(db_path) as conn:
        cursor = conn.execute(query, (last_time, last_time, last_id))
        for row in cursor:
            (
                session_id,
                raw_model,
                time_created,
                time_updated,
                input_tokens,
                output_tokens,
                reasoning_tokens,
                cache_read_tokens,
                cache_write_tokens,
            ) = row

            event_time_ms = time_updated or time_created or 0
            if not session_id or event_time_ms <= 0:
                continue

            total_tokens = (
                int(input_tokens or 0)
                + int(output_tokens or 0)
                + int(reasoning_tokens or 0)
                + int(cache_read_tokens or 0)
                + int(cache_write_tokens or 0)
            )
            if total_tokens <= 0:
                max_time = event_time_ms
                max_id = session_id
                continue

            timestamp = datetime.fromtimestamp(event_time_ms / 1000, tz=tzinfo)
            event_id = f"opencode:{session_id}"
            events[event_id] = {
                "event_id": event_id,
                "message_id": None,
                "session_id": session_id,
                "event_timestamp": timestamp.isoformat(),
                "activity_date": timestamp.date().isoformat(),
                "model": parse_opencode_model(raw_model),
                "input_tokens": int(input_tokens or 0),
                "output_tokens": int(output_tokens or 0) + int(reasoning_tokens or 0),
                "cache_creation_input_tokens": int(cache_write_tokens or 0),
                "cache_read_input_tokens": int(cache_read_tokens or 0),
                "stop_reason": "session_total",
                "source_path": str(db_path),
                "source": "opencode",
            }
            max_time = event_time_ms
            max_id = session_id

    return events, {"last_time": max_time, "last_id": max_id, "db_path": str(db_path)}


def iter_opencode_events(state):
    for db_path in discover_opencode_db_paths():
        try:
            return iter_opencode_events_from_db(db_path, state)
        except sqlite3.OperationalError as exc:
            error_text = str(exc).lower()
            if "no such table" in error_text or "no such column" in error_text:
                continue
            raise

    return {}, None


def iter_codex_events(state):
    if not CODEX_LOG_DB.exists():
        return {}, None

    last_id = state.get("last_id", 0)
    if not isinstance(last_id, int) or last_id < 0:
        last_id = 0

    query = """
        select id, ts, ts_nanos, feedback_log_body
        from logs
        where id > ?
          and target = 'opentelemetry_sdk'
          and feedback_log_body like '%codex.turn.token_usage.input_tokens=%'
        order by id asc
    """

    events = {}
    max_id = last_id

    with sqlite3.connect(CODEX_LOG_DB) as conn:
        cursor = conn.execute(query, (last_id,))
        for row_id, ts, ts_nanos, body in cursor:
            max_id = max(max_id, row_id)
            text = body or ""

            turn_id = extract_codex_field("turn_id", text)
            thread_id = extract_codex_field("thread_id", text)
            model = extract_codex_field("model", text)

            if not turn_id or not thread_id or not model:
                continue

            total_tokens = int(extract_codex_field("total_tokens", text, "0"))
            if total_tokens <= 0:
                continue

            timestamp = datetime.fromtimestamp(ts + (ts_nanos / 1_000_000_000), tz=datetime.now().astimezone().tzinfo)
            activity_date = timestamp.date().isoformat()
            event_timestamp = timestamp.isoformat()
            cached_input_tokens = int(extract_codex_field("cached_input_tokens", text, "0"))
            output_tokens = int(extract_codex_field("output_tokens", text, "0"))
            reasoning_output_tokens = int(extract_codex_field("reasoning_output_tokens", text, "0"))

            event_id = f"codex:{turn_id}"
            events[event_id] = {
                "event_id": event_id,
                "message_id": turn_id,
                "session_id": thread_id,
                "event_timestamp": event_timestamp,
                "activity_date": activity_date,
                "model": model,
                "input_tokens": int(extract_codex_field("input_tokens", text, "0")),
                "output_tokens": output_tokens + reasoning_output_tokens,
                "cache_creation_input_tokens": 0,
                "cache_read_input_tokens": cached_input_tokens,
                "stop_reason": extract_codex_field("op", text, "user_input"),
                "source_path": str(CODEX_LOG_DB),
                "source": "codex",
            }

    return events, {"last_id": max_id}


def collect_events(cache):
    projects_dir = CLAUDE_DIR / "projects"
    next_files = {}
    events = {}
    diagnostics = fresh_diagnostics()

    if projects_dir.exists():
        for jsonl_file in sorted(projects_dir.rglob("*.jsonl")):
            file_events, next_state, file_diagnostics = iter_events(jsonl_file, cache["files"])
            if next_state is not None:
                next_files[str(jsonl_file)] = next_state
            for event_id, event in file_events.items():
                events[event_id] = event
            merge_diagnostics(diagnostics, file_diagnostics)

    codex_events, codex_state = iter_codex_events(cache.get("codex", {}))
    for event_id, event in codex_events.items():
        events[event_id] = event

    opencode_events, opencode_state = iter_opencode_events(cache.get("opencode", {}))
    for event_id, event in opencode_events.items():
        events[event_id] = event

    return list(events.values()), next_files, codex_state, opencode_state, diagnostics


def sync_once(api_url, sync_token, cache):
    ordered_events, next_files, codex_state, opencode_state, diagnostics = collect_events(cache)
    server_generation = cache.get("sync_generation")
    batches = list(chunked(ordered_events, MAX_EVENTS_PER_BATCH)) or [[]]

    for batch in batches:
        response = post_events(api_url, sync_token, batch)
        generation = response.get("sync_generation")
        if isinstance(generation, int):
            server_generation = generation

    return next_files, codex_state, opencode_state, server_generation, diagnostics


def hook_present():
    if not SETTINGS_FILE.exists():
        return False
    try:
        settings = load_json(SETTINGS_FILE, "", "settings.json is not valid JSON")
    except SystemExit:
        return False

    hooks = settings.get("hooks", {})
    stop_hooks = hooks.get("Stop", [])
    expected_command = f"python3 {EXPECTED_SCRIPT_PATH}"
    for entry in stop_hooks:
        for hook in entry.get("hooks", []):
            if hook.get("type") == "command" and hook.get("command") == expected_command:
                return True
    return False


def run_doctor(quiet=False):
    config = load_config()
    checks = [
        ("Claude directory exists", CLAUDE_DIR.exists()),
        ("Installed script exists", EXPECTED_SCRIPT_PATH.exists()),
        ("This script is installed at ~/.claude/sync.py", Path(__file__).resolve() == EXPECTED_SCRIPT_PATH.resolve() if EXPECTED_SCRIPT_PATH.exists() else False),
        ("sync_config.json exists", CONFIG_FILE.exists()),
        ("sync token present", bool(config.get("sync_token"))),
        ("api_url present", bool(config.get("api_url"))),
        ("settings.json exists", SETTINGS_FILE.exists()),
        ("Claude Stop hook present", hook_present()),
        ("~/.claude is writable", os.access(CLAUDE_DIR, os.W_OK)),
    ]

    failures = [label for label, passed in checks if not passed]
    if not quiet:
        for label, passed in checks:
            prefix = "[ok]" if passed else "[fail]"
            print(f"{prefix} {label}")
        if CODEX_LOG_DB.exists():
            print(f"[ok] Codex log source detected at {CODEX_LOG_DB}")
        else:
            print(f"[info] Codex log source not found at {CODEX_LOG_DB}")
        opencode_paths = discover_opencode_db_paths()
        if opencode_paths:
            print(f"[ok] OpenCode session source detected at {opencode_paths[0]}")
        else:
            print(f"[info] OpenCode session source not found at {OPENCODE_DEFAULT_DB}")
        print(f"[info] Script version: {SCRIPT_VERSION}")

    if failures:
        raise SystemExit("Doctor check failed: " + ", ".join(failures))

    if quiet:
        print("health-check ok")
    else:
        print("Doctor check passed.")


def run_dry_run():
    load_config()
    cache = load_cache()
    ordered_events, next_files, codex_state, opencode_state, diagnostics = collect_events(cache)
    summary = {
        "script_version": SCRIPT_VERSION,
        "schema_version": SCHEMA_VERSION,
        "event_count": len(ordered_events),
        "claude_sources": len(next_files),
        "codex_state_present": codex_state is not None,
        "opencode_state_present": opencode_state is not None,
        "api_url": load_config().get("api_url", "http://localhost:3000/api/sync"),
        **diagnostics,
    }
    print(json.dumps(summary, indent=2))


def run_sync():
    config = load_config()
    sync_token = config["sync_token"]
    api_url = config.get("api_url", "http://localhost:3000/api/sync")

    cache = load_cache()
    cached_generation = cache.get("sync_generation")
    next_files, codex_state, opencode_state, server_generation, diagnostics = sync_once(api_url, sync_token, cache)

    if (
        isinstance(cached_generation, int)
        and isinstance(server_generation, int)
        and server_generation != cached_generation
    ):
        cache = fresh_cache(server_generation)
        next_files, codex_state, opencode_state, server_generation, diagnostics = sync_once(api_url, sync_token, cache)

    cache["files"] = next_files
    if codex_state is not None:
        cache["codex"] = codex_state
    if opencode_state is not None:
        cache["opencode"] = opencode_state
    if isinstance(server_generation, int):
        cache["sync_generation"] = server_generation
    save_cache(cache)

    suspicious_events = diagnostics.get("suspicious_claude_usage_events", 0)
    if suspicious_events > 0:
        stderr(
            f"Warning: detected {suspicious_events} Claude usage event(s) with token-like fields but zero recognized token counters. Run --dry-run to inspect local history."
        )


def parse_args():
    parser = argparse.ArgumentParser(description="Sync local Claude, Codex, and OpenCode usage to Claude Leaderboard.")
    parser.add_argument("--doctor", action="store_true", help="Verify local install health and hook wiring.")
    parser.add_argument("--dry-run", action="store_true", help="Parse local activity without uploading anything.")
    parser.add_argument("--health-check", action="store_true", help="Run a concise installer-facing verification.")
    parser.add_argument("--version", action="store_true", help="Print the installed script version.")
    return parser.parse_args()


def main():
    args = parse_args()

    if args.version:
        print(SCRIPT_VERSION)
        return

    if args.health_check:
        run_doctor(quiet=True)
        return

    if args.doctor:
        run_doctor()
        return

    if args.dry_run:
        run_dry_run()
        return

    run_sync()


if __name__ == "__main__":
    try:
        main()
    except SystemExit as exc:
        if isinstance(exc.code, str):
            stderr(exc.code)
            raise SystemExit(1) from exc
        raise
