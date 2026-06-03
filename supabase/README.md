# Supabase Schema Layout

This folder is the forward-looking schema entry point for self-hosted deployments.

## Migrations

The `migrations/` folder contains ordered SQL files that map to the current production schema:

1. `202606010001_next_auth.sql`
2. `202606010002_leaderboard_tables.sql`
3. `202606010003_leaderboard_functions.sql`
4. `202606010004_row_level_security.sql`
5. `202606030001_user_widget_settings.sql`

These files are designed for teams who want a more maintainable migration story than pasting one large SQL file into the Supabase editor.

## Compatibility snapshot

The repository still keeps `supabase-migration.sql` at the repo root as a compatibility snapshot for the current setup flow and for teams that prefer a single-file bootstrap.

If you are setting this project up for the first time, prefer the ordered files in `supabase/migrations/`.

## CLI workflow

This repo now includes:

- `supabase/config.toml`
- `npm run db:push`
- `scripts/supabase-db-push.sh`

Typical flow:

```bash
supabase link --project-ref <your-project-ref>
npm run db:push
```

## Demo data

For evaluation environments, see `supabase/seed/demo.sql`.

That file seeds synthetic users and raw usage events, then rebuilds the derived leaderboard tables through the normal rollup pipeline.
