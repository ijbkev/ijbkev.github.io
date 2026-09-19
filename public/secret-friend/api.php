<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
try {
    require __DIR__.'/bootstrap.php';
    $action=$_GET['action'] ?? 'state';
    $read=['state','rooms','room','admin_data','export'];
    $input=[];
    if (!in_array($action,$read,true)) {
        if ($_SERVER['REQUEST_METHOD']!=='POST') sf_fail('POST required.',405);
        sf_csrf();
        if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0)>100000) sf_fail('Request too large.',413);
        $raw=file_get_contents('php://input',false,null,0,100001);
        if ($raw===false || strlen($raw)>100000) sf_fail('Request too large.',413);
        $input=json_decode($raw,true,32,JSON_THROW_ON_ERROR);
        if (!is_array($input)) sf_fail('Invalid request.');
    }
    $pid=(string)($input['project'] ?? $_GET['project'] ?? '');
    if (in_array($action,['login','authenticate','join'],true)) {
        sf_rate('ip:'.($_SERVER['REMOTE_ADDR'] ?? 'local'),300,900);
        sf_rate($action==='login' ? 'admin' : ($action==='join' ? 'join:'.$pid : 'pin:'.$pid.':'.($input['participant'] ?? '')), $action==='login'?30:($action==='join'?60:5),900);
    }
    $out=sf_store(function (&$db) use ($action,$input,$pid) {
        switch ($action) {
            case 'state': return ['csrf'=>$_SESSION['csrf'],'installed'=>(bool)$db['admin'],'admin'=>sf_is_admin(),'siteAuth'=>sf_site_auth_available()];
            case 'login':
                if (!$db['admin'] || !sf_verify_admin_password((string)($input['password'] ?? ''),$db['admin'])) sf_fail('Sign-in failed.',401);
                session_regenerate_id(true); unset($_SESSION['participant']);
                if(sf_site_auth_available()&&verify_secret((string)($input['password']??''),IJBK_ADMIN_PASSWORD_HASH)) {
                    // Integrated password sign-in creates the same session as passkey sign-in.
                    new_session('admin');unset($_SESSION['admin']);
                } else { $_SESSION['admin']=true; }
                return ['ok'=>true];
            case 'logout': if(sf_site_auth_available()&&site_admin_authenticated())site_admin_logout(); $_SESSION=['csrf'=>bin2hex(random_bytes(32)),'last'=>time()]; session_regenerate_id(true); return ['ok'=>true];
            case 'rooms': return ['rooms'=>array_values(array_map(fn($p)=>['id'=>$p['id'],'name'=>$p['name'],'active'=>$p['active'],'lobbyOpen'=>!empty($p['lobby_open']),'participantCount'=>count($p['people'])],$db['projects']))];
            case 'room':
                $p=$db['projects'][$pid] ?? null;
                if (!$p) sf_fail('Room not found.',404);
                $s=$_SESSION['participant'] ?? null;
                $joined=$s && $s['project']===$pid && isset($p['people'][$s['id']]) && $p['people'][$s['id']]['version']===$s['version'] ? $p['people'][$s['id']] : null;
                $checkedIn=$p['checked_in'] ?? [];
                if (!$p['active']) return ['id'=>$p['id'],'name'=>$p['name'],'active'=>false,'lobbyOpen'=>!empty($p['lobby_open']),'participants'=>!empty($p['lobby_open'])?array_values(array_map(fn($person)=>['name'=>$person['name']],array_intersect_key($p['people'],$checkedIn))):[],'joinedName'=>$joined && isset($checkedIn[$joined['id']]) ? $joined['name'] : null];
                if ($joined && empty($_SESSION['participant']['started'])) $_SESSION['participant']['started']=time();
                return ['id'=>$p['id'],'name'=>$p['name'],'active'=>true,'lobbyOpen'=>false,'participants'=>sf_safe_people($p['people']),'joinedName'=>$joined['name'] ?? null];
            case 'join':
                unset($_SESSION['participant']);
                if (!isset($db['projects'][$pid])) sf_fail('Room not found.',404);
                $p=&$db['projects'][$pid];
                if (empty($p['lobby_open']) || !empty($p['active']) || !empty($p['finalized'])) sf_fail('Player check-in is closed. Ask the organizer.',409);
                $name=sf_text($input['name'] ?? ''); $pin=(string)($input['pin'] ?? '');
                $nameKey=function_exists('mb_strtolower') ? mb_strtolower($name,'UTF-8') : strtolower($name);
                $person=null; $sameName=[];
                foreach ($p['people'] as $candidate) {
                    $candidateKey=function_exists('mb_strtolower') ? mb_strtolower(trim($candidate['name']),'UTF-8') : strtolower(trim($candidate['name']));
                    if ($candidateKey===$nameKey) $sameName[]=$candidate;
                }
                foreach ($sameName as $candidate) if (password_verify($pin,$candidate['hash'])) { $person=$candidate; break; }
                if (!$person) sf_fail('You are not on the participant list, or the birth date does not match. Ask the organizer.',401);
                $p['checked_in'] ??=[]; $p['checked_in'][$person['id']]=gmdate('c');
                session_regenerate_id(true); unset($_SESSION['admin']);
                $_SESSION['participant']=['project'=>$pid,'id'=>$person['id'],'version'=>$person['version'],'started'=>0];
                return ['ok'=>true,'name'=>$person['name']];
            case 'authenticate':
                unset($_SESSION['participant']);
                $p=$db['projects'][$pid] ?? null; $person=$p['people'][$input['participant'] ?? ''] ?? null;
                if (!$p || !$p['active'] || !$person || !password_verify((string)($input['pin'] ?? ''),$person['hash'])) sf_fail('Identity not accepted. Check your name and PIN, or ask the organizer.',401);
                session_regenerate_id(true); unset($_SESSION['admin']);
                $_SESSION['participant']=['project'=>$pid,'id'=>$person['id'],'version'=>$person['version'],'started'=>time()];
                return ['ok'=>true,'name'=>$person['name'],'minimumSeconds'=>90];
            case 'reveal':
                $s=$_SESSION['participant'] ?? null;
                if (!$s) sf_fail('Please verify your identity again.',401);
                if (!isset($db['projects'][$s['project']])) sf_fail('This room has been deleted.',403);
                $p=&$db['projects'][$s['project']]; $person=$p['people'][$s['id']] ?? null;
                if (!$person || !$p['active'] || !$p['finalized'] || $person['version']!==$s['version']) sf_fail('This mission is unavailable. Ask your organizer.',403);
                if (time()-$s['started']<90) sf_fail('Calibration is still running. Please finish your mission briefing.',409);
                sf_draw_on_reveal($p);
                $friend=$p['people'][$p['assignments'][$s['id']]];
                $p['viewed'][$s['id']] ??= gmdate('c');
                return ['name'=>$friend['name'],'country'=>$friend['country'],'viewedAt'=>$p['viewed'][$s['id']]];
        }
        sf_admin();
        if ($action==='admin_data') {
            $projects=[];
            foreach ($db['projects'] as $p) $projects[]=sf_admin_project($p);
            return ['projects'=>$projects];
        }
        if ($action==='create') {
            $id=sf_id(); $db['projects'][$id]=['id'=>$id,'name'=>sf_text($input['name'] ?? ''),'active'=>false,'lobby_open'=>false,'finalized'=>false,'people'=>[],'checked_in'=>[],'locks'=>[],'assignments'=>[],'viewed'=>[]];
            return ['id'=>$id];
        }
        if (!isset($db['projects'][$pid])) sf_fail('Project not found.',404);
        if ($action==='delete_project') {
            unset($db['projects'][$pid]);
            return ['ok'=>true];
        }
        $p=&$db['projects'][$pid];
        switch ($action) {
            case 'reset_checkins':
                $p['checked_in']=[];
                foreach ($p['people'] as &$person) $person['version']++;
                unset($person);
                break;
            case 'demo_participants':
                sf_draft($p);
                $demo=[
                    ['Test Anna','Germany','07042001'],
                    ['Test Mateo','Spain','15081999'],
                    ['Test Lea','Germany','29022000'],
                    ['Test Sofia','Italy','02022002'],
                ];
                $existing=array_map(fn($person)=>strtolower(trim($person['name'])),$p['people']);
                foreach ($demo as [$name,$country,$pin]) {
                    if (in_array(strtolower($name),$existing,true)) sf_fail('The four test participants are already in this room.',409);
                }
                if (count($p['people'])+count($demo)>300) sf_fail('A room supports up to 300 participants.');
                foreach ($demo as [$name,$country,$pin]) {
                    $id=sf_id(); $p['people'][$id]=['id'=>$id,'name'=>$name,'country'=>$country,'hash'=>sf_pin($pin),'version'=>1];
                }
                $p['assignments']=[];
                break;
            case 'lobby':
                sf_draft($p);
                $p['lobby_open']=!empty($input['open']);
                break;
            case 'start':
                sf_draft($p);
                sf_match($p['people'],$p['locks']);
                $p['assignments']=[]; $p['finalized']=gmdate('c'); $p['lobby_open']=false; $p['active']=true;
                break;
            case 'reopen': sf_reopen($p); break;
            case 'rename': $p['name']=sf_text($input['name'] ?? ''); break;
            case 'access':
                if (empty($p['finalized']) && !empty($input['active'])) sf_fail('Seal the room before opening participant access.');
                $p['active']=!empty($input['active']); break;
            case 'participant':
                $id=(string)($input['id'] ?? '');
                if ($id && !isset($p['people'][$id])) sf_fail('Participant not found.',404);
                if (!$id) sf_draft($p);
                if ($p['finalized'] && ($input['name']!==$p['people'][$id]['name'] || $input['country']!==$p['people'][$id]['country'])) sf_fail('Names and countries are locked after finalization. PIN reset is still available.');
                $name=sf_text($input['name'] ?? ''); $country=sf_text($input['country'] ?? '',60);
                $old=$p['people'][$id] ?? null;
                $hash=($input['pin'] ?? '')!=='' ? sf_pin($input['pin']) : ($old['hash'] ?? sf_fail('A PIN is required.'));
                $id=$id ?: sf_id();
                $p['people'][$id]=['id'=>$id,'name'=>$name,'country'=>$country,'hash'=>$hash,'version'=>($old['version'] ?? 0)+1];
                unset($p['checked_in'][$id]);
                if (!$p['finalized']) $p['assignments']=[];
                break;
            case 'import':
                sf_draft($p); $lines=preg_split('/\R/',sf_text($input['text'] ?? '',60000)); $added=[];
                foreach ($lines as $line) {
                    if (!trim($line)) continue;
                    $parts=array_map('trim',explode('|',$line));
                    if (count($parts)!==3) sf_fail('Each line must be Name | Country | DDMMYYYY. No rows were imported.');
                    $id=sf_id(); $added[$id]=['id'=>$id,'name'=>sf_text($parts[0]),'country'=>sf_text($parts[1],60),'hash'=>sf_pin($parts[2]),'version'=>1];
                }
                if (count($p['people'])+count($added)>300) sf_fail('A room supports up to 300 participants.');
                $p['people']+=$added; $p['assignments']=[]; break;
            case 'delete_participant':
                sf_draft($p); $id=(string)($input['id'] ?? ''); unset($p['people'][$id],$p['checked_in'][$id],$p['locks'][$id]);
                foreach ($p['locks'] as $a=>$b) if ($b===$id) unset($p['locks'][$a]);
                $p['assignments']=[]; break;
            case 'lock':
                sf_draft($p); $from=(string)($input['from'] ?? ''); $to=(string)($input['to'] ?? '');
                if (!isset($p['people'][$from])) sf_fail('Choose a participant.');
                $locks=$p['locks'];
                if ($to==='') unset($locks[$from]); else $locks[$from]=$to;
                sf_match($p['people'],$locks); $p['locks']=$locks; $p['assignments']=[]; break;
            case 'generate':
                sf_draft($p); sf_match($p['people'],$p['locks']); $p['assignments']=[]; break;
            case 'finalize':
                sf_draft($p);
                sf_match($p['people'],$p['locks']); // Validate feasibility without saving a draw.
                $p['assignments']=[];
                $p['finalized']=gmdate('c'); $p['lobby_open']=false; break;
            case 'admin_result':
                $id=(string)($input['participant'] ?? '');
                if (!isset($p['people'][$id])) sf_fail('Participant not found.',404);
                if (!isset($p['assignments'][$id])) sf_fail('The draw happens when the first agent finishes their mission.',409);
                return ['participant'=>$id,'recipient'=>$p['assignments'][$id]];
            case 'export':
                if (count($p['people'])<2 || count($p['assignments'])!==count($p['people'])) sf_fail('Results are available after the first final reveal.',409);
                $rows=[['Participant','Secret Friend','Participant country','Friend country','Assignment','Same-country warning','Viewed','Reveal timestamp']];
                $cell=fn($s)=>preg_match('/^[\s]*[=+@\-\t\r\n]/u',(string)$s) ? "'".$s : $s;
                foreach ($p['people'] as $id=>$person) {
                    $friend=$p['people'][$p['assignments'][$id] ?? ''] ?? null;
                    $rows[]=array_map($cell,[$person['name'],$friend['name'] ?? '',$person['country'],$friend['country'] ?? '',isset($p['locks'][$id])?'Manual':'Random',$friend && sf_country($person['country'])===sf_country($friend['country'])?'Same country':'',isset($p['viewed'][$id])?'Yes':'No',$p['viewed'][$id] ?? '']);
                }
                return ['csv'=>$rows];
            default: sf_fail('Unknown operation.',404);
        }
        if (count($p['people'])>300) sf_fail('A room supports up to 300 participants.');
        return ['ok'=>true];
    });
    if (isset($out['csv'])) {
        header('Content-Type: text/csv; charset=utf-8'); header('Content-Disposition: attachment; filename="secret-friend-results.csv"');
        $stream=fopen('php://output','w'); foreach ($out['csv'] as $row) fputcsv($stream,$row,',','"',''); fclose($stream);
    } else echo json_encode($out,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    $code=$e instanceof RuntimeException && $e->getCode()>=400 && $e->getCode()<=599 ? $e->getCode() : 500;
    http_response_code($code); echo json_encode(['error'=>$code===500?'The request could not be completed. Check server configuration.':$e->getMessage()]);
}
