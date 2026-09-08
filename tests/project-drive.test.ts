import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GoogleDrive, renameDriveFolder, configureDrive, enableCountryBrowsing, saveDrivePerson, type DriveFile, type DrivePermission } from '../server/project-drive';
import { drivePersonSchema } from '../shared/project-drive';
import { execFileSync } from 'node:child_process';

const folderType = 'application/vnd.google-apps.folder';
class FakeDrive extends GoogleDrive {
  files = new Map<string, DriveFile>();
  acl = new Map<string, DrivePermission[]>();
  changes: string[] = [];
  constructor() { super('never-used'); }
  add(id: string, parent?: string, folder = true, permissions: DrivePermission[] = []) {
    this.files.set(id, { id, name: id, mimeType: folder ? folderType : 'application/pdf', parents: parent ? [parent] : [], ownedByMe: true, inheritedPermissionsDisabled: false, writersCanShare: true });
    this.acl.set(id, [{ id: 'owner', role: 'owner', type: 'user', emailAddress: 'organizer@example.test' }, ...permissions]);
    return this.files.get(id)!;
  }
  override async api<T>(path: string, method = 'GET', query: Record<string, string> = {}, body?: Record<string, unknown>): Promise<T> {
    const parts = path.split('/'); const id = parts[1];
    if (method !== 'GET') this.changes.push(`${method} ${path}`);
    if (parts[2] === 'permissions') {
      const permissions = this.acl.get(id)!;
      if (method === 'GET') return { permissions: structuredClone(permissions) } as T;
      if (method === 'DELETE') this.acl.set(id, permissions.filter(p => p.id !== parts[3]));
      if (method === 'POST') permissions.push({ ...body, id: String(permissions.length + 1) } as unknown as DrivePermission);
      if (method === 'PATCH') Object.assign(permissions.find(p => p.id === parts[3])!, body);
      return {} as T;
    }
    if (method === 'PATCH') { Object.assign(this.files.get(id)!, body); return structuredClone(this.files.get(id)) as T; }
    if (path === 'files') { const parent = query.q.match(/^'([^']+)'/)![1]; return { files: structuredClone([...this.files.values()].filter(f => f.parents?.includes(parent))) } as T; }
    return structuredClone(this.files.get(id)) as T;
  }
}
const outsider: DrivePermission = { id: 'outsider', type: 'user', emailAddress: 'other@example.test', role: 'writer' };

test('private folders remove broad and other-person access, preserve files and owners, and are repeatable', async () => {
  const d = new FakeDrive(); const root = d.add('person', undefined, true, [outsider, { id: 'public', type: 'anyone', role: 'reader' }]);
  d.add('nested', 'person', true, [outsider]); d.add('ticket', 'nested', false, [outsider]);
  await d.restrict(root, 'person@example.test');
  assert.equal(d.files.size, 3, 'no content deleted');
  assert.equal(d.files.get('person')!.inheritedPermissionsDisabled, true);
  assert.equal(d.files.get('nested')!.inheritedPermissionsDisabled, false, 'nested contents inherit participant access');
  for (const f of d.files.values()) assert.equal(f.writersCanShare, false);
  for (const permissions of d.acl.values()) assert.ok(permissions.every(p => p.role === 'owner' || p.emailAddress === 'person@example.test'));
  assert.equal(d.acl.get('person')!.filter(p => p.emailAddress === 'person@example.test').length, 1);
  await d.restrict(root, 'person@example.test');
  assert.equal(d.acl.get('person')!.filter(p => p.emailAddress === 'person@example.test').length, 1, 'retry does not duplicate permissions');
});

test('email reassignment revokes the previous participant; empty email makes owner-only', async () => {
  const d = new FakeDrive(); const root = d.add('person', undefined, true, [outsider]);
  await d.restrict(root, 'new@example.test');
  assert.ok(!d.acl.get(root.id)!.some(p => p.emailAddress === outsider.emailAddress));
  await d.restrict(root, '');
  assert.deepEqual(d.acl.get(root.id)!.map(p => p.role), ['owner']);
});

