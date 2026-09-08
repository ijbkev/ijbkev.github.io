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
        'CREATE TABLE IF NOT EXISTS access_code_secrets (project_id TEXT NOT NULL, country TEXT NOT NULL, encrypted_code TEXT NOT NULL, PRIMARY KEY(project_id,country))',
        'CREATE TABLE IF NOT EXISTS partner_country_access (project_id TEXT NOT NULL, country TEXT NOT NULL, access_hash TEXT NOT NULL, PRIMARY KEY(project_id,country))',
        'CREATE TABLE IF NOT EXISTS reimbursement_drafts (token_hash TEXT PRIMARY KEY, project_id TEXT NOT NULL, data TEXT NOT NULL, files TEXT NOT NULL, claim_id TEXT, revision INTEGER NOT NULL DEFAULT 1, finalized INTEGER NOT NULL DEFAULT 0)',
        'CREATE TABLE IF NOT EXISTS drive_projects (project_id TEXT PRIMARY KEY NOT NULL, countries_folder_id TEXT NOT NULL UNIQUE)',
        "CREATE TABLE IF NOT EXISTS drive_participants (folder_id TEXT PRIMARY KEY NOT NULL, project_id TEXT NOT NULL, country_id TEXT NOT NULL, country TEXT NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'Needs privacy setup')",
        "CREATE UNIQUE INDEX IF NOT EXISTS drive_participant_identity ON drive_participants(project_id,country_id,email) WHERE email <> ''",
        'CREATE TABLE IF NOT EXISTS drive_locks (lock_key TEXT PRIMARY KEY NOT NULL, token TEXT NOT NULL, expires_at INTEGER NOT NULL)',
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
    if(!in_array('country',array_column($db->query('PRAGMA table_info(sessions)')->fetchAll(),'name'),true))$db->exec('ALTER TABLE sessions ADD COLUMN country TEXT');
    $draftColumns=array_column($db->query('PRAGMA table_info(reimbursement_drafts)')->fetchAll(),'name');
    foreach(['resume_number','legacy_submission_id'] as $column)if(!in_array($column,$draftColumns,true))$db->exec('ALTER TABLE reimbursement_drafts ADD COLUMN '.$column.' TEXT');
    $db->exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_draft_legacy_submission ON reimbursement_drafts(legacy_submission_id) WHERE legacy_submission_id IS NOT NULL');
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

function masked_client_ip(): string {
    $ip=(string)($_SERVER['REMOTE_ADDR']??'unknown');
    if(getenv('IJBK_TRUST_PROXY')==='1'){
        $forwarded=trim(explode(',',(string)($_SERVER['HTTP_X_FORWARDED_FOR']??''))[0]);
        $candidate=(string)($_SERVER['HTTP_CF_CONNECTING_IP']??$forwarded);
        if(filter_var($candidate,FILTER_VALIDATE_IP))$ip=$candidate;
    }
    if(filter_var($ip,FILTER_VALIDATE_IP,FILTER_FLAG_IPV4)){$parts=explode('.',$ip);$parts[3]='xxx';return implode('.',$parts);}
    if(filter_var($ip,FILTER_VALIDATE_IP,FILTER_FLAG_IPV6)){$parts=array_slice(explode(':',$ip),0,4);return implode(':',$parts).'::';}
    return 'Unavailable';
}

function browser_device_label(?string $userAgent=null): string {
    $ua=trim($userAgent??(string)($_SERVER['HTTP_USER_AGENT']??''));if($ua==='')return 'Unavailable';
    $browser='Other browser';
    foreach([['Edge','#Edg/([0-9.]+)#'],['Chrome','#(?:Chrome|CriOS)/([0-9.]+)#'],['Firefox','#(?:Firefox|FxiOS)/([0-9.]+)#'],['Safari','#Version/([0-9.]+).*Safari/#']] as [$name,$pattern])if(preg_match($pattern,$ua,$match)){$browser=$name.' '.$match[1];break;}
    $device='Other device';
    if(preg_match('#Windows NT ([0-9.]+)#',$ua,$match))$device='Windows '.$match[1];
    elseif(preg_match('#Android ([0-9.]+)#',$ua,$match))$device='Android '.$match[1];
    elseif(preg_match('#(?:iPhone|CPU) OS ([0-9_]+)#',$ua,$match))$device='iOS '.str_replace('_','.',$match[1]);
    elseif(preg_match('#Mac OS X ([0-9_]+)#',$ua,$match))$device='macOS '.str_replace('_','.',$match[1]);
    elseif(str_contains($ua,'Linux'))$device='Linux';
    return $browser.' / '.$device;
}

