#!/usr/bin/env python3
"""
Claude Code usage sync script.

This collector is intentionally dumb about leaderboard scoring:
it only extracts finalized usage events and uploads raw facts.
The server computes streaks, totals, sessions, and model breakdowns.
"""

import hashlib
import json
import os
import re
import sqlite3
import socket
import ssl
import sys
import urllib.error
import urllib.request
from datetime import date, datetime
from pathlib import Path

CLAUDE_DIR = Path.home() / ".claude"
CONFIG_FILE = CLAUDE_DIR / "sync_config.json"
CACHE_FILE = CLAUDE_DIR / "sync_cache.json"
CODEX_DIR = Path.home() / ".codex"
CODEX_LOG_DB = CODEX_DIR / "logs_2.sqlite"
SCHEMA_VERSION = 2
SCRIPT_VERSION = "2.1.0"
MAX_EVENTS_PER_BATCH = 5000

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


def fresh_cache(sync_generation=None):
    cache = {"schema_version": SCHEMA_VERSION, "files": {}, "codex": {}}
    if sync_generation is not None:
        cache["sync_generation"] = sync_generation
    return cache


def load_config():
    if not CONFIG_FILE.exists():
        print("sync_config.json not found. Run the install script first.", file=sys.stderr)
        sys.exit(1)
    with open(CONFIG_FILE, encoding="utf-8") as f:
        config = json.load(f)
    if "sync_token" not in config:
        print("sync_config.json is missing sync_token.", file=sys.stderr)
        sys.exit(1)
    return config


def load_cache():
    if not CACHE_FILE.exists():
        return fresh_cache()
    try:
        with open(CACHE_FILE, encoding="utf-8") as f:
            cache = json.load(f)
    except (OSError, json.JSONDecodeError):
        return fresh_cache()

    if cache.get("schema_version") != SCHEMA_VERSION:
        return fresh_cache()
    if not isinstance(cache.get("files"), dict):
        cache["files"] = {}
    if not isinstance(cache.get("codex"), dict):
        cache["codex"] = {}
    if "sync_generation" in cache and not isinstance(cache.get("sync_generation"), int):
        cache.pop("sync_generation", None)
    return cache


def save_cache(cache):
    CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(cache, f)


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


def iter_events(path: Path, state):
    events = {}
    file_key = str(path)
    try:
        stat = path.stat()
    except OSError:
        return events, None

    cached = state.get(file_key, {})
    offset = cached.get("offset", 0)

    if not isinstance(offset, int) or offset < 0 or cached.get("size", 0) > stat.st_size:
        offset = 0

    if offset > stat.st_size:
        offset = 0

    with open(path, "r", encoding="utf-8", errors="replace") as f:
        f.seek(offset)
        while True:
            raw_line = f.readline()
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

            events[event_id] = {
                "event_id": event_id,
                "message_id": msg_id,
                "session_id": session_id,
                "event_timestamp": normalized_ts or datetime.now().astimezone().isoformat(),
                "activity_date": activity_date,
                "model": model,
                "input_tokens": int(usage.get("input_tokens", 0) or 0),
                "output_tokens": int(usage.get("output_tokens", 0) or 0),
                "cache_creation_input_tokens": int(usage.get("cache_creation_input_tokens", 0) or 0),
                "cache_read_input_tokens": int(usage.get("cache_read_input_tokens", 0) or 0),
                "stop_reason": stop_reason,
                "source_path": file_key,
                "source": "claude",
            }

        end_offset = f.tell()

    next_state = {
        "offset": end_offset,
        "size": stat.st_size,
        "mtime_ns": stat.st_mtime_ns,
    }
    return events, next_state


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
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        print(f"Sync failed: HTTP {e.code} {detail}", file=sys.stderr)
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"Sync failed: {e.reason}", file=sys.stderr)
        sys.exit(1)


def chunked(items, size):
    for index in range(0, len(items), size):
        yield items[index:index + size]


def extract_codex_field(name, text, default=None):
    pattern = CODEX_FIELD_PATTERNS[name]
    match = pattern.search(text)
    if not match:
        return default
    return match.group(1)


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


def sync_once(api_url, sync_token, cache):
    projects_dir = CLAUDE_DIR / "projects"
    next_files = {}
    events = {}

    if projects_dir.exists():
        for jsonl_file in sorted(projects_dir.rglob("*.jsonl")):
            file_events, next_state = iter_events(jsonl_file, cache["files"])
            if next_state is not None:
                next_files[str(jsonl_file)] = next_state
            for event_id, event in file_events.items():
                events[event_id] = event

    codex_events, codex_state = iter_codex_events(cache.get("codex", {}))
    for event_id, event in codex_events.items():
        events[event_id] = event

    server_generation = cache.get("sync_generation")
    ordered_events = list(events.values())
    batches = list(chunked(ordered_events, MAX_EVENTS_PER_BATCH)) or [[]]

    for batch in batches:
        response = post_events(api_url, sync_token, batch)
        generation = response.get("sync_generation")
        if isinstance(generation, int):
            server_generation = generation

    return next_files, codex_state, server_generation


def main():
    config = load_config()
    sync_token = config["sync_token"]
    api_url = config.get("api_url", "http://localhost:3000/api/sync")

    cache = load_cache()
    cached_generation = cache.get("sync_generation")
    next_files, codex_state, server_generation = sync_once(api_url, sync_token, cache)

    if (
        isinstance(cached_generation, int)
        and isinstance(server_generation, int)
        and server_generation != cached_generation
    ):
        cache = fresh_cache(server_generation)
        next_files, codex_state, server_generation = sync_once(api_url, sync_token, cache)

    cache["files"] = next_files
    if codex_state is not None:
        cache["codex"] = codex_state
    if isinstance(server_generation, int):
        cache["sync_generation"] = server_generation
    save_cache(cache)


if __name__ == "__main__":
    main()
