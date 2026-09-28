// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { isDeepStrictEqual } from 'node:util';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DockerComposeEnvironment, Wait } from 'testcontainers';
import {
  traceContractCases,
  traceContractDifferences,
} from '../packages/jaeger-ui/src/model/trace-contract.fixtures.ts';

const API_DIR = path.resolve(import.meta.dirname, '../packages/jaeger-ui/src/api/v3');
const INPUT_FILE = path.join(API_DIR, 'v3-trace-input.json');
const OUTPUT_FILE = path.join(API_DIR, 'v3-trace-output.json');
const PARITY_FILE = path.join(API_DIR, 'parser-parity-fixtures.json');
const PAIRED_FILE = path.join(API_DIR, 'parser-parity-capture.json');
const COMPOSE_DIR = path.resolve(import.meta.dirname, 'v3-fixture');
const COMPOSE_FILE = 'docker-compose.yml';

type JsonObject = { [key: string]: JsonValue };
type JsonValue = JsonObject | JsonValue[] | boolean | number | string | null;

const delay = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

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
    throw new Error(`${init?.method ?? 'GET'} ${url} returned ${response.status}: ${await response.text()}`);
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
      if (['attributes', 'tags', 'fields'].includes(key) && Array.isArray(value)) {
        value.sort((left, right) => objectString(left, 'key').localeCompare(objectString(right, 'key')));
      } else if (key === 'spans' && Array.isArray(value)) {
        value.sort((left, right) =>
          (objectString(left, 'spanId') || objectString(left, 'spanID')).localeCompare(
            objectString(right, 'spanId') || objectString(right, 'spanID')
          )
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

async function captureTrace(
  input: JsonValue,
  traceId: string,
  expectedSpans: number,
  queryUrl: string,
  collectorUrl: string
) {
  await request(`${collectorUrl}/v1/traces`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  return waitFor(`all ${expectedSpans} spans`, 30, async () => {
    try {
      const response = await request(`${queryUrl}/api/v3/traces/${traceId}?raw_traces=false`);
      const document = (await response.json()) as JsonValue;
      return spansIn(document).length === expectedSpans ? document : undefined;
    } catch {
      return undefined;
    }
  });
}

async function saveOrCheck(file: string, output: JsonValue, checkOnly: boolean) {
  // The shared legacy cases deliberately contain undefined timestamps. JSON
  // omits those properties, so compare the serialized wire shape on both sides.
  const wireOutput = JSON.parse(JSON.stringify(output)) as JsonValue;
  if (checkOnly) {
    const committed = JSON.parse(await readFile(file, 'utf8')) as JsonValue;
    if (!isDeepStrictEqual(normalise(committed), normalise(wireOutput))) {
      throw new Error(`${path.basename(file)} differs from a fresh capture`);
    }
    console.log(`${path.basename(file)} is up to date.`);
  } else {
    await writeFile(file, `${JSON.stringify(output, null, 2)}\n`);
    console.log(`Wrote ${file}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => !['--check', '--parity'].includes(arg)) || new Set(args).size !== args.length) {
    throw new Error('Usage: pnpm run generate:v3-fixture [-- --check] [--parity]');
  }

  const checkOnly = args.includes('--check');
  const parity = args.includes('--parity');
  const input = JSON.parse(await readFile(INPUT_FILE, 'utf8')) as JsonValue;
  const { expectedSpans, traceId } = inputDetails(input);

  let compose = new DockerComposeEnvironment(
    parity ? path.join(COMPOSE_DIR, 'parity') : COMPOSE_DIR,
    COMPOSE_FILE
  ).withWaitStrategy('jaeger-1', Wait.forHttp('/api/v3/services', 16686));
  if (parity) {
    compose = compose.withBuild().withWaitStrategy('converter-1', Wait.forHttp('/health', 8080));
  }
  await using environment = await compose.up();
  const jaeger = environment.getContainer('jaeger-1');
  const host = jaeger.getHost();
  const queryUrl = `http://${host}:${jaeger.getMappedPort(16686)}`;
  const collectorUrl = `http://${host}:${jaeger.getMappedPort(4318)}`;
  if (parity) {
    const converter = environment.getContainer('converter-1');
    const convertUrl = `http://${converter.getHost()}:${converter.getMappedPort(8080)}/convert`;
    const fixtures = [];
    for (const { name, input: legacy } of [...traceContractCases(), ...traceContractDifferences()]) {
      const response = await request(convertUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(legacy),
      });
      fixtures.push({ name, legacy, otlp: await response.json() });
    }
    await saveOrCheck(PARITY_FILE, fixtures as JsonValue, checkOnly);

    // Both endpoints read the same stored trace with enrichment enabled.
    // The legacy query parameter is "raw", whereas v3 calls it "raw_traces".
    const seed = fixtures.find(fixture => fixture.name === 'field-mapping')!;
    const v3 = await captureTrace(
      seed.otlp as JsonValue,
      seed.legacy.traceID,
      seed.legacy.spans.length,
      queryUrl,
      collectorUrl
    );
    const legacy = await waitFor('the paired legacy response', 30, async () => {
      const document = await (
        await request(`${queryUrl}/api/traces/${seed.legacy.traceID}?raw=false`)
      ).json();
      return document.data?.[0]?.spans?.length === seed.legacy.spans.length ? document : undefined;
    });
    await saveOrCheck(PAIRED_FILE, { legacy, v3 } as JsonValue, checkOnly);
    return;
  }
  const output = await captureTrace(input, traceId, expectedSpans, queryUrl, collectorUrl);

  if (checkOnly) {
    const committed = JSON.parse(await readFile(OUTPUT_FILE, 'utf8')) as JsonValue;
    // Jaeger may reorder spans, attributes and kvlist entries without changing their meaning.
    if (!isDeepStrictEqual(normalise(committed), normalise(output))) {
      process.stderr.write(`${JSON.stringify(normalise(output), null, 2)}\n`);
      throw new Error('The v3 trace fixture differs from a fresh capture');
    }
    console.log('The v3 trace fixture is up to date.');
    return;
  }

  await writeFile(OUTPUT_FILE, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Wrote ${OUTPUT_FILE}`);
}

await main();
