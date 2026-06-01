#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SUPABASE_DIR="$ROOT_DIR/supabase"

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI is not installed." >&2
  echo "Install it from https://supabase.com/docs/guides/cli and rerun this command." >&2
  exit 1
fi

if [ ! -d "$SUPABASE_DIR/migrations" ]; then
  echo "Missing supabase/migrations directory." >&2
  exit 1
fi

echo "Applying Supabase migrations from $SUPABASE_DIR/migrations"
supabase db push --workdir "$SUPABASE_DIR"
