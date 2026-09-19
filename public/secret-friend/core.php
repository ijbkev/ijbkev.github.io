<?php
declare(strict_types=1);

function sf_fail(string $message, int $status = 400): void {
    throw new RuntimeException($message, $status);
}
function sf_id(): string { return bin2hex(random_bytes(12)); }
function sf_text(mixed $value, int $max = 100): string {
    if (!is_string($value) || strlen(trim($value)) < 1 || strlen(trim($value)) > $max) sf_fail('Please complete all fields within the allowed length.');
    return trim($value);
}
function sf_pin(mixed $pin): string {
    if (!is_string($pin) || !preg_match('/^\d{8}$/D', $pin) || !checkdate((int)substr($pin,2,2), (int)substr($pin,0,2), (int)substr($pin,4,4)) || (int)substr($pin,4,4) < 1900 || DateTimeImmutable::createFromFormat('!dmY', $pin) > new DateTimeImmutable('today')) sf_fail('Enter a valid birth date as DDMMYYYY.');
    return password_hash($pin, PASSWORD_DEFAULT);
}
function sf_country(string $country): string { return strtolower(trim($country)); }

// Hungarian minimum-cost perfect matching. Country cost dominates all random tie costs.
// Forbidden edges have a cost greater than every possible valid complete assignment.
function sf_match(array $people, array $locks): array {
    $ids = array_keys($people); $n = count($ids);
    if ($n < 2) sf_fail('Add at least two participants.');
    $used = [];
    foreach ($locks as $from => $to) {
        if (!isset($people[$from], $people[$to]) || $from === $to || isset($used[$to])) sf_fail('Manual locks must use different recipients and cannot assign someone to themselves.');
        $used[$to] = true;
    }
    $givers = array_values(array_diff($ids, array_keys($locks)));
    $receivers = array_values(array_diff($ids, array_keys($used)));
    shuffle($givers); shuffle($receivers); $m = count($givers);
    if (!$m) return $locks;
    $countryCost = $n * 1000 + 1; $forbidden = ($n + 1) * ($countryCost + 1000);
    $cost = [];
    for ($i=1; $i <= $m; $i++) for ($j=1; $j <= $m; $j++) {
        $a=$givers[$i-1]; $b=$receivers[$j-1];
        $cost[$i][$j] = $a === $b ? $forbidden : (sf_country($people[$a]['country']) === sf_country($people[$b]['country']) ? $countryCost : 0) + random_int(0,999);
    }
    $u=$v=$p=$way=array_fill(0,$m+1,0);
    for ($i=1; $i <= $m; $i++) {
        $p[0]=$i; $j0=0; $minv=array_fill(0,$m+1,PHP_INT_MAX); $usedColumns=array_fill(0,$m+1,false);
        do {
            $usedColumns[$j0]=true; $i0=$p[$j0]; $delta=PHP_INT_MAX; $j1=0;
            for ($j=1; $j <= $m; $j++) if (!$usedColumns[$j]) {
                $cur=$cost[$i0][$j]-$u[$i0]-$v[$j];
                if ($cur<$minv[$j]) { $minv[$j]=$cur; $way[$j]=$j0; }
                if ($minv[$j]<$delta) { $delta=$minv[$j]; $j1=$j; }
            }
            for ($j=0; $j <= $m; $j++) { if ($usedColumns[$j]) { $u[$p[$j]]+=$delta; $v[$j]-=$delta; } else $minv[$j]-=$delta; }
            $j0=$j1;
        } while ($p[$j0]!==0);
        do { $j1=$way[$j0]; $p[$j0]=$p[$j1]; $j0=$j1; } while ($j0!==0);
    }
    $result=$locks;
    for ($j=1; $j <= $m; $j++) {
        if ($cost[$p[$j]][$j] >= $forbidden) sf_fail('These manual locks leave no valid draw. Remove or change a lock.');
        $result[$givers[$p[$j]-1]]=$receivers[$j-1];
    }
    return $result;
}
function sf_safe_people(array $people): array {
    return array_values(array_map(fn($p) => ['id'=>$p['id'], 'name'=>$p['name'], 'country'=>$p['country']], $people));
}

// Called inside sf_store's exclusive transaction, only after final-reveal authorization.
function sf_draw_on_reveal(array &$project): void {
    if (count($project['assignments']) === count($project['people']) && count($project['people']) >= 2) return;
    $project['assignments']=sf_match($project['people'],$project['locks']);
    $project['drawn_at']=gmdate('c');
}
function sf_admin_project(array $project): array {
    $project['drawn']=count($project['people'])>=2 && count($project['assignments'])===count($project['people']);
    $project['assignments']=[];
    $project['people']=sf_safe_people($project['people']);
    return $project;
}

function sf_reopen(array &$project): void {
    if (!empty($project['assignments']) || !empty($project['viewed'])) sf_fail('The draw has already happened. Existing assignments cannot be changed.',409);
    $project['active']=false;
    $project['lobby_open']=false;
    $project['checked_in']=[];
    $project['finalized']=false;
    foreach ($project['people'] as &$person) $person['version']++;
    unset($person);
}
