# Secret Friend HQ

Standalone PHP 8+ application, vanilla JavaScript and CSS. No Node.js, npm,
Composer, database server, CDN or third-party service is needed to install or
run the game. The surrounding IJBK website retains its existing React build.

## Site integration

The website footer links to `/project-materials/` below Instagram, alongside
the main website Admin link. Secret Friend’s own admin panel remains inside
the game. Both materials and game screens use the website’s blue, sky and yellow
palette with classified-paper accents. That page contains the
Secret Friend HQ game at `/secret-friend/`. The admin panel is inside the game.
Creating a project immediately adds its room to the game lobby. The organizer
can open player check-in from the admin dashboard after adding the eligible
participants. Players enter their name and date of birth; only a matching
admin-added participant can enter. They then wait together with only checked-in
names visible—unarrived participants are not exposed. Birth dates are never
shown. **Start game** closes check-in, locks the roster and admits checked-in
players at once. Closed draft rooms show a waiting message without exposing a
participant roster.
The organizer can copy a room link for invitations or an independently printed
QR code. Links include a room identifier, never a PIN or assignment.

The repository's existing build copies `public/` to the deployment output.
For a PHP-only deployment, upload `public/secret-friend/` and
`public/project-materials/` directly to the matching directories on the host.
No build step is required for these folders. To add the tab to another site,
add a normal navigation link to `/project-materials/`.

## Install on shared hosting

1. Upload `public/secret-friend/` to `public_html/secret-friend/` (or your
   equivalent document root). PHP 8+ with sessions and JSON support is required.
2. Provision a private directory **outside the document root**, writable by PHP.
   By default it is `secret-friend-private` beside the document root. Set
   `SECRET_FRIEND_DATA_DIR` to an absolute path to override it. The application
   refuses paths inside the public document root. On the integrated IJBK
   deployment, the game automatically uses an isolated `secret-friend`
   subdirectory below `IJBK_STORAGE_DIR`, or below the existing private
   `reimbursement` storage directory when no environment override is set.
   `SECRET_FRIEND_DATA_DIR` takes precedence. This directory must not be
   exposed by a web-server alias or symlink.
3. Generate an installation token, for example with
   `php -r 'echo bin2hex(random_bytes(32)), PHP_EOL;'` on a trusted machine.
   Configure `SECRET_FRIEND_INSTALL_TOKEN` in your hosting control panel's PHP
   environment, with at least 32 random characters. On Apache, when permitted,
   `SetEnv SECRET_FRIEND_INSTALL_TOKEN "your-random-token"` can be placed in
   `secret-friend/.htaccess`; confirm your PHP SAPI receives SetEnv variables.
   Configure the private path the same way if needed. If the host does not
   expose environment configuration, ask it to provision these two settings.
4. Visit `https://yourwebsite.com/secret-friend/install.php`, enter the token,
   and create an admin password of 14–72 characters. Installation is protected
   by the token so a visitor cannot claim the first admin account.
5. Remove the installation token from the server environment after setup.
   The installer refuses to overwrite an existing password. Use HTTPS in
   production; Secure cookies are enabled when PHP sees an HTTPS request.
   If a proxy terminates TLS, configure it to set PHP's HTTPS server flag;
   the app deliberately does not trust client-supplied forwarding headers.
6. Enter the game → **Admin panel** → create a room → add/import participants →
   set any directed locks → optionally **Check matching is possible** →
   **Seal room for surprise draw** → **Activate access**. Share the participant room link.

Names and countries are displayed to participants in active room rosters;
project room titles are public. Do not put sensitive information in room names.

## Data and matching rules

- DOB PINs are validated calendar dates in `DDMMYYYY`, then stored only as PHP
  `password_hash(PASSWORD_DEFAULT)` hashes. PIN resets revoke existing sessions
  for that participant. The application never writes the submitted DOB PIN
  to its datastore, URLs, CSV, browser storage or application logs. Configure
  reverse proxies/APM not to capture request bodies or form fields.
- Authentication is scoped to a participant and room. All reveals derive the
  identity from the server session, ignoring caller-supplied participant IDs.
  The first authenticated final reveal POST, after a 90-second minimum briefing
  window, generates and saves the entire draw under the exclusive datastore
  lock. Later reveals reuse that draw. The recipient is returned only by the
  authenticated final reveal POST. No assignments are in public responses.
- The browser games do not send answers to the matching service. A normal run
  takes about 2–3 minutes, including reading and choices. Refreshing starts a
  new identity check; signing in later shows the same permanent assignment.
- The minimum-cost perfect matching algorithm minimizes the total number of
  same-country edges subject to manual locks and no self-assignment. Random
  costs break ties between optimal country solutions; draws are not guaranteed
  uniformly distributed. Directed matches may happen to include a reciprocal
  pair; reciprocal pairs are not required or prohibited.
- Use consistent country names. Whitespace and case differences are ignored;
  free-text aliases such as `Germany` and `Deutschland` are not equivalent.
- Each room supports up to 300 participants. Infeasible locks are rejected.
  Participant edits, deletion, import and lock changes clear any legacy draft
  assignments. Checking feasibility does not save or expose a draw. Sealing
  freezes names, countries, membership and manual locks; it does not choose the
  random assignments. The first final reveal saves those permanently. PIN resets,
  project renaming, CSV export and access toggling remain available. Create a
  new project for the next round. Admins can permanently delete a room, including
  finalized rooms; this removes its participants, assignments and reveal history
  and immediately prevents existing participant sessions from revealing results. Deactivation keeps the room visible as waiting.
