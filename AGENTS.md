# Architecture rules

- Serialize relational writes and await each caller's own snapshot; overlapping saves must never reuse or acknowledge an older snapshot.
- Keep unacknowledged changes in an organization-scoped local journal and replay only changed records over remote reads; app closure must not discard edits or overwrite unrelated remote changes.
- Propagate business-table persistence errors to the sync coordinator; failed writes must remain retryable and block successful sign-out acknowledgement.
- Service workers may cache only same-origin static assets and navigation shells, never authenticated or external data; this prevents stale reads from replacing saved business records.
- Read company display names through useCompanyName backed by the existing company settings store; non-React document generators use the passed company settings to avoid duplicate sources.
