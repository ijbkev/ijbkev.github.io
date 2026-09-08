<?php
declare(strict_types=1);

function drive_error(string $message): never { throw new RuntimeException($message); }
function drive_equal(string $a,string $b): bool { return mb_strtolower(trim($a))===mb_strtolower(trim($b)); }
function drive_inherited(array $p): bool { return !empty($p['permissionDetails']) && !in_array(false,array_column($p['permissionDetails'],'inherited'),true); }
function drive_credentials(): array {
    $path=getenv('IJBK_GOOGLE_DRIVE_CREDENTIALS') ?: storage_dir().'/google-drive.json';
    $file=is_file($path)?json_decode((string)file_get_contents($path),true):[];
    return ['client_id'=>getenv('GOOGLE_DRIVE_CLIENT_ID')?:($file['client_id']??''),'client_secret'=>getenv('GOOGLE_DRIVE_CLIENT_SECRET')?:($file['client_secret']??''),'refresh_token'=>getenv('GOOGLE_DRIVE_REFRESH_TOKEN')?:($file['refresh_token']??'')];
}
function drive_connected(): bool { $c=drive_credentials();return !in_array('',array_values($c),true); }
function drive_folder(string $project): string { $s=db()->prepare('SELECT countries_folder_id FROM drive_projects WHERE project_id=?');$s->execute([$project]);return $s->fetchColumn()?:((json_decode((string)file_get_contents(__DIR__.'/drive-defaults.json'),true))[$project]??''); }
class ProjectDrive {
    const FOLDER='application/vnd.google-apps.folder';
    const FIELDS='id,name,mimeType,parents,ownedByMe,driveId,inheritedPermissionsDisabled,writersCanShare,trashed';
    private string $token;
    function __construct() {
        if(!drive_connected())drive_error('Google Drive is not connected on this server. Configure the organizer’s Google connection first.');
        $c=drive_credentials();$result=$this->http('https://oauth2.googleapis.com/token','POST',http_build_query(array_merge($c,['grant_type'=>'refresh_token'])),['Content-Type: application/x-www-form-urlencoded']);
        if(empty($result['access_token']))drive_error('The Google connection expired. Reconnect the organizer account.');$this->token=$result['access_token'];
    }
    private function http(string $url,string $method,?string $body,array $headers): array {
        $options=['http'=>['method'=>$method,'header'=>implode("\r\n",$headers),'timeout'=>25,'ignore_errors'=>true,'follow_location'=>0]];if($body!==null)$options['http']['content']=$body;
        for($attempt=0;;$attempt++) {
            $response=@file_get_contents($url,false,stream_context_create($options));$status=0;foreach($http_response_header??[] as $h)if(preg_match('#^HTTP/\S+ (\d+)#',$h,$m))$status=(int)$m[1];
            if($status>=200&&$status<300&&$response!==false)return $response===''?[]:json_decode($response,true,512,JSON_THROW_ON_ERROR);
            if($attempt>0&&$method==='DELETE'&&$status===404)return [];
            $data=$response===false?[]:json_decode($response,true);$reason=$data['error']['errors'][0]['reason']??'';
            $temporary=in_array($status,[429,500,502,503,504],true)||($status===403&&in_array($reason,['rateLimitExceeded','userRateLimitExceeded'],true));
            // Do not replay creates after ambiguous failures: they can duplicate folders.
            if($temporary&&in_array($method,['GET','PATCH','DELETE'],true)&&$attempt<3){usleep((1000*(2**$attempt)+random_int(0,250))*1000);continue;}
            $path=(string)parse_url($url,PHP_URL_PATH);$detail=is_string($reason)&&preg_match('/^[a-zA-Z0-9_]{1,80}$/',$reason)?'; '.$reason:'';
            drive_error('Google Drive failed during '.$method.' '.$path.' ('.$status.$detail.')'.($attempt?' after 3 retries':'').'. Changes may be partial; refresh and retry. '.($temporary?'Google reported a temporary server or rate-limit error.':'Check folder access and the Google connection.'));
        }
    }

