<?php
declare(strict_types=1);
require __DIR__.'/../../public/secret-friend/core.php';
function check(bool $ok,string $message): void { if (!$ok) throw new Exception($message); }
function permutations(array $items): Generator {
    if (!$items) { yield []; return; }
    foreach ($items as $i=>$v) { $rest=$items; unset($rest[$i]); foreach (permutations(array_values($rest)) as $p) yield array_merge([$v],$p); }
}
function optimum(array $people,array $locks): int {
    $ids=array_keys($people); $min=PHP_INT_MAX;
    foreach (permutations($ids) as $recipients) {
        $cost=0;
        foreach ($ids as $i=>$id) {
            $to=$recipients[$i];
            if ($id===$to || (isset($locks[$id]) && $locks[$id]!==$to)) continue 2;
            $cost+=sf_country($people[$id]['country'])===sf_country($people[$to]['country'])?1:0;
        }
        $min=min($min,$cost);
    }
    return $min;
}
$cases=0;
for ($n=2;$n<=7;$n++) for ($trial=0;$trial<22;$trial++) {
    $people=[]; for ($i=0;$i<$n;$i++) $people['p'.$i]=['country'=>['Germany','Spain','Italy'][random_int(0,2)]];
    $locks=[];
    if ($trial%3===0) $locks['p0']='p1';
    if ($trial%5===0 && $n>3) $locks['p1']='p2';
    $best=optimum($people,$locks);
    for ($repeat=0;$repeat<3;$repeat++) {
        try {$result=sf_match($people,$locks);} catch (RuntimeException $e) {check($best===PHP_INT_MAX,'Rejected feasible draw');continue;}
        check(count($result)===$n && count(array_unique($result))===$n,'Not a permutation');
        $cost=0;foreach($result as $a=>$b){check($a!==$b,'Self match');check(!isset($locks[$a])||$locks[$a]===$b,'Lock changed');$cost+=sf_country($people[$a]['country'])===sf_country($people[$b]['country'])?1:0;}
        check($cost===$best,'Country preference not globally optimal');$cases++;
    }
}
foreach ([['p0'=>'p0'],['p0'=>'p1','p2'=>'p1'],['p0'=>'missing'],['p0'=>'p1','p1'=>'p0']] as $locks) {
    try {sf_match(['p0'=>['country'=>'DE'],'p1'=>['country'=>'ES'],'p2'=>['country'=>'IT']],$locks);throw new Exception('Invalid locks accepted');}catch(RuntimeException $e){}
}
check(password_verify('07042001',sf_pin('07042001')),'PIN hash failed');
foreach (['31022001','29022001','1111111','abcdefgh','01013000'] as $pin) {try{sf_pin($pin);throw new Exception('Bad date accepted');}catch(RuntimeException $e){}}
echo "PASS: $cases optimal randomized draws; self/duplicate/impossible locks; PIN hashing and date validation.\n";
