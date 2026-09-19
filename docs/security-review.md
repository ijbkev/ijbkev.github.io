# Website and data security review

**Update:** The signature exposure and legacy-recovery issue have now been fixed live, authentication checked, and an encrypted backup restored successfully. See [the live follow-up](security-follow-up.md) for current status and remaining actions. The details below record the initial review.

Review date: 12 September 2026. Scope: the current local React/Vite website, PHP reimbursement API, Google Drive permission code, Secret Friend application, build artifacts, dependency lockfiles, and limited unauthenticated HEAD requests to the documented live host. Existing user changes were preserved. No live data, Drive permissions, credentials, or deployment were changed.

**Result: local hardening is complete and both dependency audits are clean. The live site is not yet cleared: the signature image is publicly accessible, the fixes need deployment, and hosting/account/backup controls still need verification.** This is a scoped code/configuration review, not proof that all vulnerabilities or past compromises have been excluded.

## Findings and changes

| Priority | Finding and impact | Remediation / status |
| --- | --- | --- |
| High | Legacy application recovery accepted a project code plus a predictable reference and email, then returned personal/bank details, signatures, documents and a reusable private recovery number. Email/reference knowledge is not identity verification. | `resume_legacy_application` now requires an administrator session in addition to the existing participant session. Tests verify a participant alone is rejected and an administrator can assist. Private random submission-number recovery remains available. Updated on-screen guidance. **Local fix; deploy required.** |
| High | Coordinator signature was copied into public assets and API assets were not denied. Live HEAD requests returned **200 image/png, 170950 bytes** for both `/reimbursement/coordinator-signature.png` and `/api/assets/coordinator-signature.png`. | Moved source image into `php-api/assets`, removed the public build copy, and blocked both URL locations with root/API rules. Apache tests return 403. **Live exposure remains until deployment and cache removal.** A scanned signature can also be extracted from legitimately issued PDFs; this change reduces unauthenticated exposure and does not make it a cryptographic signature. |
| High | Initial npm audit reported **20 affected packages: 15 high, 4 moderate, 1 low**. The spreadsheet importer read arbitrary files with vulnerable `xlsx` 0.18.5. Severity totals describe packages, not demonstrated remotely exploitable bugs. | Applied compatible updates and upgraded SheetJS to official 0.20.3, React Router DOM to 7.18.3 and Vite to 7.3.6. Final npm audit: **0 findings**. Both PHP PDF packages also have **0 reported advisories**. Lockfile and build updated. |
| High, conditional | Development server bound all interfaces and did not explicitly deny Secret Friend private state, generated outputs or temporary data. Exposure depends on network reachability. | Default bind changed to localhost; added denials for private game state, outputs, temporary files, built API sources and database/key files. Development service is not a production server. |
| Medium | Reimbursement storage trusted its configured path and existing permissions; an incorrect deployment could put sensitive files inside the public document root. | Enforce an absolute path, resolve symlinks, reject public-root paths before creating storage, and secure the directory to 0700. Tests cover direct and symlink paths. Server filesystem isolation still matters. |
| Medium | Reimbursement JSON reads had no application byte limit; the game trusted Content-Length alone. | Bound actual reads to 8 MiB for reimbursement JSON and 100,000 bytes for game JSON, even without Content-Length. Added administrator password length bound. Existing multipart limits remain. |
| Medium | Forwarded HTTPS was trusted without opting into proxy trust. | Only accept `X-Forwarded-Proto` when `IJBK_TRUST_PROXY=1`. Tests cover direct HTTPS, trusted proxy and spoofed untrusted header. Proxy restriction/overwrite must be verified on the host. |
| Medium | Site-wide browser headers and general backup/dotfile protections were missing. Live homepage only supplied HSTS (86400 seconds) and CSP `upgrade-insecure-requests`. | Added `nosniff`, frame denial, referrer/permissions policies, conservative CSP, index suppression, and private/source/database-file denials. Preserve stronger application CSP when present. Verified on local Apache; nginx may require equivalent rules. |

Relevant implementation: `php-api/lib.php`, `php-api/index.php`, `.htaccess`, `public/.htaccess`, `php-api/.htaccess`, `public/secret-friend/api.php`, `scripts/build-server.mjs`, `vite.config.ts`, and `tests/php-security.test.ts`.

## Controls that were already present

- Server-side admin/participant/partner authorization; partner queries constrain country and project. Regression tests cover cross-country denial and role separation.
- Random session tokens stored as hashes; HttpOnly, SameSite=Strict cookies; 8-hour reimbursement session expiry; logout and project-code rotation revoke relevant sessions.
- Same-origin checks on reimbursement mutations; separate CSRF tokens, strict PHP sessions and ID regeneration in Secret Friend.
- Parameterized database queries for participant input; escaped user text in generated PDF HTML.
- Private claim storage, generated filenames, upload type inspection and file/request size limits. Originals are handled as untrusted attachments; PDF forensic indicators do not certify a document malware-free.
- Drive permission code checks folder ownership, removes unauthorized access and checks personal-folder privacy before enabling country-folder browsing. Mocked regression tests exercise failure handling. **This does not verify the current live Drive permissions.**
- Secret Friend installation requires an externally configured token of at least 32 characters, a CSRF token and a rate limit; it cannot overwrite an installed account.
- A high-confidence pattern scan of tracked first-party source found no matching private keys or common provider tokens. This was not a complete Git-history, archive, generic-password or secret-in-binary scan.

