# Welcome to your Lovable project

## Project reimbursement portal

Upcoming cards open `/projects/:projectId`. Their existing infopacks remain on
the new detail pages. Completed and ongoing project behavior is preserved.

Run `npm install` and `npm run dev` to start the website and reimbursement API
together at `http://localhost:8080`. The first run creates an administrator
password in the private, ignored `.local/admin-credentials.txt` file. Visit
`/admin/reimbursements` (linked as **Admin** in the main navigation and footer)
to sign in.

For each upcoming project, enter its official identifying code, participating
countries (one per line), a short uppercase project name, activity duration/dates, destination city, each country’s two-letter code and EUR reimbursement ceiling, and a separate secret participant access code. Enable
submissions and save. Share the public project URL and participant code. Codes
are hashed; replacing a code or closing submissions revokes participant
sessions. There is no public administrator registration or default password.

Participants select only the configured project countries, add their details
and ticket rows, enter bank details, and draw a mouse/touch signature. Submitted
claims, uploaded files, signatures, and PDFs are private to administrators.
The dashboard supports per-project submissions, search, full participant detail,
and downloading the single complete PDF. Submissions are grouped into country tables. Administrators can delete a submission with its private files, or approve an extra amount from its details dialog.

Participant submission stores the claim and untouched ticket attachments without
attempting to join them. The complete reimbursement PDF is assembled on demand
only after an administrator chooses to download it.

The declaration uses IJBK and Erasmus+ logos, two-column project/participant/bank sections, a travel table, and a signed declaration. Its title and filename are `Reimbursement Declaration - [Participant Name] - [Country]`.

Standard reimbursement is `min(submitted EUR expenses, country limit)`. Final reimbursement adds the administrator-approved extra amount. Saving an extra approval replaces the previous extra; saving zero removes it. All five amounts are shown in the PDF. Downloads are generated from the current saved claim, including any extra approval.

References use `SHORTPROJECTNAME` + two-letter country code + first name + `-` + surname, for example `OASISDEAnna-Schmidt`. Internal UUIDs keep same-name submissions separate. Existing claims keep their original references, country-limit snapshots (if present), and signed declaration wording; missing legacy fields are labelled as not recorded. Existing projects must have the new settings saved before accepting new claims.

The PDF contains the project code (never the secret code), all participant and
bank details, ticket costs and exchange-rate evidence, total, and signature.
Supporting documents follow their invoice, with boarding passes listed at EUR 0.
Flight bookings support one-way or round-trip routes and up to 12 outbound and
12 return segments. The flight invoice contributes its amount exactly once;
separate invoices are separate expense entries. Missing passes remain visible
in the supporting-document list and never prevent generating a claim.

Uploads accept PDF versions without a version or ten-page rejection, plus images,
up to 10 MB each and 40 MB overall, with up to 30 invoices per submission.
Generation uses PDF.js in the administrator's browser to render visible content
(including compressed objects, forms, and annotations) into a separate compatible
PDF; pdf-lib expansion of object streams is an additional fallback. Original
uploads remain unchanged for forensic inspection. The PHP renderer can also use
`qpdf` on `PATH` (or `IJBK_QPDF_BINARY`) for direct API downloads; the browser
compatibility path does not require it. Keep the built `pdfjs/` assets and worker
bundle in the deployment.

Modification indicators appear in red in the download review. They are not proof
of tampering and never block downloading. Unrenderable/password-locked/corrupt
files produce per-document red warnings and a placeholder in the generated claim,
with the original attached for manual review when available. Neither these files
nor missing boarding passes cancel generation. Longer documents continue across
additional output sheets instead of being rejected.

Configure PHP upload limits for the full form (`upload_max_filesize=45M`,
`post_max_size=80M`, `max_file_uploads=800`) and sufficient request memory/time
for PDF generation. Original uploads retain the application's 10 MB per-file and
40 MB total limits; compatibility rendering can produce larger derived files.
The Worker limits generated compatibility requests to 80 MB.

On the RPTU
server, raw uploads, generated PDFs, and the SQLite database are stored in
`/srv/www/www-ijbk-ev/data/reimbursement`,
outside the public document root. The optional Cloudflare deployment uses
private R2 and D1 storage.

Historical conversion uses the [Frankfurter API](https://frankfurter.dev/) with
the ECB provider. The rate is fetched using the purchase date and verified again
on the server at submission. The previous available business-day rate (at most
7 days earlier) is used for weekends and holidays and is clearly labeled. An
unavailable rate blocks submission; today's rate is never substituted. Each
ticket is rounded to euro cents before summing. Supported currencies are EUR, CZK, DKK, HUF, PLN, RON, SEK, and TRY. BGN is not accepted for new tickets. Submitted
project details and rates are snapshots and remain unchanged after later edits.

### Persistence and deployment

`npm run build` builds the Vite frontend, an Apache/PHP API at `dist/api`, and
the optional Cloudflare API at `dist/server/index.js`.
`npm run typecheck` checks both frontend and server. `npm test` runs workflow,
authorization, PDF, and exchange-rate tests against isolated D1/R2 instances;
run the build first. A synthetic PDF is written to `tmp/pdfs` for layout QA.
`npm run db:generate` generates SQL after changes to `db/schema.ts`.

Local development persists records in `.wrangler/`. Do not delete that directory
if you want to retain local submissions. The test suite uses separate ephemeral
storage and does not change local project settings or participant submissions.

The Apache build places only the one-way administrator password hash in its
server-side PHP bootstrap. The API directory blocks direct access to bootstrap,
configuration, and dependency files. Never put administrator or project secrets
in `VITE_*` variables, public JavaScript, or browser storage.

For the optional Cloudflare deployment, configure a D1 binding named `DB`, a
private R2 binding named `FILES`, and the `ADMIN_PASSWORD_HASH` server secret.
Sites provisions these bindings from `.openai/hosting.json`.

`npm run dev:web` retains the original frontend-only Vite command;
`npm run dev:api` starts just the backend. Local setup and credentials are ignored
by Git. Public project pages remain readable when the reimbursement API is
unavailable and display an unavailable message for the portal.

## Project info

**URL**: https://lovable.dev/projects/fce62516-199c-4d84-9ad5-496bb72bedc7

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/fce62516-199c-4d84-9ad5-496bb72bedc7) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/fce62516-199c-4d84-9ad5-496bb72bedc7) and click on Share -> Publish.

