import type { ReactNode } from 'react';
import { useRoute } from '../../app/useRoute';
import { PageLoadingBoundary } from './PageLoading';

/** Private access checks never consume or display public loading settings. */
export function LoadingAppBoundary({ children }: { children: ReactNode }) {
 const audience = useRoute() === '#/admin' ? 'private' : 'public';
 return <PageLoadingBoundary key={audience} audience={audience}>{children}</PageLoadingBoundary>;
}
