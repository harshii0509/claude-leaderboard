#!/usr/bin/env python3
"""
Claude Code usage sync script.
Walks ~/.claude/projects/**/*.jsonl, parses usage stats, and POSTs to the leaderboard API.
Zero external dependencies — Python stdlib only.

Key design decisions:
  - Deduplicates by message ID: Claude writes multiple JSONL lines per API call
    (streaming partial + final). We keep only the last entry per message.id,
    which has the complete usage (stop_reason != null, full output_tokens).
  - Tracks cache tokens (cache_creation_input_tokens, cache_read_input_tokens)
    which represent the bulk of actual token usage.
  - Groups by session_id for session counting, but by message.id for token/message counting.
"""

import json
import os
import sys
import urllib.request
import urllib.error
from datetime import date, timedelta
from pathlib import Path
from collections import defaultdict

CLAUDE_DIR = Path.home() / ".claude"
CONFIG_FILE = CLAUDE_DIR / "sync_config.json"
CACHE_FILE = CLAUDE_DIR / "sync_cache.json"


def load_config():
    if not CONFIG_FILE.exists():
        print("sync_config.json not found. Run the install script first.", file=sys.stderr)
        sys.exit(1)
    with open(CONFIG_FILE) as f:
        return json.load(f)


def load_cache():
    if CACHE_FILE.exists():
        with open(CACHE_FILE) as f:
            return json.load(f)
    return {"synced_sessions": []}


def save_cache(cache):
    with open(CACHE_FILE, "w") as f:
        json.dump(cache, f)


def parse_jsonl_file(path: Path):
    """Parse a single .jsonl file, return list of assistant usage entries."""
    entries = []
    try:
        with open(path, encoding="utf-8", errors="replace") as f:
            for line in f:
                line = line.strip()
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
                msg_id = msg.get("id", "")
                ts = obj.get("timestamp", "")
                day = ts[:10] if len(ts) >= 10 else str(date.today())
                entries.append({
                    "session_id": session_id,
                    "msg_id": msg_id,
                    "model": model,
                    "day": day,
                    "input_tokens": usage.get("input_tokens", 0),
                    "output_tokens": usage.get("output_tokens", 0),
                    "cache_creation_input_tokens": usage.get("cache_creation_input_tokens", 0),
                    "cache_read_input_tokens": usage.get("cache_read_input_tokens", 0),
                    "stop_reason": msg.get("stop_reason"),
                })
    except OSError:
        pass
    return entries


def compute_streak(active_dates: set):
    if not active_dates:
        return 0, 0
    sorted_dates = sorted(active_dates)
    today = date.today()
    yesterday = today - timedelta(days=1)

    current = 0
    check = today if today in active_dates else yesterday
    while check in active_dates:
        current += 1
        check -= timedelta(days=1)

    longest = 1
    run = 1
    for i in range(1, len(sorted_dates)):
        if (sorted_dates[i] - sorted_dates[i - 1]).days == 1:
            run += 1
            longest = max(longest, run)
        else:
            run = 1

    return current, longest


def main():
    config = load_config()
    sync_token = config["sync_token"]
    api_url = config.get("api_url", "http://localhost:3000/api/sync")

    cache = load_cache()

    projects_dir = CLAUDE_DIR / "projects"
    if not projects_dir.exists():
        return

    all_entries = []
    for jsonl_file in projects_dir.rglob("*.jsonl"):
        all_entries.extend(parse_jsonl_file(jsonl_file))

    if not all_entries:
        return

    # Deduplicate by message ID: keep only the LAST entry per msg_id.
    # Claude writes multiple JSONL lines per API response (streaming partial
    # with stop_reason=null, then final with stop_reason=end_turn/tool_use).
    # The last entry has the complete token counts.
    msg_final = {}
    for entry in all_entries:
        mid = entry["msg_id"]
        if not mid:
            mid = f"{entry['session_id']}_{entry['day']}_{id(entry)}"
        msg_final[mid] = entry

    # Aggregate from deduplicated messages
    sessions_seen = set()
    day_stats = defaultdict(lambda: {
        "input": 0, "output": 0,
        "cache_creation": 0, "cache_read": 0,
        "messages": 0, "sessions": set(),
    })
    models_used = defaultdict(int)
    active_dates = set()

    for entry in msg_final.values():
        sid = entry["session_id"]
        day = entry["day"]
        model = entry["model"] or "unknown"

        sessions_seen.add(sid)
        day_stats[day]["input"] += entry["input_tokens"]
        day_stats[day]["output"] += entry["output_tokens"]
        day_stats[day]["cache_creation"] += entry["cache_creation_input_tokens"]
        day_stats[day]["cache_read"] += entry["cache_read_input_tokens"]
        day_stats[day]["messages"] += 1
        day_stats[day]["sessions"].add(sid)
        models_used[model] += (
            entry["input_tokens"]
            + entry["output_tokens"]
            + entry["cache_creation_input_tokens"]
            + entry["cache_read_input_tokens"]
        )

        try:
            active_dates.add(date.fromisoformat(day))
        except ValueError:
            pass

    current_streak, longest_streak = compute_streak(active_dates)

    total_input = sum(v["input"] for v in day_stats.values())
    total_output = sum(v["output"] for v in day_stats.values())
    total_cache_creation = sum(v["cache_creation"] for v in day_stats.values())
    total_cache_read = sum(v["cache_read"] for v in day_stats.values())
    total_messages = sum(v["messages"] for v in day_stats.values())
    total_sessions = len(sessions_seen)

    daily_activity = [
        {
            "date": day,
            "input_tokens": v["input"],
            "output_tokens": v["output"],
            "cache_creation_input_tokens": v["cache_creation"],
            "cache_read_input_tokens": v["cache_read"],
            "messages": v["messages"],
            "sessions": len(v["sessions"]),
        }
        for day, v in sorted(day_stats.items())
    ]

    payload = {
        "total_input_tokens": total_input,
        "total_output_tokens": total_output,
        "total_cache_creation_input_tokens": total_cache_creation,
        "total_cache_read_input_tokens": total_cache_read,
        "total_messages": total_messages,
        "total_sessions": total_sessions,
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "models_used": dict(models_used),
        "daily_activity": daily_activity,
    }

    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        api_url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {sync_token}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            resp.read()
    except urllib.error.HTTPError as e:
        print(f"Sync failed: HTTP {e.code}", file=sys.stderr)
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"Sync failed: {e.reason}", file=sys.stderr)
        sys.exit(1)

    cache["synced_sessions"] = list(sessions_seen)
    save_cache(cache)


if __name__ == "__main__":
    main()
