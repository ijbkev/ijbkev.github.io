<?php
declare(strict_types=1);

function respond(array $data, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(string $message, int $status = 400): never { respond(['error' => $message], $status); }

function storage_dir(): string {
    $override = getenv('IJBK_STORAGE_DIR');
    $dir = $override !== false && $override !== '' ? $override : dirname(__DIR__, 2) . '/reimbursement';
    if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) fail('The reimbursement storage could not be initialized.', 503);
    return $dir;
}

function db(): PDO {
    static $db;
    if ($db instanceof PDO) return $db;
    $db = new PDO('sqlite:' . storage_dir() . '/reimbursement.sqlite3', null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_TIMEOUT => 15,
    ]);
    $db->exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=15000');
    $schema = [
        'CREATE TABLE IF NOT EXISTS project_details (project_id TEXT PRIMARY KEY, data TEXT NOT NULL)',
        'CREATE TABLE IF NOT EXISTS project_settings (project_id TEXT PRIMARY KEY, project_code TEXT NOT NULL, countries TEXT NOT NULL, access_hash TEXT, enabled INTEGER NOT NULL DEFAULT 0)',
        'CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, role TEXT NOT NULL, project_id TEXT, expires_at INTEGER NOT NULL)',
        'CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_id)',
        "CREATE TABLE IF NOT EXISTS submissions (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, request_id TEXT NOT NULL, session_hash TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'processing', name TEXT NOT NULL, team TEXT NOT NULL, email TEXT NOT NULL, total_cents INTEGER NOT NULL, data TEXT NOT NULL, pdf_path TEXT NOT NULL, created_at TEXT NOT NULL)",
        'CREATE INDEX IF NOT EXISTS idx_submissions_project_created ON submissions(project_id, created_at)',
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_request ON submissions(project_id, request_id)',
        "CREATE TABLE IF NOT EXISTS organisation_declarations (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, country TEXT NOT NULL, organisation_name TEXT NOT NULL, legal_representative_name TEXT NOT NULL, total_cents INTEGER NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL)",
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_organisation_declarations_project_country ON organisation_declarations(project_id, country)',
        "CREATE TABLE IF NOT EXISTS partnership_agreements (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, partner_country TEXT NOT NULL, partner_name TEXT NOT NULL, legal_representative_name TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL)",
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_partnership_agreements_project_country ON partnership_agreements(project_id, partner_country)',
        'CREATE TABLE IF NOT EXISTS rate_cache (cache_key TEXT PRIMARY KEY, rate REAL NOT NULL, rate_date TEXT NOT NULL, source TEXT NOT NULL)',
        'CREATE TABLE IF NOT EXISTS rate_limits (limit_key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL)',
    ];
    foreach ($schema as $sql) $db->exec($sql);
    $columns=$db->query('PRAGMA table_info(project_settings)')->fetchAll();
    if(!in_array('organisation_access_hash',array_column($columns,'name'),true))$db->exec('ALTER TABLE project_settings ADD COLUMN organisation_access_hash TEXT');
    if (random_int(1, 100) === 1) {
        $stmt = $db->prepare('DELETE FROM sessions WHERE expires_at < ?'); $stmt->execute([time()]);
        $stmt = $db->prepare('DELETE FROM rate_limits WHERE expires_at < ?'); $stmt->execute([time()]);
    }
    return $db;
}

function projects(): array {
    static $projects;
    if ($projects === null) $projects = json_decode((string) file_get_contents(__DIR__ . '/projects.json'), true, 32, JSON_THROW_ON_ERROR);
    return $projects;
}

function project(string $id): array {
    foreach (projects() as $project) if ($project['id'] === $id) return $project;
    fail('Project not found.', 404);
}

function request_json(): array {
    try { $body = json_decode((string) file_get_contents('php://input'), true, 32, JSON_THROW_ON_ERROR); }
    catch (Throwable) { fail('The request could not be read.', 400); }
    if (!is_array($body)) fail('The request could not be read.', 400);
    return $body;
}

