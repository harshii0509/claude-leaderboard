# Security Policy

Thanks for helping keep Claude Leaderboard safe.

## Supported scope

This repository is a self-hosted project. Security issues are most useful when they affect:

- authentication or session handling
- sync credential issuance or install token handling
- raw usage event ingestion
- data exposure across users or teams
- privilege escalation through the Supabase schema or RPC layer

## Reporting a vulnerability

Please do **not** open a public GitHub issue for a suspected vulnerability.

Instead, report it privately to the maintainer with:

- a clear description of the issue
- affected files or flows
- steps to reproduce
- impact assessment
- any suggested mitigation if you have one

If you only have a suspicious behavior and are not sure whether it is exploitable, that is still worth reporting privately.

## Response expectations

Best effort goals:

- acknowledge receipt within a few days
- confirm whether the report is reproducible
- patch or mitigate confirmed issues before broad public discussion when possible

## Good-faith testing

Please avoid:

- attacking real deployments you do not own
- exfiltrating real user data
- destructive activity against shared infrastructure

Focus on local repros or your own self-hosted environments.
