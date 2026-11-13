import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { WateringLoader, loadingMessage } from './WateringLoader';

export const MINIMUM_LOADING_MS = 3000;
type BeginLoading = (message: string) => () => void;
const LoadingContext = createContext<BeginLoading | null>(null);

/** Children keep mounting/fetching while hidden. Consecutive loading phases share one clock. */
export function PageLoadingBoundary({ children }: { children: ReactNode }) {
 const [visible, setVisible] = useState(true);
 const [message, setMessage] = useState(loadingMessage);
 const state = useRef({ pending: new Set<symbol>(), visible: true, until: Date.now() + MINIMUM_LOADING_MS, timer: undefined as ReturnType<typeof setTimeout> | undefined });
 const settle = useCallback(() => {
  const current = state.current;
  clearTimeout(current.timer);
  if (current.pending.size || !current.visible) return;
  const finish = () => { if (!current.pending.size) { current.visible = false; setVisible(false); } };
  const remaining = current.until - Date.now();
  // Defer even an expired clock: a new phase can register in this same commit.
  current.timer = setTimeout(finish, Math.max(0, remaining));
 }, []);
 const begin = useCallback<BeginLoading>(label => {
  const current = state.current;
  clearTimeout(current.timer);
  if (!current.visible) {
   current.visible = true; current.until = Date.now() + MINIMUM_LOADING_MS; setVisible(true);
  }
  setMessage(label);
  const token = Symbol(); current.pending.add(token);
  return () => { current.pending.delete(token); settle(); };
 }, [settle]);
 useEffect(() => {
  const current = state.current;
  settle();
  return () => clearTimeout(current.timer);
 }, [settle]);
 return <LoadingContext.Provider value={begin}>
  <div hidden={visible}>{children}</div>
  {visible && <WateringLoader message={message}/>}
 </LoadingContext.Provider>;
}

/** A full-page loading phase; independent renders also get the same illustration. */
export function PageLoading({ message = loadingMessage }: { message?: string }) {
 const begin = useContext(LoadingContext);
 useLayoutEffect(() => begin?.(message), [begin, message]);
 return begin ? null : <WateringLoader message={message}/>;
}