function origin_guard(): void {
    if (in_array($_SERVER['REQUEST_METHOD'] ?? 'GET', ['GET', 'HEAD', 'OPTIONS'], true)) return;
    $host = $_SERVER['HTTP_HOST'] ?? '';
    $scheme = request_is_https() ? 'https' : 'http';
    if ($host === '' || ($_SERVER['HTTP_ORIGIN'] ?? '') !== $scheme . '://' . $host || ($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') === 'cross-site') fail('Please submit from the project website.', 403);
}

function text_value(mixed $value, string $label, int $max = 160): string {
    if (!is_string($value)) fail("$label is required.", 422);
    $value = trim($value);
    if ($value === '' || mb_strlen($value) > $max || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u', $value)) fail("Invalid $label.", 422);
    return $value;
}

function valid_date(mixed $value, string $label): string {
    if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) fail("Invalid $label.", 422);
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value, new DateTimeZone('UTC'));
    if (!$date || $date->format('Y-m-d') !== $value) fail("Invalid $label.", 422);
    return $value;
}

function verify_secret(string $value, string $stored): bool {
    if (str_contains($stored, ':')) {
        [$salt, $hash] = explode(':', $stored, 2);
        return hash_equals($hash, hash_pbkdf2('sha256', $value, $salt, 100000, 64, false));
    }
    return password_verify($value, $stored);
}

function request_is_https(): bool {
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https';
}

function cookie_name(?string $projectId = null, string $role = 'participant'): string { return $projectId ? 'ijbk_' . $role . '_project_' . preg_replace('/[^a-z0-9_-]/i', '_', $projectId) : 'ijbk_admin'; }

function new_session(string $role, ?string $projectId = null): void {
    $token = bin2hex(random_bytes(48));
    $stmt = db()->prepare('INSERT INTO sessions(token_hash, role, project_id, expires_at) VALUES(?, ?, ?, ?)');
    $stmt->execute([hash('sha256', $token), $role, $projectId, time() + 28800]);
    setcookie(cookie_name($projectId,$role), $token, ['expires' => time() + 28800, 'path' => '/api', 'secure' => request_is_https(), 'httponly' => true, 'samesite' => 'Strict']);
}

function require_session(?string $projectId = null, string $projectRole = 'participant'): string {
    $token = $_COOKIE[cookie_name($projectId,$projectRole)] ?? '';
    if (!is_string($token) || strlen($token) !== 96) fail($projectId ? 'Enter the project access code to continue.' : 'Administrator sign-in required.', 401);
    $hash = hash('sha256', $token);
    $stmt = db()->prepare('SELECT role, project_id, expires_at FROM sessions WHERE token_hash = ?'); $stmt->execute([$hash]); $session = $stmt->fetch();
    $role = $projectId ? $projectRole : 'admin';
    if (!$session || $session['role'] !== $role || $session['project_id'] !== $projectId || (int) $session['expires_at'] < time()) fail('Your session expired. Sign in again; your form is still here.', 401);
    return $hash;
}

function rate_limit(string $scope, int $limit, int $seconds = 900): void {
    $bucket = intdiv(time(), $seconds); $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $key = hash('sha256', "$scope:$ip:$bucket"); $expires = ($bucket + 1) * $seconds;
    db()->prepare('INSERT INTO rate_limits(limit_key, count, expires_at) VALUES(?, 1, ?) ON CONFLICT(limit_key) DO UPDATE SET count=count+1')->execute([$key, $expires]);
    $stmt = db()->prepare('SELECT count FROM rate_limits WHERE limit_key=?'); $stmt->execute([$key]);
    if ((int) $stmt->fetchColumn() > $limit) fail('Too many attempts. Please wait 15 minutes and try again.', 429);
}

function settings(string $id): ?array { project($id); $stmt = db()->prepare('SELECT * FROM project_settings WHERE project_id=?'); $stmt->execute([$id]); return $stmt->fetch() ?: null; }
function public_settings(?array $row): array { $details=[]; if ($row) { $stmt=db()->prepare('SELECT data FROM project_details WHERE project_id=?'); $stmt->execute([$row['project_id']]); $raw=$stmt->fetchColumn(); if ($raw) $details=json_decode($raw,true); } return array_merge($details, ['projectCode' => $row['project_code'] ?? '', 'countries' => isset($row['countries']) ? json_decode($row['countries'], true) : [], 'enabled' => !empty($row['enabled']) && !empty($row['access_hash']), 'organisationEnabled' => !empty($row['enabled']) && !empty($row['organisation_access_hash']), 'hasAccessCode' => !empty($row['access_hash']), 'hasOrganisationAccessCode' => !empty($row['organisation_access_hash'])]); }
function enabled_settings(string $id): array { $row = settings($id); if (!$row || empty($row['enabled']) || empty($row['access_hash'])) fail('Reimbursement is not open for this project. Please contact the organizer.', 403); return $row; }

function historical_rate(string $currency, string $date): array {
    $allowed = ['EUR','CZK','DKK','HUF','PLN','RON','NOK','SEK','TRY'];
    if (!in_array($currency, $allowed, true)) fail('Unsupported purchase currency.', 422);
    valid_date($date, 'purchase date');
    if ($date < '1999-01-04' || $date > gmdate('Y-m-d')) fail('Purchase date must be between 4 January 1999 and today.', 422);
    if ($currency === 'EUR') return ['currency'=>'EUR','requestedDate'=>$date,'rateDate'=>$date,'rate'=>1.0,'source'=>'EUR (no conversion)'];
    $key = "$currency:$date"; $stmt = db()->prepare('SELECT rate, rate_date, source FROM rate_cache WHERE cache_key=?'); $stmt->execute([$key]);
    if ($cached = $stmt->fetch()) return ['currency'=>$currency,'requestedDate'=>$date,'rateDate'=>$cached['rate_date'],'rate'=>(float)$cached['rate'],'source'=>$cached['source']];
    $url = 'https://api.frankfurter.dev/v2/rate/' . rawurlencode($currency) . '/EUR?date=' . rawurlencode($date) . '&providers=ECB';
    $ch = curl_init($url); curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true,CURLOPT_CONNECTTIMEOUT=>5,CURLOPT_TIMEOUT=>12,CURLOPT_FOLLOWLOCATION=>false,CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_HTTPHEADER=>['Accept: application/json']]);
    $raw = curl_exec($ch); $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE); curl_close($ch);
    $data = is_string($raw) ? json_decode($raw, true) : null;
    $rateDate = $data['date'] ?? ''; $distance = strtotime($date . ' UTC') - strtotime($rateDate . ' UTC'); $rate = (float)($data['rate'] ?? 0);
    if ($status !== 200 || ($data['base'] ?? '') !== $currency || ($data['quote'] ?? '') !== 'EUR' || $rate <= 0 || $distance < 0 || $distance > 604800) fail("No historical $currency/EUR rate is available for $date. Please retry later; no current rate has been substituted.", 503);
    $source = 'European Central Bank via Frankfurter';
    if ($date < gmdate('Y-m-d')) db()->prepare('INSERT OR IGNORE INTO rate_cache(cache_key, rate, rate_date, source) VALUES(?,?,?,?)')->execute([$key,$rate,$rateDate,$source]);
    return ['currency'=>$currency,'requestedDate'=>$date,'rateDate'=>$rateDate,'rate'=>$rate,'source'=>$source];
}

