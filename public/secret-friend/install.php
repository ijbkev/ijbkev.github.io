<?php
require __DIR__.'/bootstrap.php';
$error=''; $done=false;
$installed=sf_store(fn(&$db)=>(bool)$db['admin']);
if ($_SERVER['REQUEST_METHOD']==='POST' && !$installed) {
    try {
        sf_csrf(); sf_rate('install:'.($_SERVER['REMOTE_ADDR'] ?? ''),5,900);
        $token=getenv('SECRET_FRIEND_INSTALL_TOKEN') ?: '';
        if (strlen($token)<32 || !hash_equals($token,(string)($_POST['token'] ?? ''))) sf_fail('The installation token is invalid or has not been configured.');
        $password=(string)($_POST['password'] ?? '');
        if (strlen($password)<14 || strlen($password)>72) sf_fail('Use an admin password between 14 and 72 characters.');
        if ($password!==($_POST['confirm'] ?? '')) sf_fail('Passwords do not match.');
        sf_store(function (&$db) use ($password) { if ($db['admin']) sf_fail('Already installed.',409); $db['admin']=password_hash($password,PASSWORD_DEFAULT); });
        $done=true; $installed=true;
    } catch (Throwable $e) { $error=$e instanceof RuntimeException?$e->getMessage():'Installation failed. Check storage permissions.'; }
}
function esc(string $s): string { return htmlspecialchars($s,ENT_QUOTES,'UTF-8'); }
?>
<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Install · Secret Friend HQ</title><link rel="stylesheet" href="app.css"></head><body><main class="install"><a class="eyebrow" href="./">SECRET FRIEND HQ</a><h1>Establish your<br>headquarters.</h1>
<?php if ($error): ?><p class="error" role="alert"><?=esc($error)?></p><?php endif ?>
<?php if ($installed): ?><div class="panel"><h2><?=$done?'Headquarters is ready.':'Already installed.'?></h2><p>Your admin password is set. The installer cannot overwrite it.</p><a class="button" href="./#admin">Open admin panel →</a></div>
<?php else: ?><p>Create the administrator password for all Secret Friend rooms.</p><form method="post" class="panel stack"><input type="hidden" name="csrf" value="<?=esc($_SESSION['csrf'])?>"><label>Installation token<input name="token" type="password" required autocomplete="off"></label><p class="hint">Your hosting administrator sets SECRET_FRIEND_INSTALL_TOKEN before opening this page. See the deployment guide.</p><label>Admin password<input name="password" type="password" minlength="14" maxlength="72" required autocomplete="new-password"></label><label>Confirm password<input name="confirm" type="password" required autocomplete="new-password"></label><button>Establish HQ →</button></form><?php endif ?></main></body></html>
