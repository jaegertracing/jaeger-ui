// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import ts from 'typescript';
import fs from 'fs';

function hasJsx(sourceFile: ts.SourceFile): boolean {
  let found = false;
  function visit(node: ts.Node) {
    if (
      node.kind === ts.SyntaxKind.JsxElement ||
      node.kind === ts.SyntaxKind.JsxSelfClosingElement ||
      node.kind === ts.SyntaxKind.JsxFragment
    ) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return found;
}

const filePaths = process.argv.slice(2);
if (filePaths.length === 0) {
  process.exit(0);
}

for (const filePath of filePaths) {
  try {
    const sourceCode = fs.readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceCode,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    );

    if (hasJsx(sourceFile)) {
      console.log(`${filePath}:true`);
    } else {
      console.log(`${filePath}:false`);
    }
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err);
  }
}
