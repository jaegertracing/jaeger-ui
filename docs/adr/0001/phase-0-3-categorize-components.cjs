#!/usr/bin/env node

/**
 * Component Categorization Script (Phase 0.3)
 *
 * Analyzes all CSS files to categorize components by:
 * 1. CSS file size (lines of code)
 * 2. Number of hardcoded colors
 * 3. Complexity and migration priority
 *
 * Uses data from Phase 0.1 color audit to enrich the analysis.
 *
 * Usage:
 *   node docs/adr/0001/phase-0-3-categorize-components.cjs
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

/**
 * Count lines in a file
 */
function countLines(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return content.split('\n').length;
}

/**
 * Load color audit data from Phase 0.1
 */
function loadColorAuditData() {
  const auditPath = 'docs/adr/0001/phase-0-audit-findings-detailed.json';
  if (!fs.existsSync(auditPath)) {
    console.error(`Error: Color audit data not found at ${auditPath}`);
    console.error('Please run Phase 0.1 first: node docs/adr/0001/phase-0-audit-colors.cjs');
    process.exit(1);
  }
  
  const data = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
  return data.byFile;
}

/**
 * Categorize a component based on metrics
 */
function categorizeComponent(cssLines, colorCount) {
  // Priority based on color count (primary factor)
  let priority = 'LOW';
  let priorityScore = 0;
  
  if (colorCount >= 15) {
    priority = 'HIGH';
    priorityScore = 3;
  } else if (colorCount >= 8) {
    priority = 'MEDIUM';
    priorityScore = 2;
  } else if (colorCount >= 1) {
    priority = 'LOW';
    priorityScore = 1;
  } else {
    priority = 'NONE';
    priorityScore = 0;
  }
  
  // Complexity based on CSS lines
  let complexity = 'SIMPLE';
  if (cssLines > 200) {
    complexity = 'COMPLEX';
  } else if (cssLines > 100) {
    complexity = 'MODERATE';
  }
  
  return { priority, priorityScore, complexity };
}

/**
 * Determine component category from file path
 */
function getComponentCategory(filePath) {
  if (filePath.includes('/App/')) return 'App/Layout';
  if (filePath.includes('/common/')) return 'Common/Utilities';
  if (filePath.includes('/TracePage/')) return 'TracePage';
  if (filePath.includes('/SearchTracePage/')) return 'SearchTracePage';
  if (filePath.includes('/DeepDependencies/')) return 'DeepDependencies';
  if (filePath.includes('/QualityMetrics/')) return 'QualityMetrics';
  if (filePath.includes('/Monitor/')) return 'Monitor';
  if (filePath.includes('/DependencyGraph/')) return 'DependencyGraph';
  return 'Other';
}

/**
 * Get component name from file path
 */
function getComponentName(filePath) {
  const relativePath = filePath.replace('packages/jaeger-ui/src/', '');
  return relativePath;
}

/**
 * Main execution
 */
