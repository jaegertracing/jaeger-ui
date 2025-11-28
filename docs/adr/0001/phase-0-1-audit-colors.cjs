#!/usr/bin/env node

/**
 * Color Audit Script
 *
 * Scans all CSS files in the codebase and identifies hardcoded color values.
 * Generates a detailed report for migration planning.
 *
 * Usage:
 *   node scripts/audit-colors.js > color-audit-report.txt
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Regex patterns for different color formats
const patterns = {
  hex: /#[0-9a-fA-F]{3,8}\b/g,
  rgb: /rgba?\([^)]+\)/g,
  hsl: /hsla?\([^)]+\)/g,
  named: /\b(white|black|red|green|blue|yellow|orange|purple|pink|gray|grey|brown|cyan|magenta|teal|lime|olive|navy|maroon|aqua|fuchsia|silver)\b/gi,
};

/**
 * Audit a single CSS file for hardcoded colors
 */
function auditFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const findings = [];

  lines.forEach((line, idx) => {
    // Skip lines that are:
    // - Comments
    // - CSS variable definitions (--variable-name)
    // - CSS variable usage (var(--variable-name))
    if (
      line.trim().startsWith('/*') ||
      line.trim().startsWith('*') ||
      line.includes('--') ||
      line.includes('var(')
    ) {
      return;
    }

    Object.entries(patterns).forEach(([type, pattern]) => {
      const matches = line.match(pattern);
      if (matches) {
        matches.forEach(value => {
          // Skip common non-color values
          if (value === 'white-space' || value === 'content') return;

          findings.push({
            file: filePath.replace(process.cwd() + '/', ''),
            line: idx + 1,
            type,
            value: normalizeColor(value),
            context: line.trim(),
            property: extractProperty(line),
          });
        });
      }
    });
  });

  return findings;
}

/**
 * Normalize color values for grouping
 */
function normalizeColor(color) {
  // Normalize hex colors
  if (color.startsWith('#')) {
    color = color.toLowerCase();
    // Expand 3-digit hex to 6-digit
    if (color.length === 4) {
      color = '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
    }
  }
  // Normalize whitespace in rgb/hsl
  color = color.replace(/\s+/g, ' ');
  return color;
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
  console.log('JAEGER UI - COLOR AUDIT REPORT');
  console.log('='.repeat(80));
  console.log(`Generated: ${new Date().toISOString()}`);
  console.log('');

  // Scan all CSS files
  const cssFiles = glob.sync('packages/jaeger-ui/src/**/*.css');
  console.log(`Scanning ${cssFiles.length} CSS files...\n`);

  const allFindings = cssFiles.flatMap(auditFile);

  // Group by color value
  const byColor = allFindings.reduce((acc, finding) => {
    if (!acc[finding.value]) acc[finding.value] = [];
    acc[finding.value].push(finding);
    return acc;
  }, {});

  // Group by property
  const byProperty = allFindings.reduce((acc, finding) => {
    if (!acc[finding.property]) acc[finding.property] = [];
    acc[finding.property].push(finding);
    return acc;
  }, {});

  // Group by file
  const byFile = allFindings.reduce((acc, finding) => {
    if (!acc[finding.file]) acc[finding.file] = [];
    acc[finding.file].push(finding);
    return acc;
  }, {});

  // Summary statistics
  console.log('='.repeat(80));
  console.log('SUMMARY STATISTICS');
  console.log('='.repeat(80));
  console.log(`Total hardcoded colors found: ${allFindings.length}`);
  console.log(`Unique color values: ${Object.keys(byColor).length}`);
  console.log(`Files with hardcoded colors: ${Object.keys(byFile).length}`);
  console.log(`CSS properties affected: ${Object.keys(byProperty).length}`);
  console.log('');

  // Top 30 most used colors
  console.log('='.repeat(80));
  console.log('TOP 30 MOST USED COLORS');
  console.log('='.repeat(80));
  console.log('');

  Object.entries(byColor)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 30)
    .forEach(([color, occurrences], index) => {
      console.log(`${index + 1}. ${color} (${occurrences.length} occurrences)`);

      // Show property breakdown
      const props = {};
      occurrences.forEach(occ => {
        props[occ.property] = (props[occ.property] || 0) + 1;
      });
      console.log(`   Properties: ${Object.entries(props)
        .sort((a, b) => b[1] - a[1])
        .map(([p, c]) => `${p}(${c})`)
        .join(', ')}`);

      // Show sample locations (first 3)
      occurrences.slice(0, 3).forEach(occ => {
        console.log(`   - ${occ.file}:${occ.line}`);
      });
      if (occurrences.length > 3) {
        console.log(`   ... and ${occurrences.length - 3} more`);
      }
      console.log('');
    });

  // Colors by CSS property
  console.log('='.repeat(80));
  console.log('COLORS BY CSS PROPERTY');
  console.log('='.repeat(80));
  console.log('');

  Object.entries(byProperty)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([property, occurrences]) => {
      const uniqueColors = new Set(occurrences.map(o => o.value));
      console.log(`${property}: ${occurrences.length} uses, ${uniqueColors.size} unique colors`);

      // Show top 5 colors for this property
      const colorCounts = {};
      occurrences.forEach(occ => {
        colorCounts[occ.value] = (colorCounts[occ.value] || 0) + 1;
      });

      Object.entries(colorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([color, count]) => {
          console.log(`  ${color} (${count}x)`);
        });
      console.log('');
    });

  // Files with most hardcoded colors
  console.log('='.repeat(80));
  console.log('FILES WITH MOST HARDCODED COLORS (Top 20)');
  console.log('='.repeat(80));
  console.log('');

  Object.entries(byFile)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 20)
    .forEach(([file, occurrences]) => {
      console.log(`${file}: ${occurrences.length} hardcoded colors`);
    });
  console.log('');

  // Export detailed JSON for migration tool
  const jsonOutput = {
    metadata: {
      generatedAt: new Date().toISOString(),
      totalFindings: allFindings.length,
      uniqueColors: Object.keys(byColor).length,
      filesScanned: cssFiles.length,
      filesWithColors: Object.keys(byFile).length,
    },
    byColor,
    byProperty,
    byFile,
    allFindings,
  };

  const filePath = 'docs/adr/0001/phase-0-1-audit-findings-detailed.json';
  fs.writeFileSync(
    filePath,
    JSON.stringify(jsonOutput, null, 2)
  );

  console.log('='.repeat(80));
  console.log(`Detailed JSON report saved to: ${filePath}`);
  console.log('='.repeat(80));
  console.log('');
  console.log('Next steps:');
  console.log('1. Review the top colors and identify patterns');
  console.log('2. Create token taxonomy based on actual usage');
  console.log('3. Create migration mapping document');
  console.log('4. Begin incremental migration');
}

// Run the audit
main();