    function api(string $path,string $method='GET',array $query=[],?array $body=null): array { return $this->http('https://www.googleapis.com/drive/v3/'.$path.($query?'?'.http_build_query($query):''),$method,$body===null?null:json_encode($body,JSON_THROW_ON_ERROR),['Authorization: Bearer '.$this->token,'Content-Type: application/json']); }
    function file(string $id): array { return $this->api('files/'.rawurlencode($id),'GET',['fields'=>self::FIELDS]); }
    function children(string $id): array {
        $items=[];$token='';do{$q=['q'=>"'".str_replace("'","\\'",$id)."' in parents and trashed = false",'fields'=>'nextPageToken,files('.self::FIELDS.')','pageSize'=>'1000'];if($token)$q['pageToken']=$token;$page=$this->api('files','GET',$q);$items=array_merge($items,$page['files']??[]);$token=$page['nextPageToken']??'';if(count($items)>5000)drive_error('This folder is too large for one operation.');}while($token);return $items;
    }
    function permissions(string $id): array {
        $items=[];$token='';do{$q=['fields'=>'nextPageToken,permissions(id,type,emailAddress,role,view,permissionDetails(inherited))','pageSize'=>'100'];if($token)$q['pageToken']=$token;$page=$this->api('files/'.$id.'/permissions','GET',$q);$items=array_merge($items,$page['permissions']??[]);$token=$page['nextPageToken']??'';}while($token);return $items;
    }
    function owned(array $f): void { if(empty($f['ownedByMe'])||!empty($f['driveId'])||!empty($f['trashed']))drive_error('The connected organizer must own “'.$f['name'].'” in My Drive. No ownership changes will be made.'); }
    function create(string $name,string $parent): array { return $this->api('files','POST',['fields'=>self::FIELDS],['name'=>$name,'parents'=>[$parent],'mimeType'=>self::FOLDER,'inheritedPermissionsDisabled'=>true,'writersCanShare'=>false]); }
    function tree(array $root): array { $out=[];$queue=[$root];$seen=[];while($queue){$f=array_shift($queue);if(isset($seen[$f['id']]))drive_error('Unexpected repeated folder.');$seen[$f['id']]=true;$this->owned($f);if($f['mimeType']==='application/vnd.google-apps.shortcut')drive_error('Remove the shortcut “'.$f['name'].'” before applying privacy; its target may be outside this project.');$out[]=$f;if($f['mimeType']===self::FOLDER)$queue=array_merge($queue,$this->children($f['id']));if(count($out)>500)drive_error('This participant has more than 500 items. Split the privacy update into a smaller folder.');}return $out; }
    function grant(string $id,string $email,string $role): void {
        $match=null;foreach($this->permissions($id) as $p)if($p['type']==='user'&&drive_equal($p['emailAddress']??'',$email)&&empty($p['view'])){$match=$p;break;}
        if(($match['role']??'')==='owner')return;
        if($match){if($match['role']!==$role)$this->api('files/'.$id.'/permissions/'.$match['id'],'PATCH',['fields'=>'id'],['role'=>$role]);}
        else $this->api('files/'.$id.'/permissions','POST',['fields'=>'id','sendNotificationEmail'=>'false'],['type'=>'user','role'=>$role,'emailAddress'=>$email]);
    }
    function privacySettings(array $file): void {
        $current=$this->file($file['id']);
        $settings=$file['mimeType']===self::FOLDER?['inheritedPermissionsDisabled'=>true,'writersCanShare'=>false]:['writersCanShare'=>false];
        foreach($settings as $key=>$value){
            if(array_key_exists($key,$current)&&$current[$key]===$value)continue;
            try{$this->api('files/'.$file['id'],'PATCH',['fields'=>'id'],[$key=>$value]);}
            catch(RuntimeException $e){drive_error('Could not update '.$key.' for “'.$file['name'].'”. '.$e->getMessage());}
        }
    }
    function restrict(array $root,string $email): void {
        $tree=$this->tree($root);
        foreach($tree as $f){$this->privacySettings($f);
            foreach($this->permissions($f['id']) as $p){if($p['role']==='owner'||($p['view']??'')==='metadata'||drive_inherited($p))continue;if($p['type']==='user'&&$email&&drive_equal($p['emailAddress']??'',$email)){if($p['role']!=='writer')$this->api('files/'.$f['id'].'/permissions/'.$p['id'],'PATCH',['fields'=>'id'],['role'=>'writer']);continue;}$this->api('files/'.$f['id'].'/permissions/'.$p['id'],'DELETE');}}
        foreach(array_slice($tree,1) as $f)if($f['mimeType']===self::FOLDER)$this->api('files/'.$f['id'],'PATCH',['fields'=>'id'],['inheritedPermissionsDisabled'=>false]);
        if($email)$this->grant($root['id'],$email,'writer');$this->audit($root,$email);
    }
    function audit(array $root,string $email): void {
        $actual=$this->file($root['id']);if(empty($actual['inheritedPermissionsDisabled'])||($actual['writersCanShare']??true)!==false)drive_error('Apply private access to “'.$root['name'].'” first.');
        foreach($this->tree($actual) as $f){if(($f['writersCanShare']??true)!==false)drive_error('Sharing is still enabled on “'.$f['name'].'”. Apply private access again.');foreach($this->permissions($f['id']) as $p){if($p['role']==='owner'||($p['view']??'')==='metadata')continue;if(!($p['type']==='user'&&$email&&drive_equal($p['emailAddress']??'',$email)&&$p['role']==='writer'))drive_error('“'.$f['name'].'” still has access for someone other than its assigned participant. Apply private access again.');}}
        if($email){$found=false;foreach($this->permissions($root['id']) as $p)if(drive_equal($p['emailAddress']??'',$email)&&$p['role']==='writer'&&empty($p['view']))$found=true;if(!$found)drive_error('Participant access could not be verified.');}
    }
}
function drive_single(array $files,string $name): ?array { $matches=array_values(array_filter($files,fn($f)=>drive_equal($f['name'],$name)));if(count($matches)>1)drive_error('More than one folder is named “'.$name.'”. Select its existing row instead.');return $matches[0]??null; }
function drive_folders(array $files): array { return array_values(array_filter($files,fn($f)=>$f['mimeType']===ProjectDrive::FOLDER)); }
function drive_dashboard(string $project): array {
    $id=drive_folder($project);$base=['configured'=>(bool)$id,'connected'=>drive_connected(),'countriesFolderId'=>$id,'participants'=>[],'countries'=>[]];if(!$id||!$base['connected'])return $base;
    $d=new ProjectDrive();$root=$d->file($id);$d->owned($root);$base['countriesFolderName']=$root['name'];$parent=drive_project_folder($d,$root);if($parent)$base['projectFolder']=['id'=>$parent['id'],'name'=>$parent['name']];$countries=drive_folders($d->children($id));$s=db()->prepare('SELECT * FROM drive_participants WHERE project_id=?');$s->execute([$project]);$saved=[];foreach($s->fetchAll() as $r)$saved[$r['folder_id']]=$r;
    foreach($countries as $country){$base['countries'][]=['id'=>$country['id'],'name'=>$country['name']];foreach(drive_folders($d->children($country['id'])) as $f){$row=$saved[$f['id']]??[];$emails=[];foreach($d->permissions($f['id']) as $p)if($p['type']==='user'&&$p['role']!=='owner'&&empty($p['view'])&&!drive_inherited($p)&&!empty($p['emailAddress']))$emails[]=$p['emailAddress'];$base['participants'][]=['folderId'=>$f['id'],'countryId'=>$country['id'],'country'=>$country['name'],'name'=>$f['name'],'email'=>$row['email']??'','status'=>$row['status']??'Needs privacy setup','existingEmails'=>$emails];}}
    usort($base['participants'],fn($a,$b)=>strcmp($a['country'],$b['country'])?:strcmp($a['name'],$b['name']));return $base;
}
function drive_configure(string $project,string $link,string $folderType='auto'): array {
    if(!in_array($folderType,['auto','project','countries'],true))drive_error('Choose a valid folder type.');
    if(!preg_match('#^https://drive\.google\.com/drive/folders/([\w-]+)(?:[/?\#].*)?$#',$link,$m)&&!preg_match('/^([\w-]{10,})$/',$link,$m))drive_error('Enter a Google Drive folder link.');
    $d=new ProjectDrive();$f=$d->file($m[1]);$d->owned($f);if($f['mimeType']!==ProjectDrive::FOLDER)drive_error('Choose a folder.');
    if($folderType==='project'||($folderType==='auto'&&!drive_equal($f['name'],'Countries'))){$child=drive_single(drive_folders($d->children($f['id'])),'Countries');if(!$child)drive_error('No Countries folder was found inside this project folder. If the selected folder already contains the countries, choose Countries folder as the link type.');$f=$d->file($child['id']);$d->owned($f);}
    foreach(json_decode((string)file_get_contents(__DIR__.'/drive-defaults.json'),true) as $p=>$id)if($p!==$project&&$id===$f['id'])drive_error('This Countries folder belongs to another project.');
    $s=db()->prepare('SELECT project_id FROM drive_projects WHERE countries_folder_id=? AND project_id<>?');$s->execute([$f['id'],$project]);if($s->fetch())drive_error('This Countries folder is already assigned to another project.');
    db()->prepare('INSERT INTO drive_projects(project_id,countries_folder_id) VALUES(?,?) ON CONFLICT(project_id) DO UPDATE SET countries_folder_id=excluded.countries_folder_id')->execute([$project,$f['id']]);return ['ok'=>true];
}
function drive_save_person(string $project,array $input): array {
    $countryName=trim((string)($input['country']??''));$name=trim((string)($input['name']??''));$email=mb_strtolower(trim((string)($input['email']??'')));$folderId=$input['folderId']??'';
    if(!$countryName||mb_strlen($countryName)>80||!$name||mb_strlen($name)>160||strlen($email)>254||($email&&!filter_var($email,FILTER_VALIDATE_EMAIL))||($folderId&&!preg_match('/^[\w-]+$/',$folderId)))drive_error('Enter a valid country, name and email.');
    $rootId=drive_folder($project);if(!$rootId)drive_error('Configure the project Countries folder first.');$d=new ProjectDrive();$d->owned($d->file($rootId));$countries=drive_folders($d->children($rootId));$country=null;$folder=null;
    if($folderId){$folder=$d->file($folderId);foreach($countries as $c)if(in_array($c['id'],$folder['parents']??[],true))$country=$c;if(!$country||$folder['mimeType']!==ProjectDrive::FOLDER||!drive_equal($country['name'],$countryName)||!drive_equal($folder['name'],$name))drive_error('That folder is not the selected participant in this project. Refresh the list.');}
    else {if(!$email)drive_error('Enter an email for a new participant.');$country=drive_single($countries,$countryName);if(!$country)$country=$d->create($countryName,$rootId);$d->owned($country);$s=db()->prepare('SELECT folder_id FROM drive_participants WHERE project_id=? AND country_id=? AND email=?');$s->execute([$project,$country['id'],$email]);$identity=$s->fetchColumn();$children=drive_folders($d->children($country['id']));if($identity)foreach($children as $f)if($f['id']===$identity)$folder=$f;if(!$folder&&drive_single($children,$name))drive_error('This name already exists. Assign the email using its existing folder row; it will not be overwritten.');if(!$folder)$folder=$d->create($name,$country['id']);}
    $d->owned($country);$d->owned($folder);if($email){$s=db()->prepare('SELECT folder_id FROM drive_participants WHERE project_id=? AND country_id=? AND email=? AND folder_id<>?');$s->execute([$project,$country['id'],$email,$folder['id']]);if($s->fetch())drive_error('This email already has a folder in this country. Update that row instead.');}
    db()->prepare("INSERT INTO drive_participants(folder_id,project_id,country_id,country,name,email,status) VALUES(?,?,?,?,?,?,'Needs privacy setup') ON CONFLICT(folder_id) DO UPDATE SET email=excluded.email,status=excluded.status,country=excluded.country,name=excluded.name")->execute([$folder['id'],$project,$country['id'],$country['name'],$folder['name'],$email]);
    $d->restrict($folder,$email);db()->prepare('UPDATE drive_participants SET status=? WHERE folder_id=?')->execute([$email?'Private access applied':'Owner only',$folder['id']]);return ['ok'=>true,'folderId'=>$folder['id']];
}
function drive_browsing(string $project): array {
    $rootId=drive_folder($project);if(!$rootId)drive_error('Configure Countries first.');$d=new ProjectDrive();$root=$d->file($rootId);$d->owned($root);$countries=$d->children($rootId);if(count(drive_folders($countries))!==count($countries))drive_error('Move loose files out of Countries before enabling browsing.');
    $s=db()->prepare('SELECT folder_id,email FROM drive_participants WHERE project_id=?');$s->execute([$project]);$assignments=[];foreach($s->fetchAll() as $r)$assignments[$r['folder_id']]=$r['email'];$emails=[];
    foreach($countries as $country){$d->owned($country);$folders=$d->children($country['id']);if(count(drive_folders($folders))!==count($folders))drive_error('Move loose files out of '.$country['name'].' before enabling browsing.');foreach($folders as $f){if(!array_key_exists($f['id'],$assignments))drive_error('Apply private access to '.$country['name'].' / '.$f['name'].' first (leave email empty for owner-only access).');$email=$assignments[$f['id']];$d->audit($f,$email);if($email)$emails[$email]=true;}}
    foreach(array_merge([$root],$countries) as $c){$d->privacySettings($c);foreach($d->permissions($c['id']) as $p)if($p['role']!=='owner'&&($p['view']??'')!=='metadata'&&!drive_inherited($p))$d->api('files/'.$c['id'].'/permissions/'.$p['id'],'DELETE');}
    foreach(array_keys($emails) as $email){$d->grant($rootId,$email,'reader');foreach($countries as $c)$d->grant($c['id'],$email,'reader');}return ['ok'=>true,'participants'=>count($emails)];
}
function drive_locked(callable $action): array {
    $lock=fopen(storage_dir().'/drive.lock','c');if(!$lock||!flock($lock,LOCK_EX|LOCK_NB))drive_error('Another Drive update is in progress. Wait for it to finish.');
    try{return $action();}finally{flock($lock,LOCK_UN);fclose($lock);}
}