function main() {
  console.log('='.repeat(80));
  console.log('JAEGER UI - COMPONENT CATEGORIZATION REPORT (Phase 0.3)');
  console.log('='.repeat(80));
  console.log(`Generated: ${new Date().toISOString()}`);
  console.log('');

  // Load color audit data from Phase 0.1
  console.log('Loading color audit data from Phase 0.1...');
  const colorsByFile = loadColorAuditData();
  console.log(`✅ Loaded color data for ${Object.keys(colorsByFile).length} files\n`);

  // Scan all CSS files
  const cssFiles = glob.sync('packages/jaeger-ui/src/**/*.css');
  console.log(`Scanning ${cssFiles.length} CSS files...\n`);

  // Analyze each file
  const components = cssFiles.map(filePath => {
    const cssLines = countLines(filePath);
    const colorCount = colorsByFile[filePath.replace(process.cwd() + '/', '')]?.length || 0;
    const { priority, priorityScore, complexity } = categorizeComponent(cssLines, colorCount);
    const category = getComponentCategory(filePath);
    const name = getComponentName(filePath);
    
    return {
      filePath: filePath.replace(process.cwd() + '/', ''),
      name,
      category,
      cssLines,
      colorCount,
      priority,
      priorityScore,
      complexity,
    };
  });

  // Sort by priority score (descending), then by color count (descending)
  components.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) {
      return b.priorityScore - a.priorityScore;
    }
    return b.colorCount - a.colorCount;
  });

  // Summary statistics
  console.log('='.repeat(80));
  console.log('SUMMARY STATISTICS');
  console.log('='.repeat(80));
  console.log('');
  
  const totalCssLines = components.reduce((sum, c) => sum + c.cssLines, 0);
  const totalColors = components.reduce((sum, c) => sum + c.colorCount, 0);
  const highPriority = components.filter(c => c.priority === 'HIGH');
  const mediumPriority = components.filter(c => c.priority === 'MEDIUM');
  const lowPriority = components.filter(c => c.priority === 'LOW');
  const noPriority = components.filter(c => c.priority === 'NONE');
  
  console.log(`Total CSS files: ${cssFiles.length}`);
  console.log(`Total CSS lines: ${totalCssLines.toLocaleString()}`);
  console.log(`Total hardcoded colors: ${totalColors}`);
  console.log(`Average colors per file: ${(totalColors / cssFiles.length).toFixed(1)}`);
  console.log('');

  console.log('Priority Distribution:');
  console.log(`  HIGH:   ${highPriority.length} files (${highPriority.reduce((s, c) => s + c.colorCount, 0)} colors)`);
  console.log(`  MEDIUM: ${mediumPriority.length} files (${mediumPriority.reduce((s, c) => s + c.colorCount, 0)} colors)`);
  console.log(`  LOW:    ${lowPriority.length} files (${lowPriority.reduce((s, c) => s + c.colorCount, 0)} colors)`);
  console.log(`  NONE:   ${noPriority.length} files (no colors)`);
  console.log('');

  // Group by category
  const byCategory = components.reduce((acc, comp) => {
    if (!acc[comp.category]) {
      acc[comp.category] = [];
    }
    acc[comp.category].push(comp);
    return acc;
  }, {});

  console.log('='.repeat(80));
  console.log('COMPONENTS BY CATEGORY');
  console.log('='.repeat(80));
  console.log('');

  Object.entries(byCategory)
    .sort((a, b) => {
      const sumA = a[1].reduce((s, c) => s + c.colorCount, 0);
      const sumB = b[1].reduce((s, c) => s + c.colorCount, 0);
      return sumB - sumA;
    })
    .forEach(([category, comps]) => {
      const totalCategoryColors = comps.reduce((s, c) => s + c.colorCount, 0);
      const totalCategoryLines = comps.reduce((s, c) => s + c.cssLines, 0);
      console.log(`${category}: ${comps.length} files, ${totalCategoryColors} colors, ${totalCategoryLines} lines`);
    });
  console.log('');

  // High priority components (detailed)
  console.log('='.repeat(80));
  console.log('HIGH PRIORITY COMPONENTS (≥15 colors)');
  console.log('='.repeat(80));
  console.log('');

  if (highPriority.length === 0) {
    console.log('No high priority components found.');
  } else {
    console.log(`Found ${highPriority.length} high priority components:\n`);
    highPriority.forEach((comp, idx) => {
      console.log(`${idx + 1}. ${comp.name}`);
      console.log(`   Colors: ${comp.colorCount}, Lines: ${comp.cssLines}, Complexity: ${comp.complexity}`);
      console.log(`   Category: ${comp.category}`);
      console.log('');
    });
  }

  // Medium priority components (summary)
  console.log('='.repeat(80));
  console.log('MEDIUM PRIORITY COMPONENTS (8-14 colors)');
  console.log('='.repeat(80));
  console.log('');

  if (mediumPriority.length === 0) {
    console.log('No medium priority components found.');
  } else {
    console.log(`Found ${mediumPriority.length} medium priority components:\n`);
    mediumPriority.slice(0, 20).forEach((comp, idx) => {
      console.log(`${idx + 1}. ${comp.name}`);
      console.log(`   Colors: ${comp.colorCount}, Lines: ${comp.cssLines}, Complexity: ${comp.complexity}`);
      console.log('');
    });
    if (mediumPriority.length > 20) {
      console.log(`... and ${mediumPriority.length - 20} more medium priority components`);
      console.log('');
    }
  }

  // Top 10 largest files
  console.log('='.repeat(80));
  console.log('TOP 10 LARGEST CSS FILES (by lines)');
  console.log('='.repeat(80));
  console.log('');

  const largestFiles = [...components].sort((a, b) => b.cssLines - a.cssLines).slice(0, 10);
  largestFiles.forEach((comp, idx) => {
    console.log(`${idx + 1}. ${comp.name}`);
    console.log(`   Lines: ${comp.cssLines}, Colors: ${comp.colorCount}, Priority: ${comp.priority}`);
    console.log('');
  });

  // Migration batches
  console.log('='.repeat(80));
  console.log('RECOMMENDED MIGRATION BATCHES');
  console.log('='.repeat(80));
  console.log('');

  console.log('BATCH 1 - Foundation (App/Layout + Common):');
  const batch1 = components.filter(c =>
    c.category === 'App/Layout' || c.category === 'Common/Utilities'
  ).sort((a, b) => b.colorCount - a.colorCount);
  batch1.forEach(comp => {
    console.log(`  - ${comp.name} (${comp.colorCount} colors, ${comp.cssLines} lines)`);
  });
  console.log(`  Total: ${batch1.length} files, ${batch1.reduce((s, c) => s + c.colorCount, 0)} colors\n`);

  console.log('BATCH 2 - High Priority Components:');
  const batch2 = highPriority.filter(c =>
    c.category !== 'App/Layout' && c.category !== 'Common/Utilities'
  ).slice(0, 10);
  batch2.forEach(comp => {
    console.log(`  - ${comp.name} (${comp.colorCount} colors, ${comp.cssLines} lines)`);
  });
  console.log(`  Total: ${batch2.length} files, ${batch2.reduce((s, c) => s + c.colorCount, 0)} colors\n`);

  console.log('BATCH 3 - Remaining High + Medium Priority:');
  const batch3Count = highPriority.length - batch2.length + mediumPriority.length;
  const batch3Colors =
    highPriority.slice(batch2.length).reduce((s, c) => s + c.colorCount, 0) +
    mediumPriority.reduce((s, c) => s + c.colorCount, 0);
  console.log(`  Total: ${batch3Count} files, ${batch3Colors} colors`);
  console.log(`  (See detailed list in JSON output)\n`);

  // Export detailed JSON
  const jsonOutput = {
    metadata: {
      generatedAt: new Date().toISOString(),
      totalFiles: cssFiles.length,
      totalCssLines,
      totalColors,
      averageColorsPerFile: parseFloat((totalColors / cssFiles.length).toFixed(1)),
      priorityDistribution: {
        high: highPriority.length,
        medium: mediumPriority.length,
        low: lowPriority.length,
        none: noPriority.length,
      },
    },
    components,
    byCategory,
    highPriority,
    mediumPriority,
    lowPriority,
    migrationBatches: {
      batch1: batch1.map(c => c.filePath),
      batch2: batch2.map(c => c.filePath),
      batch3: [
        ...highPriority.slice(batch2.length).map(c => c.filePath),
        ...mediumPriority.map(c => c.filePath),
      ],
    },
  };

  fs.writeFileSync(
    'docs/adr/0001/phase-0-3-component-categorization-detailed.json',
    JSON.stringify(jsonOutput, null, 2)
  );

  console.log('='.repeat(80));
  console.log('Detailed JSON saved to: docs/adr/0001/phase-0-3-component-categorization-detailed.json');
  console.log('='.repeat(80));
  console.log('');
}

main();

