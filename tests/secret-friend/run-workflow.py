"""Run the timed workflow only against a fresh disposable local server."""
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

root = Path(__file__).resolve().parents[2]
with tempfile.TemporaryDirectory(prefix='sfhq-workflow-') as directory:
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    env = dict(os.environ, SECRET_FRIEND_DATA_DIR=directory,
               SECRET_FRIEND_INSTALL_TOKEN='local-test-install-token-32-characters')
    server = subprocess.Popen(['php', '-S', f'127.0.0.1:{port}', '-t', str(root / 'public')],
                              env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        base = f'http://127.0.0.1:{port}/secret-friend/'
        for _ in range(60):
            try:
                urllib.request.urlopen(base + 'api.php?action=state', timeout=1).close()
                break
            except urllib.error.URLError:
                if server.poll() is not None:
                    raise RuntimeError('The disposable PHP server exited before startup')
                time.sleep(.05)
        subprocess.run([sys.executable, str(root / 'tests/secret-friend/workflow.py'), base], check=True, timeout=150)
    finally:
        server.terminate()
        server.wait(timeout=5)