function uuid4(): string { $b = random_bytes(16); $b[6] = chr((ord($b[6]) & 0x0f) | 0x40); $b[8] = chr((ord($b[8]) & 0x3f) | 0x80); return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4)); }
function is_uuid(mixed $v): bool { return is_string($v) && preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $v) === 1; }

function parse_claim(array $input, array $countries): array {
    if (!is_uuid($input['requestId'] ?? null)) fail('Invalid submission reference.', 422);
    $p = $input['participant'] ?? null; if (!is_array($p)) fail('Participant details are required.', 422);
    $participant = [
        'firstName'=>text_value($p['firstName']??null,'first name',80),'lastName'=>text_value($p['lastName']??null,'surname',80),
        'city'=>text_value($p['city']??null,'city of residence',120),
        'arrivalDate'=>valid_date($p['arrivalDate']??null,'arrival date'),'departureDate'=>valid_date($p['departureDate']??null,'departure date'),
        'role'=>$p['role']??'', 'notes'=>optional_text($p['notes']??'',2000),
        'greenTravel'=>($p['greenTravel']??false)===true,
        'bankName'=>text_value($p['bankName']??null,'bank name'),'accountHolder'=>text_value($p['accountHolder']??null,'account holder'),
        'signaturePlace'=>text_value($p['signaturePlace']??null,'place of signature',120),
        'citizenship'=>text_value($p['citizenship']??null,'citizenship',80),'team'=>text_value($p['team']??null,'country of residence',80),
        'dateOfBirth'=>valid_date($p['dateOfBirth']??null,'date of birth'),'email'=>filter_var($p['email']??'',FILTER_VALIDATE_EMAIL)?text_value($p['email'],'email',254):fail('Enter a valid email.',422),
        'phone'=>text_value($p['phone']??null,'phone number',40),'bankAccount'=>text_value($p['bankAccount']??null,'bank account / IBAN',80),
        'bic'=>strtoupper(text_value($p['bic']??null,'BIC / SWIFT',11)),'bankAddress'=>optional_text($p['bankAddress']??'',500),'address'=>text_value($p['address']??null,'participant address',500),
    ];
    $participant['name']=$participant['firstName'].' '.$participant['lastName'];
    if (!in_array($participant['role'],['Participant','Team Leader','Facilitator'],true)) fail('Select a valid role.',422);
    if ($participant['departureDate']<$participant['arrivalDate']) fail('Departure date cannot be before the arrival date.',422);
    if (!in_array($participant['team'], $countries, true)) fail('Select one of this project’s participating countries.', 422);
    if ($participant['dateOfBirth'] < '1900-01-01' || $participant['dateOfBirth'] >= gmdate('Y-m-d')) fail('Enter a valid date of birth.',422);
    if (!preg_match('/^\+?[0-9 ()\-.]{6,40}$/',$participant['phone'])) fail('Enter a valid phone number.',422);
    if (!preg_match('/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/',$participant['bic'])) fail('BIC must contain 8 or 11 letters and numbers.',422);
    $tickets = $input['tickets'] ?? null; if (!is_array($tickets) || count($tickets)<1 || count($tickets)>30) fail('Add between 1 and 30 tickets.',422);
    $parsed=[];
    foreach ($tickets as $i=>$ticket) {
        if (!is_array($ticket)) fail('Invalid ticket ' . ($i+1) . '.',422);
        $purchase=valid_date($ticket['purchaseDate']??null,'ticket purchase date'); $travel=valid_date($ticket['travelDate']??null,'travel date');
        if ($travel<$purchase) fail('Travel date cannot be before the purchase date.',422);
        $mode=$ticket['mode']??''; if (!in_array($mode,['Car','Bus','Train','Flight'],true)) fail('Invalid mode of travel.',422);
        if ($participant['greenTravel'] && $mode === 'Flight') fail('Green travel cannot be selected when any mode of travel is Flight.',422);
        $ticketType=$ticket['ticketType']??''; if (!in_array($ticketType,['Paper ticket','Electronic ticket'],true)) fail('Select paper or electronic ticket.',422);
        $amount=$ticket['amount']??0; if (!is_int($amount)&&!is_float($amount)) fail('Enter a valid ticket amount.',422); $amount=(float)$amount;
        if ($amount<=0||$amount>100000000||abs($amount*100-round($amount*100))>0.00001) fail('Ticket amount must be positive and use at most two decimals.',422);
        $rate=historical_rate((string)($ticket['currency']??''),$purchase);
        $journeyType=$ticket['journeyType']??'one-way';
        if(!in_array($journeyType,['one-way','round-trip'],true))fail('Invalid flight booking type.',422);
        $passes=$ticket['boardingPasses']??[];$boarding=[];
        if(!is_array($passes)||count($passes)>24)fail('Use at most 24 boarding passes per booking.',422);
        if($mode!=='Flight'&&count($passes))fail('Boarding passes must belong to a flight.',422);
        $counts=['outbound'=>0,'return'=>0];
        foreach($passes as $pass){
            $journey=$pass['journey']??'';
            if(!in_array($journey,['outbound','return'],true)||($journey==='return'&&$journeyType!=='round-trip'))fail('Invalid boarding-pass journey.',422);
            if(++$counts[$journey]>12)fail('Use at most 12 segments per journey.',422);
            $boarding[]=['journey'=>$journey,'from'=>optional_text($pass['from']??'',120),'to'=>optional_text($pass['to']??'',120)];
        }
        $parsed[] = array_merge(['purchaseDate'=>$purchase,'travelDate'=>$travel,'from'=>text_value($ticket['from']??null,'departure',120),'to'=>text_value($ticket['to']??null,'destination',120),'mode'=>$mode,'ticketType'=>$ticketType,'amount'=>$amount],$rate,['journeyType'=>$journeyType,'connections'=>($ticket['connections']??false)===true,'boardingPasses'=>$boarding,'serial'=>$i+1,'euroCents'=>(int)round($amount*$rate['rate']*100)]);
    }
    $signature=$input['signature']??''; if (!is_string($signature)||strlen($signature)>300000||!str_starts_with($signature,'data:image/png;base64,')) fail('Draw your signature before submitting.',422);
    $decoded=base64_decode(substr($signature,22),true); if ($decoded===false||!str_starts_with($decoded,"\x89PNG\r\n\x1a\n")) fail('The signature could not be read.',422);
    if (($input['declaration']??null)!==true) fail('Confirm the declaration before submitting.',422);
    return ['requestId'=>$input['requestId'],'participant'=>$participant,'tickets'=>$parsed,'signature'=>$signature,'signatureBytes'=>$decoded,'declaration'=>true];
}

