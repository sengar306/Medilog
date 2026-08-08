const { spawn } = require('child_process');
const path = require('path');

console.log('--- Starting MediLog Pharmacy Platform (Backend + Frontend) ---');

// Set PATH to Node 20
const node20Path = 'C:\\Users\\vivek\\AppData\\Local\\nvm\\v20.20.2';
const env = { ...process.env };
env.PATH = `${node20Path};${env.PATH}`;

// Start Backend
console.log('Launching Backend Server...');
const backend = spawn('node', ['server.js'], {
  cwd: path.join(__dirname, 'backend'),
  env,
  shell: true
});

backend.stdout.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach(line => console.log(`[Backend] ${line}`));
});

backend.stderr.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach(line => console.error(`[Backend ERROR] ${line}`));
});

// Start Frontend
console.log('Launching Frontend Angular Serve...');
const frontend = spawn('npx', ['ng', 'serve', '--port', '4300'], {
  cwd: path.join(__dirname, 'frontend'),
  env,
  shell: true
});

frontend.stdout.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach(line => console.log(`[Frontend] ${line}`));
});

frontend.stderr.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach(line => console.error(`[Frontend ERROR] ${line}`));
});

// Handle termination
const cleanExit = () => {
  console.log('\nShutting down child processes...');
  backend.kill();
  frontend.kill();
  process.exit();
};

process.on('SIGINT', cleanExit);
process.on('SIGTERM', cleanExit);
process.on('exit', cleanExit);
