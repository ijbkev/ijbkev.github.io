#!/usr/bin/env python3
"""Run ONLY against a fresh disposable local PHP server; installs and creates fixtures."""
import json, urllib.request, urllib.error, urllib.parse, http.cookiejar, time, sys
base=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8917/secret-friend/'
token='local-test-install-token-32-characters'
password='Local-test-admin-2026!'
class Client:
    def __init__(self):
        self.opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        self.csrf=self.call('state')['csrf']
    def call(self,action,data=None,status=200,csrf=True):
        headers={'Content-Type':'application/json'}
        if csrf: headers['X-CSRF-Token']=self.csrf if hasattr(self,'csrf') else ''
        request=urllib.request.Request(base+'api.php?action='+action,data=None if data is None else json.dumps(data).encode(),headers=headers)
        try:
            response=self.opener.open(request); code=response.status; raw=response.read().decode()
        except urllib.error.HTTPError as e: code=e.code; raw=e.read().decode()
        assert code==status,(action,code,status,raw)
        if action.startswith('export') and code==200:return raw
        return json.loads(raw)
a=Client()
assert not a.call('state')['installed'],'Use a fresh test datastore; do not run against production.'
request=urllib.request.Request(base+'install.php',data=urllib.parse.urlencode({'csrf':a.csrf,'token':token,'password':password,'confirm':password}).encode())
assert 'Headquarters is ready' in a.opener.open(request).read().decode()
a.call('login',{'password':password},status=403,csrf=False)
a.call('login',{'password':'incorrect'},status=401)
a.call('login',{'password':password})
pid=a.call('create',{'name':'Kindness Without Borders'})['id']
def change(action,**data):return a.call(action,dict(project=pid,**data))
change('import',text='Anna | Germany | 07042001\nMateo | Spain | 15081999\nLea | Germany | 29022000\nSofia | Italy | 02022002')
def project():return next(p for p in a.call('admin_data')['projects'] if p['id']==pid)
p=project(); ids={v['name']:v['id'] for v in p['people']}
assert 'hash' not in json.dumps(p) and '07042001' not in json.dumps(p)
a.call('import',{'project':pid,'text':'Test | Italy | 01012001\nBroken row'},status=400)
assert len(project()['people'])==4
change('lock',**{'from':ids['Anna'],'to':ids['Mateo']})
change('generate');assert not project()['assignments'] and project()['locks'][ids['Anna']]==ids['Mateo']
change('generate');assert not project()['assignments'] and project()['locks'][ids['Anna']]==ids['Mateo']
a.call('access',{'project':pid,'active':True},status=400)
change('finalize');change('access',active=True)
a.call('generate',{'project':pid},status=409)
a.call('delete_participant',{'project':pid,'id':ids['Anna']},status=409)
b=Client(); c=Client()
assert len(b.call('rooms')['rooms'])==1
room=b.call('room&project='+pid)
assert 'assignments' not in json.dumps(room) and 'hash' not in json.dumps(room)
b.call('admin_data',status=401);b.call('export&project='+pid,status=401);b.call('reveal',{},status=401)
b.call('authenticate',{'project':pid,'participant':ids['Anna'],'pin':'07042002'},status=401)
result=b.call('authenticate',{'project':pid,'participant':ids['Anna'],'pin':'07042001'})
assert 'country' not in result and 'friend' not in result
started=time.time()
b.call('reveal',{'participant':ids['Sofia'],'project':'wrong'},status=409)
c.call('authenticate',{'project':pid,'participant':ids['Lea'],'pin':'29022000'})
change('participant',id=ids['Lea'],name='Lea',country='Germany',pin='01012000')
c.call('reveal',{},status=403)
change('access',active=False);b.call('reveal',{},status=403);change('access',active=True)
print('PASS: install, CSRF, admin auth, private responses, import atomicity, locks, finalization, early reveal, PIN revocation, access pause.',flush=True)
print('Waiting for the real 90-second reveal boundary…',flush=True)
while time.time()-started<91:time.sleep(1)
result=b.call('reveal',{'participant':ids['Sofia'],'project':'wrong'})
assert result['name']=='Mateo','Caller-supplied identity must never change the session-bound result'
assert b.call('reveal',{})['viewedAt']==result['viewedAt']
assert not project()['assignments'] and project()['drawn']
assert a.call('admin_result',{'project':pid,'participant':ids['Anna']})['recipient']==ids['Mateo']
assert ids['Anna'] in project()['viewed'] and ids['Sofia'] not in project()['viewed']
assert 'Reveal timestamp' in a.call('export&project='+pid)
b.call('logout',{});b.csrf=b.call('state')['csrf'];b.call('reveal',{},status=401)
# Account throttling works across sessions, independent of the browser.
for i in range(5):c.call('authenticate',{'project':pid,'participant':ids['Sofia'],'pin':'00000000'},status=401)
c.call('authenticate',{'project':pid,'participant':ids['Sofia'],'pin':'02022002'},status=429)
print('PASS: session-bound final reveal, stable timestamps, CSV, logout, account rate limits.',flush=True)
