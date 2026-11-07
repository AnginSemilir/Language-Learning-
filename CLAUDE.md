# Notes for Claude

- **Merging:** once a pull request's checks pass and it has no merge
  conflicts, merge it (a merge commit) without asking first. Then check that
  the Deploy workflow on `main` succeeds.
- **Secrets:** never commit or paste `dexie-cloud.key`, the Dexie Cloud admin
  secret (`*.key` is gitignored).
- **Personal data:** never commit the owner's own flashcard exports (CSV).
