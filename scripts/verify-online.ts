import { chromium, expect, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { productionOrigin as origin } from './production-config.ts';

const args = process.argv.slice(2);
if (args.includes('--help')) {
 console.log('npm run verify:online [-- --access-only]\nAbre Chrome para iniciar sesión manualmente. La prueba completa crea un borrador privado y tres solicitudes REALES de IA. No publica propuestas ni modifica inventario. --access-only comprueba acceso sin generar IA.');
} else if (args.length > 1 || (args.length === 1 && args[0] !== '--access-only')) {
 console.error('Uso: npm run verify:online [-- --access-only]'); process.exitCode = 2;
} else {
 const accessOnly = args[0] === '--access-only';
 const root = fileURLToPath(new URL('../', import.meta.url));
 const runId = new Date().toISOString().replace(/[:.]/g, '-');
 const directory = join(root, '.firebase', 'online-qa', runId); mkdirSync(directory, { recursive: true });
 const report = { status: 'started', stage: 'starting', uiErrors: [] as string[], origin, accessOnly, startedAt: new Date().toISOString(), plantId: '', checks: [] as string[], requests: [] as { kind: string; status: string; jobId?: string }[], error: '' };
 const record = () => writeFileSync(join(directory, 'result.json'), JSON.stringify(report, null, 2) + '\n'); record();
 const stage = (value: string) => { report.stage = value; record(); console.log('Verificando: ' + value + '…'); };
 const browser = await chromium.launch({ headless: false, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : { channel: 'chrome' }) }).catch(error => { report.status = 'incomplete'; report.error = 'No se pudo abrir Chrome para verificar el sitio.'; record(); throw error; });
 const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
 const page = await context.newPage();
 async function phase(page: Page, step: number) {
  const picker = page.getByRole('combobox', { name: 'Ir al paso', exact: true });
  if (await picker.isVisible()) { await picker.click(); await page.getByRole('option').nth(step - 1).click(); }
  else await page.getByRole('navigation', { name: 'Pasos de la ficha', exact: true }).getByRole('button').nth(step - 1).click();
  await expect(page.getByText(`Paso ${step} de 7 · Podés ir directamente a cualquier paso`, { exact: true })).toBeVisible();
 }
 async function request(kind: string, label: string, button: string) {
  stage('ai-' + kind);
  const entry: { kind: string; status: string; jobId?: string } = { kind, status: 'submitting' };
  report.requests.push(entry); record(); console.log('Solicitando una propuesta real de ' + label + '…');
  const [response] = await Promise.all([page.waitForResponse(response => {
   if (!response.url().startsWith('https://us-central1-rinconcito-verde-cr.cloudfunctions.net/adminCommand')) return false;
   try { const data = response.request().postDataJSON()?.data; return data?.action === 'requestAI' && data.payload?.kind === kind; } catch { return false; }
  }, { timeout: 90000 }), page.getByRole('button', { name: button, exact: true }).click()]);
  const body = await response.json();
  entry.jobId = body.result?.jobId ?? body.data?.jobId; entry.status = entry.jobId ? 'accepted' : 'unconfirmed'; record();
  if (!response.ok() || !entry.jobId) throw new Error('No se confirmó la solicitud de ' + label + '. Revisar el borrador antes de reintentar.');
  const summary = page.locator('summary').filter({ hasText: new RegExp('^' + label + ': (Propuesta lista|No disponible)') }).first();
  await expect(summary).toBeVisible({ timeout: 300000 });
  if (!(await summary.textContent())?.includes('Propuesta lista')) { entry.status = 'failed'; record(); throw new Error('El trabajo de ' + label + ' falló. Revisar el diagnóstico visible en el panel.'); }
  entry.status = 'ready'; record();
  await page.screenshot({ path: join(directory, kind + '.png'), fullPage: true });
 }
 try {
  stage('public-catalog');
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Encontrá tu próxima planta' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Administrar', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Ver detalle de Sansevieria', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sansevieria', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Añadir a favoritos', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Quitar de favoritos', exact: true })).toBeVisible();
  await page.screenshot({ path: join(directory, 'public-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: join(directory, 'public-mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 }); report.checks.push('public-catalog-detail-favorites-responsive'); record();
  stage('admin-login');
  await page.goto(origin + '/admin');
  console.log('Iniciá sesión en la ventana de Chrome con una de las cuentas administradoras. La contraseña se introduce solo en el sitio. Tenés 5 minutos.');
  await expect(page.getByRole('heading', { name: 'Tu vivero, al día', exact: true })).toBeVisible({ timeout: 300000 });
  await expect(page.getByRole('button', { name: 'Más', exact: true })).toBeVisible();
  report.checks.push('admin-login-role'); record();
  if (!accessOnly) {
   stage('private-photo-upload');
   await page.getByRole('button', { name: 'Agregar planta', exact: true }).click();
   await page.getByRole('textbox', { name: 'Nombre de la planta', exact: true }).fill('QA online Sansevieria ' + runId);
   await phase(page, 7);
   report.plantId = (await page.getByText(/^ID permanente:/).textContent())?.match(/ID permanente: ([a-z0-9-]+)\./)?.[1] ?? ''; record();
   if (!report.plantId) throw new Error('No se pudo registrar el ID del borrador de prueba.');
   await phase(page, 1);
   const image = join(root, 'public/images/sansevieria.png');
   const originalHash = createHash('sha256').update(readFileSync(image)).digest('hex');
   await page.getByLabel('Fotografía original', { exact: true }).setInputFiles(image);
   const preview = page.getByRole('img', { name: 'Vista previa de la fotografía', exact: true });
   await expect(preview).toBeVisible({ timeout: 60000 });
   await expect(preview).toHaveAttribute('src', /^blob:/, { timeout: 60000 });
   const initialBytes = await preview.evaluate(async element => Array.from(new Uint8Array(await (await fetch((element as HTMLImageElement).src)).arrayBuffer())));
   expect(createHash('sha256').update(new Uint8Array(initialBytes)).digest('hex')).toBe(originalHash);
   report.checks.push('private-photo-upload-read'); record();
   stage('private-draft-save');
   await phase(page, 3); await page.getByLabel('Identificación confirmada por una persona', { exact: true }).fill('Sansevieria');
   await phase(page, 4); await page.getByLabel('Descripción', { exact: true }).fill('Borrador privado de verificación. No publicar.');
   await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
   await expect(page.getByText('Guardado', { exact: true })).toBeVisible({ timeout: 90000 });
   report.checks.push('private-draft-saved'); record();
   await phase(page, 3); await request('identify', 'Identificación', 'Sugerir identificación');
   await expect(page.getByText('Nombre científico:', { exact: true })).toBeVisible();
   await phase(page, 4); await request('content', 'Contenido y cuidados', 'Proponer contenido con fuentes');
   await expect(page.getByLabel('Descripción', { exact: true })).toHaveValue('Borrador privado de verificación. No publicar.');
   const proposal = page.locator('details').filter({ hasText: 'Contenido y cuidados: Propuesta lista' }).first();
   expect(await proposal.locator('a[href^="https://"]').count()).toBeGreaterThan(0);
   for (const label of ['Luz', 'Riego', 'Humedad', 'Temperatura']) expect((await proposal.locator('p').filter({ hasText: new RegExp('^' + label + ':') }).first().textContent())?.trim().length).toBeGreaterThan(label.length + 1);
   await phase(page, 5); await request('enhance', 'Mejora de fotografía', 'Proponer mejora de fotografía');
   const original = page.getByRole('img', { name: 'Fotografía original', exact: true });
   await expect(original).toHaveAttribute('src', /^blob:/);
   await expect(page.getByRole('img', { name: 'Fotografía propuesta por IA', exact: true })).toBeVisible();
   const bytes = await original.evaluate(async element => Array.from(new Uint8Array(await (await fetch((element as HTMLImageElement).src)).arrayBuffer())));
   expect(createHash('sha256').update(new Uint8Array(bytes)).digest('hex')).toBe(originalHash);
   await expect(page.getByText('Fotografía elegida: original', { exact: true })).toBeVisible();
   report.checks.push('three-real-ai-jobs', 'sources-and-care', 'draft-not-overwritten', 'original-bytes-preserved', 'proposals-not-applied'); record();
  }
  stage('admin-navigation-logout');
  await page.getByRole('link', { name: 'Catálogo público', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Administrar', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: join(directory, 'admin-shortcut-mobile.png'), fullPage: true });
  await page.getByRole('link', { name: 'Administrar', exact: true }).click();
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Iniciar sesión', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Volver al catálogo', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Administrar', exact: true })).toHaveCount(0);
  report.checks.push('admin-shortcut-login-logout'); report.status = 'passed'; report.stage = 'complete'; record();
  console.log('Verificación terminada. Informe y capturas: ' + directory + (report.plantId ? '. Borrador privado conservado: ' + report.plantId : ''));
 } catch (error) {
  report.status = 'incomplete'; report.error = error instanceof Error ? error.message : 'Error de verificación';
  report.uiErrors = (await page.locator('[role="alert"].MuiAlert-standardError').allTextContents().catch(() => [])).map(text => text.trim().slice(0, 500)).slice(0, 3); record();
  console.error('Etapa incompleta: ' + report.stage);
  for (const message of report.uiErrors) console.error('Panel: ' + message);
  await page.screenshot({ path: join(directory, 'failure.png'), fullPage: true }).catch(() => {});
  console.error('Verificación incompleta. Revisar ' + join(directory, 'result.json') + ' y los trabajos existentes antes de repetir llamadas a IA.'); process.exitCode = 1;
 } finally { await browser.close(); }
}