function optional_text(mixed $value, int $max): string {
    if ($value === '') return '';
    return text_value($value, 'optional text', $max);
}
function money_cents(mixed $value): int {
    if (!is_int($value) || $value < 0 || $value > 10000000000) fail('Enter a non-negative amount in cents.', 422);
    return $value;
}
function parse_project_details(array $body, array $countries): array {
    $short = strtoupper(text_value($body['shortName']??null,'short project name',30));
    if (!preg_match('/^[A-Z0-9]+$/',$short)) fail('Use a short project name without spaces or punctuation.',422);
    $limits=$body['countryLimits']??[];
    if (!is_array($limits)) fail('Set country limits.',422);
    $outCodes=[]; $outLimits=[];
    foreach($countries as $country) {
        $code=country_code($country);
        if (!is_string($code)||!preg_match('/^[A-Z]{2}$/',$code)) fail('Use a recognised country name for '.$country.'.',422);
        $outCodes[$country]=$code; $outLimits[$country]=money_cents($limits[$country]??null);
    }
    if (count(array_unique($outCodes))!==count($countries)) fail('Country codes must be unique.',422);
    $start=valid_date($body['activityStartDate']??null,'activity start date');$end=valid_date($body['activityEndDate']??null,'activity end date');
    if($end<$start)fail('Activity end date cannot precede start date.',422);
    return ['shortName'=>$short,'activityStartDate'=>$start,'activityEndDate'=>$end,'destinationCity'=>text_value($body['destinationCity']??null,'destination city',120),'countryCodes'=>$outCodes,'countryLimits'=>$outLimits];
}
function reimbursement_totals(array $claim): array {
    $standard=min($claim['totalCents'],$claim['countryLimitCents']??$claim['totalCents']); $extra=$claim['extraCents']??0;
    return ['standardCents'=>$standard,'extraCents'=>$extra,'finalCents'=>$standard+$extra];
}
function country_code(string $country): ?string {
    static $map;
    if ($map===null) { $file=__DIR__.'/countries.json'; if(!is_file($file))$file=dirname(__DIR__).'/shared/countries.json';$map=json_decode(file_get_contents($file),true); }
    return $map[mb_strtolower(trim($country))]??null;
}
function submission_reference(array $details, array $participant, string $date): string {
    $compact=fn($v)=>preg_replace('/[^\p{L}\p{N}]/u','',mb_strtoupper($v));
    return $compact($details['shortName']).'_'.$details['countryCodes'][$participant['team']].'_'.$compact($participant['firstName']).'_'.$compact($participant['lastName']).'_'.str_replace('-','_',substr($date,0,10));
}
function claim_reference(array $claim): string {
    $p=$claim['participant'];$parts=explode(' ',$p['name']);$p['firstName']=$p['firstName']??array_shift($parts);$p['lastName']=$p['lastName']??implode(' ',$parts);
    $code=country_code($p['team'])??'XX';$compact=fn($v)=>preg_replace('/[^\p{L}\p{N}-]/u','',$v);
    $suffix=$code.$compact($p['firstName']).'-'.$compact($p['lastName']);$old=$claim['reference']??'';
    $prefix=$claim['projectShortName']??(str_contains($old,'_')?explode('_',$old)[0]:(str_ends_with($old,$suffix)?substr($old,0,-strlen($suffix)):$claim['projectName']));
    return submission_reference(['shortName'=>$prefix,'countryCodes'=>[$p['team']=>$code]],$p,$claim['createdAt']);
}
function pdf_filename(array $claim): string {
    return preg_replace('/[\x00-\x1f\x7f\/\\\\:"<>|?*]/u','','Reimbursement Declaration - '.$claim['participant']['name'].' - '.$claim['participant']['team'].'.pdf');
}
function saved_submission(string $id): array {
    $stmt=db()->prepare("SELECT * FROM submissions WHERE id=? AND status='complete'");$stmt->execute([$id]);$row=$stmt->fetch();
    if (!$row) fail('Submission not found.',404);
    return $row;
}
function flight_route(array $ticket): string {
    return $ticket['from'].' → '.$ticket['to'].(($ticket['mode']==='Flight'&&($ticket['journeyType']??'')==='round-trip')?' → '.$ticket['from']:'');
}
function supporting_documents(array $claim): array {
    $documents=[];
    foreach($claim['tickets'] as $ticket){
        $documents[]=array_merge($ticket,['key'=>'ticket-'.$ticket['serial'],'label'=>'Ticket '.$ticket['serial'],'route'=>flight_route($ticket),'isBoardingPass'=>false]);
        foreach(($ticket['mode']==='Flight'?($ticket['boardingPasses']??[]):[]) as $i=>$pass){
            $documents[]=array_merge($ticket,$pass,['key'=>'boarding-'.$ticket['serial'].'-'.($i+1),'label'=>'Flight '.$ticket['serial'].' / '.($pass['journey']==='return'?'Return':'Outbound').' boarding pass '.($i+1),'route'=>($pass['from']?:'Airport not recorded').' → '.($pass['to']?:'Airport not recorded'),'filename'=>$pass['filename']??'','amount'=>0,'euroCents'=>0,'currency'=>'EUR','isBoardingPass'=>true]);
        }
    }
    return $documents;
}
function upload_type(string $path, string $filename=''): string {
    $head=file_get_contents($path,false,null,0,1024);
    if(str_contains($head?:'','%PDF-')||preg_match('/\.pdf$/i',$filename))return 'application/pdf';
    $type=(new finfo(FILEINFO_MIME_TYPE))->file($path)?:'application/octet-stream';
    if(!str_starts_with($type,'image/')){
        $extension=strtolower(pathinfo($filename,PATHINFO_EXTENSION));
        $type=['png'=>'image/png','jpg'=>'image/jpeg','jpeg'=>'image/jpeg','webp'=>'image/webp','gif'=>'image/gif','tif'=>'image/tiff','tiff'=>'image/tiff','heic'=>'image/heic','avif'=>'image/avif','bmp'=>'image/bmp'][$extension]??$type;
    }
    return $type;
}
function saved_ticket_files(array $claim, string $dir): array {
    $files=[];
    foreach(supporting_documents($claim) as $document){
        $matches=glob($dir.'/'.$document['key'].'.*')?:[];
        $path=count($matches)===1?$matches[0]:null;
        $files[]=['key'=>$document['key'],'path'=>$path,'type'=>$path?upload_type($path,$document['filename']):'application/pdf'];
    }
    return $files;
}

