#!/usr/bin/env node

// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Post-process generated OpenAPI client to:
 * 1. Prepend copyright header
 * 2. Remove .partial() calls for strict validation (Proto3/OpenAPI optionality mismatch)
 * 3. Comment out Zodios imports/usage (avoid runtime dependency until needed)
 * 4. Add convenience exports for schemas
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
// Do not edit manually. Regenerate using: npm run generate:api-types
`;

if (!content.includes('Copyright (c)')) {
  content = copyrightHeader + '\n' + content;
  console.log('✅ Added copyright header');
}

// 2. Remove .partial() calls (Proto3 fields are required on the *typed* model).
//    EXCEPTION: AnyValue, ArrayValue, KeyValue, KeyValueList are tagged-union
//    types in OTLP — each instance carries only some of the listed fields.
//    Their TypeScript types are correctly emitted as `Partial<{...}>`, so the
//    matching Zod schemas must keep `.partial()`. The blanket strip below
//    would otherwise leave their schemas demanding every variant field at
//    once, which never holds for real OTLP attribute values.
const beforeCountPartial = (content.match(/\.partial\(\)/g) || []).length;
content = content.replace(/\.partial\(\)\s*/g, '');
// Restore .partial() on the union types. The replacement is anchored on the
// `const <Name>: z.ZodType<<Name>>` declaration up through its closing
// `.passthrough()`, so it tolerates the multi-line shapes openapi-zod-client
// emits.
const UNION_TYPES = ['AnyValue', 'ArrayValue', 'KeyValue', 'KeyValueList'];
for (const name of UNION_TYPES) {
  const re = new RegExp(
    `(const ${name}: z\\.ZodType<${name}>[\\s\\S]+?\\.object\\([\\s\\S]+?\\}\\)\\s*)(\\.passthrough\\(\\))`
  );
  const before = content;
  content = content.replace(re, '$1.partial()$2');
  if (content === before) {
    console.warn(`⚠️ Could not restore .partial() on ${name} — schema shape may have changed`);
  } else {
    console.log(`✅ Restored .partial() on ${name}`);
  }
}
const afterCountPartial = (content.match(/\.partial\(\)/g) || []).length;

// 3. Comment out Zodios imports
const zodiosImportRegex = /import\s+\{\s*makeApi,\s*Zodios.*?\} from '@zodios\/core';/g;
if (zodiosImportRegex.test(content)) {
  content = content.replace(
    zodiosImportRegex,
    "// import { makeApi, Zodios, type ZodiosOptions } from '@zodios/core';"
  );
  console.log('✅ Commented out Zodios imports');
}

// 4. Comment out Zodios usage
content = content.replace(/(const endpoints = makeApi\(\[[\s\S]*?\]\);)/, '/*\n$1\n*/');

content = content.replace(/(export const api = new Zodios\(endpoints\);)/, '// $1');
content = content.replace(
  /(export function createApiClient\(baseUrl: string, options\?: ZodiosOptions\) \{[\s\S]*?\})/,
  '/*\n$1\n*/'
);

// 5. Append convenience exports
// These aliases give the rest of the codebase stable, ergonomic names
// independent of the OpenAPI generator's chosen identifiers. If the generator
// renames an internal symbol (e.g. Span -> Span1 on regeneration), only this
// list needs updating — consumers keep importing the *Schema names from
// `./schemas.ts`.
const extraExports = `
// Export commonly used schemas individually for convenience
export { GetServicesResponse as ServicesResponseSchema };
export { GetOperationsResponse as OperationsResponseSchema };
export { Operation as OperationSchema };
// OTLP trace/span wire types. Renamed from proto nested-message style
// (Span_Event, Span_Link) to OpenTelemetry-conventional names.
export { TracesData as TracesDataSchema };
export { ResourceSpans as ResourceSpansSchema };
export { ScopeSpans as ScopeSpansSchema };
export { Span as SpanSchema };
export { Span_Event as SpanEventSchema };
export { Span_Link as SpanLinkSchema };
export { Resource as ResourceSchema };
export { InstrumentationScope as InstrumentationScopeSchema };
export { KeyValue as KeyValueSchema };
export { AnyValue as AnyValueSchema };
export { ArrayValue as ArrayValueSchema };
export { KeyValueList as KeyValueListSchema };
export { Status as StatusSchema };
`;

if (!content.includes('export { GetServicesResponse as ServicesResponseSchema }')) {
  content += extraExports;
  console.log('✅ Added convenience exports');
}

fs.writeFileSync(filePath, content, 'utf8');

console.log(`✅ Removed ${beforeCountPartial - afterCountPartial} .partial() calls`);
console.log('✅ Zodios dependencies disabled (use schemas only)');
