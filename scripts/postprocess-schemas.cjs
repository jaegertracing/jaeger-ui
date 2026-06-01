#!/usr/bin/env node

// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Post-process generated OpenAPI client to:
 * 1. Prepend copyright header
 * 2. Remove Zodios imports/client code (unused — we only use the Zod schemas)
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

// 2. Remove Zodios import (unused — we only use the Zod schemas, not the Zodios client)
const zodiosImportRegex = /import\s+\{\s*makeApi,\s*Zodios.*?\} from ['"]@zodios\/core['"];\n?/g;
const beforeZodios = content;
content = content.replace(zodiosImportRegex, '');
if (content !== beforeZodios) console.log('✅ Removed Zodios import');

// 3. Remove Zodios client code (unused — we only use the Zod schemas)
content = content.replace(/\nconst endpoints = makeApi\(\[[\s\S]*?\]\);\n?/, '\n');
content = content.replace(/\nexport const api = new Zodios\(endpoints\);\n?/, '\n');
content = content.replace(
  /\nexport function createApiClient\(baseUrl: string, options\?: ZodiosOptions\) \{[\s\S]*?\}\n?/,
  '\n'
);

fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Zodios dependencies disabled (use schemas only)');
