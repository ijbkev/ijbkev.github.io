import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { drivePersonSchema } from '../shared/project-drive';

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


test('PHP folder creation reuses a reserved ID after a server error and recovers a conflict', () => {
  const result = execFileSync('php', ['-r', `
    $posts = []; $changes = [];
    $file = ['id'=>'reserved','name'=>'Mila Živković','parents'=>['my-drive'],'mimeType'=>'application/vnd.google-apps.folder','ownedByMe'=>true];
    function test_drive_http($url, $unused, $context, &$headers) {
      global $posts, $file, $changes;
      $request = stream_context_get_options($context)['http']; $status = 200;
      if (str_contains($url, 'files/root')) $data = ['id'=>'my-drive'];
      elseif (str_contains($url, 'permissions')) $data = ['permissions'=>[['id'=>'owner','type'=>'user','role'=>'owner']]];
      elseif (str_contains($url, 'pageSize')) $data = ['files'=>[]];
      elseif (str_contains($url, 'generateIds')) $data = ['ids'=>['reserved']];
      elseif ($request['method'] === 'POST') {
        $posts[] = json_decode($request['content'], true);
        $status = count($posts) === 1 ? 500 : 409;
        $data = ['error'=>['errors'=>[['reason'=>'internalError']]]];
      } elseif ($request['method'] === 'PATCH') {
        if (str_contains($url, 'addParents')) {
          if (empty($file['inheritedPermissionsDisabled']) || $file['writersCanShare'] !== false) throw new RuntimeException('Moved before private');
          $file['parents'] = ['serbia']; $changes[] = 'move';
        } else { $body=json_decode($request['content'],true); $changes[]=array_key_first($body); $file=array_merge($file,$body); }
        $data=$file;
      } else $data = $file;
      $headers = ['HTTP/1.1 '.$status.' Test']; return json_encode($data);
    }
    $source = file_get_contents('php-api/project-drive.php');
    $source = str_replace('@file_get_contents($url,false,stream_context_create($options))', 'test_drive_http($url,false,stream_context_create($options),$http_response_header)', $source);
    eval(substr($source, 5));
    $reflection = new ReflectionClass(ProjectDrive::class);
    $drive = $reflection->newInstanceWithoutConstructor();
    $reflection->getProperty('token')->setValue($drive, 'test');
    $folder = $drive->create('Mila Živković', 'serbia');
    echo json_encode(['folder'=>$folder,'posts'=>$posts,'changes'=>$changes]);
  `], { encoding: 'utf8' });
  const data = JSON.parse(result);
  assert.equal(data.folder.id, 'reserved');
  assert.equal(data.folder.name, 'Mila Živković');
  assert.equal(data.posts.length, 2);
  assert.deepEqual(data.posts[0], data.posts[1]);
  assert.equal(data.posts[0].id, 'reserved');
  assert.equal(data.posts[0].inheritedPermissionsDisabled, undefined);
  assert.equal(data.posts[0].parents, undefined);
  assert.deepEqual(data.changes, ['inheritedPermissionsDisabled', 'writersCanShare', 'move']);
});

test('limited-access metadata permission is upgraded instead of creating a duplicate share', () => {
  const result = execFileSync('php', ['-r', `
    require 'php-api/project-drive.php';
    class MetadataDrive extends ProjectDrive {
      public array $calls=[];
      function __construct() {}
      function permissions(string $id): array { return [
        ['id'=>'inherited-person','type'=>'user','emailAddress'=>'person@example.test','role'=>'reader','view'=>'metadata','permissionDetails'=>[['inherited'=>true]]]
      ]; }
      function api(string $path,string $method='GET',array $query=[],?array $body=null): array {
        $this->calls[]=[$path,$method,$body]; return [];
      }
    }
    $d=new MetadataDrive();
    $d->grant('folder','person@example.test','writer');
    $d->grant('folder','person@example.test','reader');
    echo json_encode($d->calls);
  `], { encoding: 'utf8' });
  assert.deepEqual(JSON.parse(result), [
    ['files/folder/permissions/inherited-person', 'PATCH', { role: 'writer' }],
    ['files/folder/permissions/inherited-person', 'PATCH', { role: 'reader' }],
  ]);
});