test('privacy audit rejects shared child files and ownership problems before expansion', async () => {
  const d = new FakeDrive(); const root = d.add('person'); d.add('ticket', 'person', false);
  await d.restrict(root, 'person@example.test');
  d.acl.get('ticket')!.push(outsider);
  await assert.rejects(() => d.audit(root, 'person@example.test'), /someone other than/);
  const d2 = new FakeDrive(); const r2 = d2.add('person'); d2.add('ticket', 'person', false).ownedByMe = false;
  await assert.rejects(() => d2.restrict(r2, 'person@example.test'), /must own/);
  assert.deepEqual(d2.changes, [], 'ownership preflight occurs before permission changes');
});

test('privacy checks fail closed on shortcuts and unrestricted personal roots', async () => {
  const d = new FakeDrive(); const root = d.add('person');
  await assert.rejects(() => d.audit(root, ''), /Apply private access/);
  d.add('shortcut', 'person', false).mimeType = 'application/vnd.google-apps.shortcut';
  await assert.rejects(() => d.restrict(root, ''), /shortcut/);
  assert.deepEqual(d.changes, []);
});

test('participant input normalizes email and rejects invalid identifiers and addresses', () => {
  assert.equal(drivePersonSchema.parse({ country: ' Tunisia ', name: ' Mokhtar ', email: 'TEST@example.com' }).email, 'test@example.com');
  assert.equal(drivePersonSchema.safeParse({ country: 'Tunisia', name: 'Mokhtar', email: 'invalid' }).success, false);
  assert.equal(drivePersonSchema.safeParse({ folderId: '../other', country: 'Tunisia', name: 'Mokhtar', email: '' }).success, false);
});

test('PHP privacy engine preserves contents, removes outsiders, supports reassignment and rejects unsafe ownership', () => {
  const script = `
require 'php-api/project-drive.php';
class FakeProjectDrive extends ProjectDrive {
 public array $files=[]; public array $acl=[]; public int $changes=0;
 function __construct() {}
 function file(string $id): array{return $this->files[$id];}
 function children(string $id): array{return array_values(array_filter($this->files,fn($f)=>in_array($id,$f['parents'],true)));}
 function permissions(string $id): array{return $this->acl[$id];}
 function api(string $path,string $method='GET',array $query=[],?array $body=null): array {
  $p=explode('/',$path);$id=$p[1];$this->changes++;
  if(($p[2]??'')==='permissions'){
   if($method==='DELETE')$this->acl[$id]=array_values(array_filter($this->acl[$id],fn($a)=>$a['id']!==$p[3]));
   if($method==='POST')$this->acl[$id][]=array_merge($body,['id'=>'assigned']);
   if($method==='PATCH')foreach($this->acl[$id] as &$a)if($a['id']===$p[3])$a=array_merge($a,$body);
  }else $this->files[$id]=array_merge($this->files[$id],$body??[]);
  return [];
 }
}
function check($value){if(!$value)throw new Exception('Privacy test failed');}
$d=new FakeProjectDrive();
foreach(['person','ticket'] as $id){$d->files[$id]=['id'=>$id,'name'=>$id,'mimeType'=>$id==='person'?ProjectDrive::FOLDER:'application/pdf','parents'=>$id==='person'?[]:['person'],'ownedByMe'=>true,'inheritedPermissionsDisabled'=>false,'writersCanShare'=>true];$d->acl[$id]=[['id'=>'owner','role'=>'owner','type'=>'user','emailAddress'=>'owner@example.test'],['id'=>'outsider','role'=>'reader','type'=>'anyone']];}
$d->restrict($d->files['person'],'person@example.test');check(count($d->files)===2);check(count($d->acl['person'])===2);check(count($d->acl['ticket'])===1);check($d->files['person']['inheritedPermissionsDisabled']);
$d->restrict($d->files['person'],'new@example.test');check($d->acl['person'][1]['emailAddress']==='new@example.test');
$d->restrict($d->files['person'],'');check(count($d->acl['person'])===1);
$d->files['ticket']['ownedByMe']=false;$before=$d->changes;$failed=false;try{$d->restrict($d->files['person'],'person@example.test');}catch(RuntimeException $e){$failed=true;}check($failed);check($before===$d->changes);
echo 'PHP privacy verified';
`;
  assert.equal(execFileSync('php', ['-r', script], { encoding: 'utf8' }), 'PHP privacy verified');
});

