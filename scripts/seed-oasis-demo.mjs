import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const databasePath = process.argv[2] || path.resolve('.local/demo-reimbursement/reimbursement.sqlite3');
if (!existsSync(databasePath)) throw new Error('Start npm run dev once to initialize the local PHP database.');

const db = new DatabaseSync(databasePath);
const project = db.prepare("SELECT project_code AS projectCode FROM project_settings WHERE project_id='oasis'").get();
const detailsRow = db.prepare("SELECT data FROM project_details WHERE project_id='oasis'").get();
if (!project || !detailsRow) throw new Error('Configure the OASIS reimbursement project before seeding demo participants.');
const details = JSON.parse(detailsRow.data);
const createdAt = new Date().toISOString();
const signature = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+Xw2ZAAAAAElFTkSuQmCC';
const germanDemoTickets = [
  ['2026-09-04', '2026-09-20', 'Berlin', 'Vienna', 'Train', 'Electronic ticket', 'EUR', 89.90],
  ['2026-09-04', '2026-09-20', 'Vienna', 'Bratislava', 'Train', 'Electronic ticket', 'EUR', 18.50],
  ['2026-09-05', '2026-09-21', 'Bratislava', 'Vienna', 'Bus', 'Electronic ticket', 'EUR', 12.00],
  ['2026-09-06', '2026-09-22', 'Vienna', 'Graz', 'Train', 'Electronic ticket', 'EUR', 24.90],
  ['2026-09-07', '2026-09-23', 'Graz', 'Vienna', 'Train', 'Electronic ticket', 'EUR', 24.90],
  ['2026-09-08', '2026-09-24', 'Vienna', 'Bratislava', 'Bus', 'Electronic ticket', 'EUR', 12.00],
  ['2026-09-09', '2026-09-25', 'Bratislava', 'Vienna', 'Train', 'Electronic ticket', 'EUR', 18.50],
  ['2026-09-10', '2026-09-27', 'Vienna', 'Berlin', 'Train', 'Electronic ticket', 'EUR', 94.90],
  ['2026-09-20', '', 'Vienna', 'Food', 'Food', 'Paper ticket', 'EUR', 26.40],
  ['2026-09-20', '', 'Vienna', 'Accommodation', 'Accommodation', 'Paper ticket', 'EUR', 118.00],
].map(([purchaseDate, travelDate, from, to, mode, ticketType, currency, amount], index) => ({
  serial: index + 1, purchaseDate, travelDate, from, to, mode, ticketType, currency, amount,
  euroCents: Math.round(amount * 100), rate: 1, rateDate: purchaseDate, requestedDate: purchaseDate,
  source: 'Demo data', filename: `demo-germany-${index + 1}.jpg`,
}));
const people = [
  ['demo-oasis-de-leader', 'Anna Keller', 'Germany', 'Team Leader', 'anna.keller@demo.ijbk.local', 44000, 0],
  ['demo-oasis-de-p1', 'Lukas Weber', 'Germany', 'Participant', 'lukas.weber@demo.ijbk.local', 24890, 0],
  ['demo-oasis-de-p2', 'Mia Hoffmann', 'Germany', 'Participant', 'mia.hoffmann@demo.ijbk.local', 31750, 0],
  ['demo-oasis-de-p3', 'Noah Fischer', 'Germany', 'Participant', 'noah.fischer@demo.ijbk.local', 19450, 1250],
  ['demo-oasis-ee-leader', 'Katrin Tamm', 'Estonia', 'Team Leader', 'katrin.tamm@demo.ijbk.local', 30120, 3000],
  ['demo-oasis-ee-p1', 'Martin Saar', 'Estonia', 'Participant', 'martin.saar@demo.ijbk.local', 27880, 0],
  ['demo-oasis-ee-p2', 'Liis Kask', 'Estonia', 'Participant', 'liis.kask@demo.ijbk.local', 22340, 850],
  ['demo-oasis-ee-p3', 'Rasmus Põder', 'Estonia', 'Participant', 'rasmus.poder@demo.ijbk.local', 30900, 0],
];
const insert = db.prepare(`INSERT OR REPLACE INTO submissions
  (id, project_id, request_id, session_hash, status, name, team, email, total_cents, data, pdf_path, created_at)
  VALUES (?, 'oasis', ?, 'demo-seed', 'complete', ?, ?, ?, ?, ?, ?, ?)`);
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
      tickets: id === 'demo-oasis-de-leader' ? germanDemoTickets : [], signature, declaration: true, createdAt,
    };
    const claimDirectory = path.join(path.dirname(databasePath), 'claims', 'oasis', id);
    mkdirSync(claimDirectory, { recursive: true, mode: 0o700 });
    insert.run(id, id, name, team, email, totalCents, JSON.stringify(claim), path.join(claimDirectory, 'complete.pdf'), createdAt);
  }
  db.exec('COMMIT');
} catch (error) {
  db.exec('ROLLBACK');
  throw error;
} finally {
  db.close();
}
console.log(`Seeded ${people.length} OASIS demo claims in ${databasePath}`);
