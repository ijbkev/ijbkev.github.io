import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/reimbursement-api';

type Profile = { name: string; oid: string; country: string };
export function usePartnerProfile(projectId: string, country: string, apply: (profile: Profile) => void) {
  const [status, setStatus] = useState('Loading saved organisation details…');
  const [loaded, setLoaded] = useState(false);
  const applyRef = useRef(apply);
  applyRef.current = apply;
  const queue = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    api<Profile>(`/projects/${projectId}/partner-profile`).then(profile => {
      if (active) { applyRef.current(profile); setLoaded(true); setStatus('Organisation details saved for both steps.'); }
    }).catch(() => { if (active) setStatus('Could not load saved organisation details. Reload to try again.'); });
    return () => { active = false; };
  }, [projectId, country]);
  function save(name: string, oid: string) {
    setStatus('Saving organisation details…');
    queue.current = queue.current.then(async () => {
      try {
        await api(`/projects/${projectId}/partner-profile`, { method: 'PUT', body: JSON.stringify({ name, oid, country }) });
        setStatus('Organisation details saved for both steps.');
      } catch { setStatus('Organisation details could not be saved. Edit a field to retry.'); }
    });
  }
  return { loaded, status, save };
}
