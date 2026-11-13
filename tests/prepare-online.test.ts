// @vitest-environment node
import { expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { catalogPairs, migrateCatalog, provisionAdmins } from '../scripts/prepare-online';
import { documentName, fields, projectApi, type Account, type Document, type ProjectApi, type Write } from '../scripts/project-admin-api';
const plants = JSON.parse(readFileSync(new URL('../src/data/plants.json', import.meta.url), 'utf8')).plants;
const categories = JSON.parse(readFileSync(new URL('../src/data/categories.json', import.meta.url), 'utf8')).categories;
function runtime() {
 const docs = new Map<string, Document>();
 const accounts: Account[] = [{ localId: 'user-one', email: 'one@example.test', customAttributes: JSON.stringify({ existing: 'preserve' }) }, { localId: 'user-two', email: 'two@example.test' }];
 const api: ProjectApi = {
  getDocument: vi.fn(async path => structuredClone(docs.get(path) ?? null)),
  lookup: vi.fn(async emails => structuredClone(accounts.filter(account => emails.includes(account.email)))),
  setClaims: vi.fn(async (uid, claims) => { accounts.find(account => account.localId === uid)!.customAttributes = JSON.stringify(claims); }),
  commit: vi.fn(async writes => {
   for (const write of writes) {
    const path = write.update.name.split('/documents/')[1]; const old = docs.get(path);
    if (('exists' in write.currentDocument && old) || ('updateTime' in write.currentDocument && old?.updateTime !== write.currentDocument.updateTime)) throw new Error('precondition failed');
   }
   for (const write of writes) {
    const path = write.update.name.split('/documents/')[1];
    docs.set(path, { ...write.update, fields: { ...(write.updateMask ? docs.get(path)?.fields : {}), ...write.update.fields }, updateTime: 'new-time' });
   }
  }),
 };
 return { api, docs, accounts, record: vi.fn() };
}
it('migra cuatro fichas y tres categorías conservando IDs y la foto adicional', async () => {
 const r = runtime(); const pairs = catalogPairs(plants, categories);
 const plan = await migrateCatalog(r.api, pairs, false, r.record);
 expect(plan.creates).toHaveLength(14); expect(r.api.commit).not.toHaveBeenCalled();
 await migrateCatalog(r.api, pairs, true);
 expect(r.api.commit).toHaveBeenCalledOnce();
 const writes = vi.mocked(r.api.commit).mock.calls[0][0];
 expect(writes.every(write => 'exists' in write.currentDocument && write.currentDocument.exists === false)).toBe(true);
 expect(r.docs.has('plants/sansevieria')).toBe(true);
 expect(r.docs.get('publicPlants/demo-monstera')?.fields?.images?.arrayValue?.values).toHaveLength(2);
 expect(writes.some(write => /stocks|movements|aiJobs/.test(write.update.name))).toBe(false);
});
it('preserva fichas existentes y detiene pares público/privado incompletos', async () => {
 const r = runtime(); const pairs = catalogPairs(plants, categories);
 const existing = { name: documentName('plants/sansevieria'), fields: fields({ notes: 'existing edits' }), updateTime: 'old' };
 r.docs.set('plants/sansevieria', existing);
 await expect(migrateCatalog(r.api, pairs, true)).rejects.toThrow('incompleto');
 expect(r.api.commit).not.toHaveBeenCalled();
 r.docs.set('publicPlants/sansevieria', { name: documentName('publicPlants/sansevieria'), updateTime: 'old' });
 const result = await migrateCatalog(r.api, pairs, true);
 expect(result.creates).toHaveLength(12); expect(r.docs.get('plants/sansevieria')).toEqual(existing);
});
it('una creación concurrente conserva los datos y deja informe incompleto', async () => {
 const r = runtime(); vi.mocked(r.api.commit).mockRejectedValue(new Error('precondition failed'));
 await expect(migrateCatalog(r.api, catalogPairs(plants, categories), true, r.record)).rejects.toThrow('precondition');
 expect(r.record).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'incomplete' }));
 expect(r.api.commit).toHaveBeenCalledOnce();
});
it('asigna los dos mecanismos de acceso, preserva claims/campos y vuelve a leerlos', async () => {
 const r = runtime(); r.docs.set('adminUsers/user-one', { name: documentName('adminUsers/user-one'), updateTime: 'old', fields: fields({ role: 'editor', active: true, note: 'keep' }) });
 await provisionAdmins(r.api, ['one@example.test', 'two@example.test'], false); expect(r.api.setClaims).not.toHaveBeenCalled(); expect(r.api.commit).not.toHaveBeenCalled();
 await provisionAdmins(r.api, ['one@example.test', 'two@example.test'], true, r.record);
 expect(JSON.parse(r.accounts[0].customAttributes!)).toEqual({ existing: 'preserve', role: 'admin' });
 expect(r.docs.get('adminUsers/user-one')?.fields).toEqual(fields({ role: 'admin', active: true, note: 'keep' }));
 expect(vi.mocked(r.api.commit).mock.calls[0][0][0]).toMatchObject({ currentDocument: { updateTime: 'old' }, updateMask: { fieldPaths: ['role', 'active'] } });
 expect(r.record).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'done' }));
});
it('comprueba todas las cuentas antes de asignar permisos y no crea usuarios', async () => {
 const r = runtime();
 await expect(provisionAdmins(r.api, ['one@example.test', 'missing@example.test'], true)).rejects.toThrow('no existe');
 expect(r.api.setClaims).not.toHaveBeenCalled(); expect(r.api.commit).not.toHaveBeenCalled();
});
it('no reactiva una cuenta deshabilitada ni un acceso revocado', async () => {
 const r = runtime(); r.accounts[0].disabled = true;
 await expect(provisionAdmins(r.api, ['one@example.test'], true)).rejects.toThrow('deshabilitada');
 r.accounts[0].disabled = false; r.docs.set('adminUsers/user-one', { name: documentName('adminUsers/user-one'), updateTime: 'old', fields: fields({ active: false }) });
 await expect(provisionAdmins(r.api, ['one@example.test'], true)).rejects.toThrow('reactiva');
 expect(r.api.setClaims).not.toHaveBeenCalled();
});
it('registra un fallo entre claims y lista de acceso y no sigue con la siguiente cuenta', async () => {
 const r = runtime(); vi.mocked(r.api.commit).mockRejectedValue(new Error('failure'));
 await expect(provisionAdmins(r.api, ['one@example.test', 'two@example.test'], true, r.record)).rejects.toThrow('failure');
 expect(r.api.setClaims).toHaveBeenCalledTimes(1); expect(r.docs.size).toBe(0);
 expect(r.record).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'incomplete' }));
});
it('no pisa claims que cambiaron durante la preparación', async () => {
 const r = runtime(); vi.mocked(r.api.lookup).mockResolvedValueOnce(structuredClone(r.accounts));
 r.accounts[0].customAttributes = JSON.stringify({ changed: true });
 await expect(provisionAdmins(r.api, ['one@example.test'], true)).rejects.toThrow('cambió');
 expect(r.api.setClaims).not.toHaveBeenCalled();
});
it('consulta y escribe solo el proyecto fijo sin incluir passwords ni devolver tokens', async () => {
 const fetcher = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
  expect(init?.headers).toMatchObject({ Authorization: 'Bearer private-fixture', 'X-Goog-User-Project': 'rinconcito-verde-cr' });
  expect(init?.redirect).toBe('error');
  if (String(url).includes('accounts:lookup')) { expect(url).toContain('fields=users(localId,email,disabled,customAttributes)'); return new Response(JSON.stringify({ users: [{ localId: 'user-one', email: 'one@example.test' }] })); }
  if (String(url).includes('accounts:update')) { expect(JSON.parse(init!.body as string)).toEqual({ localId: 'user-one', customAttributes: '{"role":"admin"}' }); return new Response('{"localId":"user-one"}'); }
  return new Response('{}', { status: 404 });
 });
 const api = projectApi(() => 'private-fixture', fetcher);
 expect(await api.getDocument('plants/sansevieria')).toBeNull();
 await api.lookup(['one@example.test']); await api.setClaims('user-one', { role: 'admin' });
 await expect(api.getDocument('../secrets/other')).rejects.toThrow('fuera');
 await expect(api.commit([{ update: { name: 'projects/other/databases/(default)/documents/plants/one' }, currentDocument: { exists: false } }])).rejects.toThrow('fuera');
 expect(fetcher).toHaveBeenCalledTimes(3);
});
it('un error de API no revela cuerpo o credenciales ni reintenta una escritura', async () => {
 const fetcher = vi.fn(async () => new Response('{"error":"private-fixture"}', { status: 403 }));
 const api = projectApi(() => 'private-fixture', fetcher);
 const writes: Write[] = [{ update: { name: documentName('plants/one'), fields: fields({ id: 'one' }) }, currentDocument: { exists: false } }];
 await expect(api.commit(writes)).rejects.toThrow('HTTP 403'); expect(fetcher).toHaveBeenCalledOnce();
});
