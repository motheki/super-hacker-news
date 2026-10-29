// @ts-check
import { spawn } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

const retryDelays = [10_000, 20_000];

/** @param {string} output */
export function isUploadSessionFailure(output) {
  const plain = output.replace(/\u001b\[[0-9;]*m/g, '');
  return /A request to the Cloudflare API \([^\n]*\/assets-upload-session\) failed\.[\s\S]*?\[code: 10013\]/.test(plain);
}

/**
 * @typedef {{ code: number | null, signal?: string | null, output: string }} CommandResult
 * @param {() => Promise<CommandResult>} run
 * @param {{ sleep?: (delay: number) => Promise<void>, log?: (message: string) => void }} options
 */
export async function deployWithRetry(run, { sleep = setTimeout, log = console.error } = {}) {
  for (let attempt = 0; ; attempt++) {
    const result = await run();
    const delay = retryDelays[attempt];
    if (result.code === 0 || result.signal || delay === undefined || !isUploadSessionFailure(result.output)) {
      return result.code ?? 1;
    }
    log(`Cloudflare could not create the asset upload session. Retrying the same build in ${delay / 1000}s (${attempt + 2}/3).`);
    await sleep(delay);
  }
}

/** @param {string[]} args @returns {Promise<CommandResult>} */
export function runWrangler(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['node_modules/wrangler/bin/wrangler.js', ...args], {
      stdio: ['inherit', 'pipe', 'pipe'],
    });
    let output = '';
    /** @param {NodeJS.WriteStream} stream */
    const capture = (stream) => /** @param {Buffer} chunk */ (chunk) => {
      stream.write(chunk);
      // Keep only recent diagnostics, not an unbounded asset listing.
      output = (output + chunk.toString()).slice(-65_536);
    };
    child.stdout.on('data', capture(process.stdout));
    child.stderr.on('data', capture(process.stderr));
    child.on('error', reject);
    child.on('close', (code, signal) => resolve({ code, signal, output }));
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await deployWithRetry(() => runWrangler(['deploy', '--config', 'wrangler.jsonc']));
}
