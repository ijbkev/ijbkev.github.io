# Live security follow-up

Completed 12 September 2026 (local time). This updates the [initial review](security-review.md). Only targeted security changes were deployed; unrelated local website changes were not published.

## Coordinator signature: fixed and verified live

- Moved the signing image to `/srv/www/www-ijbk-ev/data/reimbursement/coordinator-signature.png`, outside the public document root, with permissions 0600.
- Updated the live PDF generator to use that private file. Agreement generation now fails if it is missing instead of silently producing an unsigned coordinator section.
- Removed both public copies and installed tested root/API file-denial rules.
- Both `/reimbursement/coordinator-signature.png` and `/api/assets/coordinator-signature.png` now return **403**. The homepage remains **200**.
- The production PDF engine successfully rendered the private image into an in-memory test PDF. No real agreement was created or changed.
- Future local builds exclude the image. The computer's original is in ignored `.local/signing/coordinator-signature.png`; previews copy it into private demo storage. Tests use synthetic signature fixtures rather than production signing material.
- The repository is public, but its current `main` branch returned **404** for the previous public signature path. Git history was not exhaustively audited. Previously downloaded images and signatures embedded in issued PDFs cannot be recalled by this change.

Private rollback copies are under `/srv/www/www-ijbk-ev/data/security-maintenance/`. Do not copy that folder into the web root. Rolling back old public-image files would reintroduce the exposure.

## Other website controls checked

| Check | Result |
| --- | --- |
| Public homepage / new headers | 200; nosniff, frame denial, referrer policy, CSP and existing HSTS present |
| Anonymous admin session | 401 |
| Login from another origin / missing Origin | 403 / 403 |
| Existing administrator login | 200; test session immediately logged out |
| Session cookie | Secure, HttpOnly, SameSite=Strict |
| Authenticated session | 200; API sends no-store |
| Logout and replay of old cookie | 200 logout, then 401 on replay |
| Legacy reference/email recovery | Administrator-only gate deployed; an unauthenticated direct function check rejects before querying records |
| Reimbursement database | SQLite integrity check: `ok` |
| Private storage | Outside web root; directory restricts other users; remaining broadly readable regular files tightened to 0600 |
| Application MFA | Not implemented; login currently accepts the administrator password alone |
| Hosting/email/Google account MFA | Not verifiable through the available website/SSH checks; no account settings changed |

The earlier dependency upgrades and other local hardening remain in the working tree. The live deployment in this follow-up contains the signature fix, web-server protection rules, legacy-recovery gate and tighter file permissions; it does **not** claim that all rebuilt frontend dependencies or every earlier PHP hardening change have been deployed.

## Backup and restore verification

A new encrypted recovery snapshot was created from the roughly 1 MB private datastore. A brief SQLite write lock and Secret Friend store lock coordinated the snapshot with the applications. The SQLite backup API created the database copy; live records were not edited.

- Server copy: `/srv/www/www-ijbk-ev/data/security-backups/reimbursement-20260911T185711Z.cms` (0600, outside web root).
- Off-server encrypted copy: `.local/security-review/reimbursement-20260911T185711Z.cms`.
- Encryption: OpenSSL CMS with AES-256-GCM, using a recovery certificate whose private key exists only on this computer.
- SHA-256 of encrypted file: `1987960c7a33e1d58bc938f8d1f1963c413a5090a006a4a604c549bb508470f4`.
- Restore test passed decryption, **10 file checksums**, SQLite integrity, **2 claim records**, **1 draft**, and valid game state.
- Restored active sessions are cleared. OAuth credentials are excluded: reconnect Drive after disaster recovery.
- Temporary decrypted restore-test files were removed. The backup includes personal records and signing/encryption material and must remain private.

Recovery key: `.local/security-review/backup-recovery.key.pem` (0600). Recovery certificate: `.local/security-review/backup-recovery.cert.pem`. Keep an additional protected recovery-key copy in your organization's secure storage; losing the key makes this backup unusable. Do not publish or commit either the key or decrypted backup contents. Instructions are in `.local/security-review/RECOVERY.md`.

**No scheduled backup job was found in this hosting account's crontab.** No provider-level backup guarantee has been established. This is a verified manual recovery snapshot, not an installed automatic backup service. A recurring schedule, retention policy, monitoring and periodic restore test still need an operational owner.

## Drive scope

The initial read-only inspection checked 51 personal folders; 39 failed the application's private-access configuration check. The failures were classified as private-folder settings not yet applied. A deeper inspection was stopped when you instructed me to leave Drive access to you. No Drive permissions, ownership, participant assignments or notifications were changed. Drive remediation is user-managed and excluded from this follow-up's completion claim.

## Remaining actions

1. Configure administrator MFA and verify hosting/email/Google account MFA.
2. Choose and operate an automatic encrypted backup schedule and retention policy; preserve the recovery key separately.
3. Deploy the remaining reviewed dependency/PHP changes through a normal full-release review, without accidentally publishing unrelated work.
4. Apply Drive privacy settings yourself, as requested. Secret Friend's birth-date PIN design also remains unchanged.

## Final local validation

All 14 regression tests passed with synthetic signing fixtures. The production build passed, both former public signature files are absent from `dist`, and `git diff --check` passed.
