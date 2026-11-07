import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const python = process.env.ML_PYTHON || path.join(root, '.data/ml-venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
if (!existsSync(python)) {
  console.error('Create .data/ml-venv and install ml/requirements.txt first; see DEPLOYMENT.md. Or set ML_PYTHON to an absolute interpreter path.');
  process.exit(1);
}
const action = process.argv[2];
if (!['test', 'serve'].includes(action)) throw new Error('Expected test or serve');
const args = action === 'test'
  ? ['-m', 'unittest', 'discover', '-s', 'ml', '-p', 'test_*.py']
  : ['-m', 'uvicorn', 'app:app', '--app-dir', 'ml', '--host', '127.0.0.1', '--port', '8001'];
const result = spawnSync(python, args, { cwd: root, stdio: 'inherit' });
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
