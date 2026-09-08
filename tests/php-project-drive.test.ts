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

