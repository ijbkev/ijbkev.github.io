import { api } from './reimbursement-api';

export function passkeysSupported() {
  return window.isSecureContext && typeof PublicKeyCredential !== 'undefined';
}
function decode(value: string): ArrayBuffer {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, c => c.charCodeAt(0)).buffer;
}
function encode(value: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(value))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
type Descriptor = Omit<PublicKeyCredentialDescriptor, 'id'> & { id: string };
type CreateOptions = Omit<PublicKeyCredentialCreationOptions, 'challenge' | 'user' | 'excludeCredentials'> & {
  challenge: string; user: Omit<PublicKeyCredentialUserEntity, 'id'> & { id: string }; excludeCredentials?: Descriptor[];
};
type GetOptions = Omit<PublicKeyCredentialRequestOptions, 'challenge' | 'allowCredentials'> & { challenge: string; allowCredentials?: Descriptor[] };
export async function registerPasskey(password: string, label: string) {
  const { publicKey } = await api<{ publicKey: CreateOptions }>('/admin/passkeys/register/options', { method: 'POST', body: JSON.stringify({ password, label }) });
  const credential = await navigator.credentials.create({ publicKey: {
    ...publicKey, challenge: decode(publicKey.challenge), user: { ...publicKey.user, id: decode(publicKey.user.id) },
    excludeCredentials: publicKey.excludeCredentials?.map(c => ({ ...c, id: decode(c.id) })),
  } }) as PublicKeyCredential | null;
  if (!credential) throw new Error('Passkey registration was cancelled.');
  const response = credential.response as AuthenticatorAttestationResponse;
  await api('/admin/passkeys/register/verify', { method: 'POST', body: JSON.stringify({ id: encode(credential.rawId), type: credential.type, clientDataJSON: encode(response.clientDataJSON), attestationObject: encode(response.attestationObject) }) });
}
export async function signInWithPasskey() {
  const { publicKey } = await api<{ publicKey: GetOptions }>('/admin/passkeys/login/options', { method: 'POST' });
  const credential = await navigator.credentials.get({ publicKey: {
    ...publicKey, challenge: decode(publicKey.challenge), allowCredentials: publicKey.allowCredentials?.map(c => ({ ...c, id: decode(c.id) })),
  } }) as PublicKeyCredential | null;
  if (!credential) throw new Error('Passkey sign-in was cancelled.');
  const response = credential.response as AuthenticatorAssertionResponse;
  await api('/admin/passkeys/login/verify', { method: 'POST', body: JSON.stringify({ id: encode(credential.rawId), type: credential.type, clientDataJSON: encode(response.clientDataJSON), authenticatorData: encode(response.authenticatorData), signature: encode(response.signature), userHandle: response.userHandle ? encode(response.userHandle) : null }) });
}
export function passkeyError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'AbortError') return 'Passkey request cancelled or timed out. Try again, or use your password.';
    if (error.name === 'InvalidStateError') return 'This passkey is already registered. Try signing in with it.';
    if (error.name === 'SecurityError') return 'Open this website over HTTPS to use passkeys. For local testing, use localhost.';
  }
  return error instanceof Error ? error.message : 'Passkey request failed. Please try again.';
}