function declaration_text(): string {
    return implode("\n\n", [
  "I declare that all information provided is true and complete, that all tickets and supporting documents are genuine, unaltered, and relate to my travel for this project, and that these expenses have not been and will not be reimbursed from any other source.",
  "Authenticity of documents: If any document is found to be forged, falsified, Photoshopped, digitally manipulated, or otherwise intentionally altered, I understand that IJBK reserves the right to cancel my entire reimbursement.",
  "Data processing: I authorize IJBK to use the provided details to process my reimbursement.",
  "Deadline and incomplete claims: The claim and all required supporting documents must be submitted within 15 days of the last day of the activity. Claims submitted after this deadline cannot be reimbursed. If required documents are missing, IJBK will contact the participant once by email. If the missing documents are not provided within 14 days of that email, the claim will be closed.",
  "Reimbursement ceiling and actual costs: Reimbursement is limited to the applicable Erasmus+ distance-band amount based on the participant’s city of departure and only covers actual costs supported by the attached tickets, invoices, receipts, and other required evidence. Higher actual costs may be declared in full, but reimbursement will not exceed the applicable ceiling, and any amount above it is borne by the participant. In special cases, additional travel costs may be reimbursed by the organiser.",
  "Payment conditions: Payment will be made only after (a) the participant’s full attendance at the activity has been confirmed and (b) the agreed dissemination activities have been completed and validated by IJBK. The transfer will normally be made within two weeks of such validation.",
  "Transfer: Reimbursement will be made by SEPA transfer in EUR to the bank account stated in the claim. Any charges imposed by the receiving bank are borne by the participant."
]);
}

