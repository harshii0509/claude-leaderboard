# Internal Branch And Environment Workflow

This note documents how the repo is operated for the live Juspay instance without turning every internal decision into the OSS default.

## Branch model

- `experimentation`: local-only exploration, rough ideas, and unfinished product work
- `internal`: live Juspay product branch and the Vercel production branch
- `main`: curated OSS-safe branch for public releases and self-hosted users

## Working flow

1. Build on `experimentation`
2. Test locally on `localhost`
3. Merge or cherry-pick to `internal` when the work is ready for the live Juspay app
4. Verify the Vercel production deploy from `internal`
5. Promote only reusable, self-hosted-safe work from `internal` to `main`

## Vercel policy

Vercel is production-only for this project.

- the Vercel production branch is `internal`
- required hosted secrets stay scoped to the `Production` environment
- preview parity is not a goal for `experimentation` or other non-production branches
- failed preview deploys on non-production branches are acceptable unless the workflow changes later

## Production environment contract

The live hosted app should keep these values in Vercel `Production`:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AUTH_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

`AUTH_URL` may still exist for compatibility, but it is not part of the required documented contract and should be reviewed before future cleanup.

## Promotion rule

If a change is Juspay-specific, unfinished, or still being shaped, keep it off `main`.

`main` should stay safe for outside teams who clone the repo and deploy their own separate instance with their own OAuth, Supabase, and hosting setup.
