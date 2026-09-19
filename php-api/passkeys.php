<?php
declare(strict_types=1);
require_once __DIR__.'/vendor/autoload.php';

function passkey_stamp(): string { return hash('sha256',IJBK_ADMIN_PASSWORD_HASH); }
function passkey_user(): string { return hash('sha256','IJBK administrator',true); }
function passkey_encode(string $value): string { return rtrim(strtr(base64_encode($value),'+/','-_'),'='); }
function passkey_decode(mixed $value): string {
    if(!is_string($value)||$value===''||strlen($value)>100000||!preg_match('/^[A-Za-z0-9_-]+$/D',$value))fail('Invalid passkey response.',422);
    $decoded=base64_decode(strtr($value,'-_','+/'),true);
    if($decoded===false||passkey_encode($decoded)!==$value)fail('Invalid passkey response.',422);
    return $decoded;
}
function passkey_origin(): string {
    $host=strtolower($_SERVER['HTTP_HOST']??'');
    if(!preg_match('/^[a-z0-9.-]+(?::[0-9]+)?$/D',$host))fail('Invalid website address.',400);
    $hostname=explode(':',$host)[0];
    if(!request_is_https()&&$hostname!=='localhost')fail('Passkeys require HTTPS. For local testing, use localhost.',400);
    return (request_is_https()?'https':'http').'://'.$host;
}
function passkey_password(array $body): void {
    rate_limit('passkey-password',8);
    $password=$body['password']??null;
    if(!is_string($password)||strlen($password)>128||!verify_secret($password,IJBK_ADMIN_PASSWORD_HASH))fail('Confirm your administrator password to manage passkeys.',401);
}
function passkey_challenge(string $kind,string $challenge,string $origin,?string $adminHash,string $label=''): void {
    $token=bin2hex(random_bytes(32));
    db()->prepare('DELETE FROM admin_passkey_challenges WHERE expires_at<?')->execute([time()]);
    db()->prepare('INSERT INTO admin_passkey_challenges(token_hash,kind,challenge,origin,admin_hash,label,password_stamp,expires_at)VALUES(?,?,?,?,?,?,?,?)')->execute([hash('sha256',$token),$kind,passkey_encode($challenge),$origin,$adminHash,$label,passkey_stamp(),time()+300]);
    setcookie('ijbk_passkey_'.$kind,$token,['expires'=>time()+300,'path'=>'/api','secure'=>request_is_https(),'httponly'=>true,'samesite'=>'Strict']);
}
function passkey_consume(string $kind,string $origin,?string $adminHash): array {
    $token=$_COOKIE['ijbk_passkey_'.$kind]??'';
    if(!is_string($token)||!preg_match('/^[a-f0-9]{64}$/D',$token))fail('Passkey request expired. Please try again.',401);
    // Consume atomically before validating the response, including failed attempts.
    db()->exec('BEGIN IMMEDIATE');
    $stmt=db()->prepare('SELECT * FROM admin_passkey_challenges WHERE token_hash=?');$stmt->execute([hash('sha256',$token)]);$row=$stmt->fetch();
    db()->prepare('DELETE FROM admin_passkey_challenges WHERE token_hash=?')->execute([hash('sha256',$token)]);db()->exec('COMMIT');
    setcookie('ijbk_passkey_'.$kind,'',['expires'=>time()-3600,'path'=>'/api','secure'=>request_is_https(),'httponly'=>true,'samesite'=>'Strict']);
    if(!$row||$row['kind']!==$kind||$row['origin']!==$origin||$row['admin_hash']!==$adminHash||(int)$row['expires_at']<time()||!hash_equals(passkey_stamp(),$row['password_stamp']))fail('Passkey request expired. Please try again.',401);
    return $row;
}
function passkey_client(array $body,string $origin): string {
    if(($body['type']??'')!=='public-key')fail('Invalid passkey response.',422);
    $raw=passkey_decode($body['clientDataJSON']??null);
    $client=json_decode($raw,true);
    // Enforce the exact origin, beyond the library's relying-party suffix check.
    if(!is_array($client)||($client['origin']??'')!==$origin||($client['crossOrigin']??false)!==false||isset($client['topOrigin']))fail('Passkey website verification failed.',401);
    return $raw;
}
function passkey_routes(string $method,string $path): never {
    $login=in_array($path,['/admin/passkeys/login/options','/admin/passkeys/login/verify'],true);
    $adminHash=$login?null:require_session();
    $origin=passkey_origin();$rp=parse_url($origin,PHP_URL_HOST);
    $webAuthn=new \lbuchs\WebAuthn\WebAuthn('IJBK Admin',$rp,['none'],true);
    db()->exec('CREATE TABLE IF NOT EXISTS admin_passkeys (id TEXT PRIMARY KEY, public_key TEXT NOT NULL, counter INTEGER NOT NULL, label TEXT NOT NULL, rp_id TEXT NOT NULL, password_stamp TEXT NOT NULL, created_at TEXT NOT NULL, last_used_at TEXT)');
    db()->exec('CREATE TABLE IF NOT EXISTS admin_passkey_challenges (token_hash TEXT PRIMARY KEY, kind TEXT NOT NULL, challenge TEXT NOT NULL, origin TEXT NOT NULL, admin_hash TEXT, label TEXT NOT NULL, password_stamp TEXT NOT NULL, expires_at INTEGER NOT NULL)');
    if($method==='GET'&&$path==='/admin/passkeys') {
        $stmt=db()->prepare('SELECT id,label,created_at,last_used_at FROM admin_passkeys WHERE rp_id=? AND password_stamp=? ORDER BY created_at');$stmt->execute([$rp,passkey_stamp()]);respond(['passkeys'=>$stmt->fetchAll()]);
    }
    if($method==='POST'&&$path==='/admin/passkeys/register/options') {
        $body=request_json();passkey_password($body);$label=text_value($body['label']??null,'passkey name',80);
        $stmt=db()->prepare('SELECT id FROM admin_passkeys WHERE rp_id=? AND password_stamp=?');$stmt->execute([$rp,passkey_stamp()]);$ids=$stmt->fetchAll(PDO::FETCH_COLUMN);
        if(count($ids)>=20)fail('Remove an unused passkey before adding another.',422);
        $args=$webAuthn->getCreateArgs(passkey_user(),'admin','IJBK Administrator',120,true,true,null,array_map('passkey_decode',$ids));
        passkey_challenge('register',$webAuthn->getChallenge()->getBinaryString(),$origin,$adminHash,$label);respond((array)$args);
    }
    if($method==='POST'&&$path==='/admin/passkeys/login/options') {
        rate_limit('passkey-login-options',30);
        $args=$webAuthn->getGetArgs([],120,true,true,true,true,true,true);
        passkey_challenge('login',$webAuthn->getChallenge()->getBinaryString(),$origin,null);respond((array)$args);
    }
    if($method==='POST'&&$path==='/admin/passkeys/register/verify') {
        $challenge=passkey_consume('register',$origin,$adminHash);$body=request_json();$client=passkey_client($body,$origin);
        try {$data=$webAuthn->processCreate($client,passkey_decode($body['attestationObject']??null),passkey_decode($challenge['challenge']),true,true);}
        catch(\lbuchs\WebAuthn\WebAuthnException $e){fail('Could not verify this passkey. Please try registering again.',401);}
        $id=passkey_encode($data->credentialId);
        if($id!==($body['id']??null))fail('Invalid passkey identifier.',422);
        $stmt=db()->prepare('INSERT OR IGNORE INTO admin_passkeys(id,public_key,counter,label,rp_id,password_stamp,created_at)VALUES(?,?,?,?,?,?,?)');
        $stmt->execute([$id,$data->credentialPublicKey,$data->signatureCounter??0,$challenge['label'],$rp,passkey_stamp(),gmdate('c')]);
        if(!$stmt->rowCount())fail('This passkey is already registered.',409);
        respond(['ok'=>true]);
    }
    if($method==='POST'&&$path==='/admin/passkeys/login/verify') {
        rate_limit('passkey-login-verify',20);
        $challenge=passkey_consume('login',$origin,null);$body=request_json();$client=passkey_client($body,$origin);
        $id=passkey_encode(passkey_decode($body['id']??null));
        if(!hash_equals(passkey_user(),passkey_decode($body['userHandle']??null)))fail('Passkey sign-in failed. Use a registered admin passkey.',401);
        db()->exec('BEGIN IMMEDIATE');
        try {
            $stmt=db()->prepare('SELECT * FROM admin_passkeys WHERE id=? AND rp_id=? AND password_stamp=?');$stmt->execute([$id,$rp,passkey_stamp()]);$saved=$stmt->fetch();
            if(!$saved){db()->exec('ROLLBACK');fail('Passkey sign-in failed. Use a registered admin passkey.',401);}
            $webAuthn->processGet($client,passkey_decode($body['authenticatorData']??null),passkey_decode($body['signature']??null),$saved['public_key'],passkey_decode($challenge['challenge']),(int)$saved['counter'],true,true);
            db()->prepare('UPDATE admin_passkeys SET counter=?,last_used_at=? WHERE id=?')->execute([$webAuthn->getSignatureCounter()??0,gmdate('c'),$id]);
            new_session('admin');db()->exec('COMMIT');
        } catch(\lbuchs\WebAuthn\WebAuthnException $e){db()->exec('ROLLBACK');fail('Passkey sign-in failed. Please try again or use your password.',401);}
        respond(['ok'=>true]);
    }
    if($method==='POST'&&$path==='/admin/passkeys/remove') {
        $body=request_json();passkey_password($body);$id=passkey_encode(passkey_decode($body['id']??null));
        db()->prepare('DELETE FROM admin_passkeys WHERE id=? AND rp_id=?')->execute([$id,$rp]);respond(['ok'=>true]);
    }
    fail('Endpoint not found.',404);
}
