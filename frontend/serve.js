const { spawn } = require('child_process');
const path = require('path');

const port = process.env.PORT || 4400;
const host = '0.0.0.0';

console.log(`🚀 Starting Angular Frontend on ${host}:${port}...`);

const ngBin = path.join(__dirname, 'node_modules', '@angular', 'cli', 'bin', 'ng.js');

const child = spawn(process.execPath, [ngBin, 'serve', '--host', host, '--port', port.toString()], {
  stdio: 'inherit',
  shell: true
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
