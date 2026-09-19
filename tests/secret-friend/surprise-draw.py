"""Fast isolated surprise draw regression; creates and removes only temporary test data."""
import http.cookiejar,json,os,re,socket,subprocess,tempfile,time,urllib.request,urllib.parse,urllib.error
from pathlib import Path
root=Path(__file__).resolve().parents[2]
with tempfile.TemporaryDirectory(prefix='sfhq-delete-') as directory:
    with socket.socket() as sock:
        sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
    env=dict(os.environ,SECRET_FRIEND_DATA_DIR=directory,SECRET_FRIEND_INSTALL_TOKEN='temporary-deletion-test-token-123456')
    server=subprocess.Popen(['php','-S',f'127.0.0.1:{port}','-t',str(root/'public')],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    base=f'http://127.0.0.1:{port}/secret-friend/'
    try:
        for _ in range(60):
            try:urllib.request.urlopen(base+'api.php?action=state',timeout=1).close();break
            except urllib.error.URLError:time.sleep(.05)
        class Client:
            def __init__(self):
                self.jar=http.cookiejar.CookieJar()
                self.opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))
                self.csrf=self.call('state')['csrf']
            def call(self,action,data=None,status=200,csrf=True):
                headers={'Content-Type':'application/json'}
                if csrf:headers['X-CSRF-Token']=getattr(self,'csrf','')
                request=urllib.request.Request(base+'api.php?action='+action,data=None if data is None else json.dumps(data).encode(),headers=headers)
                try:
                    response=self.opener.open(request);code=response.status;result=response.read()
                except urllib.error.HTTPError as e:code=e.code;result=e.read()
                assert code==status,(action,code,status,result)
                return json.loads(result)
        admin=Client();guest=Client();participant=Client()
        body=urllib.parse.urlencode(dict(csrf=admin.csrf,token=env['SECRET_FRIEND_INSTALL_TOKEN'],password='Test-only-password-2026',confirm='Test-only-password-2026')).encode()
        admin.opener.open(urllib.request.Request(base+'install.php',data=body)).close()
        admin.call('login',{'password':'Test-only-password-2026'})
        keep=admin.call('create',{'name':'Keep this room'})['id']
        room=admin.call('create',{'name':'Delete test room'})['id']
        admin.call('import',{'project':room,'text':'Test Anna | Germany | 07042001\nTest Mateo | Spain | 15081999'})
        admin.call('generate',{'project':room});admin.call('finalize',{'project':room});admin.call('access',{'project':room,'active':True})
        roster=guest.call('room&project='+room)['participants']
        person=next(p for p in roster if p['name']=='Test Anna')
        participant.call('authenticate',{'project':room,'participant':person['id'],'pin':'07042001'})
        def stored():return json.loads(Path(directory,'store.json').read_text())['projects'][room]
        assert not stored()['assignments'],'Sealing must not save random assignments'
        guest.call('reopen',{'project':room},401)
        admin.call('reopen',{'project':room},403,csrf=False)
        admin.call('reopen',{'project':room})
        assert not stored()['active'] and not stored()['finalized']
        participant.call('reveal',{},403)
        admin.call('finalize',{'project':room});admin.call('access',{'project':room,'active':True})
        participant.call('reveal',{},403)
        participant.call('authenticate',{'project':room,'participant':person['id'],'pin':'07042001'})

        participant.call('reveal',{},409)
        assert not stored()['assignments'],'Early reveals must not generate a draw'
        admin.call('admin_result',{'project':room,'participant':person['id']},409)
        guest.call('admin_result',{'project':room,'participant':person['id']},401)
        participant.call('admin_result',{'project':room,'participant':person['id']},401)
        # Age only this disposable test session, avoiding a real 90-second wait.
        cookie=next(c.value for c in participant.jar if c.name=='sfhq_session')
        code="session_save_path(getenv('TEST_SESSIONS')); session_id(getenv('TEST_SESSION_ID')); session_start(); $_SESSION['participant']['started']=time()-91; session_write_close();"
        subprocess.run(['php','-r',code],env=dict(env,TEST_SESSIONS=directory+'/sessions',TEST_SESSION_ID=cookie),check=True)
        result=participant.call('reveal',{'participant':'somebody-else','project':keep})
        assert result['name']=='Test Mateo'
        saved=stored()['assignments'];timestamp=stored()['drawn_at']
        admin.call('reopen',{'project':room},409)
        assert len(saved)==2 and len(set(saved.values()))==2
        assert all(a!=b for a,b in saved.items())
        assert participant.call('reveal',{})==result
        assert stored()['assignments']==saved and stored()['drawn_at']==timestamp
        projection=next(p for p in admin.call('admin_data')['projects'] if p['id']==room)
        assert projection['drawn'] and not projection['assignments']
        assert not projection['locks']
        assert admin.call('admin_result',{'project':room,'participant':person['id']})['recipient']==saved[person['id']]
        assert not next(p for p in admin.call('admin_data')['projects'] if p['id']==room)['assignments']
        # Manual directed locks are preserved in a separate late draw.
        locked=admin.call('create',{'name':'Manual surprise'})['id']
        admin.call('import',{'project':locked,'text':'A | Germany | 01012000\nB | Spain | 02022000\nC | Italy | 03032000'})
        agents=guest.call('admin_data',status=401)
        roster=next(p for p in admin.call('admin_data')['projects'] if p['id']==locked)['people']
        ids={p['name']:p['id'] for p in roster}
        admin.call('lock',{'project':locked,'from':ids['A'],'to':ids['B']})
        admin.call('finalize',{'project':locked});admin.call('access',{'project':locked,'active':True})
        participant.call('authenticate',{'project':locked,'participant':ids['A'],'pin':'01012000'})
        cookie=next(c.value for c in participant.jar if c.name=='sfhq_session')
        subprocess.run(['php','-r',code],env=dict(env,TEST_SESSIONS=directory+'/sessions',TEST_SESSION_ID=cookie),check=True)
        assert participant.call('reveal',{})['name']=='B'
        draw=json.loads(Path(directory,'store.json').read_text())['projects'][locked]['assignments']
        assert draw[ids['B']]==ids['C'],'A to B must not force B to A'
        admin.call('delete_project',{'project':locked})
        print('PASS: no draw before final reveal, stable saved draw, hidden admin responses, explicit per-row result access, session identity, and directed manual locks.')

        guest.call('delete_project',{'project':room},401)
        participant.call('delete_project',{'project':room},401)
        admin.call('delete_project',{'project':room},403,csrf=False)
        admin.call('delete_project&project='+room,status=405)
        admin.call('delete_project',{'project':room})
        guest.call('room&project='+room,status=404)
        participant.call('reveal',{},403)
        admin.call('delete_project',{'project':room},404)
        assert [p['id'] for p in guest.call('rooms')['rooms']]==[keep]
        admin.call('delete_project',{'project':keep})
        assert not guest.call('rooms')['rooms']
        data=json.loads(Path(directory,'store.json').read_text())
        assert not data['projects']
        print('PASS: admin-only deletion, CSRF, POST-only, draft/finalized deletion, session revocation, missing-room handling, other-room preservation, persisted removal.')
    finally:
        server.terminate();server.wait(timeout=5)
