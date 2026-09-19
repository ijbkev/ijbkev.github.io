import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, symlinkSync, existsSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const library = path.resolve('php-api/lib.php');
function php(code: string, args: string[] = []) {
  return execFileSync('php', ['-r', `require $argv[1]; ${code}`, library, ...args], { encoding: 'utf8' });
}

test('Private storage rejects public paths and symlinks before writing data', () => {
  const base = mkdtempSync(path.join(tmpdir(), 'ijbk-security-'));
  try {
    const web = path.join(base, 'web'); mkdirSync(web);
    const link = path.join(base, 'linked-web'); symlinkSync(web, link);
    const run = (storage: string) => php(`$_SERVER['DOCUMENT_ROOT']=$argv[2]; putenv('IJBK_STORAGE_DIR='.$argv[3]); echo storage_dir();`, [web, storage]);
    for (const storage of [web, path.join(web, 'private'), path.join(link, 'private'), 'relative-storage']) {
      assert.match(run(storage), /Storage must be/);
    }
    assert.equal(existsSync(path.join(web, 'private')), false);
    const privateDir = path.join(base, 'private'); mkdirSync(privateDir, { mode: 0o755 });
    assert.equal(run(privateDir), execFileSync('php', ['-r', 'echo realpath($argv[1]);', privateDir], { encoding: 'utf8' }));
    assert.equal(statSync(privateDir).mode & 0o777, 0o700);
  } finally { rmSync(base, { recursive: true, force: true }); }
});

test('Forwarded HTTPS is trusted only when the host explicitly enables its proxy', () => {
  const check = (trusted: string, https: string) => php(`putenv('IJBK_TRUST_PROXY='.$argv[2]); $_SERVER['HTTPS']=$argv[3]; $_SERVER['HTTP_X_FORWARDED_PROTO']='https'; echo request_is_https()?'secure':'plain';`, [trusted, https]);
  assert.equal(check('', 'off'), 'plain');
  assert.equal(check('1', 'off'), 'secure');
  assert.equal(check('', 'on'), 'secure');
});