### Deploying to Apache for `ijbk-ev.hsg.rptu.de`

The reimbursement API is included in `dist/api`, so the same build and rsync
command deploys both the website and the service:

1. Build the site:
   ```sh
   npm run build
   ```
2. Upload the complete build:
   ```sh
   rsync -avz --delete dist/ \
     www-ijbk-ev@www-admin13.rz.rptu.de:/srv/www/www-ijbk-ev/data/http/
   ```
3. Open `https://ijbk-ev.hsg.rptu.de/admin/reimbursements`. The password is in
   `.local/admin-credentials.txt` on the computer where the first build ran.

The site's `.htaccess` sends `/api/...` to PHP before applying the React SPA
fallback. PHP creates durable private state in
`/srv/www/www-ijbk-ev/data/reimbursement`; the rsync target is only `data/http`,
so `--delete` does not remove submitted claims. Back up the reimbursement
directory according to the organization's retention policy.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

The Erasmus+ logo is sourced from the [German Erasmus+ National Agency document centre](https://erasmusplus.schule/service-und-unterstuetzung/unterstuetzung-im-programm/dokumentencenter). The attached example informed the layout only; its host organisation, legal terms, deadlines, and personal data are not copied into the portal.

### PDF regression checks

`npm test` covers both PHP and Worker submission/download paths, compressed
object streams, missing and corrupt boarding passes, route grouping, zero-cost
passes, authorization, and preservation of original files. To exercise local
real-world PDF examples without committing private documents:

```sh
IJBK_TEST_DB_PDF='/path/to/DB.pdf' IJBK_TEST_ALIISA_PDF='/path/to/ALIISA.pdf' npm test
```

QA PDFs are written only into ignored `tmp/pdfs/`. Browser verification should
also run with `IJBK_QPDF_BINARY` pointing to an unavailable executable to confirm
that the deployment does not depend on a server-installed converter.

### Project participant Drive folders

The bottom of each project's reimbursement admin dashboard lists countries and
personal folders directly from the configured Google Drive. Oasis, Who Am AI,
and Connected Not Consumed have default Countries links. Other projects can
connect a project folder (Countries is detected inside) or directly select a
Countries folder with any name. Existing connections stay selected; use
Change Drive link only when intentionally replacing one. Saving a link reads
folders and does not create folders or change Google permissions. Participant links are returned
only by the authenticated participant session endpoint.

1. Enter each existing participant's email on their row. Existing Drive shares
   are displayed as hints, never silently treated as verified assignments.
2. Choose **Apply all emails & enable country browsing**. Blank emails make the
   corresponding folders owner-only. This removes other direct shares and
   public links from personal folders and their current contents. It preserves
   files, applies limited access, disables editor resharing, and verifies access.
3. Add future participants using country, name, and email. Countries are reused;
   identity is project + country folder ID + normalized email. A matching name
   alone never authorizes reassigning an existing folder: use its explicit row.
   Applying a changed email revokes the previous person's personal-folder access.

Country browsing is granted only after every personal folder in the selected
project passes a privacy audit. All assigned participants receive reader access
to Countries and its country folders, with writer access only to their assigned
personal folder. Owners retain access. Google may show other personal folder
names greyed out; their contents cannot be opened. Folders with unknown ownership,
shortcuts, loose files in country containers, or over 500 participant items stop
the operation rather than weakening privacy. Current enforcement requires
organizer ownership of the inspected content in My Drive; shared drives are not
supported. External changes or new direct shares require another privacy audit;
this is not a continuous background policy enforcement service.

The backend records assignments and statuses in SQLite/D1 and serializes Drive
mutations. A failed operation can leave partial restrictions in place but does
not report success; refresh and retry the same row. Do not run the older local
Oasis pilot simultaneously with dashboard changes.

#### Server connection

Use the organizer's OAuth refresh token, not an API key. For local Workers:

```sh
node scripts/setup-drive.mjs /path/to/client.json /path/to/tokens.json
```

This writes only ignored `.dev.vars` and `.local/google-drive.json`, with private
file permissions. The frontend never receives Google credentials. For hosted
Workers, set `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`, and
`GOOGLE_DRIVE_REFRESH_TOKEN` as runtime secrets. For PHP, provide the same
server environment variables, or store the JSON containing `client_id`,
`client_secret`, and `refresh_token` at
`/srv/www/www-ijbk-ev/data/reimbursement/google-drive.json` with permissions 0600
and ownership allowing the PHP process to read it. Alternatively set
`IJBK_GOOGLE_DRIVE_CREDENTIALS` to an absolute private path. Never put this file
inside `data/http` or `dist`. Build output intentionally excludes this connection.
OAuth consent in Google's testing mode may require reconnection when Google
expires its refresh token.

The additive `0005_project_drive.sql` migration is generated from the three Drive
schema definitions (isolated generation avoids regenerating earlier manually
maintained migrations). Worker and PHP initialization also create the tables
idempotently; no existing claims or submissions are modified.
