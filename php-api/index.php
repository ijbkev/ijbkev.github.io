<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib.php';
require_once __DIR__ . '/pdf.php';

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
        $id=rawurldecode($m[1]);rate_limit("organisation-unlock:$id",10);$row=enabled_settings($id);$body=request_json();$code=$body['code']??'';
        if(!is_string($code)||strlen($code)>128||empty($row['organisation_access_hash'])||!verify_secret($code,$row['organisation_access_hash']))fail('Incorrect partner organisation access code.',401);
        new_session('organisation',$id);respond(['ok'=>true]);
    }
    if ($method==='GET' && preg_match('#^/projects/([^/]+)/session$#',$path,$m)) { $id=rawurldecode($m[1]); require_session($id); respond(public_settings(enabled_settings($id))); }
    if ($method==='GET' && preg_match('#^/projects/([^/]+)/organisation-session$#',$path,$m)) { $id=rawurldecode($m[1]);require_session($id,'organisation');respond(public_settings(enabled_settings($id))); }
    if ($method==='GET' && preg_match('#^/projects/([^/]+)/organisation-form$#',$path,$m)) { $id=rawurldecode($m[1]);require_session($id,'organisation');respond(organisation_form_data($id,(string)($_GET['country']??''))); }
    if ($method==='GET' && preg_match('#^/projects/([^/]+)/rate$#',$path,$m)) { $id=rawurldecode($m[1]); require_session($id); enabled_settings($id); rate_limit('rates',300); respond(historical_rate((string)($_GET['currency']??''),(string)($_GET['date']??''))); }
    if ($method==='POST' && preg_match('#^/projects/([^/]+)/organisation-declarations$#',$path,$m)) {
        $id=rawurldecode($m[1]);require_session($id,'organisation');rate_limit("organisation-submit:$id",10);$row=enabled_settings($id);$input=parse_organisation_declaration(request_json(),json_decode($row['countries'],true));$source=organisation_form_data($id,$input['country']);
        if(!count($source['participants']))fail('No completed participant reimbursements were found for this country.',422);
        $declarationId=uuid4();$createdAt=gmdate('Y-m-d\TH:i:s\Z');$saved=array_merge($source,$input,['id'=>$declarationId,'projectId'=>$id,'createdAt'=>$createdAt]);
        try{db()->prepare('INSERT INTO organisation_declarations(id,project_id,country,organisation_name,legal_representative_name,total_cents,data,created_at)VALUES(?,?,?,?,?,?,?,?)')->execute([$declarationId,$id,$input['country'],$input['organisationName'],$input['legalRepresentativeName'],$source['totalCents'],json_encode($saved,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),$createdAt]);}
        catch(PDOException $e){if($e->getCode()==='23000')fail('An organisation declaration has already been submitted for this country.',409);throw $e;}
        respond(['id'=>$declarationId,'country'=>$input['country'],'totalCents'=>$source['totalCents'],'createdAt'=>$createdAt],201);
    }
    if ($method==='POST' && preg_match('#^/projects/([^/]+)/partnership-agreements$#',$path,$m)) {
        $id=rawurldecode($m[1]);require_session($id,'organisation');rate_limit("partnership-submit:$id",10);$row=enabled_settings($id);$input=parse_partnership_agreement(request_json(),json_decode($row['countries'],true));$agreementId=uuid4();$createdAt=gmdate('Y-m-d\TH:i:s\Z');$saved=array_merge($input,['id'=>$agreementId,'projectId'=>$id,'projectName'=>project($id)['title'],'projectCode'=>$row['project_code'],'createdAt'=>$createdAt]);
        try{db()->prepare('INSERT INTO partnership_agreements(id,project_id,partner_country,partner_name,legal_representative_name,data,created_at)VALUES(?,?,?,?,?,?,?)')->execute([$agreementId,$id,$input['partnerCountry'],$input['partnerName'],$input['legalRepresentativeName'],json_encode($saved,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),$createdAt]);}catch(PDOException $e){if($e->getCode()==='23000')fail('A partnership agreement has already been submitted for this country.',409);throw $e;}respond(['id'=>$agreementId,'partnerCountry'=>$input['partnerCountry'],'createdAt'=>$createdAt],201);
    }
    if($method==='GET'&&preg_match('#^/projects/([^/]+)/partnership-agreements/([^/]+)/pdf$#',$path,$m)){$id=rawurldecode($m[1]);require_session($id,'organisation');$stmt=db()->prepare('SELECT data FROM partnership_agreements WHERE id=? AND project_id=?');$stmt->execute([rawurldecode($m[2]),$id]);$raw=$stmt->fetchColumn();if(!$raw)fail('Partnership agreement not found.',404);$data=json_decode($raw,true);$pdf=generate_partnership_agreement_pdf($data);$filename='Partnership Agreement - '.$data['partnerName'].' - '.$data['partnerCountry'].'.pdf';header('Content-Type: application/pdf');header("Content-Disposition: attachment; filename*=UTF-8''".rawurlencode($filename));header('Content-Length: '.strlen($pdf));echo $pdf;exit;}

    if ($method==='POST' && preg_match('#^/projects/([^/]+)/submissions$#',$path,$m)) {
        $id=rawurldecode($m[1]); $sessionHash=require_session($id); $row=enabled_settings($id); $project=project($id); rate_limit("submit:$id",30);
        if (!str_starts_with($_SERVER['CONTENT_TYPE']??'','multipart/form-data;')) fail('Upload the reimbursement form with its ticket files.',415);
        try { $raw=json_decode((string)($_POST['claim']??''),true,32,JSON_THROW_ON_ERROR); } catch(Throwable){ fail('Missing or invalid reimbursement form.',422); }
        $input=parse_claim($raw,json_decode($row['countries'],true));
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
            db()->prepare("UPDATE submissions SET status='complete' WHERE id=?")->execute([$claimId]);respond(array_merge(['id'=>$claimId,'reference'=>$claim['reference'],'totalCents'=>$total],reimbursement_totals($claim)),201);
        }catch(Throwable $e){db()->prepare('DELETE FROM submissions WHERE id=?')->execute([$claimId]);foreach(glob($claimDir.'/*')?:[] as $f)@unlink($f);@rmdir($claimDir);error_log('Reimbursement PDF/storage failure: '.get_class($e));fail('The submission could not be saved. Please retry; document editing or PDF versions do not prevent submission.',422);}
    }

    if($method==='POST'&&$path==='/admin/login'){rate_limit('admin-login',8);$body=request_json();$pw=$body['password']??'';if(!is_string($pw)||!verify_secret($pw,IJBK_ADMIN_PASSWORD_HASH))fail('Incorrect administrator password.',401);new_session('admin');respond(['ok'=>true]);}
    if(str_starts_with($path,'/admin/'))$adminHash=require_session();
    if($method==='GET'&&$path==='/admin/session')respond(['ok'=>true]);
    if($method==='POST'&&$path==='/admin/logout'){db()->prepare('DELETE FROM sessions WHERE token_hash=?')->execute([$adminHash]);setcookie(cookie_name(),'',time()-3600,'/api');respond(['ok'=>true]);}
    if($method==='GET'&&$path==='/admin/projects'){$rows=db()->query('SELECT * FROM project_settings')->fetchAll();$map=[];foreach($rows as $r)$map[$r['project_id']]=$r;$out=[];foreach(projects() as $p)$out[]=array_merge($p,['category'=>'Erasmus+ Youth Exchange','status'=>'Upcoming','statusTone'=>'warning','date'=>'','location'=>'','description'=>'','highlights'=>[],'coverImage'=>'','coverAlt'=>'','settings'=>public_settings($map[$p['id']]??null)]);respond($out);}
    if($method==='PUT'&&preg_match('#^/admin/projects/([^/]+)$#',$path,$m)){$id=rawurldecode($m[1]);$old=settings($id);$body=request_json();$projectCode=text_value($body['projectCode']??null,'project code',120);$countries=$body['countries']??null;if(!is_array($countries)||count($countries)<1||count($countries)>40)fail('Add participating countries.',422);$countries=array_map(fn($c)=>text_value($c,'country',80),$countries);if(count(array_unique(array_map('mb_strtolower',$countries)))!==count($countries))fail('Remove duplicate countries.',422);$details=parse_project_details($body,$countries);$access=$body['accessCode']??null;$hash=$old['access_hash']??null;if(is_string($access)&&$access!==''){if(strlen($access)<8||strlen($access)>128)fail('Use an access code of 8 to 128 characters.',422);$hash=password_hash($access,PASSWORD_ARGON2ID);}$organisationAccess=$body['organisationAccessCode']??null;$organisationHash=$old['organisation_access_hash']??null;if(is_string($organisationAccess)&&$organisationAccess!==''){if(strlen($organisationAccess)<8||strlen($organisationAccess)>128)fail('Use a partner organisation access code of 8 to 128 characters.',422);$organisationHash=password_hash($organisationAccess,PASSWORD_ARGON2ID);}if(!$hash)fail('Set a participant access code for this project.',422);$enabled=($body['enabled']??false)===true?1:0;db()->beginTransaction();db()->prepare('INSERT INTO project_settings(project_id,project_code,countries,access_hash,organisation_access_hash,enabled)VALUES(?,?,?,?,?,?) ON CONFLICT(project_id)DO UPDATE SET project_code=excluded.project_code,countries=excluded.countries,access_hash=excluded.access_hash,organisation_access_hash=excluded.organisation_access_hash,enabled=excluded.enabled')->execute([$id,$projectCode,json_encode($countries,JSON_UNESCAPED_UNICODE),$hash,$organisationHash,$enabled]);db()->prepare('INSERT INTO project_details(project_id,data)VALUES(?,?) ON CONFLICT(project_id)DO UPDATE SET data=excluded.data')->execute([$id,json_encode($details,JSON_UNESCAPED_UNICODE)]);if(($access??'')!==''||($organisationAccess??'')!==''||!$enabled)db()->prepare('DELETE FROM sessions WHERE project_id=?')->execute([$id]);db()->commit();respond(public_settings(settings($id)));}
    if($method==='GET'&&preg_match('#^/admin/projects/([^/]+)/submissions$#',$path,$m)){$id=rawurldecode($m[1]);project($id);$stmt=db()->prepare("SELECT id,name,team,email,total_cents AS totalCents,created_at AS createdAt,data FROM submissions WHERE project_id=? AND status='complete' ORDER BY created_at DESC");$stmt->execute([$id]);$rows=$stmt->fetchAll();foreach($rows as &$summary){$claim=json_decode($summary['data'],true);unset($summary['data']);$summary['reference']=claim_reference($claim);$summary['finalCents']=reimbursement_totals($claim)['finalCents'];}unset($summary);respond($rows);}
    if($method==='GET'&&preg_match('#^/admin/projects/([^/]+)/organisation-declarations$#',$path,$m)){$id=rawurldecode($m[1]);project($id);$stmt=db()->prepare('SELECT id,project_id AS projectId,country,organisation_name AS organisationName,legal_representative_name AS legalRepresentativeName,total_cents AS totalCents,created_at AS createdAt FROM organisation_declarations WHERE project_id=? ORDER BY country');$stmt->execute([$id]);respond($stmt->fetchAll());}
    if($method==='GET'&&preg_match('#^/admin/projects/([^/]+)/partnership-agreements$#',$path,$m)){$id=rawurldecode($m[1]);project($id);$stmt=db()->prepare('SELECT id,project_id AS projectId,partner_country AS partnerCountry,partner_name AS partnerName,legal_representative_name AS legalRepresentativeName,created_at AS createdAt FROM partnership_agreements WHERE project_id=? ORDER BY partner_country');$stmt->execute([$id]);respond($stmt->fetchAll());}
    if($method==='GET'&&preg_match('#^/admin/organisation-declarations/([^/]+)/pdf$#',$path,$m)){$stmt=db()->prepare('SELECT data FROM organisation_declarations WHERE id=?');$stmt->execute([rawurldecode($m[1])]);$raw=$stmt->fetchColumn();if(!$raw)fail('Organisation declaration not found.',404);$data=json_decode($raw,true);$pdf=generate_organisation_declaration_pdf($data);$filename='Reimbursement Declaration - '.$data['organisationName'].' - '.$data['country'].'.pdf';header('Content-Type: application/pdf');header("Content-Disposition: attachment; filename*=UTF-8''".rawurlencode($filename));header('Content-Length: '.strlen($pdf));echo $pdf;exit;}
    if($method==='GET'&&preg_match('#^/admin/partnership-agreements/([^/]+)/pdf$#',$path,$m)){$stmt=db()->prepare('SELECT data FROM partnership_agreements WHERE id=?');$stmt->execute([rawurldecode($m[1])]);$raw=$stmt->fetchColumn();if(!$raw)fail('Partnership agreement not found.',404);$data=json_decode($raw,true);$pdf=generate_partnership_agreement_pdf($data);$filename='Partnership Agreement - '.$data['partnerName'].' - '.$data['partnerCountry'].'.pdf';header('Content-Type: application/pdf');header("Content-Disposition: attachment; filename*=UTF-8''".rawurlencode($filename));header('Content-Length: '.strlen($pdf));echo $pdf;exit;}
    if($method==='DELETE'&&preg_match('#^/admin/organisation-declarations/([^/]+)$#',$path,$m)){$stmt=db()->prepare('DELETE FROM organisation_declarations WHERE id=?');$stmt->execute([rawurldecode($m[1])]);if(!$stmt->rowCount())fail('Organisation declaration not found.',404);respond(['ok'=>true]);}
    if($method==='DELETE'&&preg_match('#^/admin/partnership-agreements/([^/]+)$#',$path,$m)){$stmt=db()->prepare('DELETE FROM partnership_agreements WHERE id=?');$stmt->execute([rawurldecode($m[1])]);if(!$stmt->rowCount())fail('Partnership agreement not found.',404);respond(['ok'=>true]);}
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