test('existing-folder save persists ownership failures and clears them after a successful retry', () => {
  const result = execFileSync('php', ['-r', `
    function db(): PDO {
      static $db;
      if (!$db) {
        $db=new PDO('sqlite::memory:',null,null,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
        $db->exec("CREATE TABLE drive_projects(project_id TEXT,countries_folder_id TEXT); INSERT INTO drive_projects VALUES('test','countries');");
        $db->exec("CREATE TABLE drive_participants(folder_id TEXT PRIMARY KEY,project_id TEXT,country_id TEXT,country TEXT,name TEXT,email TEXT,status TEXT,privacy_error TEXT NOT NULL DEFAULT '')");
      }
      return $db;
    }
    $source=file_get_contents('php-api/project-drive.php');
    eval(substr(str_replace('new ProjectDrive()','new ExistingFolderDrive()',$source),5));
    class ExistingFolderDrive extends ProjectDrive {
      static bool $foreignFolder=true;
      static bool $foreignChild=true;
      static int $changes=0;
      public array $files=[];
      function __construct() {
        foreach(['countries','country','person','ticket'] as $i=>$id) {
          $this->files[$id]=['id'=>$id,'name'=>$id,'mimeType'=>$id==='ticket'?'application/pdf':self::FOLDER,'parents'=>$i?[['countries','country','person'][$i-1]]:[], 'ownedByMe'=>!($id==='person'&&self::$foreignFolder)&&!($id==='ticket'&&self::$foreignChild),'writersCanShare'=>true,'inheritedPermissionsDisabled'=>false];
        }
      }
      function file(string $id): array {return $this->files[$id];}
      function children(string $id): array {return array_values(array_filter($this->files,fn($f)=>in_array($id,$f['parents'],true)));}
      function permissions(string $id): array {return [['id'=>'owner','type'=>'user','role'=>'owner']];}
      function api(string $path,string $method='GET',array $query=[],?array $body=null): array {
        self::$changes++;
        $id=explode('/',$path)[1];$this->files[$id]=array_merge($this->files[$id],$body??[]);return [];
      }
    }
    $input=['folderId'=>'person','name'=>'person','country'=>'country','email'=>''];
    $out=[];
    foreach([true,false] as $foreignFolder) {
      ExistingFolderDrive::$foreignFolder=$foreignFolder;
      try {drive_save_person('test',$input);throw new Exception('Expected ownership failure');}
      catch(RuntimeException $e) {$out[]=db()->query('SELECT status,privacy_error FROM drive_participants')->fetch();}
    }
    $out[]=['changesBeforeRetry'=>ExistingFolderDrive::$changes];
    ExistingFolderDrive::$foreignChild=false;
    $out[]=drive_save_person('test',$input);
    $out[]=db()->query('SELECT status,privacy_error FROM drive_participants')->fetch();
    echo json_encode($out);
  `], { encoding: 'utf8' });
  const [folderFailure, childFailure, before, saved, final] = JSON.parse(result);
  assert.equal(folderFailure.status, 'Privacy setup failed');
  assert.match(folderFailure.privacy_error, /must own “person”/);
  assert.equal(childFailure.status, 'Privacy setup failed');
  assert.match(childFailure.privacy_error, /must own “ticket”/);
  assert.equal(before.changesBeforeRetry, 0);
  assert.equal(saved.ok, true);
  assert.deepEqual(final, { status: 'Owner only', privacy_error: '' });
});

