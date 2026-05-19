#!/usr/bin/env node

// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Post-process generated OpenAPI client to:
 * 1. Prepend copyright header
 * 2. Remove broad .partial() calls for strict validation
 * 3. Restore optionality for proto3 fields that may be omitted from JSON wire format
 * 4. Comment out Zodios imports/usage (avoid runtime dependency until needed)
 * 5. Add convenience exports for schemas
 */

const fs = require('fs');
const path = require('path');

// Target file relative to this script (in root/scripts/)
const filePath = path.join(__dirname, '../packages/jaeger-ui/src/api/v3/generated-client.ts');

console.log(`Post-processing ${filePath}...`);

if (!fs.existsSync(filePath)) {
  console.error(`Error: File not found at ${filePath}`);
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function optionalizeSchemaFields(schemaName, fields) {
  const schemaStart = content.indexOf(`const ${schemaName}`);
  if (schemaStart === -1) {
    console.warn(`⚠️  Schema ${schemaName} not found; skipping optional field post-process`);
    return;
  }

  const objectStart = content.indexOf('.object({', schemaStart);
  if (objectStart === -1) {
    console.warn(`⚠️  Schema ${schemaName} object not found; skipping optional field post-process`);
    return;
  }

  const bodyStart = objectStart + '.object({'.length;
  let depth = 1;
  let bodyEnd = bodyStart;

  while (bodyEnd < content.length && depth > 0) {
    const char = content[bodyEnd];
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    bodyEnd += 1;
  }

  if (depth !== 0) {
    console.warn(`⚠️  Schema ${schemaName} object body was not closed; skipping optional field post-process`);
    return;
  }

  bodyEnd -= 1;

  let body = content.slice(bodyStart, bodyEnd);
  for (const field of fields) {
    const fieldRegex = new RegExp(`(\\b${escapeRegExp(field)}\\s*:\\s*)([^,\\n]+?)(\\s*)(?=(,|\\n|$))`, 'g');
    body = body.replace(fieldRegex, (match, prefix, expression, trailingWhitespace) => {
      const trimmedExpression = expression.trimEnd();
      if (trimmedExpression.endsWith('.optional()')) {
        return match;
      }
      return `${prefix}${trimmedExpression}.optional()${trailingWhitespace}`;
    });
  }

  content = content.slice(0, bodyStart) + body + content.slice(bodyEnd);
}

// 1. Prepend Copyright Header
const copyrightHeader = `// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0
//
// This file is AUTO-GENERATED from the Jaeger OpenAPI spec.
// Do not edit manually. Regenerate using: npm run generate:api-types
`;

if (!content.includes('Copyright (c)')) {
  content = copyrightHeader + '\n' + content;
  console.log('✅ Added copyright header');
}

// 2. Remove .partial() calls
const beforeCountPartial = (content.match(/\.partial\(\)/g) || []).length;
content = content.replace(/\.partial\(\)\s*/g, '');
const afterCountPartial = (content.match(/\.partial\(\)/g) || []).length;

// 3. Restore optionality for proto3 JSON fields that may be absent when they hold default values.
optionalizeSchemaFields('Status', ['code', 'message', 'details']);
optionalizeSchemaFields('ArrayValue', ['values']);
optionalizeSchemaFields('KeyValueList', ['values']);
optionalizeSchemaFields('AnyValue', [
  'stringValue',
  'boolValue',
  'intValue',
  'doubleValue',
  'arrayValue',
  'kvlistValue',
  'bytesValue',
]);
optionalizeSchemaFields('KeyValue', ['key', 'value']);
optionalizeSchemaFields('Resource', ['attributes', 'droppedAttributesCount']);
optionalizeSchemaFields('InstrumentationScope', ['name', 'version', 'attributes', 'droppedAttributesCount']);
optionalizeSchemaFields('Span_Event', ['timeUnixNano', 'name', 'attributes', 'droppedAttributesCount']);
optionalizeSchemaFields('Span_Link', [
  'traceId',
  'spanId',
  'traceState',
  'attributes',
  'droppedAttributesCount',
  'flags',
]);
optionalizeSchemaFields('Span', [
  'traceState',
  'parentSpanId',
  'flags',
  'attributes',
  'droppedAttributesCount',
  'events',
  'droppedEventsCount',
  'links',
  'droppedLinksCount',
]);
optionalizeSchemaFields('ScopeSpans', ['scope', 'schemaUrl']);
optionalizeSchemaFields('ResourceSpans', ['resource', 'schemaUrl']);

// 4. Comment out Zodios imports
const zodiosImportRegex = /^import\s+\{\s*makeApi,\s*Zodios.*?\} from '@zodios\/core';/gm;
if (zodiosImportRegex.test(content)) {
  content = content.replace(
    zodiosImportRegex,
    "// import { makeApi, Zodios, type ZodiosOptions } from '@zodios/core';"
  );
  console.log('✅ Commented out Zodios imports');
}

// 5. Comment out Zodios usage
if (!/\/\*\r?\nconst endpoints = makeApi\(\[/.test(content)) {
  content = content.replace(/(const endpoints = makeApi\(\[[\s\S]*?\]\);)/, '/*\n$1\n*/');
}

if (!/^\/\/ export const api = new Zodios\(endpoints\);/m.test(content)) {
  content = content.replace(/(export const api = new Zodios\(endpoints\);)/, '// $1');
}

if (!/\/\*\r?\nexport function createApiClient/.test(content)) {
  content = content.replace(
    /(export function createApiClient\(baseUrl: string, options\?: ZodiosOptions\) \{[\s\S]*?\})/,
    '/*\n$1\n*/'
  );
}

// 6. Append convenience exports
const extraExports = `
// Export commonly used schemas individually for convenience
export { GetServicesResponse as ServicesResponseSchema };
export { GetOperationsResponse as OperationsResponseSchema };
export { Operation as OperationSchema };
`;

if (!content.includes('export { GetServicesResponse as ServicesResponseSchema }')) {
  content += extraExports;
  console.log('✅ Added convenience exports');
}

fs.writeFileSync(filePath, content, 'utf8');

console.log(`✅ Removed ${beforeCountPartial - afterCountPartial} .partial() calls`);
console.log('✅ Zodios dependencies disabled (use schemas only)');
