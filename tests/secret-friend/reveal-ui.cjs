// Fast logic checks with a fake clock; no browser or application dependencies.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
let now=0,tick,timeoutFn,requests=0;
const button={textContent:'Continue →',disabled:false};
const app={querySelector:()=>button};
const context=vm.createContext({
 document:{querySelector:s=>s==='#app'?app:{addEventListener(){}}},
 window:{addEventListener(){}},
 fetch:()=>{requests++;return new Promise(()=>{});},
 Date:{now:()=>now},setInterval:fn=>{tick=fn;return 1;},clearInterval(){},
 setTimeout:fn=>{timeoutFn=fn;return 2;},clearTimeout(){timeoutFn=null;},console
});
vm.runInContext(fs.readFileSync('public/secret-friend/app.js','utf8'),context);
assert.equal(vm.runInContext('questions.length',context),4);
assert.equal(vm.runInContext('questions[2].length',context),8);
assert.equal(vm.runInContext('questions.filter((q,i)=>i!==2).every(q=>q.length===5)',context),true);
assert.equal(vm.runInContext('questionSeconds.every(seconds=>seconds>=13&&seconds<=15)',context),true);
for(let animal=0;animal<4;animal++)for(let budget=0;budget<7;budget++){
 const text=vm.runInContext(`agentBriefing({answers:[0,${animal},${budget},0]})`,context);
 assert.ok(text.includes(['Cat','Raccoon','Panda','Giraffe'][animal]+' energy detected.'));
 assert.ok(!text.includes('undefined'));
}
assert.equal(requests,1,'Personalizing answers must not make network requests');
let advanced=0;
context.advance=()=>advanced++;
vm.runInContext('autoAdvance(13,advance)',context);
assert.match(button.textContent,/automatically in 13s/);
now=13000;tick();assert.match(button.textContent,/Continuing/);
timeoutFn();assert.equal(advanced,1,'Automatic stages advance at the deadline');
assert.match(vm.runInContext('agentBriefing({answers:[null,null,null,null]})',context),/Undercover energy detected/);
console.log('PASS: 13–15 second questions, automatic stage advance, briefing fallbacks, and no answer transmission.');
