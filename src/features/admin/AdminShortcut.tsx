import { useEffect, useState } from 'react';
import { Button } from '@mui/material';

/** Only observes access; the public catalog never subscribes to private collections. */
export function AdminShortcut() {
 const [allowed, setAllowed] = useState(false);
 useEffect(() => {
  if (!import.meta.env.VITE_FIREBASE_MODE) return;
  let cancelled = false, generation = 0;
  let stop = () => {};
  void Promise.all([import('../../lib/firebase'), import('firebase/auth'), import('firebase/firestore')]).then(([{ firebase }, { onIdTokenChanged }, { doc, getDoc }]) => {
   if (cancelled || !firebase) return;
   stop = onIdTokenChanged(firebase.auth, async user => {
    const current = ++generation;
    setAllowed(false);
    if (!user) return;
    const isCurrent = () => !cancelled && current === generation;
    try {
     const { claims } = await user.getIdTokenResult();
     if (!isCurrent() || !['admin', 'editor'].includes(String(claims.role))) return;
     const member = await getDoc(doc(firebase.db, 'adminUsers', user.uid));
     if (isCurrent()) setAllowed(member.data()?.active === true && member.data()?.role === claims.role);
    } catch {
     if (isCurrent()) setAllowed(false);
    }
   }, () => { ++generation; if (!cancelled) setAllowed(false); });
  }).catch(() => { if (!cancelled) setAllowed(false); });
  return () => { cancelled = true; ++generation; stop(); };
 }, []);
 if (!allowed) return null;
 return <Button component="a" href="/admin" variant="outlined" size="small" sx={{ flexShrink: 0, ml: 'auto', minHeight: 40 }}>Administrar</Button>;
}
