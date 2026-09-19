#!/usr/bin/env python3
"""Fast isolated regression for self check-in and the admin-controlled start gate."""
import http.cookiejar,json,os,socket,subprocess,tempfile,time,urllib.error,urllib.parse,urllib.request
from pathlib import Path
root=Path(__file__).resolve().parents[2]
with tempfile.TemporaryDirectory(prefix='sfhq-lobby-') as directory:
    with socket.socket() as sock:
        sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
    env=dict(os.environ,SECRET_FRIEND_DATA_DIR=directory,SECRET_FRIEND_INSTALL_TOKEN='temporary-lobby-test-token-123456')
    server=subprocess.Popen(['php','-S',f'127.0.0.1:{port}','-t',str(root/'public')],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    base=f'http://127.0.0.1:{port}/secret-friend/'
    try:
        for _ in range(60):
            try:urllib.request.urlopen(base+'api.php?action=state',timeout=1).close();break
            except urllib.error.URLError:time.sleep(.05)
        class Client:
            def __init__(self):
                self.opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
                self.csrf=self.call('state')['csrf']
            def call(self,action,data=None,status=200):
                headers={'Content-Type':'application/json','X-CSRF-Token':getattr(self,'csrf','')}
                request=urllib.request.Request(base+'api.php?action='+action,data=None if data is None else json.dumps(data).encode(),headers=headers)
                try:response=self.opener.open(request);code=response.status;raw=response.read()
                except urllib.error.HTTPError as error:code=error.code;raw=error.read()
                assert code==status,(action,code,status,raw)
                return json.loads(raw)
        admin=Client();anna=Client();other_anna=Client();mateo=Client();observer=Client()
        body=urllib.parse.urlencode(dict(csrf=admin.csrf,token=env['SECRET_FRIEND_INSTALL_TOKEN'],password='Test-only-password-2026',confirm='Test-only-password-2026')).encode()
        admin.opener.open(urllib.request.Request(base+'install.php',data=body)).close()
        admin.call('login',{'password':'Test-only-password-2026'})
        room=admin.call('create',{'name':'Live lobby'})['id']
        admin.call('import',{'project':room,'text':'Anna | Germany | 07042001\nAnna | France | 08052002\nMateo | Spain | 15081999'})
        anna.call('join',{'project':room,'name':'Anna','pin':'07042001'},409)
        admin.call('lobby',{'project':room,'open':True})
        observer.call('join',{'project':room,'name':'Uninvited','pin':'01012000'},401)
        assert observer.call('room&project='+room)['participants']==[]
        anna.call('join',{'project':room,'name':'Anna','pin':'07042001'})
        other_anna.call('join',{'project':room,'name':'Anna','pin':'08052002'})
        mateo.call('join',{'project':room,'name':'Mateo','pin':'15081999'})
        waiting=observer.call('room&project='+room)
        assert waiting['lobbyOpen'] and [p['name'] for p in waiting['participants']].count('Anna')==2
        assert len(waiting['participants'])==3 and {p['name'] for p in waiting['participants']}=={'Anna','Mateo'}
        assert 'pin' not in json.dumps(waiting).lower() and 'hash' not in json.dumps(waiting).lower()
        assert anna.call('room&project='+room)['joinedName']=='Anna'
        anna.call('join',{'project':room,'name':'Anna','pin':'07042001'})
        assert len(observer.call('room&project='+room)['participants'])==3
        admin.call('reset_checkins',{'project':room})
        assert observer.call('room&project='+room)['participants']==[]
        anna.call('join',{'project':room,'name':'Anna','pin':'07042001'})
        other_anna.call('join',{'project':room,'name':'Anna','pin':'08052002'})
        mateo.call('join',{'project':room,'name':'Mateo','pin':'15081999'})
        admin.call('start',{'project':room})
        started=anna.call('room&project='+room)
        assert started['active'] and started['joinedName']=='Anna' and not started['lobbyOpen']
        observer.call('join',{'project':room,'name':'Late player','pin':'01012000'},409)
        saved=json.loads(Path(directory,'store.json').read_text())['projects'][room]
        assert saved['finalized'] and saved['active'] and not saved['lobby_open'] and not saved['assignments']
        demo_room=admin.call('create',{'name':'Manual testing'})['id']
        admin.call('demo_participants',{'project':demo_room})
        projects=admin.call('admin_data')['projects']
        demo=next(project for project in projects if project['id']==demo_room)
        assert [person['name'] for person in demo['people']]==['Test Anna','Test Mateo','Test Lea','Test Sofia']
        ids={person['name']:person['id'] for person in demo['people']}
        admin.call('participant',{'project':demo_room,'id':ids['Test Anna'],'name':'Edited Anna','country':'France','pin':''})
        admin.call('lock',{'project':demo_room,'from':ids['Test Mateo'],'to':ids['Test Lea']})
        edited=next(project for project in admin.call('admin_data')['projects'] if project['id']==demo_room)
        assert next(person for person in edited['people'] if person['id']==ids['Test Anna'])['name']=='Edited Anna'
        assert edited['locks'][ids['Test Mateo']]==ids['Test Lea']
        admin.call('demo_participants',{'project':demo_room},409)
        print('PASS: private DOB check-in, duplicate names with different DOBs, session re-entry, admin start gate, and closed late entry.')
    finally:
        server.terminate();server.wait(timeout=5)
