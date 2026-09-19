import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calendarDate, ticketSchema, settingsSchema, allGreenTransport } from '../shared/reimbursement';

const ticket = { purchaseDate: '2020-01-01', travelDate: '2020-01-02', from: 'Berlin', to: 'Vienna', mode: 'Train', ticketType: 'Electronic ticket', currency: 'EUR', amount: 12.34 };
test('form dates reject impossible dates and accept leap days', () => {
  for (const date of ['2025-02-29', '2024-04-31', '', 'invalid', '2024-13-01']) assert.equal(calendarDate.safeParse(date).success, false, date);
  assert.equal(calendarDate.safeParse('2024-02-29').success, true);
});
test('ticket amounts and routes handle boundary and incomplete inputs', () => {
  assert.equal(ticketSchema.safeParse(ticket).success, true);
  for (const amount of [0, -1, NaN, Infinity, 1.001, 100000001]) assert.equal(ticketSchema.safeParse({ ...ticket, amount }).success, false, String(amount));
  for (const patch of [{ travelDate: '' }, { travelDate: '2019-12-31' }, { from: '' }, { currency: 'USD' }, { boardingPasses: [{ journey: 'outbound' }] }]) assert.equal(ticketSchema.safeParse({ ...ticket, ...patch }).success, false);
  const receipt = ticketSchema.parse({ ...ticket, mode: 'Food', travelDate: '' });
  assert.equal(receipt.to, 'Food');
  assert.equal(allGreenTransport([]), false);
  assert.equal(allGreenTransport([{ mode: 'Food' }]), false);
  assert.equal(allGreenTransport([{ mode: 'Train' }, { mode: 'Food' }]), true);
  assert.equal(allGreenTransport([{ mode: 'Train' }, { mode: 'Flight' }]), false);
});
test('admin settings reject incomplete caps, duplicate countries and reversed dates', () => {
  const settings = { shortName: 'TEST', projectCode: 'TEST-2026', activityStartDate: '2026-09-20', activityEndDate: '2026-09-27', destinationCity: 'Vienna', countries: ['Germany'], countryLimits: { Germany: 30900 }, enabled: true };
  assert.equal(settingsSchema.safeParse(settings).success, true);
  for (const patch of [{ countryLimits: {} }, { countryLimits: { Germany: -1 } }, { countries: [] }, { countries: ['Germany', 'Germany'] }, { activityEndDate: '2026-09-19' }, { expectedParticipants: { Germany: 1.5 } }]) assert.equal(settingsSchema.safeParse({ ...settings, ...patch }).success, false);
});
