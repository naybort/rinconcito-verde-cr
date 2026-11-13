// Run backend tests without reading the developer's functions/.env.local or reusing live emulator data.
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, cp, readFile, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const childEnv={...process.env,AI_ENABLED:'false',AI_EMULATOR_OPENAI:'false',OPENAI_LOCAL_API_KEY:'',OPENAI_API_KEY:''};
const run=(program,args,env=childEnv)=>new Promise((resolve,reject)=>{
 const grouped=process.platform!=='win32';
 const child=spawn(program,args,{cwd:root,env,stdio:'inherit',detached:grouped});
 child.once('error',reject);child.once('exit',code=>{
  if(code===0){resolve();return;}
  // Stop only this test process group if the CLI exits before its workers.
  if(grouped&&child.pid)try{process.kill(-child.pid,'SIGTERM');}catch{ /* Already stopped. */ }
  reject(new Error(`Proceso de pruebas terminó con código ${code}.`));
 });
});
const quote=value=>"'"+value.replaceAll("'","'\\''")+"'";
let temp;
try {
 await run('npm',['run','build:backend']);
 // Keep UNIX socket paths below macOS limits even when the OS temp path is long.
 temp=await mkdtemp(join(process.platform==='win32'?tmpdir():'/tmp','rv-tests-'));
 // Firebase Storage uses os.tmpdir()/firebase/storage/blobs and deletes it on shutdown.
 // Ports/project IDs alone do not isolate parallel emulator instances.
 const runtimeTmp=join(temp,'runtime');await mkdir(runtimeTmp);
 const source=join(temp,'functions');await mkdir(source);
 await cp(join(root,'functions','lib'),join(source,'lib'),{recursive:true});
 await cp(join(root,'functions','package.json'),join(source,'package.json'));
 await symlink(join(root,'functions','node_modules'),join(source,'node_modules'),'dir');
 await writeFile(join(source,'.env.local'),'AI_ENABLED=false\nAI_EMULATOR_OPENAI=false\nOPENAI_LOCAL_API_KEY=\nOPENAI_API_KEY=\n');
 const config=JSON.parse(await readFile(join(root,'firebase.json'),'utf8'));
 delete config.hosting;config.functions=[{source:'functions',codebase:'catalog'}];
 config.firestore.rules=join(root,config.firestore.rules);config.firestore.indexes=join(root,config.firestore.indexes);config.storage.rules=join(root,config.storage.rules);
 for(const service of Object.values(config.emulators))if(service&&typeof service==='object'){
  if(service.port)service.port+=10000;if(service.websocketPort)service.websocketPort+=10000;
 }
 config.emulators.ui.enabled=false;
 const configPath=join(temp,'firebase.json');await writeFile(configPath,JSON.stringify(config));
 const suite=process.argv.includes('--ui')?`${quote(join(root,'node_modules','.bin','playwright'))} test --config playwright.admin.config.ts`:'node --test --test-concurrency=1 tests/emulators/*.test.mjs';
 const script=`cd ${quote(root)} && node scripts/seed-emulators.mjs && ${suite}`;
 await run(join(root,'node_modules','.bin','firebase'),['emulators:exec','--config',configPath,'--project','demo-rinconcito-verde-tests','--only','auth,firestore,storage,functions',script],{...childEnv,TMPDIR:runtimeTmp,TMP:runtimeTmp,TEMP:runtimeTmp,RV_TEST_FUNCTIONS_SOURCE:source,RV_TEST_FUNCTIONS_PORT:String(config.emulators.functions.port),RV_TEST_AUTH_PORT:String(config.emulators.auth.port),RV_TEST_FIRESTORE_PORT:String(config.emulators.firestore.port),RV_TEST_STORAGE_PORT:String(config.emulators.storage.port),RV_TEST_PROJECT:'demo-rinconcito-verde-tests'});
} catch(error) {
 console.error(error instanceof Error?error.message:'No se pudieron ejecutar las pruebas.');process.exitCode=1;
} finally {
 if(temp)await rm(temp,{recursive:true,force:true});
}
