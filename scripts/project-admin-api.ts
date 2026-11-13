import { spawnSync } from 'node:child_process';
import { productionProject as project, projectGcloudArgs } from './production-config.ts';
export const database = `projects/${project}/databases/(default)`;
export type Value = { stringValue?: string; booleanValue?: boolean; integerValue?: string; doubleValue?: number; nullValue?: null; arrayValue?: { values: Value[] }; mapValue?: { fields: Record<string, Value> } };
export type Document = { name: string; updateTime?: string; fields?: Record<string, Value> };
export type Write = { update: Document; currentDocument: { exists: false } | { updateTime: string }; updateMask?: { fieldPaths: string[] } };
export type Account = { localId: string; email: string; disabled?: boolean; customAttributes?: string };
export type ProjectApi = { getDocument(path: string): Promise<Document | null>; commit(writes: Write[]): Promise<void>; lookup(emails: string[]): Promise<Account[]>; setClaims(uid: string, claims: Record<string, unknown>): Promise<void> };
export function fields(value: Record<string, unknown>): Record<string, Value> {
 const encode = (v: unknown): Value => {
  if (v === null) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number' && Number.isFinite(v)) return Number.isSafeInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encode) } };
  if (v && typeof v === 'object') return { mapValue: { fields: fields(v as Record<string, unknown>) } };
  throw new Error('Dato incompatible con Firestore.');
 };
 return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined).map(([key, v]) => [key, encode(v)]));
}
export function documentName(path: string) {
 if (!/^(plants|publicPlants|categories|publicCategories|adminUsers)\/[A-Za-z0-9_-]{1,128}$/.test(path)) throw new Error('Ruta fuera de la preparación autorizada.');
 return database + '/documents/' + path;
}
export function gcloudSession(root: string): () => string {
 let token = ''; let expires = 0;
 return () => {
  if (token && Date.now() < expires) return token;
  const result = spawnSync('gcloud', projectGcloudArgs(['auth', 'print-access-token']), { cwd: root, shell: false, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (result.error || result.status !== 0) throw new Error('No se pudo usar la sesión gcloud. Revisar login y permisos; no se muestran credenciales.');
  token = result.stdout.trim(); expires = Date.now() + 30000;
  if (!token || /\s/.test(token)) throw new Error('gcloud no devolvió una sesión válida.');
  return token;
 };
}
export function projectApi(getAccessToken: () => string, fetcher: typeof fetch = globalThis.fetch): ProjectApi {
 async function request(url: string, body?: unknown, allowMissing = false): Promise<unknown> {
  let response: Response;
  try {
   response = await fetcher(url, { method: body === undefined ? 'GET' : 'POST', headers: { Authorization: 'Bearer ' + getAccessToken(), 'X-Goog-User-Project': project, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(20000) });
  } catch { throw new Error('No se confirmó la petición al proyecto. Revisar el informe antes de repetir una escritura.'); }
  if (allowMissing && response.status === 404) return null;
  if (!response.ok) throw new Error(`La API respondió HTTP ${response.status}. Revisar APIs/permisos del proyecto; no se reintenta automáticamente.`);
  try { return await response.json(); } catch { throw new Error('Respuesta de API inválida. Comprobar el estado antes de repetir.'); }
 }
 const authUrl = `https://identitytoolkit.googleapis.com/v1/projects/${project}/accounts:`;
 return {
  async getDocument(path) {
   const name = documentName(path);
   const result = await request('https://firestore.googleapis.com/v1/' + name, undefined, true) as Document | null;
   if (result && result.name !== name) throw new Error('Firestore devolvió otro documento.');
   return result;
  },
  async commit(writes) {
   if (!writes.length) return;
   for (const write of writes) {
    if (!write.update.name.startsWith(database + '/documents/')) throw new Error('Escritura fuera del proyecto confirmado.');
    documentName(write.update.name.slice((database + '/documents/').length));
   }
   const result = await request('https://firestore.googleapis.com/v1/' + database + '/documents:commit', { writes }) as { commitTime?: string };
   if (!result.commitTime) throw new Error('No se confirmó el commit Firestore; revisar los documentos antes de repetir.');
  },
  async lookup(emails) {
   const result = await request(authUrl + 'lookup?fields=users(localId,email,disabled,customAttributes)', { email: emails }) as { users?: Account[] };
   return result.users ?? [];
  },
  async setClaims(uid, claims) {
   if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid)) throw new Error('UID incompatible con adminUsers.');
   const customAttributes = JSON.stringify(claims);
   if (Buffer.byteLength(customAttributes) > 1000) throw new Error('Los claims excederían el límite permitido.');
   const result = await request(authUrl + 'update?fields=localId', { localId: uid, customAttributes }) as { localId?: string };
   if (result.localId !== uid) throw new Error('No se confirmó la actualización de claims.');
  },
 };
}