function partnership_document_id(string $projectCode,string $country,string $agreementId,string $createdAt): string {
    $project=trim((string)preg_replace('/[^A-Z0-9]+/','-',strtoupper($projectCode)),'-');
    $project=substr($project,0,18)?:'PROJECT';$countryPart=country_code($country)??substr(preg_replace('/[^A-Z]/','',strtoupper($country)),0,2)?:'XX';
    return 'PA-'.$project.'-'.$countryPart.'-'.str_replace('-','',substr($createdAt,0,10)).'-'.strtoupper(substr(str_replace('-','',$agreementId),0,8));
}

function cookie_name(?string $projectId = null, string $role = 'participant'): string { return $projectId ? 'ijbk_' . $role . '_project_' . preg_replace('/[^a-z0-9_-]/i', '_', $projectId) : 'ijbk_admin'; }

function new_session(string $role, ?string $projectId = null, ?string $country = null): void {
    $token = bin2hex(random_bytes(48));
    $stmt = db()->prepare('INSERT INTO sessions(token_hash, role, project_id, expires_at, country) VALUES(?, ?, ?, ?, ?)');
    $stmt->execute([hash('sha256', $token), $role, $projectId, time() + 28800, $country]);
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
function public_settings(?array $row): array { $details=[]; if ($row) { $stmt=db()->prepare('SELECT data FROM project_details WHERE project_id=?'); $stmt->execute([$row['project_id']]); $raw=$stmt->fetchColumn(); if ($raw) $details=json_decode($raw,true); } return array_merge($details, ['demo' => getenv('IJBK_DEMO')==='1', 'projectCode' => $row['project_code'] ?? '', 'countries' => isset($row['countries']) ? json_decode($row['countries'], true) : [], 'enabled' => !empty($row['enabled']) && !empty($row['access_hash']), 'organisationEnabled' => !empty($row['enabled']) && !empty(partner_access_flags($row['project_id']??'')), 'hasAccessCode' => !empty($row['access_hash']), 'hasOrganisationAccessCode' => !empty(partner_access_flags($row['project_id']??''))]); }
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
    $hasTravel=false; $hasReceipt=false; $hasFlight=false;
    foreach($tickets as $item) { $m=$item['mode']??''; $hasReceipt=$hasReceipt||in_array($m,['Food','Accommodation'],true); $hasTravel=$hasTravel||in_array($m,['Car','Bus','Train','Flight'],true); $hasFlight=$hasFlight||$m==='Flight'; }
    if(!$hasTravel)fail('Add at least one travel ticket.',422);
    if($hasReceipt&&(!$participant['greenTravel']||$hasFlight))fail('Food and accommodation receipts require green travel with no flights.',422);
    $parsed=[];
    foreach ($tickets as $i=>$ticket) {
        if (!is_array($ticket)) fail('Invalid ticket ' . ($i+1) . '.',422);
        $purchase=valid_date($ticket['purchaseDate']??null,'ticket purchase date'); $receipt=in_array($ticket['mode']??'',['Food','Accommodation'],true); $travel=$receipt?'':valid_date($ticket['travelDate']??null,'travel date');
        if (!$receipt && $travel<$purchase) fail('Travel date cannot be before the purchase date.',422);
        $mode=$ticket['mode']??''; if (!in_array($mode,['Car','Bus','Train','Flight','Food','Accommodation'],true)) fail('Invalid mode of travel.',422);
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
        if($mode==='Flight'&&(!$counts['outbound']||($journeyType==='round-trip'&&!$counts['return'])))fail('Boarding pass missing: add each outbound and return flight segment for ticket '.($i+1).'.',422);
        $parsed[] = array_merge(['purchaseDate'=>$purchase,'travelDate'=>$travel,'from'=>text_value($ticket['from']??null,'departure',120),'to'=>$receipt?$mode:text_value($ticket['to']??null,'destination',120),'mode'=>$mode,'ticketType'=>$ticketType,'amount'=>$amount],$rate,['journeyType'=>$journeyType,'connections'=>($ticket['connections']??false)===true,'boardingPasses'=>$boarding,'serial'=>$i+1,'euroCents'=>(int)round($amount*$rate['rate']*100)]);
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
    $expected=$body['expectedParticipants']??[];if(!is_array($expected))fail('Set expected participant counts.',422);
    foreach($expected as $country=>$count)if(!in_array($country,$countries,true)||!is_int($count)||$count<0||$count>1000)fail('Expected participants must be whole numbers from 0 to 1000.',422);
    return ['expectedParticipants'=>$expected,'shortName'=>$short,'activityStartDate'=>$start,'activityEndDate'=>$end,'destinationCity'=>text_value($body['destinationCity']??null,'destination city',120),'countryCodes'=>$outCodes,'countryLimits'=>$outLimits];
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
    if(in_array($ticket['mode'],['Food','Accommodation'],true))return $ticket['from'].' / '.$ticket['to'];
    return $ticket['from'].' → '.$ticket['to'].(($ticket['mode']==='Flight'&&($ticket['journeyType']??'')==='round-trip')?' → '.$ticket['from']:'');
}
function supporting_documents(array $claim): array {
    $documents=[];
    foreach($claim['tickets'] as $ticket){
        $documents[]=array_merge($ticket,['key'=>'ticket-'.$ticket['serial'],'label'=>(in_array($ticket['mode'],['Food','Accommodation'],true)?$ticket['mode'].' receipt':'Ticket').' '.$ticket['serial'],'route'=>flight_route($ticket),'isBoardingPass'=>false]);
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
    $stmt=db()->prepare("SELECT data FROM submissions WHERE project_id=? AND team=? AND status='complete' ORDER BY created_at DESC, rowid DESC");$stmt->execute([$projectId,$country]);
    $unique=[];foreach($stmt->fetchAll() as $item){$claim=json_decode($item['data'],true);$email=mb_strtolower($claim['participant']['email']);if(!isset($unique[$email]))$unique[$email]=$claim;}
    $submitted=count($unique);$claims=array_values(array_filter($unique,fn($c)=>!empty($c['approvedAt'])));$approved=count($claims);$expected=$details['expectedParticipants'][$country]??null;$progress=['expected'=>$expected,'submitted'=>$submitted,'approved'=>$approved,'pending'=>$submitted-$approved,'missing'=>$expected===null?null:max(0,$expected-$submitted),'ready'=>$expected!==null&&$expected>0&&$submitted===$expected&&$approved===$expected];usort($claims,function($a,$b){$rank=fn($role)=>$role==='Team Leader'?0:($role==='Participant'?1:2);return $rank($a['participant']['role'])<=>$rank($b['participant']['role'])?:strcmp($a['participant']['name'],$b['participant']['name']);});
    $leader=0;$participant=0;$people=[];
    foreach($claims as $claim){$isLeader=$claim['participant']['role']==='Team Leader';$number=$isLeader?++$leader:++$participant;$people[]=['label'=>$isLeader?'Leader'.($number>1?' '.$number:''):'Participant '.$number,'name'=>$claim['participant']['name'],'role'=>$claim['participant']['role'],'reimbursementCents'=>reimbursement_totals($claim)['finalCents']];}
    return array_merge($details,['projectName'=>$project['title'],'projectCode'=>$row['project_code'],'countries'=>$countries,'country'=>$country,'progress'=>$progress,'participants'=>$people,'totalCents'=>array_sum(array_column($people,'reimbursementCents'))]);
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
    return ['requestId'=>$body['requestId'],'organisationOid'=>optional_text($body['organisationOid']??'',40),'organisationName'=>text_value($body['organisationName']??null,'organisation name',200),'country'=>$country,'submitterRole'=>$submitterRole,'submitterName'=>$submitterName,'submitterPosition'=>$submitterRole==='team-leader'?'':$submitterPosition,'submitterPhone'=>$submitterPhone,'submitterEmail'=>$submitterEmail,'legalRepresentativeName'=>$submitterName,'signaturePlace'=>text_value($body['signaturePlace']??null,'place of signature',120),'signatureDate'=>$date,'accountHolder'=>text_value($body['accountHolder']??null,'account holder',160),'iban'=>text_value($body['iban']??null,'IBAN',80),'bankCountry'=>text_value($body['bankCountry']??null,'bank country',80),'swift'=>$swift,'signature'=>$signature,'declaration'=>true];
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
    $signerEmail=$body['signerEmail']??'';if(!filter_var($signerEmail,FILTER_VALIDATE_EMAIL)||strlen($signerEmail)>254)fail('Enter a valid signer email.',422);
    return ['requestId'=>$body['requestId'],'partnerName'=>text_value($body['partnerName']??null,'partner name',200),'partnerOid'=>text_value($body['partnerOid']??null,'partner OID',40),'partnerCountry'=>$country,'contactName'=>text_value($body['contactName']??null,'contact name',160),'contactEmail'=>$email,'contactPhone'=>$phone,'iban'=>text_value($body['iban']??null,'IBAN',80),'accountHolder'=>text_value($body['accountHolder']??null,'account holder',160),'swift'=>$swift,'bankName'=>text_value($body['bankName']??null,'bank name',160),'bankAddress'=>text_value($body['bankAddress']??null,'bank address',500),'bankCurrency'=>$bankCurrency,'legalRepresentativeName'=>text_value($body['legalRepresentativeName']??null,'legal representative name',160),'legalRepresentativePosition'=>text_value($body['legalRepresentativePosition']??null,'legal representative position',160),'signerEmail'=>$signerEmail,'signaturePlace'=>text_value($body['signaturePlace']??null,'place of signature',120),'signatureDate'=>$date,'signature'=>$signature,'declaration'=>true];
}

// A submission number is a bearer secret, accepted only inside an authenticated project session.
function reimbursement_draft(string $projectId, string $number): array {
    $number=trim($number);if(preg_match('/^IJBK-[0-9a-f]{48}$/i',$number))$number='IJBK-'.strtolower(substr($number,5));
    $stmt=db()->prepare('SELECT * FROM reimbursement_drafts WHERE project_id=? AND token_hash=?');
    $stmt->execute([$projectId,hash('sha256',$number)]);$draft=$stmt->fetch();
    if(!$draft)fail('No application found for this submission number in this project.',404);
    if($draft['finalized'])fail('This reimbursement application has already been finalized and can no longer be accessed or edited. Kindly contact the administrator if you require any changes.',403);
    return $draft;
}
function draft_payload(): array {
    $raw=(string)($_POST['claim']??'');if(strlen($raw)>1024*1024)fail('Form information is too large.',413);
    try{$data=json_decode($raw,true,32,JSON_THROW_ON_ERROR);}catch(Throwable){fail('Invalid saved form.',422);}
    if(!is_array($data)||!is_array($data['participant']??null)||!is_array($data['tickets']??null)||count($data['tickets'])>30)fail('Invalid saved form.',422);
    foreach($data['tickets'] as $t)if(!is_array($t)||!is_array($t['boardingPasses']??[])||count($t['boardingPasses']??[])>24)fail('Invalid travel segments.',422);
    return $data;
}
function save_draft_files(): array {
    $files=[];$total=0;
    foreach($_FILES as $key=>$file){
        if(!preg_match('/^(ticket-[0-9]+|boarding-[0-9]+-[0-9]+)$/',$key))fail('Invalid document field.',422);
        if(($file['error']??UPLOAD_ERR_NO_FILE)===UPLOAD_ERR_NO_FILE)continue;
        if(($file['error']??-1)!==UPLOAD_ERR_OK||!is_uploaded_file($file['tmp_name']))fail('A document upload failed. Retry saving.',422);
        $total+=(int)$file['size'];if($file['size']>10*1024*1024||$total>40*1024*1024)fail('Uploads must be at most 10 MB each and 40 MB overall.',413);
        $name=mb_substr(basename((string)$file['name']),0,180);$type=upload_type($file['tmp_name'],$name);
        if($type!=='application/pdf'&&!str_starts_with($type,'image/'))fail('Upload a PDF or image.',422);
        $files[$key]=['name'=>$name,'type'=>$type,'tmp'=>$file['tmp_name']];
    }
    return $files;
}

function persist_draft_files(array $files): array {
    if(!$files)return [];
    $dir=storage_dir().'/drafts/'.bin2hex(random_bytes(24));
    if(!mkdir($dir,0700,true))throw new RuntimeException('Could not prepare draft storage.');
    try{foreach($files as $key=>&$file){$target=$dir.'/'.$key;if(!move_uploaded_file($file['tmp'],$target))throw new RuntimeException('Could not save document.');chmod($target,0600);unset($file['tmp']);$file['path']=$target;}unset($file);}
    catch(Throwable $e){foreach(glob($dir.'/*')?:[] as $f)@unlink($f);@rmdir($dir);throw $e;}
    return $files;
}
function delete_draft_files(array $files): void {
    foreach($files as $file){if(isset($file['path'])){@unlink($file['path']);@rmdir(dirname($file['path']));}}
}

// Older name-based references need the participant email as an additional check.
// A successful recovery returns a private number for all later saves and reads.
function resume_legacy_application(string $projectId, string $reference, string $email): array {
    $reference=trim($reference);$email=mb_strtolower(trim($email));
    if($reference===''||strlen($reference)>500)fail('Enter your previous submission reference.',422);
    if(!filter_var($email,FILTER_VALIDATE_EMAIL))fail('For an older submission reference, enter the email used on the application.',422);
    db()->exec('BEGIN IMMEDIATE');
    $stmt=db()->prepare("SELECT * FROM submissions WHERE project_id=? AND lower(trim(email))=? AND status IN ('complete','withdrawn')");$stmt->execute([$projectId,$email]);$matches=[];
    foreach($stmt->fetchAll() as $row){$claim=json_decode($row['data'],true);$references=[$row['id'],$claim['reference']??'',claim_reference($claim)];foreach($references as $value)if($value!==''&&mb_strtolower($reference)===mb_strtolower($value)){$matches[]=[$row,$claim];break;}}
    if(!$matches)fail('No application matches this reference and email in this project. Check both details and the selected project.',404);
    if(count($matches)>1)fail('More than one application has this reference. Ask the administrator for the unique application ID.',409);
    [$row,$claim]=$matches[0];
    $stmt=db()->prepare('SELECT * FROM reimbursement_drafts WHERE project_id=? AND (legacy_submission_id=? OR claim_id=?)');$stmt->execute([$projectId,$row['id'],$row['id']]);$draft=$stmt->fetch();
    if(!empty($claim['approvedAt'])||!empty($draft['finalized']))fail('This reimbursement application has already been finalized and can no longer be accessed or edited. Kindly contact the administrator if you require any changes.',403);
    if($draft){
        if(empty($draft['legacy_submission_id']))db()->prepare('UPDATE reimbursement_drafts SET legacy_submission_id=? WHERE token_hash=?')->execute([$row['id'],$draft['token_hash']]);
        if(empty($draft['resume_number'])){
            $number='IJBK-'.bin2hex(random_bytes(24));$hash=hash('sha256',$number);
            db()->prepare('UPDATE reimbursement_drafts SET token_hash=?,resume_number=?,legacy_submission_id=? WHERE token_hash=?')->execute([$hash,$number,$row['id'],$draft['token_hash']]);
            $draft['token_hash']=$hash;$draft['resume_number']=$number;
        }
        db()->exec('COMMIT');return $draft;
    }
    if($row['status']==='withdrawn')fail('This submitted version was replaced by a saved draft. Use the private submission number shown when you saved, or contact the administrator.',409);
    $number='IJBK-'.bin2hex(random_bytes(24));$hash=hash('sha256',$number);$files=[];
    $draftDir=storage_dir().'/drafts/'.bin2hex(random_bytes(24));
    if(!mkdir($draftDir,0700,true))throw new RuntimeException('Could not prepare continuation storage.');
    try{
        foreach(($claim['tickets']??[]) as $i=>$ticket){
            $entries=[['source'=>'ticket-'.($ticket['serial']??($i+1)),'field'=>'ticket-'.$i,'name'=>$ticket['filename']??'invoice']];
            foreach(($ticket['boardingPasses']??[]) as $j=>$pass)$entries[]=['source'=>'boarding-'.($ticket['serial']??($i+1)).'-'.($j+1),'field'=>'boarding-'.$i.'-'.$j,'name'=>$pass['filename']??'boarding-pass'];
            foreach($entries as $entry){
                if(!preg_match('/^(ticket-[0-9]+|boarding-[0-9]+-[0-9]+)$/',$entry['source']))continue;
                $paths=glob(dirname($row['pdf_path']).'/'.$entry['source'].'.*')?:[];
                if(count($paths)!==1||!is_file($paths[0]))continue;
                $target=$draftDir.'/'.$entry['field'];if(!copy($paths[0],$target))throw new RuntimeException('Could not restore original document.');chmod($target,0600);
                $files[$entry['field']]=['name'=>$entry['name'],'type'=>upload_type($paths[0],$entry['name']),'path'=>$target];
            }
        }
        $data=['participant'=>$claim['participant'],'tickets'=>$claim['tickets']??[],'signature'=>$claim['signature']??'','declaration'=>$claim['declaration']??false];
        $draft=['token_hash'=>$hash,'project_id'=>$projectId,'data'=>json_encode($data),'files'=>json_encode($files),'claim_id'=>$row['status']==='complete'?$row['id']:null,'revision'=>1,'finalized'=>0,'resume_number'=>$number,'legacy_submission_id'=>$row['id']];
        db()->prepare('INSERT INTO reimbursement_drafts(token_hash,project_id,data,files,claim_id,resume_number,legacy_submission_id)VALUES(?,?,?,?,?,?,?)')->execute([$hash,$projectId,$draft['data'],$draft['files'],$draft['claim_id'],$number,$row['id']]);
        db()->exec('COMMIT');return $draft;
    }catch(Throwable $e){delete_draft_files($files);@rmdir($draftDir);throw $e;}
}

function partner_access_flags(string $projectId): array {
    $s=db()->prepare('SELECT country FROM partner_country_access WHERE project_id=?');$s->execute([$projectId]);return array_fill_keys(array_column($s->fetchAll(),'country'),true);
}
function partner_country(string $projectId, ?string $requested = null): string {
    $hash=require_session($projectId,'organisation');
    $s=db()->prepare('SELECT country FROM sessions WHERE token_hash=?');$s->execute([$hash]);$country=$s->fetchColumn();
    $settings=enabled_settings($projectId);
    if(!$country||!isset(partner_access_flags($projectId)[$country])||!in_array($country,json_decode($settings['countries'],true),true))fail('Sign in with the separate partner code for your country.',401);
    if($requested!==null&&$requested!==''&&$requested!==$country)fail('Your partner access is limited to your own country.',403);
    return $country;
}
function scoped_partner_settings(array $data, string $country): array {
    $data['country']=$country;$data['countries']=[$country];
    foreach(['countryCodes','countryLimits','expectedParticipants','partnerAccessConfigured'] as $key)if(isset($data[$key]))$data[$key]=array_intersect_key($data[$key],[$country=>true]);
    return $data;
}
function update_partner_codes(string $projectId, array $countries, mixed $updates, string $participantHash, ?string $legacyHash): void {
    if(!is_array($updates))fail('Invalid country partner codes.',422);
    $s=db()->prepare('SELECT country,access_hash FROM partner_country_access WHERE project_id=?');$s->execute([$projectId]);$hashes=array_column($s->fetchAll(),'access_hash','country');
    foreach($updates as $country=>$code){
        if(!in_array($country,$countries,true))fail('Set partner codes only for participating countries.',422);
        if($code===null){unset($hashes[$country]);continue;}
        if(!is_string($code)||strlen($code)===0||strlen($code)>128)fail('Enter a partner code of up to 128 characters.',422);
        if(verify_secret($code,$participantHash)||($legacyHash&&verify_secret($code,$legacyHash)))fail('Use a new partner code different from the participant code and the old shared partner code.',422);
        $hashes[$country]=password_hash($code,PASSWORD_ARGON2ID);
    }
    $hashes=array_intersect_key($hashes,array_fill_keys($countries,true));
    foreach($updates as $country=>$code)if(is_string($code))foreach($hashes as $other=>$hash)if($other!==$country&&verify_secret($code,$hash))fail('Each country must have a different partner code.',422);
    foreach($updates as $country=>$code){
        db()->prepare("DELETE FROM sessions WHERE project_id=? AND role='organisation' AND country=?")->execute([$projectId,$country]);
        save_access_code($projectId,$country,$code);
        if($code===null)db()->prepare('DELETE FROM partner_country_access WHERE project_id=? AND country=?')->execute([$projectId,$country]);
        else db()->prepare('INSERT INTO partner_country_access(project_id,country,access_hash)VALUES(?,?,?) ON CONFLICT(project_id,country)DO UPDATE SET access_hash=excluded.access_hash')->execute([$projectId,$country,$hashes[$country]]);
    }
    $s=db()->prepare('SELECT country FROM partner_country_access WHERE project_id=?');$s->execute([$projectId]);
    foreach($s->fetchAll() as $entry)if(!in_array($entry['country'],$countries,true)){save_access_code($projectId,$entry['country'],null);db()->prepare('DELETE FROM partner_country_access WHERE project_id=? AND country=?')->execute([$projectId,$entry['country']]);db()->prepare("DELETE FROM sessions WHERE project_id=? AND role='organisation' AND country=?")->execute([$projectId,$entry['country']]);}
    db()->prepare("DELETE FROM sessions WHERE project_id=? AND role='organisation' AND country IS NULL")->execute([$projectId]);
}

// Authentication still uses password hashes. Reversible copies are available only
// to administrators, encrypted with a key kept outside the web root.
function access_code_key(): string {
    $path=storage_dir().'/access-code.key';
    if(!is_file($path)){
        $handle=@fopen($path,'x');
        if($handle){chmod($path,0600);fwrite($handle,random_bytes(32));fclose($handle);}
    }
    $key=@file_get_contents($path);if($key===false||strlen($key)!==32)throw new RuntimeException('Access-code encryption key unavailable.');
    return $key;
}
function save_access_code(string $projectId,string $country,?string $code): void {
    if($code===null){db()->prepare('DELETE FROM access_code_secrets WHERE project_id=? AND country=?')->execute([$projectId,$country]);return;}
    $iv=random_bytes(12);$tag='';$encrypted=openssl_encrypt($code,'aes-256-gcm',access_code_key(),OPENSSL_RAW_DATA,$iv,$tag,$projectId.'|'.$country);
    if($encrypted===false)throw new RuntimeException('Could not encrypt access code.');
    db()->prepare('INSERT INTO access_code_secrets(project_id,country,encrypted_code)VALUES(?,?,?) ON CONFLICT(project_id,country)DO UPDATE SET encrypted_code=excluded.encrypted_code')->execute([$projectId,$country,base64_encode($iv.$tag.$encrypted)]);
}
function reveal_access_codes(string $projectId): array {
    $s=db()->prepare('SELECT country,encrypted_code FROM access_code_secrets WHERE project_id=?');$s->execute([$projectId]);$codes=[];
    foreach($s->fetchAll() as $row){$raw=base64_decode($row['encrypted_code'],true);if($raw===false||strlen($raw)<28)throw new RuntimeException('Invalid encrypted code.');$code=openssl_decrypt(substr($raw,28),'aes-256-gcm',access_code_key(),OPENSSL_RAW_DATA,substr($raw,0,12),substr($raw,12,16),$projectId.'|'.$row['country']);if($code===false)throw new RuntimeException('Could not decrypt saved code.');$codes[$row['country']]=$code;}
    return ['participant'=>$codes['']??null,'partners'=>(object)array_filter($codes,fn($country)=>$country!=='',ARRAY_FILTER_USE_KEY)];
}
