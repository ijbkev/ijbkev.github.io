import type { DocumentWarning } from '../../shared/reimbursement';
export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, { ...options, credentials: 'same-origin', headers: options.body instanceof FormData ? options.headers : { 'Content-Type': 'application/json', ...options.headers } });
  } catch { throw new ApiError('The reimbursement service could not be reached. Your form is still here; please retry.', 503); }
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new ApiError(data?.error ?? 'The reimbursement service is unavailable. Please try again later.', response.status || 503);
  return data;
}
export async function downloadClaim(id: string, prepared?: FormData) {
  let response = await fetch(`/api/admin/submissions/${id}/pdf`, { credentials: 'same-origin', ...(prepared ? { method: 'POST', body: prepared } : {}) });
  if (prepared && response.status === 413) response = await fetch(`/api/admin/submissions/${id}/pdf`, { credentials: 'same-origin' });
  if (!response.ok) { const data = await response.json().catch(() => ({})); throw new ApiError(data.error ?? 'Unable to download the PDF.', response.status); }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a'); link.href = url; const encodedName = response.headers.get('Content-Disposition')?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  link.download = encodedName ? decodeURIComponent(encodedName) : 'Reimbursement Declaration.pdf'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  try { return JSON.parse(decodeURIComponent(response.headers.get('X-Document-Warnings') || '%5B%5D')) as DocumentWarning[]; } catch { return []; }
}