- First reveal timestamps are recorded once in UTC; the admin screen shows
  local time and CSV preserves the original ISO timestamp. Refresh admin to
  load the newest viewed statuses, or use **Refresh status**.

## Security boundaries and operations

A birth date is guessable and can already be known by peers. **DOB-only login
cannot guarantee that another person cannot impersonate a participant.** The
app prevents unauthenticated result access and ID-based access to other results,
but it cannot distinguish people who know the same PIN. Stronger identity
assurance requires changing the requested authentication scheme to a private,
random per-person code or another verified factor. The organizer necessarily
has access to all assignments and can reset PINs.

The app uses session rotation, HttpOnly/SameSite cookies, idle session expiry,
CSRF checks, no-store responses, a restrictive CSP, escaped UI output, CSV
formula protection, and persistent attempt throttling. Participant identity
checks allow five attempts per account per 15 minutes and 300 attempts per IP
per 15 minutes. This counts successful attempts too: the shared-IP allowance accommodates project groups on the same Wi-Fi. Admin login allows 30
attempts per 15 minutes globally, additionally subject to the shared IP limit.
Sessions expire after 30 minutes of inactivity. Rate-limit counters contain
hashed keys, counts and expiration times; old counters expire on new attempts.

Private state is `store.json`, guarded by a stable `store.lock`. All read/modify/
write operations are serialized with flock and replaced atomically. This is
intended for a single shared host with a local filesystem that supports flock
and atomic rename; it is not a multi-server or network-filesystem datastore.
The session files live under the same private directory. Restrict that directory
to the PHP account. Back it up outside the public deployment, with access
controls appropriate for personal information. Web-server deployment must not
remove or overwrite private state. To restore, stop writes and restore
`store.json`; discard old session files to require new authentication.

Admin password recovery is a hosting-operator operation: back up the datastore,
stop application writes, replace only its `admin` field with a newly generated
`password_hash` value, delete the private session files to revoke all existing
sessions, then resume the app. Never delete the datastore to reset a password.

## Verification

Run the matching and DOB-validation tests with:

```sh
php tests/secret-friend/matching.php
```

The HTTP suite is **destructive to its disposable test fixtures** and requires
an empty private datastore. Never point it at production. Run a local server:

```sh
SECRET_FRIEND_DATA_DIR=/tmp/sfhq-disposable-test \
SECRET_FRIEND_INSTALL_TOKEN=local-test-install-token-32-characters \
php -S 127.0.0.1:8917 -t public
```

Then, in another terminal:

```sh
python3 tests/secret-friend/workflow.py http://127.0.0.1:8917/secret-friend/
```

It creates fictional participants, checks permissions and lifecycle operations,
and waits through the actual 90-second server reveal boundary. Python is a test
utility only, not an application dependency. Use a new empty private test path
for each run. Never ship test credentials or test data.

The reveal includes four humorous calibration questions (Hogwarts house, animal for a day,
a €1 million purchase, and preferred drink), equipment selection, radar signals, a five-pulse kindness transmitter,
and a sealed dossier. Animal and purchase choices personalize the briefing.
Answers stay in the current page’s memory and are not stored or transmitted.
These choices remain independent of backend assignments. Waiting-for-answers
copy is fictional mission flavor, not a live submission count or group gate.
Question countdowns are 8, 11, 23 and 17 seconds; equipment takes 9 seconds,
radar 16 seconds and decryption at least 19 seconds, respecting the server’s
90-second minimum briefing window.

Fast room-deletion regression (uses a temporary local PHP server and disposable
data): `python3 tests/secret-friend/deletion.py`.

## Organizer suspense

The normal admin response omits all assignment mappings, even after a draw has
been saved. Rows say **Draw at final reveal** before the draw and **Hidden**
afterward. The **Show** button requests only that row’s result through an
admin-authenticated POST; **Hide** conceals it again. Refreshing the page hides
all rows. Recipient countries and same-country warnings are concealed together
with names. Manual lock choices remain visible because the organizer set them.
CSV export becomes available after the draw and explicitly contains all results.
Neither checking feasibility, sealing, loading the admin table, nor requesting
an admin result generates the saved draw. The mini-games do not affect matching.

Existing finalized rooms keep their saved draws, preserving any previously
revealed assignments. They gain hidden admin rows automatically. Use a new or
existing draft room to try a draw generated at the final reveal. The feasibility
check may use the matching algorithm internally but discards that candidate.

Fast regression: `python3 tests/secret-friend/surprise-draw.py`. It uses its own
temporary PHP server and ages only disposable test sessions to exercise the
90-second boundary without waiting or adding a production bypass.

Sealed rooms with no saved draw or reveal history can be reopened using
**Edit participants & manual locks**. Reopening pauses access and revokes existing
participant sessions, while preserving participants and manual locks. Seal and
activate again after editing. Reopening is rejected once a draw has been saved.

Calibration questions advance automatically at their deadlines. An unanswered
question records no choice and displays “Oops, you missed the previous one.”
The mission continues normally; missing answers never affect the assignment.
The seven-option budget question gets 23 seconds for reading.
