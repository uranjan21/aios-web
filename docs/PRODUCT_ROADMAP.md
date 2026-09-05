# Roadmap

Honest state of what is missing, roughly in the order it is worth doing.
Shipped functionality is in `FEATURES.md`.

## Correctness

**"Today" is the server's local date in ~20 places.** Every timestamp is naive
UTC, but around twenty call sites compute the current day with `date.today()`.
On a UTC host they agree; elsewhere they diverge for the length of the offset.

The fix is not a mechanical sweep to `utcnow()` — that would move every user's
day boundary to UTC midnight, which for an IST user is 05:30 local, a worse bug
than the one being fixed. The right answer is a `user_today(user)` helper
resolving through `BriefingPreference.tz`, which already exists and already
drives agent crons, applied to the human-facing sites while UTC stays where the
comparison is against a stored instant. Sites are listed in `backend/CLAUDE.md`.

**The original TIMESTAMPTZ → TIMESTAMP conversions cannot be audited.** Two
early migrations converted without an explicit `USING` clause, so Postgres used
whatever the session's `TimeZone` was and nothing in the row records it. On a
UTC host they are fine, and the available cross-checks agree — but "almost
certainly" is not an audit, and the shift is undetectable from the data alone.
Settling it requires correlating a row against an external record of the same
event on a pre-conversion restore. Guessing an offset would turn a suspicion
into corruption.

## Backend capability with no interface

Each of these has working, tested endpoints and no screen. Either build the UI
or remove the endpoint; leaving them is what produced this list.

- **Credit-card bills** — full CRUD, no UI.
- **Categorisation rules** — create and delete, no UI. Transactions are
  categorised server-side by `match_suggested_category`, but the rules behind it
  cannot be edited.
- **What-if simulator** — a Monte-Carlo cash-flow projection with an endpoint
  and no screen since the Finance IA was redesigned.
- **Forecasts and the discoveries feed** — endpoints survive; the dashboard
  components that rendered them were removed.
- **Career events** — the timelines that read `career_events` were deleted.
  `CareerLogModal.tsx` is still on disk, unreferenced, for whenever a surface
  that shows them comes back.
- **Saved quotes** — a complete, isolated, tested API whose UI was deleted. The
  backend was kept because it is woven through the isolation, export and
  timestamp tests as a representative table.
- **Financial health score** — `financeApi.healthScore()` has no caller and the
  route is untouched.

## Product gaps

- **Custom foods can be created but not edited or deleted.** A meal log can now
  save into the catalogue; `patchFood` and `deleteFood` still have no UI.
- **Nothing syncs account balances from an institution.** Balances are entered
  and then adjusted by the ledger. The accounts table has no `credit_limit`, so
  credit utilisation cannot be shown.
- **Content metrics were always manual** and the Content area is gone; its
  tables remain so historical rows still render.

## Platform

- **No `LICENSE` file.** The repository is public, so default copyright applies
  and nobody may reuse the code. Pick a licence.
- **The frontend has no end-to-end test.** Coverage is 81 unit tests plus
  `test_api_mappings.py`, which checks that every frontend call site matches a
  real backend route. Nothing exercises a real browser session.
- **ESLint carries 289 warnings**, almost all `no-explicit-any`. The ratchet
  stops it growing; reducing it is untouched work.
- **The main bundle is 893 kB** (265 kB gzipped) after chunking. Route-level
  code splitting would help most.