function fakeDb(assignments: { folder_id: string; email: string }[] = []) {
  return { prepare: (sql: string) => {
    const statement = {
      bind: (..._args: unknown[]) => statement,
      first: async () => sql.includes('countries_folder_id') ? { countries_folder_id: 'countries' } : null,
      all: async () => ({ results: assignments }),
      run: async () => ({}),
    };
    return statement;
  } } as unknown as D1Database;
}

test('country browsing fails before granting any access if a sibling has no privacy assignment', async () => {
  const d = new FakeDrive(); d.add('countries'); d.add('Tunisia', 'countries');
  const one = d.add('one', 'Tunisia'); d.add('two', 'Tunisia');
  await d.restrict(one, 'one@example.test'); d.changes = [];
  const original = GoogleDrive.connect; GoogleDrive.connect = async () => d;
  try {
    await assert.rejects(() => enableCountryBrowsing(fakeDb([{ folder_id: 'one', email: 'one@example.test' }]), {}, 'oasis'), /Apply private access/);
    assert.deepEqual(d.changes, [], 'no parent permission expansion before all personal folders pass');
    await d.restrict(d.files.get('two')!, ''); d.changes = [];
    await enableCountryBrowsing(fakeDb([{ folder_id: 'one', email: 'one@example.test' }, { folder_id: 'two', email: '' }]), {}, 'oasis');
    for (const id of ['countries', 'Tunisia']) assert.equal(d.acl.get(id)!.find(p => p.emailAddress === 'one@example.test')!.role, 'reader');
    assert.equal(d.acl.get('one')!.find(p => p.emailAddress === 'one@example.test')!.role, 'writer');
    assert.deepEqual(d.acl.get('two')!.map(p => p.role), ['owner']);
  } finally { GoogleDrive.connect = original; }
});

test('same-name participant and cross-project folder IDs cannot overwrite an existing folder', async () => {
  const d = new FakeDrive(); d.add('countries'); const country = d.add('Tunisia', 'countries');
  country.name = 'Tunisia'; d.add('existing', 'Tunisia').name = 'ABC';
  d.add('foreign', 'other-country').name = 'ABC';
  const original = GoogleDrive.connect; GoogleDrive.connect = async () => d;
  try {
    await assert.rejects(() => saveDrivePerson(fakeDb(), {}, 'oasis', { country: 'Tunisia', name: 'ABC', email: 'new@example.test' }), /already exists/);
    await assert.rejects(() => saveDrivePerson(fakeDb(), {}, 'oasis', { folderId: 'foreign', country: 'Tunisia', name: 'ABC', email: 'new@example.test' }), /not the selected participant/);
    assert.deepEqual(d.changes, []);
  } finally { GoogleDrive.connect = original; }
});

test('reusable connection accepts project or custom-named Countries folders without modifying Drive', async () => {
  const d = new FakeDrive(); d.add('projectroot'); const countries = d.add('countryroot', 'projectroot'); countries.name = 'Countries';
  d.add('customroot').name = 'Participant documents';
  const saved: unknown[][] = [];
  const db = { prepare: () => {
    let values: unknown[] = [];
    const statement = { bind: (...args: unknown[]) => { values = args; return statement; }, first: async () => null, run: async () => { saved.push(values); return {}; } };
    return statement;
  } } as unknown as D1Database;
  const original = GoogleDrive.connect; GoogleDrive.connect = async () => d;
  try {
    await configureDrive(db, {}, 'future-project', 'https://drive.google.com/drive/folders/projectroot', 'project');
    assert.deepEqual(saved[0], ['future-project', 'countryroot']);
    await configureDrive(db, {}, 'another-project', 'https://drive.google.com/drive/folders/customroot', 'countries');
    assert.deepEqual(saved[1], ['another-project', 'customroot']);
    await assert.rejects(() => configureDrive(db, {}, 'future-project', 'https://drive.google.com/drive/folders/customroot', 'auto'), /No Countries folder/);
    assert.equal(saved.length, 2, 'failed discovery does not change an existing connection');
    assert.deepEqual(d.changes, [], 'connecting never creates folders or changes permissions');
  } finally { GoogleDrive.connect = original; }
});

