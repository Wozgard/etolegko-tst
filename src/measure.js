import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUEST_COUNT = 10;

export async function measure(url) {
  let totalBytes = 0;
  let totalSeconds = 0;

  for (let i = 0; i < REQUEST_COUNT; i += 1) {
    const requestStart = performance.now();
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }
    const body = Buffer.from(await response.arrayBuffer());
    totalSeconds += (performance.now() - requestStart) / 1000;
    totalBytes += body.length;
  }

  const averageRequestSeconds = totalSeconds / REQUEST_COUNT;
  const speedKBps = totalBytes / 1024 / totalSeconds;

  return { averageRequestSeconds, totalBytes, speedKBps };
}

const scriptPath = fileURLToPath(import.meta.url);
const isCli =
  process.argv[1] && path.resolve(process.argv[1]) === scriptPath;

if (isCli) {
  const url = process.argv[2];
  if (!url) {
    process.exit(1);
  }
  measure(url)
    .then((result) => {
      console.log(`${result.speedKBps} KB/s`);
    })
    .catch((err) => {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    });
}