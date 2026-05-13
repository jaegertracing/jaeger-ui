#!/usr/bin/env node

// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Post-process generated OpenAPI client to:
 * 1. Prepend copyright header
 * 2. Remove .partial() calls for strict validation (Proto3/OpenAPI optionality mismatch)
 *    then restore .partial() only on the tagged-union types (AnyValue, ArrayValue,
 *    KeyValue, KeyValueList) which are proto3 oneof — match by suffix so qualified
 *    names like opentelemetry_proto_common_v1_AnyValue still match after codegen renames.
 * 3. Remove Zodios imports/client code (unused — we only use the Zod schemas)
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

// 1. Prepend Copyright Header
const copyrightHeader = `// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0
//
// This file is AUTO-GENERATED from the Jaeger OpenAPI spec.
// Do not edit manually. Regenerate using: pnpm run generate:api-types
`;

if (!content.includes('Copyright (c)')) {
  content = copyrightHeader + '\n' + content;
  console.log('✅ Added copyright header');
}

// 2. Remove .partial() calls for strict validation, then restore on union types.
// AnyValue, ArrayValue, KeyValue, KeyValueList are mutually recursive tagged unions;
// they must stay .partial() while everything else becomes required.
const beforeCountPartial = (content.match(/\.partial\(\)/g) || []).length;
content = content.replace(/\.partial\(\)\s*/g, '');
const UNION_TYPES = ['AnyValue', 'ArrayValue', 'KeyValue', 'KeyValueList'];
let restoredCountPartial = 0;
for (const name of UNION_TYPES) {
  // Match by suffix so qualified names like opentelemetry_proto_common_v1_AnyValue still hit.
  // eslint-disable-next-line no-useless-escape
  const re = new RegExp(`(const \\w*${name}: z\\.ZodType<\\w*${name}>[\\s\\S]+?\\.object\\([\\s\\S]+?\\}\\)\\s*)(\\.passthrough\\(\\))`);
  const before = content;
  content = content.replace(re, '$1.partial()$2');
  if (content === before) {
    console.warn(`⚠️ Could not restore .partial() on ${name} — schema shape may have changed`);
  } else {
    restoredCountPartial += 1;
    console.log(`✅ Restored .partial() on ${name}`);
  }
}

// 3. Remove Zodios import (unused — we only use the Zod schemas, not the Zodios client)
const zodiosImportRegex = /import\s+\{\s*makeApi,\s*Zodios.*?\} from ['"]@zodios\/core['"];\n?/g;
const beforeZodios = content;
content = content.replace(zodiosImportRegex, '');
if (content !== beforeZodios) console.log('✅ Removed Zodios import');

// 4. Remove Zodios client code (unused — we only use the Zod schemas)
content = content.replace(/\nconst endpoints = makeApi\(\[[\s\S]*?\]\);\n?/, '\n');
content = content.replace(/\nexport const api = new Zodios\(endpoints\);\n?/, '\n');
content = content.replace(
  /\nexport function createApiClient\(baseUrl: string, options\?: ZodiosOptions\) \{[\s\S]*?\}\n?/,
  '\n'
);

fs.writeFileSync(filePath, content, 'utf8');

console.log(`Removed ${beforeCountPartial - (content.match(/\.partial\(\)/g) || []).length - restoredCountPartial} .partial() calls, restored ${restoredCountPartial} on unions`);
console.log('✅ Zodios dependencies disabled (use schemas only)');
