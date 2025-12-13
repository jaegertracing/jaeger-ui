#!/usr/bin/env node

/**
 * CSS Variables Audit Script (Phase 0.2)
 *
 * Scans all CSS files to find:
 * 1. CSS variable definitions (--variable-name: value)
 * 2. CSS variable usages (var(--variable-name))
 * 3. Analyzes consistency and naming patterns
 *
 * Usage:
 *   node docs/adr/0001/phase-0-2-audit-css-variables.cjs
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

/**
 * Extract CSS variable definitions from a file
 */
function extractDefinitions(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const definitions = [];

  lines.forEach((line, idx) => {
    // Match CSS variable definitions: --variable-name: value;
    const match = line.match(/^\s*(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/);
    if (match) {
      const [, varName, value] = match;
      definitions.push({
        file: filePath.replace(process.cwd() + '/', ''),
        line: idx + 1,
        variable: varName,
        value: value.trim(),
        context: line.trim(),
      });
    }
  });

  return definitions;
}

/**
 * Extract CSS variable usages from a file
 */
function extractUsages(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const usages = [];

  lines.forEach((line, idx) => {
    // Match var(--variable-name) usages
    const regex = /var\((--[a-zA-Z0-9-]+)(?:,\s*([^)]+))?\)/g;
    let match;
    
    while ((match = regex.exec(line)) !== null) {
      const [fullMatch, varName, fallback] = match;
      usages.push({
        file: filePath.replace(process.cwd() + '/', ''),
        line: idx + 1,
        variable: varName,
        fallback: fallback ? fallback.trim() : null,
        context: line.trim(),
        property: extractProperty(line),
      });
    }
  });

  return usages;
}

/**
 * Extract CSS property name from a line
 */
function extractProperty(line) {
  const match = line.match(/^\s*([a-z-]+)\s*:/);
  return match ? match[1] : 'unknown';
}

/**
 * Main execution
 */
