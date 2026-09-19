# Functional regression checks

Run from the repository root with Node dependencies, PHP and Python 3 installed:

```sh
npm run test:functional
npm run test:game:timed
npm run typecheck
npx vite build
```

`test:functional` runs reimbursement/partner/Drive API workflows, client error handling, form validation and the fast Friends HQ regressions. It excludes the dedicated security and forensics suites. `npm test` retains the existing complete TypeScript test selection, including the new client and validation tests; the game scripts are separate.

The API/game tests start localhost servers and use temporary isolated storage. They need permission to bind local ports. The timed game runner creates its own disposable server and waits through the real 90-second reveal boundary; do not point `workflow.py` at a live site.

## Covered use cases

| Area | Scenarios |
| --- | --- |
| Reimbursement | Submit and retry, country caps, extra support, green travel/receipts, flights and boarding passes, modern PDFs, long participant names, approval and deletion |
| Saved applications | Save/resume, document storage, revisions, finalized locks, return to draft, recovery, duplicate submissions and expected team counts |
| Admin settings | Missing/negative caps, duplicate/empty countries, reversed activity dates, fractional participant counts |
| Partner dashboard APIs | Country session, declarations, agreements, document lists and PDFs, access-code changes and logout |
| Project Drive | Participant/folder workflows and recovery from folder creation errors, conflicts and failed listings, using test fixtures |
| Form validation | Invalid/leap dates, zero/negative/nonfinite/overprecision amounts, incomplete journeys, unsupported currency, receipt normalization |
| Client errors | Offline API, expired session, HTML/empty response, PDF preparation too large, malformed PDF filename/warnings, null PDF error body |
| Friends HQ | Lobby, duplicate names, session re-entry, start gate, late entry, manual locks, impossible draws, 396 randomized optimal draws, delayed/stable reveal, CSV export, deletion and missing rooms |

## Limits

These command-line checks exercise APIs, shared validation and selected client/game logic. They do not render and click through the React dashboards in a real browser, validate actual external Drive availability, or simulate production load. Passing them does not guarantee every possible scenario is crash-free.

The PDF metadata regressions exposed failures in filename decoding and null error handling, plus a warning-shape issue that could break the admin download caller. The download helper now falls back to a default filename, preserves useful errors and returns only valid warning entries.
