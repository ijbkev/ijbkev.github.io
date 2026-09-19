<?php
declare(strict_types=1);
require_once __DIR__.'/core.php';
// Integrated builds place the main API bootstrap beside this application.
// Loading it lets organizers use the same administrator credential everywhere.
$mainApiBootstrap=dirname(__DIR__).'/api/bootstrap.php';
if (!defined('IJBK_ADMIN_PASSWORD_HASH') && is_file($mainApiBootstrap)) require_once $mainApiBootstrap;
$mainApiLibrary=dirname(__DIR__).'/api/lib.php';
if(!is_file($mainApiLibrary)&&PHP_SAPI==='cli-server')$mainApiLibrary=dirname(__DIR__,2).'/php-api/lib.php';
if(defined('IJBK_ADMIN_PASSWORD_HASH')&&is_file($mainApiLibrary))require_once $mainApiLibrary;

ini_set('display_errors', '0');
header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
header('X-Frame-Options: DENY');
$documentRoot=realpath($_SERVER['DOCUMENT_ROOT'] ?? '') ?: __DIR__;
$secretFriendStorage=getenv('SECRET_FRIEND_DATA_DIR');
$siteStorage=getenv('IJBK_STORAGE_DIR');
$integratedSiteStorage=dirname(__DIR__,2).'/reimbursement';
$storage=$secretFriendStorage !== false && $secretFriendStorage !== ''
    ? $secretFriendStorage
    : ($siteStorage !== false && $siteStorage !== ''
        ? rtrim($siteStorage,'/').'/secret-friend'
        : (is_dir($integratedSiteStorage)
            ? $integratedSiteStorage.'/secret-friend'
            : dirname($documentRoot).'/secret-friend-private'));
if (!str_starts_with($storage, '/')) sf_fail('Storage must be an absolute private directory.', 503);
if (!is_dir($storage) && !@mkdir($storage,0700,true)) sf_fail('Private storage is unavailable. Check installation instructions.',503);
$storage=realpath($storage);
if (!$storage || $storage===$documentRoot || str_starts_with($storage,$documentRoot.'/')) sf_fail('Storage must be outside the public document root.',503);
define('SF_STORAGE',$storage);
if (!is_dir($storage.'/sessions')) mkdir($storage.'/sessions',0700);
ini_set('session.use_strict_mode','1');
ini_set('session.use_only_cookies','1');
session_save_path($storage.'/sessions');
session_name('sfhq_session');
session_set_cookie_params(['lifetime'=>0,'path'=>rtrim(dirname($_SERVER['SCRIPT_NAME']),'/').'/', 'secure'=>isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off','httponly'=>true,'samesite'=>'Strict']);
session_start();
if (isset($_SESSION['last']) && time()-$_SESSION['last']>1800) { $_SESSION=[]; session_regenerate_id(true); }
$_SESSION['last']=time();
$_SESSION['csrf'] ??= bin2hex(random_bytes(32));

// A separate stable lock guards read-modify-write and atomic replacement, including installation.
function sf_store(callable $work): mixed {
    $lock=fopen(SF_STORAGE.'/store.lock','c');
    if (!$lock || !flock($lock, LOCK_EX)) sf_fail('Storage is busy. Try again.',503);
    try {
        $path=SF_STORAGE.'/store.json';
        $db=is_file($path) ? json_decode(file_get_contents($path),true,512,JSON_THROW_ON_ERROR) : ['admin'=>null,'projects'=>[], 'limits'=>[]];
        $before=$db; $result=$work($db);
        if ($db!==$before) {
            $tmp=tempnam(SF_STORAGE,'save-');
            try {
                chmod($tmp,0600);
                $json=json_encode($db,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE);
                if (file_put_contents($tmp,$json)!==strlen($json) || !rename($tmp,$path)) sf_fail('Could not save changes.',503);
            } finally { if (is_file($tmp)) unlink($tmp); }
        }
        return $result;
    } finally { flock($lock,LOCK_UN); fclose($lock); }
}
function sf_csrf(): void {
    if (!hash_equals($_SESSION['csrf'],$_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_POST['csrf'] ?? '')) sf_fail('Session expired. Reload and try again.',403);
}
function sf_site_auth_available(): bool { return defined('IJBK_ADMIN_PASSWORD_HASH')&&function_exists('site_admin_authenticated'); }
function sf_is_admin(): bool { return !empty($_SESSION['admin'])||(sf_site_auth_available()&&site_admin_authenticated()); }
function sf_admin(): void { if (!sf_is_admin()) sf_fail('Admin sign-in required.',401); }
function sf_verify_admin_password(string $password, ?string $secretFriendHash): bool {
    if (!defined('IJBK_ADMIN_PASSWORD_HASH') && $secretFriendHash && password_verify($password,$secretFriendHash)) return true;
    if (!defined('IJBK_ADMIN_PASSWORD_HASH') || IJBK_ADMIN_PASSWORD_HASH==='' || IJBK_ADMIN_PASSWORD_HASH==='__ADMIN_PASSWORD_HASH__') return false;
    $stored=IJBK_ADMIN_PASSWORD_HASH;
    if (str_contains($stored,':')) {
        [$salt,$hash]=explode(':',$stored,2);
        return hash_equals($hash,hash_pbkdf2('sha256',$password,$salt,100000,64,false));
    }
    return password_verify($password,$stored);
}
function sf_draft(array $p): void { if ($p['finalized']) sf_fail('This draw is permanently finalized. Create a new project for a new draw.',409); }
function sf_rate(string $key, int $max, int $window): void {
    $allowed=sf_store(function (&$db) use ($key,$max,$window) {
        foreach ($db['limits'] as $k=>$v) if ($v['until']<=time()) unset($db['limits'][$k]);
        $key=hash('sha256',$key);
        $entry=$db['limits'][$key] ?? ['count'=>0,'until'=>time()+$window];
        $entry['count']++; $db['limits'][$key]=$entry;
        return $entry['count'] <= $max;
    });
    if (!$allowed) sf_fail('Too many attempts. Please try again later or ask the organizer.',429);
}