function organisation_form_data(string $projectId, string $country): array {
    $row=enabled_settings($projectId);$countries=json_decode($row['countries'],true);
    if(!is_string($country)||!in_array($country,$countries,true))fail('Select one of this project’s participating countries.',422);
    $details=parse_project_details(public_settings($row),$countries);$project=project($projectId);
    $stmt=db()->prepare("SELECT data FROM submissions WHERE project_id=? AND team=? AND status='complete' ORDER BY created_at DESC");$stmt->execute([$projectId,$country]);
    $unique=[];foreach($stmt->fetchAll() as $item){$claim=json_decode($item['data'],true);$email=mb_strtolower($claim['participant']['email']);if(!isset($unique[$email]))$unique[$email]=$claim;}
    $claims=array_values($unique);usort($claims,function($a,$b){$rank=fn($role)=>$role==='Team Leader'?0:($role==='Participant'?1:2);return $rank($a['participant']['role'])<=>$rank($b['participant']['role'])?:strcmp($a['participant']['name'],$b['participant']['name']);});
    $leader=0;$participant=0;$people=[];
    foreach($claims as $claim){$isLeader=$claim['participant']['role']==='Team Leader';$number=$isLeader?++$leader:++$participant;$people[]=['label'=>$isLeader?'Leader'.($number>1?' '.$number:''):'Participant '.$number,'name'=>$claim['participant']['name'],'role'=>$claim['participant']['role'],'reimbursementCents'=>reimbursement_totals($claim)['finalCents']];}
    return array_merge($details,['projectName'=>$project['title'],'projectCode'=>$row['project_code'],'countries'=>$countries,'country'=>$country,'participants'=>$people,'totalCents'=>array_sum(array_column($people,'reimbursementCents'))]);
}

