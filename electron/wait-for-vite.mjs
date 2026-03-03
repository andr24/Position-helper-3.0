// Simple script: wait for Vite dev server, then launch Electron
import { exec } from 'child_process';
import http from 'http';

const PORT = 5173;
const MAX_WAIT = 30000;

function checkPort() {
    return new Promise((resolve) => {
        const req = http.get(`http://localhost:${PORT}`, () => resolve(true));
        req.on('error', () => resolve(false));
        req.setTimeout(500, () => { req.destroy(); resolve(false); });
    });
}

async function waitAndLaunch() {
    const start = Date.now();
    while (Date.now() - start < MAX_WAIT) {
        if (await checkPort()) {
            console.log(`Vite ready on port ${PORT}, launching Electron...`);
            const child = exec('npx electron .', { cwd: process.cwd() });
            child.stdout?.pipe(process.stdout);
            child.stderr?.pipe(process.stderr);
            child.on('exit', (code) => process.exit(code ?? 0));
            return;
        }
        await new Promise(r => setTimeout(r, 300));
    }
    console.error('Timed out waiting for Vite dev server');
    process.exit(1);
}

waitAndLaunch();