test('participant rename preserves access and rejects containers, foreign folders and duplicate names', async () => {
  const d = new FakeDrive(); d.add('project', 'my-drive'); d.add('countries', 'project'); d.add('Tunisia', 'countries');
  d.add('person', 'Tunisia'); d.add('sibling', 'Tunisia').name = 'Existing'; d.add('foreign', 'elsewhere');
  const original = GoogleDrive.connect; GoogleDrive.connect = async () => d;
  const permissions = structuredClone([...d.acl]);
  try {
    const renamed = await renameDriveFolder(fakeDb(), {}, 'oasis', 'New participant name', 'person');
    assert.equal(renamed.folderId, 'person'); assert.equal(d.files.get('person')!.name, 'New participant name');
    assert.deepEqual(d.files.get('person')!.parents, ['Tunisia']);
    assert.deepEqual([...d.acl], permissions);
    for (const id of ['countries', 'project', 'Tunisia', 'foreign']) {
      await assert.rejects(() => renameDriveFolder(fakeDb(), {}, 'oasis', 'Wrong', id), /not in this project/);
    }
    await assert.rejects(() => renameDriveFolder(fakeDb(), {}, 'oasis', 'existing', 'person'), /already exists/);
    assert.deepEqual(d.changes, ['PATCH files/person']);
  } finally { GoogleDrive.connect = original; }
});

test('Drive retries temporary failures with increasing delays and stops on success', async () => {
  const waits: number[] = []; let calls = 0;
  const drive = new GoogleDrive('test', (async () => ++calls < 3 ? new Response('{"error":{"errors":[{"reason":"backendError"}]}}', { status: 500 }) : new Response('{"id":"person"}')) as typeof fetch, async ms => { waits.push(ms); });
  assert.deepEqual(await drive.api('files/person', 'PATCH', {}, { writersCanShare: false }), { id: 'person' });
  assert.equal(calls, 3); assert.equal(waits.length, 2);
  assert.ok(waits[0] >= 1000 && waits[0] < 1250); assert.ok(waits[1] >= 2000 && waits[1] < 2250);
});

test('Drive retries are bounded, expose operation and reason, and do not replay creates or access denials', async () => {
  for (const [method, status, count] of [['PATCH', 500, 4], ['POST', 500, 1], ['PATCH', 403, 1]] as const) {
    let calls = 0;
    const drive = new GoogleDrive('secret-token', (async () => { calls++; return new Response('{"error":{"errors":[{"reason":"backendError"}]}}', { status }); }) as typeof fetch, async () => {});
    await assert.rejects(() => drive.api('files/person', method), error => {
      assert.match((error as Error).message, new RegExp(`${method} files/person`));
      assert.match((error as Error).message, /backendError/);
      assert.ok(!(error as Error).message.includes('secret-token')); return true;
    });
    assert.equal(calls, count);
  }
});

test('Drive accepts an already-completed deletion after a transient failure', async () => {
  let calls = 0;
  const drive = new GoogleDrive('test', (async () => new Response('{}', { status: ++calls === 1 ? 500 : 404 })) as typeof fetch, async () => {});
  await drive.api('files/person/permissions/outsider', 'DELETE'); assert.equal(calls, 2);
});

test('privacy settings are updated separately and already-applied settings are skipped', async () => {
  const d = new FakeDrive(); const file = d.add('person');
  const original = d.api.bind(d); const updates: unknown[] = [];
  d.api = async (path, method, query, body) => {
    if (method === 'PATCH') { assert.equal(Object.keys(body ?? {}).length, 1); updates.push(body); }
    return original(path, method, query, body);
  };
  await d.privacySettings(file);
  assert.deepEqual(updates, [{ inheritedPermissionsDisabled: true }, { writersCanShare: false }]);
  await d.privacySettings(file); assert.equal(updates.length, 2);
});
