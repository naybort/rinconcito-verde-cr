import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, URL } from 'node:url';

// Never inherit the active Firebase/GCloud project: an explicit destination is mandatory.
const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== '--project' || !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(args[1])) {
  process.stderr.write('Uso: npm run deploy -- --project ID_DEL_PROYECTO_CONFIRMADO\nNo se publicó nada. El ID debe ser explícito y válido.\n');
  process.exit(2);
}
const project = args[1];
const cwd = fileURLToPath(new URL('../', import.meta.url));
function run(command, parameters) {
  const result = spawnSync(command, parameters, { cwd, stdio: 'inherit', shell: false });
  if (result.error) {
    process.stderr.write(`${command}: ${result.error.message}\n`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}
// Check the existing CLI, never install or log in automatically.
run('firebase', ['--version']);
run('npm', ['run', 'check']);
process.stdout.write(`Publicando solamente Firebase Hosting en ${project}\n`);
run('firebase', ['deploy', '--only', 'hosting', '--project', project, '--config', 'firebase.json', '--non-interactive']);
