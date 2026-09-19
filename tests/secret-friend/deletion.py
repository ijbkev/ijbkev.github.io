"""Fast isolated deletion regression; creates and removes only temporary test data."""
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
                self.opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
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