function parse_organisation_declaration(array $body,array $countries): array {
    if(!is_uuid($body['requestId']??null))fail('Invalid submission reference.',422);
    $country=text_value($body['country']??null,'country',80);if(!in_array($country,$countries,true))fail('Select one of this project’s participating countries.',422);
    $date=valid_date($body['signatureDate']??null,'signature date');if($date>gmdate('Y-m-d'))fail('Signature date cannot be in the future.',422);
    $swift=strtoupper(text_value($body['swift']??null,'SWIFT / BIC',11));if(!preg_match('/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/',$swift))fail('SWIFT must contain 8 or 11 letters and numbers.',422);
    $submitterRole=$body['submitterRole']??'';if(!in_array($submitterRole,['team-leader','sending-organisation-member'],true))fail('Select who is submitting the declaration.',422);
    $submitterName=text_value($body['submitterName']??null,'submitter name',160);
    $submitterPosition=optional_text($body['submitterPosition']??'',160);if($submitterRole==='sending-organisation-member'&&$submitterPosition==='')fail('Position is required for a member of the sending organisation.',422);
    $submitterPhone=text_value($body['submitterPhone']??null,'contact number',40);if(!preg_match('/^\+?[0-9 ()\-.]{6,40}$/',$submitterPhone))fail('Enter a valid contact number.',422);
    $submitterEmail=$body['submitterEmail']??'';if(!filter_var($submitterEmail,FILTER_VALIDATE_EMAIL)||strlen($submitterEmail)>254)fail('Enter a valid email.',422);
    $signature=$body['signature']??'';if(!is_string($signature)||strlen($signature)>300000||!str_starts_with($signature,'data:image/png;base64,'))fail('Draw the submitter signature before submitting.',422);
    $bytes=base64_decode(substr($signature,22),true);if($bytes===false||!str_starts_with($bytes,"\x89PNG\r\n\x1a\n"))fail('The signature could not be read.',422);
    if(($body['declaration']??null)!==true)fail('Confirm the declaration before submitting.',422);
    return ['requestId'=>$body['requestId'],'organisationName'=>text_value($body['organisationName']??null,'organisation name',200),'country'=>$country,'submitterRole'=>$submitterRole,'submitterName'=>$submitterName,'submitterPosition'=>$submitterRole==='team-leader'?'':$submitterPosition,'submitterPhone'=>$submitterPhone,'submitterEmail'=>$submitterEmail,'legalRepresentativeName'=>$submitterName,'signaturePlace'=>text_value($body['signaturePlace']??null,'place of signature',120),'signatureDate'=>$date,'accountHolder'=>text_value($body['accountHolder']??null,'account holder',160),'iban'=>text_value($body['iban']??null,'IBAN',80),'bankCountry'=>text_value($body['bankCountry']??null,'bank country',80),'swift'=>$swift,'signature'=>$signature,'declaration'=>true];
}

