<?php
declare(strict_types=1);
$root=dirname(__DIR__);
$path=parse_url($_SERVER['REQUEST_URI']??'/',PHP_URL_PATH)?:'/';
if($path==='/api'||str_starts_with($path,'/api/')){
    $env=parse_ini_file($root.'/.local/server.env',false,INI_SCANNER_RAW);
    if(empty($env['ADMIN_PASSWORD_HASH'])){http_response_code(503);echo 'Run npm run setup:admin first.';return;}
    define('IJBK_ADMIN_PASSWORD_HASH',$env['ADMIN_PASSWORD_HASH']);
    foreach(['GOOGLE_DRIVE_CLIENT_ID','GOOGLE_DRIVE_CLIENT_SECRET','GOOGLE_DRIVE_REFRESH_TOKEN'] as $key)if(!getenv($key)&&!empty($env[$key]))putenv($key.'='.$env[$key]);
    require $root.(getenv('IJBK_PREVIEW')==='1'?'/dist/api/index.php':'/php-api/index.php');
    return;
}
if(getenv('IJBK_PREVIEW')==='1'){
    $dist=realpath($root.'/dist');$file=realpath($root.'/dist/'.rawurldecode($path));
    if($file&&str_starts_with($file,$dist.'/')&&is_file($file)&&preg_match('/\.(html|js|mjs|css|png|jpe?g|svg|webp|ico|pdf|ttf|woff2?|bcmap|wasm|txt)$/i',$file)&&!str_starts_with($file,$dist.'/api/'))return false;
    if(pathinfo($path,PATHINFO_EXTENSION)!==''){http_response_code(404);return;}
    header('Content-Type: text/html; charset=utf-8');readfile($dist.'/index.html');return;
}
http_response_code(404);