function main() {
  console.log('='.repeat(80));
  console.log('JAEGER UI - CSS VARIABLES AUDIT REPORT (Phase 0.2)');
  console.log('='.repeat(80));
  console.log(`Generated: ${new Date().toISOString()}`);
  console.log('');

  // Scan all CSS files
  const cssFiles = glob.sync('packages/jaeger-ui/src/**/*.css');
  console.log(`Scanning ${cssFiles.length} CSS files...\n`);

  const allDefinitions = cssFiles.flatMap(extractDefinitions);
  const allUsages = cssFiles.flatMap(extractUsages);

  // Group definitions by variable name
  const definitionsByVar = allDefinitions.reduce((acc, def) => {
    if (!acc[def.variable]) acc[def.variable] = [];
    acc[def.variable].push(def);
    return acc;
  }, {});

  // Group usages by variable name
  const usagesByVar = allUsages.reduce((acc, usage) => {
    if (!acc[usage.variable]) acc[usage.variable] = [];
    acc[usage.variable].push(usage);
    return acc;
  }, {});

  // Summary statistics
  console.log('='.repeat(80));
  console.log('SUMMARY STATISTICS');
  console.log('='.repeat(80));
  console.log('');
  console.log(`Total CSS variable definitions found: ${allDefinitions.length}`);
  console.log(`Unique CSS variables defined: ${Object.keys(definitionsByVar).length}`);
  console.log(`Total CSS variable usages found: ${allUsages.length}`);
  console.log(`Unique CSS variables used: ${Object.keys(usagesByVar).length}`);
  console.log('');

  // Files with definitions
  const filesWithDefs = [...new Set(allDefinitions.map(d => d.file))];
  console.log(`Files with CSS variable definitions: ${filesWithDefs.length}`);
  filesWithDefs.forEach(file => console.log(`  - ${file}`));
  console.log('');

  // List all defined variables
  console.log('='.repeat(80));
  console.log('ALL DEFINED CSS VARIABLES');
  console.log('='.repeat(80));
  console.log('');
  
  Object.entries(definitionsByVar)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([varName, defs]) => {
      console.log(`${varName}:`);
      defs.forEach(def => {
        console.log(`  Defined in: ${def.file}:${def.line}`);
        console.log(`  Value: ${def.value}`);
      });
      
      const usages = usagesByVar[varName] || [];
      console.log(`  Used ${usages.length} times across ${new Set(usages.map(u => u.file)).size} files`);
      console.log('');
    });

  // Unused variables (defined but never used)
  console.log('='.repeat(80));
  console.log('UNUSED VARIABLES (Defined but never used)');
  console.log('='.repeat(80));
  console.log('');

  const unusedVars = Object.keys(definitionsByVar).filter(
    varName => !usagesByVar[varName] || usagesByVar[varName].length === 0
  );

  if (unusedVars.length === 0) {
    console.log('✅ No unused variables found!');
  } else {
    unusedVars.forEach(varName => {
      const defs = definitionsByVar[varName];
      console.log(`${varName}:`);
      defs.forEach(def => {
        console.log(`  Defined in: ${def.file}:${def.line}`);
        console.log(`  Value: ${def.value}`);
      });
      console.log('');
    });
  }
  console.log('');

  // Undefined variables (used but never defined)
  console.log('='.repeat(80));
  console.log('UNDEFINED VARIABLES (Used but never defined)');
  console.log('='.repeat(80));
  console.log('');

  const undefinedVars = Object.keys(usagesByVar).filter(
    varName => !definitionsByVar[varName] || definitionsByVar[varName].length === 0
  );

  if (undefinedVars.length === 0) {
    console.log('✅ No undefined variables found!');
  } else {
    undefinedVars.forEach(varName => {
      const usages = usagesByVar[varName];
      console.log(`${varName}:`);
      console.log(`  Used ${usages.length} times in:`);
      usages.slice(0, 5).forEach(usage => {
        console.log(`    ${usage.file}:${usage.line} (${usage.property})`);
      });
      if (usages.length > 5) {
        console.log(`    ... and ${usages.length - 5} more`);
      }
      console.log('');
    });
  }
  console.log('');

  // Naming pattern analysis
  console.log('='.repeat(80));
  console.log('NAMING PATTERN ANALYSIS');
  console.log('='.repeat(80));
  console.log('');

  const namingPatterns = {
    'tx-color-*': [],
    'nav-*': [],
    'other': [],
  };

  Object.keys(definitionsByVar).forEach(varName => {
    if (varName.startsWith('--tx-color-')) {
      namingPatterns['tx-color-*'].push(varName);
    } else if (varName.startsWith('--nav-')) {
      namingPatterns['nav-*'].push(varName);
    } else {
      namingPatterns['other'].push(varName);
    }
  });

  Object.entries(namingPatterns).forEach(([pattern, vars]) => {
    if (vars.length > 0) {
      console.log(`Pattern: ${pattern} (${vars.length} variables)`);
      vars.forEach(v => console.log(`  ${v}`));
      console.log('');
    }
  });

  // Most used variables
  console.log('='.repeat(80));
  console.log('MOST USED VARIABLES (Top 10)');
  console.log('='.repeat(80));
  console.log('');

  Object.entries(usagesByVar)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10)
    .forEach(([varName, usages]) => {
      const def = definitionsByVar[varName]?.[0];
      console.log(`${varName}: ${usages.length} usages`);
      if (def) {
        console.log(`  Defined as: ${def.value}`);
        console.log(`  Defined in: ${def.file}`);
      } else {
        console.log(`  ⚠️  NOT DEFINED`);
      }
      console.log(`  Used in ${new Set(usages.map(u => u.file)).size} files`);
      console.log('');
    });

  // Export detailed JSON
  const jsonOutput = {
    metadata: {
      generatedAt: new Date().toISOString(),
      totalDefinitions: allDefinitions.length,
      uniqueVariablesDefined: Object.keys(definitionsByVar).length,
      totalUsages: allUsages.length,
      uniqueVariablesUsed: Object.keys(usagesByVar).length,
      filesScanned: cssFiles.length,
      filesWithDefinitions: filesWithDefs.length,
    },
    definitions: definitionsByVar,
    usages: usagesByVar,
    unusedVariables: unusedVars,
    undefinedVariables: undefinedVars,
    namingPatterns,
    allDefinitions,
    allUsages,
  };

  fs.writeFileSync(
    'docs/adr/0001/phase-0-2-css-variables-detailed.json',
    JSON.stringify(jsonOutput, null, 2)
  );

  console.log('='.repeat(80));
  console.log(`Detailed JSON report saved to: docs/adr/0001/phase-0-2-css-variables-detailed.json`);
  console.log('='.repeat(80));
  console.log('');
}

main();