function parse_partnership_agreement(array $body,array $countries): array {
    if(!is_uuid($body['requestId']??null))fail('Invalid submission reference.',422);
    $country=text_value($body['partnerCountry']??null,'partner country',80);if(!in_array($country,$countries,true))fail('Select one of this project’s participating countries.',422);
    $date=valid_date($body['signatureDate']??null,'signature date');if($date>gmdate('Y-m-d'))fail('Signature date cannot be in the future.',422);
    $email=$body['contactEmail']??'';if(!filter_var($email,FILTER_VALIDATE_EMAIL)||strlen($email)>254)fail('Enter a valid email.',422);
    $phone=text_value($body['contactPhone']??null,'phone number',40);if(!preg_match('/^\+?[0-9 ()\-.]{6,40}$/',$phone))fail('Enter a valid phone number.',422);
    $swift=strtoupper(text_value($body['swift']??null,'SWIFT / BIC',11));if(!preg_match('/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/',$swift))fail('SWIFT / BIC must contain 8 or 11 letters and numbers.',422);
    $signature=$body['signature']??'';if(!is_string($signature)||strlen($signature)>300000||!str_starts_with($signature,'data:image/png;base64,'))fail('Draw the partner signature before submitting.',422);
    $bytes=base64_decode(substr($signature,22),true);if($bytes===false||!str_starts_with($bytes,"\x89PNG\r\n\x1a\n"))fail('The signature could not be read.',422);
    if(($body['declaration']??null)!==true)fail('Confirm the agreement before submitting.',422);
    $bankCurrency=strtoupper(text_value($body['bankCurrency']??null,'bank account currency',3));$allowedCurrencies=['EUR','USD','GBP','CHF','NOK','SEK','DKK','ISK','PLN','CZK','HUF','RON','BGN','TRY','UAH','RSD','ALL','BAM','MKD','MDL','GEL','AMD','AZN'];if(!in_array($bankCurrency,$allowedCurrencies,true))fail('Select a supported bank account currency.',422);
    return ['requestId'=>$body['requestId'],'partnerName'=>text_value($body['partnerName']??null,'partner name',200),'partnerOid'=>text_value($body['partnerOid']??null,'partner OID',40),'partnerCountry'=>$country,'contactName'=>text_value($body['contactName']??null,'contact name',160),'contactEmail'=>$email,'contactPhone'=>$phone,'iban'=>text_value($body['iban']??null,'IBAN',80),'accountHolder'=>text_value($body['accountHolder']??null,'account holder',160),'swift'=>$swift,'bankName'=>text_value($body['bankName']??null,'bank name',160),'bankAddress'=>text_value($body['bankAddress']??null,'bank address',500),'bankCurrency'=>$bankCurrency,'legalRepresentativeName'=>text_value($body['legalRepresentativeName']??null,'legal representative name',160),'legalRepresentativePosition'=>text_value($body['legalRepresentativePosition']??null,'legal representative position',160),'signaturePlace'=>text_value($body['signaturePlace']??null,'place of signature',120),'signatureDate'=>$date,'signature'=>$signature,'declaration'=>true];
}
