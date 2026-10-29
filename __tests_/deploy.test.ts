import { expect, test } from 'bun:test';
import { deployWithRetry } from '../scripts/deploy.mjs';

const uploadError = 'A request to the Cloudflare API (/accounts/example/workers/scripts/example/assets-upload-session) failed.\nAn unknown error has occurred. [code: 10013]';

async function simulate(results: { code: number | null; output: string; signal?: string }[]) {
  let calls = 0;
  const delays: number[] = [];
  const code = await deployWithRetry(async () => {
    const result = results[Math.min(calls++, results.length - 1)];
    if (!result) throw new Error('Missing result');
    return result;
  }, { sleep: async (delay: number) => { delays.push(delay); }, log: () => {} });
  return { code, calls, delays };
}

test('retries the upload-session error and stops immediately on success', async () => {
  expect(await simulate([
    { code: 1, output: `\u001b[31m${uploadError}\u001b[0m` },
    { code: 0, output: 'Deployed' },
  ])).toEqual({ code: 0, calls: 2, delays: [10_000] });
});

test('persistent upload-session failure exits unsuccessfully after three attempts', async () => {
  expect(await simulate([{ code: 1, output: uploadError }]))
    .toEqual({ code: 1, calls: 3, delays: [10_000, 20_000] });
});

test('does not retry successful deployments, other failures, or interrupted commands', async () => {
  for (const result of [
    { code: 0, output: 'Deployed' },
    { code: 1, output: uploadError.replace('10013', '10000') },
    { code: 1, output: uploadError.replace('/assets-upload-session', '/deployments') },
    { code: 2, output: 'Invalid configuration' },
    { code: null, signal: 'SIGTERM', output: uploadError },
  ]) {
    expect(await simulate([result])).toEqual({ code: result.code ?? 1, calls: 1, delays: [] });
  }
});