function drive_project_folder(ProjectDrive $d,array $root): ?array {
    if(count($root['parents']??[])!==1)return null;
    $parent=$d->file($root['parents'][0]);
    return $parent['mimeType']===ProjectDrive::FOLDER&&!empty($parent['ownedByMe'])&&empty($parent['driveId'])&&!empty($parent['parents'])?$parent:null;
}
function drive_rename(string $project,array $input): array {
    $name=trim((string)($input['name']??''));$folderId=(string)($input['folderId']??'');
    if(!$name||mb_strlen($name)>160||!preg_match('/^[\w-]+$/',$folderId))drive_error('Enter a participant name and select their folder.');
    $id=drive_folder($project);if(!$id)drive_error('Connect a Drive folder first.');
    $d=new ProjectDrive();$root=$d->file($id);$d->owned($root);$folder=$d->file($folderId);$country=null;
    foreach(drive_folders($d->children($id)) as $c)if(in_array($c['id'],$folder['parents']??[],true))$country=$c;
    if(!$country||$folder['mimeType']!==ProjectDrive::FOLDER)drive_error('That participant folder is not in this project. Refresh the list.');
    $d->owned($country);$d->owned($folder);
    foreach(drive_folders($d->children($country['id'])) as $f)if($f['id']!==$folderId&&drive_equal($f['name'],$name))drive_error('A participant folder with this name already exists in this country.');
    $d->api('files/'.$folderId,'PATCH',['fields'=>'id,name'],['name'=>$name]);
    db()->prepare('UPDATE drive_participants SET name=? WHERE folder_id=? AND project_id=?')->execute([$name,$folderId,$project]);
    return ['ok'=>true,'name'=>$name,'folderId'=>$folderId];
}
