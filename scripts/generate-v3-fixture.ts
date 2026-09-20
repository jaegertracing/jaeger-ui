// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { execFileSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const API_DIR = path.resolve(import.meta.dirname, '../packages/jaeger-ui/src/api/v3');
const INPUT_FILE = path.join(API_DIR, 'v3-trace-input.json');
const OUTPUT_FILE = path.join(API_DIR, 'v3-trace-output.json');
const COMPOSE_FILE = path.resolve(import.meta.dirname, 'v3-fixture/docker-compose.yml');
const COMPOSE_PROJECT = 'jaeger-ui-v3-fixture';

type JsonObject = { [key: string]: JsonValue };
type JsonValue = JsonObject | JsonValue[] | boolean | number | string | null;

const delay = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

function compose(...args: string[]) {
  execFileSync('docker', ['compose', '--project-name', COMPOSE_PROJECT, '--file', COMPOSE_FILE, ...args], {
    stdio: 'inherit',
  });
}

function isObject(value: JsonValue | undefined): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function objectString(value: JsonValue, key: string) {
  return isObject(value) && typeof value[key] === 'string' ? value[key] : '';
}

function spansIn(document: JsonValue): JsonValue[] {
  if (!isObject(document)) {
    return [];
  }
  const tracesData = isObject(document.result) ? document.result : document;
  if (!Array.isArray(tracesData.resourceSpans)) {
    return [];
  }

  return tracesData.resourceSpans.flatMap(resourceSpan => {
    if (!isObject(resourceSpan) || !Array.isArray(resourceSpan.scopeSpans)) {
      return [];
    }
    return resourceSpan.scopeSpans.flatMap(scopeSpan => {
      return isObject(scopeSpan) && Array.isArray(scopeSpan.spans) ? scopeSpan.spans : [];
    });
  });
}

function inputDetails(input: JsonValue) {
  const spans = spansIn(input);
  if (spans.length === 0) {
    throw new Error(`${INPUT_FILE} contains no spans`);
  }

  const traceIds = new Set<string>();
  for (const span of spans) {
    if (!isObject(span) || typeof span.traceId !== 'string' || span.traceId.length === 0) {
      throw new Error(`${INPUT_FILE} contains a span without a trace ID`);
    }
    traceIds.add(span.traceId);
  }
  if (traceIds.size !== 1) {
    throw new Error(`${INPUT_FILE} must contain exactly one trace ID`);
  }

  return { expectedSpans: spans.length, traceId: [...traceIds][0] };
}

async function waitFor<T>(description: string, attempts: number, action: () => Promise<T | undefined>) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const result = await action();
    if (result !== undefined) {
      return result;
    }
    await delay(1_000);
  }
  throw new Error(`Timed out waiting for ${description}`);
}

async function request(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`${init?.method ?? 'GET'} ${url} returned ${response.status}`);
  }
  return response;
}

function normalise(node: JsonValue): JsonValue {
  if (Array.isArray(node)) {
    return node.map(normalise);
  }
  if (!isObject(node)) {
    return node;
  }

  return Object.fromEntries(
    Object.entries(node).map(([key, rawValue]) => {
      let value = normalise(rawValue);
      if (key === 'attributes' && Array.isArray(value)) {
        value.sort((left, right) => objectString(left, 'key').localeCompare(objectString(right, 'key')));
      } else if (key === 'spans' && Array.isArray(value)) {
        value.sort((left, right) =>
          objectString(left, 'spanId').localeCompare(objectString(right, 'spanId'))
        );
      } else if (
        key === 'values' &&
        Array.isArray(value) &&
        value.every(entry => isObject(entry) && typeof entry.key === 'string')
      ) {
        value.sort((left, right) => objectString(left, 'key').localeCompare(objectString(right, 'key')));
      }
      return [key, value];
    })
  );
}

async function captureTrace(input: JsonValue, traceId: string, expectedSpans: number) {
  await waitFor('the Jaeger query API', 60, async () => {
    try {
      await request('http://localhost:16686/api/v3/services');
      return true;
    } catch {
      return undefined;
    }
  });

  await request('http://localhost:4318/v1/traces', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  return waitFor(`all ${expectedSpans} spans`, 30, async () => {
    try {
      const response = await request(`http://localhost:16686/api/v3/traces/${traceId}?raw_traces=false`);
      const document = (await response.json()) as JsonValue;
      return spansIn(document).length === expectedSpans ? document : undefined;
    } catch {
      return undefined;
    }
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--check') || args.length > 1) {
    throw new Error('Usage: pnpm run generate:v3-fixture [-- --check]');
  }

  const checkOnly = args[0] === '--check';
  const input = JSON.parse(await readFile(INPUT_FILE, 'utf8')) as JsonValue;
  const { expectedSpans, traceId } = inputDetails(input);

  compose('down', '--volumes', '--remove-orphans');
  try {
    compose('up', '--detach');
    const output = await captureTrace(input, traceId, expectedSpans);
    if (checkOnly) {
      const committed = JSON.parse(await readFile(OUTPUT_FILE, 'utf8')) as JsonValue;
      if (!isDeepStrictEqual(normalise(committed), normalise(output))) {
        process.stderr.write(`${JSON.stringify(normalise(output), null, 2)}\n`);
        throw new Error('The v3 trace fixture differs from a fresh capture');
      }
      console.log('The v3 trace fixture is up to date.');
      return;
    }

    await writeFile(OUTPUT_FILE, `${JSON.stringify(output, null, 2)}\n`);
    execFileSync('pnpm', ['exec', 'vp', 'fmt', OUTPUT_FILE], {
      cwd: path.resolve(import.meta.dirname, '..'),
      shell: process.platform === 'win32',
      stdio: 'inherit',
    });
    console.log(`Wrote ${OUTPUT_FILE}`);
  } finally {
    compose('down', '--volumes', '--remove-orphans');
  }
}

await main();
