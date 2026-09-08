<?php
declare(strict_types=1);

if (!defined('IJBK_ADMIN_PASSWORD_HASH')) require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib.php';
require_once __DIR__ . '/pdf.php';
require_once __DIR__ . '/project-drive.php';

header('Cache-Control: no-store'); header('X-Content-Type-Options: nosniff'); header('Referrer-Policy: no-referrer');
origin_guard();
$method=$_SERVER['REQUEST_METHOD']??'GET';
$path=parse_url($_SERVER['REQUEST_URI']??'/api',PHP_URL_PATH)?:'/api';
$path=preg_replace('#^/api#','',$path); if ($path==='') $path='/';

try {
    if ($method==='GET' && preg_match('#^/projects/([^/]+)$#',$path,$m)) respond(public_settings(settings(rawurldecode($m[1]))));

    if ($method==='POST' && preg_match('#^/projects/([^/]+)/unlock$#',$path,$m)) {
        $id=rawurldecode($m[1]); rate_limit("unlock:$id",10); $row=enabled_settings($id); $body=request_json();
        $code=$body['code']??''; if(!is_string($code)||strlen($code)>128||!verify_secret($code,$row['access_hash'])) fail('Incorrect project access code.',401);
        new_session('participant',$id); respond(['ok'=>true]);
    }
    if ($method==='POST' && preg_match('#^/projects/([^/]+)/organisation-unlock$#',$path,$m)) {
        $id=rawurldecode($m[1]);rate_limit("organisation-unlock:$id",10);$row=enabled_settings($id);$body=request_json();$code=$body['code']??'';$country=$body['country']??'';
        if(!is_string($country)||!is_string($code)||$code===''||strlen($code)>128)fail('Incorrect partner access code.',401);
        $stmt=db()->prepare('SELECT country,access_hash FROM partner_country_access WHERE project_id=?');$stmt->execute([$id]);$matches=[];
        foreach($stmt->fetchAll() as $entry)if(($country===''||$country===$entry['country'])&&in_array($entry['country'],json_decode($row['countries'],true),true)&&verify_secret($code,$entry['access_hash']))$matches[]=$entry['country'];
        if(count($matches)!==1)fail('Incorrect partner access code.',401);$country=$matches[0];
        new_session('organisation',$id,$country);respond(['ok'=>true,'country'=>$country]);
    }
    if ($method==='GET' && preg_match('#^/projects/([^/]+)/session$#',$path,$m)) { $id=rawurldecode($m[1]); require_session($id); $data=public_settings(enabled_settings($id)); $folderId=drive_folder($id); if($folderId)$data['reimbursementDriveUrl']='https://drive.google.com/drive/folders/'.$folderId; respond($data); }
    if ($method==='GET' && preg_match('#^/projects/([^/]+)/organisation-session$#',$path,$m)) { $id=rawurldecode($m[1]);$country=partner_country($id);respond(scoped_partner_settings(public_settings(enabled_settings($id)),$country)); }
    if ($method==='GET' && preg_match('#^/projects/([^/]+)/organisation-form$#',$path,$m)) { $id=rawurldecode($m[1]);$country=partner_country($id,(string)($_GET['country']??''));respond(scoped_partner_settings(organisation_form_data($id,$country),$country)); }
    if($method==='POST'&&preg_match('#^/projects/([^/]+)/organisation-logout$#',$path,$m)){$id=rawurldecode($m[1]);$hash=require_session($id,'organisation');db()->prepare('DELETE FROM sessions WHERE token_hash=?')->execute([$hash]);setcookie(cookie_name($id,'organisation'),'',time()-3600,'/api');respond(['ok'=>true]);}
    if($method==='GET'&&preg_match('#^/projects/([^/]+)/partner-documents$#',$path,$m)){
        $id=rawurldecode($m[1]);$country=partner_country($id);$result=['country'=>$country];
        foreach(['declarations'=>['organisation_declarations','country','organisation_name'],'agreements'=>['partnership_agreements','partner_country','partner_name']] as $key=>[$table,$column,$name]){$q=db()->prepare("SELECT id,$name AS name,created_at AS createdAt FROM $table WHERE project_id=? AND $column=?");$q->execute([$id,$country]);$result[$key]=$q->fetchAll();}respond($result);
    }
    if($method==='GET'&&preg_match('#^/projects/([^/]+)/organisation-declarations/([^/]+)/pdf$#',$path,$m)){
        $id=rawurldecode($m[1]);$country=partner_country($id);$q=db()->prepare('SELECT data FROM organisation_declarations WHERE id=? AND project_id=? AND country=?');$q->execute([rawurldecode($m[2]),$id,$country]);$raw=$q->fetchColumn();if(!$raw)fail('Declaration not found.',404);$data=json_decode($raw,true);$pdf=generate_organisation_declaration_pdf($data);header('Content-Type: application/pdf');header("Content-Disposition: attachment; filename*=UTF-8''".rawurlencode('Reimbursement Declaration - '.$data['organisationName'].' - '.$country.'.pdf'));echo $pdf;exit;
    }
    if ($method==='GET' && preg_match('#^/projects/([^/]+)/rate$#',$path,$m)) { $id=rawurldecode($m[1]); require_session($id); enabled_settings($id); rate_limit('rates',300); respond(historical_rate((string)($_GET['currency']??''),(string)($_GET['date']??''))); }
    if ($method==='POST' && preg_match('#^/projects/([^/]+)/organisation-declarations$#',$path,$m)) {
        $id=rawurldecode($m[1]);require_session($id,'organisation');rate_limit("organisation-submit:$id",10);db()->exec('BEGIN IMMEDIATE');$row=enabled_settings($id);$input=parse_organisation_declaration(request_json(),json_decode($row['countries'],true));$country=partner_country($id,$input['country']);$source=scoped_partner_settings(organisation_form_data($id,$country),$country);
        if(!$source['progress']['ready'])fail('Team reimbursement is blocked: all expected participants must submit and receive administrator approval.',422);
        $declarationId=uuid4();$createdAt=gmdate('Y-m-d\TH:i:s\Z');$saved=array_merge($source,$input,['id'=>$declarationId,'projectId'=>$id,'createdAt'=>$createdAt]);
        try{db()->prepare('INSERT INTO organisation_declarations(id,project_id,country,organisation_name,legal_representative_name,total_cents,data,created_at)VALUES(?,?,?,?,?,?,?,?)')->execute([$declarationId,$id,$input['country'],$input['organisationName'],$input['legalRepresentativeName'],$source['totalCents'],json_encode($saved,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),$createdAt]);}
        catch(PDOException $e){if($e->getCode()==='23000')fail('An organisation declaration has already been submitted for this country.',409);throw $e;}
        db()->exec('COMMIT');respond(['id'=>$declarationId,'country'=>$input['country'],'totalCents'=>$source['totalCents'],'createdAt'=>$createdAt],201);
    }
    if ($method==='POST' && preg_match('#^/projects/([^/]+)/partnership-agreements$#',$path,$m)) {
        $id=rawurldecode($m[1]);require_session($id,'organisation');rate_limit("partnership-submit:$id",10);$row=enabled_settings($id);$input=parse_partnership_agreement(request_json(),json_decode($row['countries'],true));$country=partner_country($id,$input['partnerCountry']);$agreementId=uuid4();$createdAt=gmdate('Y-m-d\TH:i:s\Z');$documentId=partnership_document_id($row['project_code'],$country,$agreementId,$createdAt);$confirmation='I confirm that I personally completed and signed this form.';$evidence=['signerName'=>$input['legalRepresentativeName'],'signerRole'=>$input['legalRepresentativePosition'],'signerEmail'=>$input['signerEmail'],'signedAt'=>$createdAt,'maskedIp'=>masked_client_ip(),'userAgent'=>browser_device_label(),'documentId'=>$documentId,'confirmation'=>$confirmation];$coordinatorEvidence=['signerName'=>'Vidit Goyal','signerRole'=>'Chairman','organisation'=>'IJBK e.V.','issuedAt'=>$createdAt,'documentId'=>$documentId,'statement'=>'Signature applied automatically from the coordinator-approved signature record.'];$evidence['sha256']=hash('sha256',json_encode(['agreement'=>$input,'partnerEvidence'=>$evidence,'coordinatorEvidence'=>$coordinatorEvidence],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES));$saved=array_merge($input,['id'=>$agreementId,'projectId'=>$id,'projectName'=>project($id)['title'],'projectCode'=>$row['project_code'],'createdAt'=>$createdAt,'signingEvidence'=>$evidence,'coordinatorSignatureEvidence'=>$coordinatorEvidence]);
        try{db()->prepare('INSERT INTO partnership_agreements(id,project_id,partner_country,partner_name,legal_representative_name,data,created_at)VALUES(?,?,?,?,?,?,?)')->execute([$agreementId,$id,$input['partnerCountry'],$input['partnerName'],$input['legalRepresentativeName'],json_encode($saved,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),$createdAt]);}catch(PDOException $e){if($e->getCode()==='23000')fail('A partnership agreement has already been submitted for this country.',409);throw $e;}respond(['id'=>$agreementId,'partnerCountry'=>$input['partnerCountry'],'createdAt'=>$createdAt],201);
    }
    if($method==='GET'&&preg_match('#^/projects/([^/]+)/partnership-agreements/([^/]+)/pdf$#',$path,$m)){$id=rawurldecode($m[1]);$country=partner_country($id);$stmt=db()->prepare('SELECT data FROM partnership_agreements WHERE id=? AND project_id=? AND partner_country=?');$stmt->execute([rawurldecode($m[2]),$id,$country]);$raw=$stmt->fetchColumn();if(!$raw)fail('Partnership agreement not found.',404);$data=json_decode($raw,true);$pdf=generate_partnership_agreement_pdf($data);$filename='Partnership Agreement - '.$data['partnerName'].' - '.$data['partnerCountry'].'.pdf';header('Content-Type: application/pdf');header("Content-Disposition: attachment; filename*=UTF-8''".rawurlencode($filename));header('Content-Length: '.strlen($pdf));echo $pdf;exit;}

    if($method==='POST'&&preg_match('#^/projects/([^/]+)/applications/(save|resume|document)$#',$path,$m)) {
        $id=rawurldecode($m[1]);require_session($id);enabled_settings($id);rate_limit("applications:$id:".$m[2],$m[2]==='document'?1500:60);
        if(in_array($m[2],['resume','document'],true)){
            $body=request_json();$number=trim((string)($body['number']??''));
            $draft=$m[2]==='resume'&&!preg_match('/^IJBK-[0-9a-f]{48}$/i',$number)
                ?resume_legacy_application($id,$number,(string)($body['email']??''))
                :reimbursement_draft($id,$number);
            $files=json_decode($draft['files'],true);
            if($m[2]==='document'){
                if((int)($body['revision']??0)!==(int)$draft['revision'])fail('Application changed. Load it again.',409);
                $file=$files[(string)($body['key']??'')]??null;if(!$file||!is_file($file['path']))fail('Saved document not found.',404);
                header('Content-Type: '.$file['type']);header('Content-Length: '.filesize($file['path']));readfile($file['path']);exit;
            }
            foreach($files as &$file)unset($file['path']);unset($file);
            respond(['number'=>$draft['resume_number']??$number,'data'=>json_decode($draft['data'],true),'files'=>$files,'revision'=>(int)$draft['revision'],'submitted'=>!empty($draft['claim_id'])]);
        }
        $data=draft_payload();$files=save_draft_files();$number=(string)($_POST['number']??'');
        db()->exec('BEGIN IMMEDIATE');$oldFiles=[];
        if($number!==''){
            $draft=reimbursement_draft($id,$number);
            if((int)($_POST['revision']??0)!==(int)$draft['revision'])fail('This application changed in another tab. Continue again using your submission number before saving.',409);
            if($draft['claim_id'])db()->prepare("UPDATE submissions SET status='withdrawn' WHERE id=?")->execute([$draft['claim_id']]);
            $revision=(int)$draft['revision']+1;$oldFiles=json_decode($draft['files'],true);$files=persist_draft_files($files);
            db()->prepare('UPDATE reimbursement_drafts SET data=?,files=?,claim_id=NULL,revision=? WHERE token_hash=?')->execute([json_encode($data),json_encode($files),$revision,$draft['token_hash']]);
        }else{
            $number='IJBK-'.bin2hex(random_bytes(24));$revision=1;$files=persist_draft_files($files);
            db()->prepare('INSERT INTO reimbursement_drafts(token_hash,project_id,data,files,resume_number) VALUES(?,?,?,?,?)')->execute([hash('sha256',$number),$id,json_encode($data),json_encode($files),$number]);
        }
        db()->exec('COMMIT');delete_draft_files($oldFiles);respond(['number'=>$number,'revision'=>$revision,'status'=>'draft']);
    }

    if ($method==='POST' && preg_match('#^/projects/([^/]+)/submissions$#',$path,$m)) {
        $id=rawurldecode($m[1]); $sessionHash=require_session($id); $row=enabled_settings($id); $project=project($id); rate_limit("submit:$id",30);
        if (!str_starts_with($_SERVER['CONTENT_TYPE']??'','multipart/form-data;')) fail('Upload the reimbursement form with its ticket files.',415);
        try { $raw=json_decode((string)($_POST['claim']??''),true,32,JSON_THROW_ON_ERROR); } catch(Throwable){ fail('Missing or invalid reimbursement form.',422); }
        $input=parse_claim($raw,json_decode($row['countries'],true));
        $applicationNumber=(string)($_POST['number']??'');$draft=null;
        if($applicationNumber!==''){db()->exec('BEGIN IMMEDIATE');$draft=reimbursement_draft($id,$applicationNumber);if((int)($_POST['revision']??0)!==(int)$draft['revision'])fail('This application changed. Load it again before submitting.',409);if($draft['claim_id']){ $previous=saved_submission($draft['claim_id']);$saved=json_decode($previous['data'],true);db()->exec('COMMIT');respond(array_merge(['id'=>$saved['id'],'reference'=>claim_reference($saved),'number'=>$applicationNumber,'totalCents'=>$saved['totalCents']],reimbursement_totals($saved))); }}
        $details=parse_project_details(public_settings($row),json_decode($row['countries'],true));
        $stmt=db()->prepare('SELECT id,status,session_hash,data FROM submissions WHERE project_id=? AND request_id=?'); $stmt->execute([$id,$input['requestId']]); $existing=$stmt->fetch();
        if($existing){ if($existing['session_hash']!==$sessionHash) fail('This submission reference is already in use.',409); if($existing['status']!=='complete') fail('Your submission is still being processed. Please wait, then retry.',409); $saved=json_decode($existing['data'],true);respond(array_merge(['id'=>$existing['id'],'reference'=>claim_reference($saved),'totalCents'=>$saved['totalCents'],'alreadySubmitted'=>true],reimbursement_totals($saved))); }
        $files=[];$totalSize=0;
        foreach($input['tickets'] as $i=>&$ticket){
            $entries=[['field'=>'ticket-'.$i,'key'=>'ticket-'.($i+1),'pass'=>null]];
            foreach($ticket['boardingPasses'] as $j=>$pass)$entries[]=['field'=>'boarding-'.$i.'-'.$j,'key'=>'boarding-'.($i+1).'-'.($j+1),'pass'=>$j];
            foreach($entries as $entry){
                $upload=$_FILES[$entry['field']]??null;
                if(!is_array($upload)||($upload['error']??UPLOAD_ERR_NO_FILE)===UPLOAD_ERR_NO_FILE){fail($entry['pass']!==null?'Upload every selected boarding pass for ticket '.($i+1).'.':'Upload the file for ticket '.($i+1).'.',422);}
                if(($upload['error']??-1)!==UPLOAD_ERR_OK||!is_uploaded_file($upload['tmp_name']))fail('The upload could not be saved. Please retry.',422);
                $size=(int)$upload['size'];if($size>10*1024*1024)fail('Each upload must be at most 10 MB.',413);
                $totalSize+=$size;if($totalSize>40*1024*1024)fail('Total uploads exceed 40 MB.',413);
                $name=mb_substr(basename((string)$upload['name']),0,180);
                $type=upload_type($upload['tmp_name'],$name);
                if($type!=='application/pdf'&&!str_starts_with($type,'image/'))fail('Upload a PDF or image.',422);
                if($entry['pass']===null)$ticket['filename']=$name;else $ticket['boardingPasses'][$entry['pass']]['filename']=$name;
                $files[]=['tmp'=>$upload['tmp_name'],'type'=>$type,'key'=>$entry['key']];
            }
        }unset($ticket);
        $claimId=uuid4();$claimDir=storage_dir().'/claims/'.$id.'/'.$claimId; if(!mkdir($claimDir,0700,true)&&!is_dir($claimDir)) fail('Could not prepare private claim storage.',503);
        $stored=[];
        try {
            foreach($files as $i=>&$file){$ext=['application/pdf'=>'pdf','image/png'=>'png','image/jpeg'=>'jpg'][$file['type']]??'image';$target=$claimDir.'/'.$file['key'].'.'.$ext;if(!move_uploaded_file($file['tmp'],$target))throw new RuntimeException('Unable to save uploaded ticket');chmod($target,0600);$file['path']=$target;$stored[]=$target;}unset($file);
            $createdAt=gmdate('Y-m-d\TH:i:s\Z');$total=array_sum(array_column($input['tickets'],'euroCents'));
            $claim=['declarationText'=>declaration_text(),'reference'=>submission_reference($details,$input['participant'],$createdAt),'projectShortName'=>$details['shortName'],'activityStartDate'=>$details['activityStartDate'],'activityEndDate'=>$details['activityEndDate'],'destinationCity'=>$details['destinationCity'],'countryLimitCents'=>$details['countryLimits'][$input['participant']['team']],'extraCents'=>0,'id'=>$claimId,'projectId'=>$id,'projectName'=>$project['title'],'projectCode'=>$row['project_code'],'participant'=>$input['participant'],'tickets'=>$input['tickets'],'totalCents'=>$total,'signature'=>$input['signature'],'signatureBytes'=>$input['signatureBytes'],'createdAt'=>$createdAt,'declaration'=>true];
            $pdfPath="$claimDir/complete.pdf"; $data=$claim;unset($data['signatureBytes']);
            db()->prepare('INSERT INTO submissions(id,project_id,request_id,session_hash,name,team,email,total_cents,data,pdf_path,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)')->execute([$claimId,$id,$input['requestId'],$sessionHash,$input['participant']['name'],$input['participant']['team'],$input['participant']['email'],$total,json_encode($data,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),$pdfPath,$createdAt]);
            // Joining tickets is an administrator download concern. Keeping it
            // out of submission means a safely stored original cannot be rejected
            // merely because the PDF renderer needs compatibility processing.
            db()->prepare("UPDATE submissions SET status='complete' WHERE id=?")->execute([$claimId]);if($draft){db()->prepare('UPDATE reimbursement_drafts SET claim_id=? WHERE token_hash=?')->execute([$claimId,$draft['token_hash']]);db()->exec('COMMIT');}respond(array_merge(['id'=>$claimId,'number'=>$applicationNumber,'reference'=>$claim['reference'],'totalCents'=>$total],reimbursement_totals($claim)),201);
        }catch(Throwable $e){db()->prepare('DELETE FROM submissions WHERE id=?')->execute([$claimId]);foreach(glob($claimDir.'/*')?:[] as $f)@unlink($f);@rmdir($claimDir);error_log('Reimbursement PDF/storage failure: '.get_class($e));fail('The submission could not be saved. Please retry; document editing or PDF versions do not prevent submission.',422);}
    }

    if($method==='POST'&&$path==='/admin/login'){rate_limit('admin-login',8);$body=request_json();$pw=$body['password']??'';if(!is_string($pw)||!verify_secret($pw,IJBK_ADMIN_PASSWORD_HASH))fail('Incorrect administrator password.',401);new_session('admin');respond(['ok'=>true]);}
    if(str_starts_with($path,'/admin/'))$adminHash=require_session();
    if(preg_match('#^/admin/projects/([^/]+)/drive(?:/(participants|browsing|rename))?$#',$path,$m)) {
        $id=rawurldecode($m[1]);project($id);$action=$m[2]??'';if(getenv('IJBK_DEMO')==='1'&&$method!=='GET')fail('Google Drive changes are disabled in the local demo.',403);
        try {
            if($method==='GET'&&$action==='')respond(drive_dashboard($id));
            if($method==='PUT'&&$action===''){$body=request_json();respond(drive_locked(fn()=>drive_configure($id,trim((string)($body['url']??'')),(string)($body['folderType']??'auto'))));}
            if($method==='POST'&&$action==='participants'){$body=request_json();respond(drive_locked(fn()=>drive_save_person($id,$body)));}
            if($method==='POST'&&$action==='rename'){$body=request_json();respond(drive_locked(fn()=>drive_rename($id,$body)));}
            if($method==='POST'&&$action==='browsing')respond(drive_locked(fn()=>drive_browsing($id)));
        } catch(RuntimeException $e) { fail($e->getMessage(),409); }
    }
    if($method==='GET'&&preg_match('#^/admin/projects/([^/]+)/access-codes$#',$path,$m)){ $id=rawurldecode($m[1]);project($id);respond(reveal_access_codes($id)); }
    if($method==='GET'&&$path==='/admin/session')respond(['ok'=>true]);
    if($method==='POST'&&$path==='/admin/logout'){db()->prepare('DELETE FROM sessions WHERE token_hash=?')->execute([$adminHash]);setcookie(cookie_name(),'',time()-3600,'/api');respond(['ok'=>true]);}
    if($method==='GET'&&$path==='/admin/projects'){$rows=db()->query('SELECT * FROM project_settings')->fetchAll();$map=[];foreach($rows as $r)$map[$r['project_id']]=$r;$out=[];foreach(projects() as $p)$out[]=array_merge($p,['category'=>'Erasmus+ Youth Exchange','status'=>'Upcoming','statusTone'=>'warning','date'=>'','location'=>'','description'=>'','highlights'=>[],'coverImage'=>'','coverAlt'=>'','settings'=>array_merge(public_settings($map[$p['id']]??null),['partnerAccessConfigured'=>partner_access_flags($p['id'])])]);respond($out);}
    if($method==='PUT'&&preg_match('#^/admin/projects/([^/]+)$#',$path,$m)){$id=rawurldecode($m[1]);$old=settings($id);$body=request_json();$projectCode=text_value($body['projectCode']??null,'project code',120);$countries=$body['countries']??null;if(!is_array($countries)||count($countries)<1||count($countries)>40)fail('Add participating countries.',422);$countries=array_map(fn($c)=>text_value($c,'country',80),$countries);if(count(array_unique(array_map('mb_strtolower',$countries)))!==count($countries))fail('Remove duplicate countries.',422);$details=parse_project_details($body,$countries);$access=$body['accessCode']??null;$hash=$old['access_hash']??null;if(is_string($access)&&$access!==''){if(strlen($access)>128)fail('Use an access code of up to 128 characters.',422);$hash=password_hash($access,PASSWORD_ARGON2ID);}if(!$hash)fail('Set a participant access code for this project.',422);$enabled=($body['enabled']??false)===true?1:0;db()->beginTransaction();if(is_string($access)&&$access!=='')save_access_code($id,'',$access);update_partner_codes($id,$countries,$body['partnerAccessCodes']??[],$hash,$old['organisation_access_hash']??null);db()->prepare('INSERT INTO project_settings(project_id,project_code,countries,access_hash,organisation_access_hash,enabled)VALUES(?,?,?,?,?,?) ON CONFLICT(project_id)DO UPDATE SET project_code=excluded.project_code,countries=excluded.countries,access_hash=excluded.access_hash,organisation_access_hash=excluded.organisation_access_hash,enabled=excluded.enabled')->execute([$id,$projectCode,json_encode($countries,JSON_UNESCAPED_UNICODE),$hash,null,$enabled]);db()->prepare('INSERT INTO project_details(project_id,data)VALUES(?,?) ON CONFLICT(project_id)DO UPDATE SET data=excluded.data')->execute([$id,json_encode($details,JSON_UNESCAPED_UNICODE)]);if(($access??'')!==''||!$enabled)db()->prepare('DELETE FROM sessions WHERE project_id=?')->execute([$id]);db()->commit();respond(public_settings(settings($id)));}
    if($method==='GET'&&preg_match('#^/admin/projects/([^/]+)/submissions$#',$path,$m)){$id=rawurldecode($m[1]);project($id);$stmt=db()->prepare("SELECT id,name,team,email,total_cents AS totalCents,created_at AS createdAt,data FROM submissions WHERE project_id=? AND status='complete' ORDER BY created_at DESC");$stmt->execute([$id]);$rows=$stmt->fetchAll();foreach($rows as &$summary){$claim=json_decode($summary['data'],true);unset($summary['data']);$summary['approvedAt']=$claim['approvedAt']??null;$summary['reference']=claim_reference($claim);$summary['finalCents']=reimbursement_totals($claim)['finalCents'];}unset($summary);respond($rows);}
    if($method==='GET'&&preg_match('#^/admin/projects/([^/]+)/organisation-declarations$#',$path,$m)){$id=rawurldecode($m[1]);project($id);$stmt=db()->prepare('SELECT id,project_id AS projectId,country,organisation_name AS organisationName,legal_representative_name AS legalRepresentativeName,total_cents AS totalCents,created_at AS createdAt FROM organisation_declarations WHERE project_id=? ORDER BY country');$stmt->execute([$id]);respond($stmt->fetchAll());}
    if($method==='GET'&&preg_match('#^/admin/projects/([^/]+)/partnership-agreements$#',$path,$m)){$id=rawurldecode($m[1]);project($id);$stmt=db()->prepare('SELECT id,project_id AS projectId,partner_country AS partnerCountry,partner_name AS partnerName,legal_representative_name AS legalRepresentativeName,created_at AS createdAt FROM partnership_agreements WHERE project_id=? ORDER BY partner_country');$stmt->execute([$id]);respond($stmt->fetchAll());}
    if($method==='GET'&&preg_match('#^/admin/organisation-declarations/([^/]+)/pdf$#',$path,$m)){$stmt=db()->prepare('SELECT data FROM organisation_declarations WHERE id=?');$stmt->execute([rawurldecode($m[1])]);$raw=$stmt->fetchColumn();if(!$raw)fail('Organisation declaration not found.',404);$data=json_decode($raw,true);$pdf=generate_organisation_declaration_pdf($data);$filename='Reimbursement Declaration - '.$data['organisationName'].' - '.$data['country'].'.pdf';header('Content-Type: application/pdf');header("Content-Disposition: attachment; filename*=UTF-8''".rawurlencode($filename));header('Content-Length: '.strlen($pdf));echo $pdf;exit;}
    if($method==='GET'&&preg_match('#^/admin/partnership-agreements/([^/]+)/pdf$#',$path,$m)){$stmt=db()->prepare('SELECT data FROM partnership_agreements WHERE id=?');$stmt->execute([rawurldecode($m[1])]);$raw=$stmt->fetchColumn();if(!$raw)fail('Partnership agreement not found.',404);$data=json_decode($raw,true);$pdf=generate_partnership_agreement_pdf($data);$filename='Partnership Agreement - '.$data['partnerName'].' - '.$data['partnerCountry'].'.pdf';header('Content-Type: application/pdf');header("Content-Disposition: attachment; filename*=UTF-8''".rawurlencode($filename));header('Content-Length: '.strlen($pdf));echo $pdf;exit;}
    if($method==='DELETE'&&preg_match('#^/admin/organisation-declarations/([^/]+)$#',$path,$m)){$stmt=db()->prepare('DELETE FROM organisation_declarations WHERE id=?');$stmt->execute([rawurldecode($m[1])]);if(!$stmt->rowCount())fail('Organisation declaration not found.',404);respond(['ok'=>true]);}
    if($method==='DELETE'&&preg_match('#^/admin/partnership-agreements/([^/]+)$#',$path,$m)){$stmt=db()->prepare('DELETE FROM partnership_agreements WHERE id=?');$stmt->execute([rawurldecode($m[1])]);if(!$stmt->rowCount())fail('Partnership agreement not found.',404);respond(['ok'=>true]);}
    if($method==='PUT'&&preg_match('#^/admin/submissions/([^/]+)/finalize$#',$path,$m)){
        db()->exec('BEGIN IMMEDIATE');$row=saved_submission(rawurldecode($m[1]));$claim=json_decode($row['data'],true);
        if(empty($claim['approvedAt'])){$claim['approvedAt']=gmdate('Y-m-d\TH:i:s\Z');db()->prepare('UPDATE submissions SET data=? WHERE id=?')->execute([json_encode($claim,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),$claim['id']]);}
        db()->prepare('UPDATE reimbursement_drafts SET finalized=1 WHERE claim_id=?')->execute([$claim['id']]);
        db()->exec('COMMIT');respond($claim);
    }
    if($method==='GET'&&preg_match('#^/admin/submissions/([^/]+)$#',$path,$m)){$stmt=db()->prepare("SELECT data FROM submissions WHERE id=? AND status='complete'");$stmt->execute([rawurldecode($m[1])]);$data=$stmt->fetchColumn();if(!$data)fail('Submission not found.',404);$claim=json_decode($data,true);$claim['reference']=claim_reference($claim);respond($claim);}
    if($method==='GET'&&preg_match('#^/admin/submissions/([^/]+)/pdf-tickets$#',$path,$m)) {
        $row=saved_submission(rawurldecode($m[1]));$claim=json_decode($row['data'],true);$dir=dirname($row['pdf_path']);$tickets=[];$skipped=0;
        $documents=[];
        foreach(supporting_documents($claim) as $t){
            $matches=glob($dir.'/'.$t['key'].'.*')?:[];$type=count($matches)===1?upload_type($matches[0],$t['filename']):null;
            $entry=array_intersect_key($t,array_flip(['serial','key','label','filename','from','to','amount','currency','isBoardingPass']));
            $entry['type']=$type;$entry['url']='/api/admin/submissions/'.rawurlencode($claim['id']).'/documents/'.$t['key'];
            if(!$type)$entry['error']=$t['isBoardingPass']?'Boarding pass missing. The claim can still be downloaded.':'Original attachment is unavailable. The claim can still be downloaded.';
            $documents[]=$entry;
            if($type&&str_starts_with($type,'image/')){$skipped++;continue;}
            $tickets[]=$entry;
        }
        respond(['participant'=>$claim['participant']['name'],'tickets'=>$tickets,'documents'=>$documents,'skippedImages'=>$skipped]);
    }
    if($method==='GET'&&preg_match('#^/admin/submissions/([^/]+)/(tickets/[1-9][0-9]*|documents/(?:ticket-[1-9][0-9]*|boarding-[1-9][0-9]*-[1-9][0-9]*))$#',$path,$m)){
        $row=saved_submission(rawurldecode($m[1]));$claim=json_decode($row['data'],true);
        $key=str_starts_with($m[2],'tickets/')?'ticket-'.substr($m[2],8):substr($m[2],10);
        $docs=array_column(supporting_documents($claim),null,'key');if(!isset($docs[$key]))fail('Document not found.',404);
        $matches=glob(dirname($row['pdf_path']).'/'.$key.'.*')?:[];if(count($matches)!==1)fail('Original document is unavailable.',404);
        $type=upload_type($matches[0],$docs[$key]['filename']);
        if(str_starts_with($m[2],'tickets/')&&$type!=='application/pdf')fail('Only PDF tickets are scanned. Images are excluded.',415);
        header('Content-Type: '.$type);header('Content-Disposition: attachment');readfile($matches[0]);exit;
    }
    if($method==='PUT'&&preg_match('#^/admin/submissions/([^/]+)/green-travel$#',$path,$m)) {
        $row=saved_submission(rawurldecode($m[1]));$claim=json_decode($row['data'],true);$body=request_json();
        if(!is_bool($body['greenTravel']??null))fail('Choose the green travel option.',422);
        $reason=text_value($body['reason']??null,'correction reason',500);$value=$body['greenTravel'];
        foreach($claim['tickets'] as $ticket){
            if($value&&$ticket['mode']==='Flight')fail('Green travel cannot be selected when the claim contains flights.',422);
            if(!$value&&in_array($ticket['mode'],['Food','Accommodation'],true))fail('Food and accommodation receipts require green travel. Review those expenses before changing this option.',422);
        }
        $transport=array_values(array_filter($claim['tickets'],fn($ticket)=>!in_array($ticket['mode'],['Food','Accommodation'],true)));
        if(!$value&&count($transport)>0&&count(array_filter($transport,fn($ticket)=>!in_array($ticket['mode'],['Car','Bus','Train'],true)))===0)fail('Green travel cannot be disabled when all transport is by car, bus, or train.',422);
        if($value!==($claim['participant']['greenTravel']??false)){
            $claim['greenTravelCorrections'][]=['previous'=>$claim['participant']['greenTravel']??false,'value'=>$value,'reason'=>$reason,'correctedAt'=>gmdate('Y-m-d\TH:i:s\Z')];
            $claim['participant']['greenTravel']=$value;
        }
        $dir=dirname($row['pdf_path']);$files=saved_ticket_files($claim,$dir);$claim['signatureBytes']=base64_decode(substr($claim['signature'],22),true);
        generate_claim_pdf($claim,$files,$dir);unset($claim['signatureBytes']);
        $stmt=db()->prepare("UPDATE submissions SET data=? WHERE id=? AND status='complete' AND data=?");$stmt->execute([json_encode($claim,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),$claim['id'],$row['data']]);
        if(!$stmt->rowCount())fail('This submission changed. Refresh before correcting it again.',409);
        respond($claim);
    }
    if($method==='PUT'&&preg_match('#^/admin/submissions/([^/]+)/extra$#',$path,$m)) {
        $row=saved_submission(rawurldecode($m[1]));$claim=json_decode($row['data'],true);$body=request_json();
        $claim['extraCents']=money_cents($body['extraCents']??null);$claim['extraNote']=optional_text($body['note']??'',1000);$claim['extraApprovedAt']=gmdate('Y-m-d\TH:i:s\Z');
        $dir=dirname($row['pdf_path']);$files=saved_ticket_files($claim,$dir);
        $claim['signatureBytes']=base64_decode(substr($claim['signature'],22),true);
        generate_claim_pdf($claim,$files,$dir);unset($claim['signatureBytes']);
        $stmt=db()->prepare("UPDATE submissions SET data=? WHERE id=? AND status='complete' AND data=?");$stmt->execute([json_encode($claim,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),$claim['id'],$row['data']]);
        if (!$stmt->rowCount()) fail('This submission changed. Refresh before approving again.',409);
        respond($claim);
    }
    if($method==='DELETE'&&preg_match('#^/admin/submissions/([^/]+)$#',$path,$m)) {
        $id=rawurldecode($m[1]);$stmt=db()->prepare('SELECT * FROM submissions WHERE id=?');$stmt->execute([$id]);$row=$stmt->fetch();if(!$row)fail('Submission not found.',404);
        if(!in_array($row['status'],['complete','deleting'],true))fail('This submission is still processing. Please retry after it completes.',409);
        db()->prepare("UPDATE submissions SET status='deleting' WHERE id=?")->execute([$id]);
        $dir=dirname($row['pdf_path']);foreach(glob($dir.'/*')?:[] as $file) if(is_file($file)&&!unlink($file))fail('Could not delete all submission files. Please retry.',503);
        if(is_dir($dir)&&!rmdir($dir))fail('Could not remove submission storage. Please retry.',503);
        db()->prepare('DELETE FROM submissions WHERE id=?')->execute([$id]);respond(['ok'=>true]);
    }
    if(in_array($method,['GET','POST'],true)&&preg_match('#^/admin/submissions/([^/]+)/pdf$#',$path,$m)) {
        $row=saved_submission(rawurldecode($m[1]));$claim=json_decode($row['data'],true);$dir=dirname($row['pdf_path']);
        $claim['signatureBytes']=base64_decode(substr($claim['signature'],22),true);
        $files=saved_ticket_files($claim,$dir);
        if($method==='POST')foreach($files as &$file){
            $upload=$_FILES[$file['key']]??null;
            if(is_array($upload)&&($upload['error']??-1)===UPLOAD_ERR_OK&&is_uploaded_file($upload['tmp_name'])){
                $type=upload_type($upload['tmp_name']);
                if(in_array($type,['application/pdf','image/png','image/jpeg'],true)){$file['originalPath']=$file['path'];$file['path']=$upload['tmp_name'];$file['type']=$type;}
            }
        }unset($file);
        $warnings=[];$pdf=generate_claim_pdf($claim,$files,$dir,$warnings);
        $notice=array_slice($warnings,0,10);
        if(count($warnings)>10)$notice[]=['key'=>'generation','filename'=>'Supporting documents','message'=>'Additional document warnings are shown inside the generated PDF.'];
        header('X-Document-Warnings: '.rawurlencode(json_encode($notice,JSON_UNESCAPED_UNICODE)));
        header('Content-Type: application/pdf');header("Content-Disposition: attachment; filename=\"Reimbursement Declaration.pdf\"; filename*=UTF-8''".rawurlencode(pdf_filename($claim)));header('Content-Length: '.strlen($pdf));echo $pdf;exit;
    }
    fail('Endpoint not found.',404);
} catch(PDOException $e){error_log('Reimbursement database failure: '.$e->getCode());fail('The reimbursement service is temporarily unavailable. Your form is still here; please retry.',503);}
catch(Throwable $e){error_log('Reimbursement failure: '.get_class($e));fail('The reimbursement document could not be prepared. Please retry.',503);}
