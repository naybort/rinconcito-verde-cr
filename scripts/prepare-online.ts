import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { draftFromRecord, draftPhotos, idSchema, publicSnapshot } from '../functions/src/domain.ts';
import { productionProject as project } from './production-config.ts';
import { documentName, fields, gcloudSession, projectApi, type Account, type ProjectApi, type Write } from './project-admin-api.ts';

type RecordData = Record<string, unknown> & { id: string };
type RecordReport = (data: Record<string, unknown>) => void;
const noReport: RecordReport = () => {};
export function catalogPairs(plants: RecordData[], categories: RecordData[], now = new Date().toISOString()) {
 const ids = new Set(categories.map(category => idSchema.parse(category.id)));
 if (ids.size !== categories.length || new Set(plants.map(plant => idSchema.parse(plant.id))).size !== plants.length) throw new Error('IDs duplicados en el catálogo inicial.');
 const pairs: { path: string; data: Record<string, unknown> }[][] = categories.map(category => [
  { path: 'categories/' + category.id, data: { ...category, active: true, revision: 1 } },
  { path: 'publicCategories/' + category.id, data: category },
 ]);
 for (const plant of plants) {
  const draft = draftFromRecord({ ...plant, careTemplateId: '', sources: [], warnings: '', originalPath: '', approvedImagePath: '', notes: 'Ficha original conservada desde el catálogo JSON; revisar antes de editar.' });
  if (draft.categoryIds.some(id => !ids.has(id))) throw new Error('Categoría desconocida en ' + draft.id);
  const photos = draftPhotos(draft);
  if (photos.some(photo => !/^\/images\/[A-Za-z0-9_-]+\.(png|webp|jpe?g)$/.test(photo.image.src))) throw new Error('La migración inicial solo acepta imágenes existentes del catálogo.');
  pairs.push([
   { path: 'plants/' + draft.id, data: { ...draft, status: 'published', revision: 1, publishedRevision: 1, updatedBy: 'initial-json-migration', updatedAt: now } },
   { path: 'publicPlants/' + draft.id, data: publicSnapshot(draft, photos.map(photo => photo.image.src)) },
  ]);
 }
 return pairs;
}
export async function migrateCatalog(api: ProjectApi, pairs: ReturnType<typeof catalogPairs>, apply = false, record: RecordReport = noReport) {
 const writes: Write[] = []; const preserved: string[] = [];
 for (const pair of pairs) {
  const existing = await Promise.all(pair.map(row => api.getDocument(row.path)));
  if (existing.some(Boolean) && !existing.every(Boolean)) throw new Error('Par público/privado incompleto: ' + pair[0].path + '. No se reconstruye desde datos antiguos.');
  if (existing.every(Boolean)) { preserved.push(...pair.map(row => row.path)); continue; }
  for (const row of pair) writes.push({ update: { name: documentName(row.path), fields: fields(row.data) }, currentDocument: { exists: false } });
 }
 const report = { operation: 'catalog', project, status: 'planned', creates: writes.map(write => write.update.name), preserved, writes };
 record(report);
 if (!apply) return report;
 try {
  report.status = 'applying'; record(report);
  await api.commit(writes);
  report.status = 'done'; record(report); return report;
 } catch (error) { report.status = 'incomplete'; record(report); throw error; }
}
function claims(account: Account): Record<string, unknown> {
 let value: unknown;
 try { value = JSON.parse(account.customAttributes || '{}'); } catch { throw new Error('Los claims existentes requieren revisión.'); }
 if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Los claims existentes requieren revisión.');
 return value as Record<string, unknown>;
}
function findAccount(accounts: Account[], email: string) {
 const matches = accounts.filter(account => account.email?.toLowerCase() === email);
 if (matches.length !== 1 || !/^[A-Za-z0-9_-]{1,128}$/.test(matches[0].localId) || matches[0].disabled) throw new Error('La cuenta solicitada no existe, está deshabilitada o requiere revisión: ' + email);
 return matches[0];
}
export async function provisionAdmins(api: ProjectApi, requested: string[], apply = false, record: RecordReport = noReport) {
 const emails = [...new Set(requested.map(email => email.trim().toLowerCase()))];
 if (!emails.length || emails.length > 10 || emails.some(email => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new Error('Indicar entre uno y diez correos administrativos explícitos.');
 const accounts = await api.lookup(emails);
 const plans = [];
 for (const email of emails) {
  const account = findAccount(accounts, email); const previousClaims = claims(account);
  const doc = await api.getDocument('adminUsers/' + account.localId);
  if (doc && (doc.fields?.active?.booleanValue === false || !doc.updateTime)) throw new Error('La lista de acceso existente requiere revisión; no se reactiva automáticamente: ' + email);
  if (Buffer.byteLength(JSON.stringify({ ...previousClaims, role: 'admin' })) > 1000) throw new Error('Los claims excederían el límite para ' + email);
  plans.push({ email, uid: account.localId, previousClaims, previousDocument: doc, completed: false });
 }
 const report = { operation: 'admins', project, status: 'planned', accounts: plans };
 record(report);
 if (!apply) return report;
 try {
  report.status = 'applying'; record(report);
  for (const plan of plans) {
   const current = findAccount(await api.lookup([plan.email]), plan.email);
   if (current.localId !== plan.uid || !isDeepStrictEqual(claims(current), plan.previousClaims)) throw new Error('La cuenta cambió durante la preparación; revisar antes de continuar.');
   const targetClaims = { ...plan.previousClaims, role: 'admin' };
   if (!isDeepStrictEqual(targetClaims, plan.previousClaims)) await api.setClaims(plan.uid, targetClaims);
   if (plan.previousDocument?.fields?.role?.stringValue !== 'admin' || plan.previousDocument.fields?.active?.booleanValue !== true) {
    await api.commit([{ update: { name: documentName('adminUsers/' + plan.uid), fields: fields({ role: 'admin', active: true }) }, updateMask: { fieldPaths: ['role', 'active'] }, currentDocument: plan.previousDocument ? { updateTime: plan.previousDocument.updateTime! } : { exists: false } }]);
   }
   const verified = findAccount(await api.lookup([plan.email]), plan.email);
   const doc = await api.getDocument('adminUsers/' + plan.uid);
   if (claims(verified).role !== 'admin' || doc?.fields?.role?.stringValue !== 'admin' || doc.fields?.active?.booleanValue !== true) throw new Error('No se confirmó el acceso de ' + plan.email);
   plan.completed = true; record(report);
  }
  report.status = 'done'; record(report); return report;
 } catch (error) { report.status = 'incomplete'; record(report); throw error; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
 const args = process.argv.slice(2); const root = fileURLToPath(new URL('../', import.meta.url));
 const help = 'npm run prepare:online -- catalog [--apply]\nnpm run prepare:online -- admins --email=CORREO [--email=CORREO] [--apply]\nSin --apply solo consulta y guarda un plan privado. Proyecto fijo: ' + project + '. No crea cuentas, cambia contraseñas, publica reglas ni mueve inventario.';
 if (args.includes('--help')) console.log(help);
 else {
  let directory = '';
  try {
   const mode = args[0]; const apply = args.includes('--apply');
   if (!['catalog', 'admins'].includes(mode) || args.slice(1).some(arg => arg !== '--apply' && !(mode === 'admins' && arg.startsWith('--email=')))) throw new Error(help);
   directory = join(root, '.firebase', 'setup-online', new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID());
   mkdirSync(directory, { recursive: true, mode: 0o700 });
   const record: RecordReport = data => writeFileSync(join(directory, 'result.json'), JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
   const api = projectApi(gcloudSession(root));
   if (mode === 'catalog') {
    const plants = JSON.parse(readFileSync(join(root, 'src/data/plants.json'), 'utf8')).plants as RecordData[];
    const categories = JSON.parse(readFileSync(join(root, 'src/data/categories.json'), 'utf8')).categories as RecordData[];
    const pairs = catalogPairs(plants, categories);
    for (const pair of pairs) for (const row of pair) if (row.path.startsWith('publicPlants/')) for (const photo of row.data.images as { src: string }[]) if (!existsSync(join(root, 'public', photo.src))) throw new Error('Falta imagen local ' + photo.src);
    const result = await migrateCatalog(api, pairs, apply, record);
    console.log(`${apply ? 'Migración confirmada' : 'Plan de migración'}: ${result.creates.length} documentos por crear; ${result.preserved.length} existentes preservados.`);
   } else {
    const result = await provisionAdmins(api, args.filter(arg => arg.startsWith('--email=')).map(arg => arg.slice(8)), apply, record);
    console.log(`${apply ? 'Accesos verificados' : 'Plan de accesos'}: ${result.accounts.length} cuentas. Los usuarios deben volver a iniciar sesión tras asignar claims.`);
   }
   console.log('Informe privado: ' + join(directory, 'result.json'));
  } catch (error) {
   console.error(error instanceof Error ? error.message : 'Preparación incompleta.');
   if (directory) console.error('Si hay un informe en ' + directory + ', revisarlo antes de repetir. No compartir su contenido privado.');
   process.exitCode = 1;
  }
 }
}
