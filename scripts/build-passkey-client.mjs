import { build } from 'esbuild';
// The standalone game uses exactly the same WebAuthn client as the React pages.
await build({ entryPoints: ['src/lib/admin-passkeys.ts'], bundle: true, format: 'iife', globalName: 'IjbkAdminPasskeys', outfile: 'public/secret-friend/passkeys.js', minify: true, target: 'es2020' });
