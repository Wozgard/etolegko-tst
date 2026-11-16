import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { measure } from '../src/measure.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const BODY = Buffer.alloc(1024, 'x');
const REQUEST_COUNT = 10;
const PER_REQUEST_DELAY_MS = 15;
const TIMER_SLACK = 0.85;
const SPEED_RELATIVE_TOLERANCE = 0.4;

function startTestServer() {
  let inFlight = 0;
  let maxConcurrent = 0;
  let getCount = 0;
  const order = [];

  const server = http.createServer((req, res) => {
    if (req.method !== 'GET') {
      res.writeHead(405);
      res.end();
      return;
    }
    getCount += 1;
    order.push(Date.now());
    inFlight += 1;
    maxConcurrent = Math.max(maxConcurrent, inFlight);
    setTimeout(() => {
      res.writeHead(200, { 'content-type': 'application/octet-stream' });
      res.end(BODY);
      inFlight -= 1;
    }, PER_REQUEST_DELAY_MS);
  });

  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', (err) => {
      if (err) {
        reject(err);
        return;
      }
      const { port } = server.address();
      resolve({
        url: `http://127.0.0.1:${port}/`,
        server,
        getStats: () => ({ maxConcurrent, order, getCount }),
      });
    });
  });
}

async function closeServer(server) {
  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

test('measure performs 10 sequential GET requests', async () => {
  const { url, server, getStats } = await startTestServer();
  try {
    await measure(url);
    const { maxConcurrent, order, getCount } = getStats();
    assert.equal(maxConcurrent, 1, 'sequential: at most one request in flight');
    assert.equal(getCount, REQUEST_COUNT, 'sequential: exactly 10 GET requests');
    assert.equal(order.length, REQUEST_COUNT, 'sequential: exactly 10 GET requests');
    for (let i = 1; i < order.length; i += 1) {
      assert.ok(
        order[i] >= order[i - 1],
        'sequential: requests are not started in parallel bursts',
      );
    }
  } finally {
    await closeServer(server);
  }
});

test('measure reports correct average request duration', async () => {
  const { url, server } = await startTestServer();
  try {
    const result = await measure(url);
    const minAverageSeconds = (PER_REQUEST_DELAY_MS / 1000) * TIMER_SLACK;
    assert.ok(result && typeof result.averageRequestSeconds === 'number');
    assert.ok(
      result.averageRequestSeconds >= minAverageSeconds,
      'average: at least per-request delay (with timer slack)',
    );
  } finally {
    await closeServer(server);
  }
});

test('measure sums total body bytes across 10 responses', async () => {
  const { url, server } = await startTestServer();
  try {
    const result = await measure(url);
    assert.equal(
      result.totalBytes,
      BODY.length * REQUEST_COUNT,
      'bytes: total downloaded body size',
    );
  } finally {
    await closeServer(server);
  }
});

test('measure computes speed as totalBytes per totalSeconds in KB/s', async () => {
  const { url, server } = await startTestServer();
  try {
    const wallStart = performance.now();
    const result = await measure(url);
    const wallSeconds = (performance.now() - wallStart) / 1000;
    const expectedSpeedKBps =
      (BODY.length * REQUEST_COUNT) / 1024 / wallSeconds;
    assert.ok(result && typeof result.speedKBps === 'number');
    assert.ok(
      Math.abs(result.speedKBps - expectedSpeedKBps) <=
        expectedSpeedKBps * SPEED_RELATIVE_TOLERANCE,
      'speed: independent wall-time KB/s estimate',
    );
  } finally {
    await closeServer(server);
  }
});

test('CLI without URL exits with non-zero code', () => {
  const script = path.join(ROOT, 'src', 'measure.js');
  const run = spawnSync(process.execPath, [script], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.notEqual(run.status, 0, 'CLI must fail when URL is missing');
});