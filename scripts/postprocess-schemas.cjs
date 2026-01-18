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

// 2. Remove .partial() calls
const beforeCountPartial = (content.match(/\.partial\(\)/g) || []).length;
content = content.replace(/\.partial\(\)\s*/g, '');
const afterCountPartial = (content.match(/\.partial\(\)/g) || []).length;

// 3. Comment out Zodios imports
const zodiosImportRegex = /import\s+\{\s*makeApi,\s*Zodios.*?\} from '@zodios\/core';/g;
if (zodiosImportRegex.test(content)) {
    content = content.replace(zodiosImportRegex, "// import { makeApi, Zodios, type ZodiosOptions } from '@zodios/core';");
    console.log('✅ Commented out Zodios imports');
}

// 4. Comment out Zodios usage
content = content.replace(
    /(const endpoints = makeApi\(\[[\s\S]*?\]\);)/, 
    "/*\n$1\n*/"
);

content = content.replace(
    /(export const api = new Zodios\(endpoints\);)/, 
    "// $1"
);
content = content.replace(
    /(export function createApiClient\(baseUrl: string, options\?: ZodiosOptions\) \{[\s\S]*?\})/, 
    "/*\n$1\n*/"
);

// 5. Append convenience exports
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
