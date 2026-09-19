<?php
declare(strict_types=1);
$root=dirname(__DIR__);
$path=parse_url($_SERVER['REQUEST_URI']??'/',PHP_URL_PATH)?:'/';
// Serve the standalone Secret Friend game through PHP in both local modes.
if ($path === '/secret-friend') {
    header('Location: '.$path.'/'); return;
}
if (str_starts_with($path, '/secret-friend/')) {
    if (!defined('IJBK_ADMIN_PASSWORD_HASH') && is_file($root.'/.local/server.env')) {
        $mainAdminEnv=parse_ini_file($root.'/.local/server.env',false,INI_SCANNER_RAW);
        if (!empty($mainAdminEnv['ADMIN_PASSWORD_HASH'])) define('IJBK_ADMIN_PASSWORD_HASH',$mainAdminEnv['ADMIN_PASSWORD_HASH']);
    }
    // Local-only installer configuration; never bundled into the deployed app.
    if (PHP_SAPI === 'cli-server' && !getenv('SECRET_FRIEND_INSTALL_TOKEN')) {
        $tokenFile=$root.'/.local/secret-friend-install-token';
        if (is_file($tokenFile)) putenv('SECRET_FRIEND_INSTALL_TOKEN='.trim(file_get_contents($tokenFile)));
    }
    $base=$root.(getenv('IJBK_PREVIEW')==='1'?'/dist':'/public');
    $resource=$path==='/secret-friend/'?'/secret-friend/index.php':$path;
    $allowed=['/secret-friend/index.php','/secret-friend/api.php','/secret-friend/install.php','/secret-friend/app.js','/secret-friend/passkeys.js','/secret-friend/app.css'];
    if (!in_array($resource,$allowed,true) || !is_file($base.$resource)) { http_response_code(404); return; }
    if (str_ends_with($resource,'.php')) { $_SERVER['SCRIPT_NAME']=$resource; require $base.$resource; return; }
    $mime=['html'=>'text/html','css'=>'text/css','js'=>'text/javascript'];
    header('Content-Type: '.$mime[pathinfo($resource,PATHINFO_EXTENSION)].'; charset=utf-8');
    readfile($base.$resource); return;
}
if($path==='/api'||str_starts_with($path,'/api/')){
    $env=parse_ini_file($root.'/.local/server.env',false,INI_SCANNER_RAW);
    if(empty($env['ADMIN_PASSWORD_HASH'])){http_response_code(503);echo 'Run npm run setup:admin first.';return;}
    define('IJBK_ADMIN_PASSWORD_HASH',$env['ADMIN_PASSWORD_HASH']);
    foreach(['GOOGLE_DRIVE_CLIENT_ID','GOOGLE_DRIVE_CLIENT_SECRET','GOOGLE_DRIVE_REFRESH_TOKEN'] as $key)if(!getenv($key)&&!empty($env[$key]))putenv($key.'='.$env[$key]);
    require $root.(getenv('IJBK_PREVIEW')==='1'?'/dist/api/index.php':'/php-api/index.php');
    return;
}
if(getenv('IJBK_PREVIEW')==='1'){
    if($path==='/project-materials/index.html'){header('Content-Type: text/html; charset=utf-8');readfile($root.'/dist/index.html');return;}
    $dist=realpath($root.'/dist');$file=realpath($root.'/dist/'.rawurldecode($path));
    if($file&&str_starts_with($file,$dist.'/')&&is_file($file)&&preg_match('/\.(html|js|mjs|css|png|jpe?g|svg|webp|ico|pdf|ttf|woff2?|bcmap|wasm|txt)$/i',$file)&&!str_starts_with($file,$dist.'/api/'))return false;
    if(pathinfo($path,PATHINFO_EXTENSION)!==''){http_response_code(404);return;}
    header('Content-Type: text/html; charset=utf-8');readfile($dist.'/index.html');return;
}
http_response_code(404);