## Actions still required for production

1. **Deploy the reviewed build and both root/API denial rules.** Remove the old public signature file and purge any cached copy. The documented host responds through nginx; verify nginx does not serve protected static paths before Apache. Both signature URLs must return 403/404, not 200 or a redirect to a downloadable image. Do not upload the repository or generated report/output archives to the web root.
2. **Check the production path and TLS/proxy configuration.** Reimbursement storage must be outside the effective document root, including symlinks/aliases. The PHP user must own it; test permissions before rollout. Confirm HTTP redirects to HTTPS, valid certificates, Secure cookies, effective CSRF checks and application no-store headers. Existing live HEAD checks confirmed valid HTTPS, HSTS and 403 for `/api/bootstrap.php`, `/.git/config`, and `/secret-friend/bootstrap.php`; other server controls were not comprehensively tested.
3. **Verify and restrict real Google Drive sharing.** Inspect participant folders, child files, inherited permissions and ownership using the admin privacy tools. Country/project folders are intentionally shareable by link; avoid sensitive data and personal identifiers in public names. No live permission audit or changes were performed.
4. **Establish recoverable, encrypted backups and a retention policy.** The SQLite database, WAL state, uploads, Secret Friend state and access-code encryption key need consistent protected backups outside the website account where feasible. Use SQLite's online backup facility or a coordinated maintenance window, not an arbitrary copy of a live database file. Test a restore, define retention/deletion dates, restrict backup access and document recovery ownership. Backup existence, encryption, retention and restore success are **unverified**.
5. **Protect administrator and hosting accounts.** MFA is not implemented in the application login; use a properly integrated MFA-capable access layer or add it, and enable MFA on hosting/Drive/email accounts. Avoid sharing the admin password, keep recovery material separate, and plan session revocation when rotating credentials. There is no comprehensive security audit trail for admin changes; add protected event logging/alerting without logging passwords, recovery numbers, bank details or documents.
6. **Review Secret Friend privacy before using real participant information.** Rooms expose participant names when active/open; birth dates are used as PINs. Even with rate limits, a known birth date is a weak credential. Use independent random participant secrets and restrict roster visibility if the game must keep identities/assignments confidential. Existing participants were not silently re-keyed by this review.
7. **Finish defense against hostile files and resource exhaustion.** Bound document decompression/rendering work in isolated workers, add malware scanning/quarantine where appropriate, storage quotas and retention for drafts. Existing size limits do not prevent every compressed-file bomb. Browser PDF analysis is not malware scanning. A full `script-src` CSP needs a separate compatibility rollout; the new baseline policy principally controls framing, objects, base URLs and form destinations.

## Verification

- Final `npm audit --json`: **0 vulnerabilities**; snapshot: [npm audit](security/npm-audit.json).
- `composer audit --locked --format=json`: **0 advisories**; snapshot: [Composer audit](security/composer-audit.json). These are database checks at review time, not future guarantees.
- `npm test`: **14/14 passed**, including storage-path/symlink protection, proxy trust, administrator-only legacy recovery, country isolation, approvals, PDFs and mocked Drive permissions.
- `npm run typecheck` and production `npm run build`: passed. Build retains a pre-existing large-chunk warning.
- Synthetic Apache checks: 13 routes passed, including blocked private files/signature/helper sources, permitted public assets, SPA fallback, and headers. Reproduce on macOS with `python3 tests/security/apache.py`; it starts an isolated localhost Apache with synthetic fixtures.
- Lightweight production checks used HEAD only; no sensitive response bodies were downloaded. Homepage and projects rendered in a brief local browser check before switching to command-line-only validation at the user's request. No authenticated browser workflow was claimed as verified.
- Secret Friend disposable workflow: passed installation, CSRF, authentication, import atomicity, access pause, PIN revocation, the real 90-second reveal boundary, stable timestamps, CSV, logout and account rate limits. Matching tests passed 396 randomized draws and invalid-lock/PIN checks.
- PHP syntax checks: 10 first-party files passed. SheetJS XLSX/CSV Unicode import smoke checks passed. `git diff --check` passed.

## Dependency references

- [SheetJS official installation and release source](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/): patched releases are distributed from its CDN rather than the stale npm `xlsx` release.
- [SheetJS prototype pollution advisory](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6) and [SheetJS ReDoS advisory](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9).
- [OWASP file upload guidance](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html): private storage, validation and layered file handling.
