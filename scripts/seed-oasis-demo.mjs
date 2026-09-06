import { DatabaseSync } from 'node:sqlite';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const d1Directory = path.resolve('.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
const candidates = existsSync(d1Directory)
  ? readdirSync(d1Directory).filter(file => file.endsWith('.sqlite')).map(file => path.join(d1Directory, file))
  : [];
const databasePath = process.argv[2] || candidates.find(file => {
  try {
    const candidate = new DatabaseSync(file, { readOnly: true });
    const found = candidate.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='project_details'").get();
    candidate.close();
    return Boolean(found);
  } catch { return false; }
});
if (!databasePath) throw new Error('The local reimbursement D1 database was not found. Start the development server once and retry.');

const db = new DatabaseSync(databasePath);
const project = db.prepare("SELECT project_code AS projectCode FROM project_settings WHERE project_id='oasis'").get();
const detailsRow = db.prepare("SELECT data FROM project_details WHERE project_id='oasis'").get();
if (!project || !detailsRow) throw new Error('Configure the OASIS reimbursement project before seeding demo participants.');
const details = JSON.parse(detailsRow.data);
const createdAt = new Date().toISOString();
const signature = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+Xw2ZAAAAAElFTkSuQmCC';
const people = [
  ['demo-oasis-de-leader', 'Anna Keller', 'Germany', 'Team Leader', 'anna.keller@demo.ijbk.local', 28640, 2260],
  ['demo-oasis-de-p1', 'Lukas Weber', 'Germany', 'Participant', 'lukas.weber@demo.ijbk.local', 24890, 0],
  ['demo-oasis-de-p2', 'Mia Hoffmann', 'Germany', 'Participant', 'mia.hoffmann@demo.ijbk.local', 31750, 0],
  ['demo-oasis-de-p3', 'Noah Fischer', 'Germany', 'Participant', 'noah.fischer@demo.ijbk.local', 19450, 1250],
  ['demo-oasis-ee-leader', 'Katrin Tamm', 'Estonia', 'Team Leader', 'katrin.tamm@demo.ijbk.local', 30120, 3000],
  ['demo-oasis-ee-p1', 'Martin Saar', 'Estonia', 'Participant', 'martin.saar@demo.ijbk.local', 27880, 0],
  ['demo-oasis-ee-p2', 'Liis Kask', 'Estonia', 'Participant', 'liis.kask@demo.ijbk.local', 22340, 850],
  ['demo-oasis-ee-p3', 'Rasmus Põder', 'Estonia', 'Participant', 'rasmus.poder@demo.ijbk.local', 30900, 0],
];
const insert = db.prepare(`INSERT OR REPLACE INTO submissions
  (id, project_id, request_id, session_hash, status, name, team, email, total_cents, data, pdf_key, created_at)
  VALUES (?, 'oasis', ?, 'demo-seed', 'complete', ?, ?, ?, ?, ?, '', ?)`);
db.exec('BEGIN');
try {
  for (const [id, name, team, role, email, totalCents, extraCents] of people) {
    const [firstName, ...last] = name.split(' ');
    const claim = {
      id, projectId: 'oasis', projectName: '🌴 OASIS', projectCode: project.projectCode,
      projectShortName: details.shortName, activityStartDate: details.activityStartDate,
      activityEndDate: details.activityEndDate, destinationCity: details.destinationCity,
      countryLimitCents: details.countryLimits[team], totalCents, extraCents,
      extraNote: extraCents ? 'Demo coordinator-approved additional travel support' : '',
      participant: {
        name, firstName, lastName: last.join(' '), role, team, email,
        citizenship: team === 'Germany' ? 'German' : 'Estonian', residenceCountry: team,
        city: team === 'Germany' ? 'Berlin' : 'Tallinn', sendingOrganisation: `${team} Youth Network`,
        arrivalDate: details.activityStartDate, departureDate: details.activityEndDate,
      },
      tickets: [], signature, declaration: true, createdAt,
    };
    insert.run(id, id, name, team, email, totalCents, JSON.stringify(claim), createdAt);
  }
  db.exec('COMMIT');
} catch (error) {
  db.exec('ROLLBACK');
  throw error;
} finally {
  db.close();
}
console.log(`Seeded ${people.length} OASIS demo claims in ${databasePath}`);
