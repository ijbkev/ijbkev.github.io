import { test } from 'node:test';
import assert from 'node:assert/strict';
import { api, ApiError, downloadClaim } from '../src/lib/reimbursement-api';

test('dashboard API reports offline, expired-session and invalid-response failures', async t => {
  for (const [label, response, status] of [
    ['offline', null, 503],
    ['expired session', new Response('{"error":"Please sign in again"}', { status: 401 }), 401],
    ['HTML outage', new Response('<html>Unavailable</html>', { status: 502 }), 502],
    ['empty response', new Response('', { status: 200 }), 200],
  ] as const) {
    await t.test(label, async t => {
      t.mock.method(globalThis, 'fetch', async () => { if (!response) throw new TypeError('offline'); return response; });
      await assert.rejects(api('/projects/oasis'), error => error instanceof ApiError && error.status === status);
    });
  }
});

test('PDF downloads tolerate malformed optional metadata and fall back after oversized preparation', async t => {
  for (const warnings of ['null', '{}', '[null]', '[{"key":"ticket-1","filename":"ticket.pdf","message":"Review original"}]']) {
    await t.test(warnings, async t => {
      let requests = 0;
      let clicked = false;
      const link = { href: '', download: '', click() { clicked = true; } };
      t.mock.method(globalThis, 'fetch', async () => ++requests === 1
        ? new Response('', { status: 413 })
        : new Response('PDF fixture', { headers: { 'Content-Disposition': "attachment; filename*=UTF-8''bad%name.pdf", 'X-Document-Warnings': encodeURIComponent(warnings) } }));
      t.mock.method(URL, 'createObjectURL', () => 'blob:test');
      t.mock.method(URL, 'revokeObjectURL', () => {});
      const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
      Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: () => link } });
      t.after(() => { if (previous) Object.defineProperty(globalThis, 'document', previous); else Reflect.deleteProperty(globalThis, 'document'); });
      const result = await downloadClaim('fixture', new FormData());
      assert.equal(requests, 2);
      assert.equal(clicked, true);
      assert.equal(link.download, 'Reimbursement Declaration.pdf');
      assert.deepEqual(result, warnings.startsWith('[{"') ? JSON.parse(warnings) : []);
    });
  }
});

test('PDF null error response remains a useful download error', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('null', { status: 500 }));
  await assert.rejects(downloadClaim('fixture'), error => error instanceof ApiError && error.status === 500);
});
