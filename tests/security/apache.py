import tempfile,pathlib,subprocess,socket,time,urllib.request,urllib.error,shutil,os
repo=pathlib.Path.cwd()
with tempfile.TemporaryDirectory(prefix='ijbk-apache-') as tmp:
 d=pathlib.Path(tmp);web=d/'web';web.mkdir();shutil.copy(repo/'public/.htaccess',web/'.htaccess')
 for name in ['index.html','api/index.php','api/assets/coordinator-signature.png','.local/server.env','secret-friend-private/store.json','backup.sqlite3','reimbursement/coordinator-signature.png','reimbursement/eu-logo.png','secret-friend/core.php','secret-friend/bootstrap.php','secret-friend/app.js']:
  p=web/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text('SYNTHETIC TEST FIXTURE')
 shutil.copy(repo/'public/secret-friend/.htaccess',web/'secret-friend/.htaccess')
 with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
 mods=['mpm_prefork','unixd','authz_core','authz_host','headers','rewrite','mime','dir']
 config=f'ServerRoot "{d}"\nListen 127.0.0.1:{port}\nServerName localhost\nPidFile "{d}/pid"\nErrorLog "{d}/error.log"\n'
 config+='\n'.join(f'LoadModule {m}_module /usr/libexec/apache2/mod_{m}.so' for m in mods)
 config+=f'\nDocumentRoot "{web}"\nTypesConfig /etc/apache2/mime.types\n<Directory "{web}">\nAllowOverride All\nRequire all granted\n</Directory>\n'
 (d/'httpd.conf').write_text(config)
 proc=subprocess.Popen(['/usr/sbin/httpd','-X','-f',str(d/'httpd.conf')],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
 try:
  time.sleep(.5)
  if proc.poll() is not None:raise RuntimeError(proc.stderr.read().decode())
  for route,expected in [('/index.html',200),('/about',200),('/reimbursement/eu-logo.png',200),('/.local/server.env',403),('/secret-friend-private/store.json',403),('/backup.sqlite3',403),('/reimbursement/coordinator-signature.png',403),('/api/assets/coordinator-signature.png',403),('/api/bootstrap.php',403),('/api/vendor/autoload.php',403),('/secret-friend/core.php',403),('/secret-friend/bootstrap.php',403),('/secret-friend/app.js',200)]:
   try:r=urllib.request.urlopen(f'http://127.0.0.1:{port}'+route)
   except urllib.error.HTTPError as e:r=e
   assert r.status==expected,(route,r.status,r.read(),(d/'error.log').read_text())
   assert r.headers['X-Content-Type-Options']=='nosniff'
   assert "frame-ancestors 'none'" in r.headers['Content-Security-Policy']
   print(route,r.status)
  print('PASS: Apache file protections, public assets, SPA routing and security headers')
 finally:
  proc.terminate();proc.wait(timeout=5)
