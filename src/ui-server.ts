import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { kvDataStorage } from './services/kv-data-storage';
import { transmissionContainer } from './services/transmission-container';

function formatDate(ts: number | null): string {
  if (!ts) return 'never';
  return new Date(ts).toLocaleString('lt-LT');
}

function row(label: string, value: string | number | null | undefined): string {
  return `<tr><td>${label}</td><td>${value ?? '—'}</td></tr>`;
}

function renderHtml(): string {
  const isRunning = kvDataStorage.get<boolean>('isServiceRunning');
  const statusColor = isRunning ? '#4caf50' : '#f44336';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="30">
  <title>pvpn-transmission</title>
  <style>
    body { font-family: monospace; background: #1a1a1a; color: #e0e0e0; padding: 2rem; max-width: 560px; margin: 0 auto; }
    h1 { font-size: 1.1rem; color: #888; margin-bottom: 1.5rem; }
    .badge { display: inline-block; padding: 0.2rem 0.7rem; border-radius: 3px; background: ${statusColor}; color: #fff; font-weight: bold; margin-bottom: 1.5rem; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; }
    td { padding: 0.35rem 0.5rem; border-bottom: 1px solid #2a2a2a; }
    td:first-child { color: #888; width: 45%; }
    button { padding: 0.5rem 1.2rem; background: #1976d2; color: #fff; border: none; border-radius: 3px; cursor: pointer; font-family: monospace; font-size: 0.95rem; }
    button:hover { background: #1565c0; }
    .hint { color: #555; font-size: 0.8rem; margin-top: 1.5rem; }
  </style>
</head>
<body>
  <h1>pvpn-transmission</h1>
  <div class="badge">${isRunning ? 'Running' : 'Stopped'}</div>
  <table>
    ${row('External IP', kvDataStorage.get<string>('externalIp'))}
    ${row('Internal IP', kvDataStorage.get<string>('internalIp'))}
    ${row('Country', kvDataStorage.get<string>('country'))}
    ${row('Interface', kvDataStorage.get<string>('interface'))}
    ${row('Current port', kvDataStorage.get<number>('currentPort'))}
    ${row('Last run', formatDate(kvDataStorage.get<number>('lastRun')))}
    ${row('Last check-in', formatDate(kvDataStorage.get<number>('lastCheckIn')))}
    ${row('Ports changed', kvDataStorage.get<number>('numPortsChanged') ?? 0)}
    ${row('Checks run', kvDataStorage.get<number>('numRuns') ?? 0)}
    ${row('IP mismatches', kvDataStorage.get<number>('ipMismatchCount') ?? 0)}
  </table>
  ${!isRunning ? `<form method="POST" action="/start"><button type="submit">Start Transmission</button></form>` : ''}
  <p class="hint">Auto-refreshes every 30s</p>
</body>
</html>`;
}

async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(renderHtml());
    return;
  }

  if (req.method === 'POST' && req.url === '/start') {
    console.log('UI: starting Transmission container');
    try {
      await transmissionContainer.up();
      await kvDataStorage.set({ isServiceRunning: true });
    } catch (e) {
      console.error('UI: failed to start Transmission', e);
    }
    res.writeHead(302, { Location: '/' });
    res.end();
    return;
  }

  res.writeHead(404);
  res.end();
}

export function startUiServer(port: number) {
  createServer(handleRequest).listen(port, () => {
    console.log(`UI listening on http://localhost:${port}`);
  });
}