test('re-uploaded folders release stale email assignments but preserve live conflicts and failed listings', () => {
  const result = execFileSync('php', ['-r', `
    function db(): PDO {
      static $db;
      if (!$db) {
        $db=new PDO('sqlite::memory:',null,null,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
        $db->exec("CREATE TABLE drive_projects(project_id TEXT,countries_folder_id TEXT); INSERT INTO drive_projects VALUES('test','countries');");
        $db->exec("CREATE TABLE drive_participants(folder_id TEXT PRIMARY KEY,project_id TEXT,country_id TEXT,country TEXT,name TEXT,email TEXT,status TEXT,privacy_error TEXT NOT NULL DEFAULT '')");
        $db->exec("CREATE UNIQUE INDEX identity ON drive_participants(project_id,country_id,email) WHERE email<>''");
      }
      return $db;
    }
    $source=file_get_contents('php-api/project-drive.php');
    eval(substr(str_replace('new ProjectDrive()','new ReuploadDrive()',$source),5));
    class ReuploadDrive extends ProjectDrive {
      static string $mode='deleted';
      static array $restricted=[];
      static ?string $created=null;
      function __construct() {}
      function file(string $id): array {return ['id'=>$id,'name'=>$id,'mimeType'=>self::FOLDER,'ownedByMe'=>true,'parents'=>[$id==='countries'?'root':($id==='Germany'?'countries':'Germany')]];}
      function children(string $id): array {
        if($id==='countries')return [$this->file('Germany')];
        if(self::$mode==='failure')throw new RuntimeException('Listing failed');
        $files=[$this->file('new')];
        if(self::$created)$files[]=$this->file(self::$created);
        if(self::$mode==='live')$files[]=$this->file('old');
        return $files;
      }
      function restrict(array $root,string $email,bool $notifyParticipant=false,string $emailMessage=''): void {self::$restricted[]=[$root['id'],$email];}
      function create(string $name,string $parent): array {self::$created=$name;return $this->file($name);}
    }
    $out=[];
    foreach(['live','failure','deleted','create'] as $mode){
      ReuploadDrive::$mode=$mode;ReuploadDrive::$restricted=[];ReuploadDrive::$created=null;
      db()->exec('DELETE FROM drive_participants');
      db()->exec("INSERT INTO drive_participants VALUES('old','test','Germany','Germany','old','person@example.test','Private access applied','')");
      db()->exec("INSERT INTO drive_participants VALUES('other','other-project','Germany','Germany','other','person@example.test','Private access applied','')");
      $input=['name'=>$mode==='create'?'created':'new','country'=>'Germany','email'=>'PERSON@example.test'];
      if($mode!=='create')$input['folderId']='new';
      // Simulate the newly created folder appearing in the fresh country listing.
      if($mode==='create')$input['name']='new-created';
      try{$saved=drive_save_person('test',$input);$error='';}catch(RuntimeException $e){$saved=null;$error=$e->getMessage();}
      $out[$mode]=['saved'=>$saved,'error'=>$error,'rows'=>db()->query('SELECT folder_id,project_id,email FROM drive_participants ORDER BY folder_id')->fetchAll(),'restricted'=>ReuploadDrive::$restricted];
    }
    echo json_encode($out);
  `], { encoding: 'utf8' });
  const data = JSON.parse(result);
  assert.match(data.live.error, /already has a folder/);
  assert.equal(data.failure.error, 'Listing failed');
  for (const mode of ['live', 'failure']) {
    assert.deepEqual(data[mode].rows.map((row: { folder_id: string }) => row.folder_id), ['old', 'other']);
    assert.deepEqual(data[mode].restricted, []);
  }
  assert.equal(data.deleted.saved.ok, true);
  assert.deepEqual(data.deleted.rows, [
    { folder_id: 'new', project_id: 'test', email: 'person@example.test' },
    { folder_id: 'other', project_id: 'other-project', email: 'person@example.test' },
  ]);
  assert.deepEqual(data.deleted.restricted, [['new', 'person@example.test']]);
  assert.equal(data.create.saved.folderId, 'new-created');
  assert.deepEqual(data.create.rows.map((row: { folder_id: string }) => row.folder_id), ['new-created', 'other']);
});

test('ownership errors identify the uploader-owned item and distinguish trash and shared drives', () => {
  const result = execFileSync('php', ['-r', `
    require 'php-api/project-drive.php';
    $d=(new ReflectionClass(ProjectDrive::class))->newInstanceWithoutConstructor();
    $out=[];
    foreach([
      ['name'=>'ticket.pdf','mimeType'=>'application/pdf','ownedByMe'=>false,'owners'=>[['emailAddress'=>'editor@example.test']]],
      ['name'=>'Arcangelo','mimeType'=>ProjectDrive::FOLDER,'ownedByMe'=>false,'owners'=>[['displayName'=>'Team editor']]],
      ['name'=>'deleted','ownedByMe'=>true,'trashed'=>true],
      ['name'=>'shared','driveId'=>'shared-drive']
    ] as $file){try{$d->owned($file);}catch(RuntimeException $e){$out[]=$e->getMessage();}}
    $d->owned(['name'=>'mine','ownedByMe'=>true]);
    echo json_encode($out);
  `], { encoding: 'utf8' });
  const errors = JSON.parse(result);
  assert.match(errors[0], /This file is owned by another Google account/);
  assert.match(errors[0], /editor@example.test/);
  assert.match(errors[1], /This folder is owned by another Google account/);
  assert.match(errors[1], /Team editor/);
  assert.match(errors[1], /app is connected to your Google account/);
  assert.match(errors[2], /in the trash/);
  assert.match(errors[3], /shared drive/);
});
