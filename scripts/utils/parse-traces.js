// Copyright (c) 2025 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * This script processes OLTP JSON files to extract and count service dependencies. (Example dataset: https://zenodo.org/records/13956078)
 * It reads all JSON files in a specified directory, processes each trace to find parent-child
 * service relationships, counts the occurrences of each unique relationship, and writes the
 * results to an output JSON file.
 *
 * Instructions to run this script:
 * 1. Prepare a directory containing OLTP trace JSON files
 * 2. Open a terminal and navigate to the directory containing the script.
 * 3. Run the script using the following command:
 *    ```
 *    node parse-traces.js <input-directory> <output-file>
 *    ```
 *    - `<input-directory>`: The directory containing the Jaeger trace JSON files.
 *    - `<output-file>`: The path to the output JSON file where the dependency array will be saved.
 *    If these arguments are not provided, the script defaults to `./traces` for input and `./service-dependencies.json` for output.
 */
function processTraceFile(filePath) {
  try {
    const fileContent = readFileSync(filePath, 'utf8');
    const jsonData = JSON.parse(fileContent);
    
    const dependencies = [];
    
    // Process each trace in the data
    jsonData.data.forEach(trace => {
      const spans = trace.spans;
      const processes = trace.processes;
      
      // Create a map of spanID to service name
      const spanServiceMap = {};
      spans.forEach(span => {
        spanServiceMap[span.spanID] = processes[span.processID]?.serviceName;
      });
      
      // Process references to find parent-child relationships
      spans.forEach(span => {
        if (span.references && span.references.length > 0) {
          span.references.forEach(ref => {
            if (ref.refType === 'CHILD_OF') {
              const childService = spanServiceMap[span.spanID];
              const parentService = spanServiceMap[ref.spanID];
              
              if (childService && parentService && childService !== parentService) {
                dependencies.push({
                  parent: parentService,
                  child: childService
                });
              }
            }
          });
        }
      });
    });
    
    return dependencies;
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error.message);
    return [];
  }
}

// Function to count occurrences of each unique parent-child relationship
function countDependencies(dependencies) {
  const dependencyMap = new Map();
  
  dependencies.forEach(dep => {
    const key = `${dep.parent}:${dep.child}`;
    if (dependencyMap.has(key)) {
      dependencyMap.set(key, dependencyMap.get(key) + 1);
    } else {
      dependencyMap.set(key, 1);
    }
  });
  
  const result = [];
  dependencyMap.forEach((count, key) => {
    const [parent, child] = key.split(':');
    result.push({
      parent,
      child,
      callCount: count
    });
  });
  
  return result;
}

// Main function to process all trace files in a directory
async function generateDependencyArray(dirPath, outputPath) {
  try {
    const files = readdirSync(dirPath);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    console.log(`Found ${jsonFiles.length} JSON files in ${dirPath}`);
    
    let allDependencies = [];
    
    // Process each JSON file
    jsonFiles.forEach((file, index) => {
      const filePath = join(dirPath, file);
      console.log(`Processing file ${index + 1}/${jsonFiles.length}: ${file}`);
      
      const dependencies = processTraceFile(filePath);
      allDependencies = allDependencies.concat(dependencies);
    });
    
    // Count and format dependencies
    const dependencyArray = countDependencies(allDependencies);
    
    // Write the result to output file
    writeFileSync(outputPath, JSON.stringify(dependencyArray, null, 2), 'utf8');
    
    console.log(`Successfully generated dependency array with ${dependencyArray.length} relationships`);
    console.log(`Output saved to: ${outputPath}`);
  } catch (error) {
    console.error('Error generating dependency array:', error.message);
  }
}

// Script entry point
const args = process.argv.slice(2);
const inputDir = args[0] || './traces';
const outputFile = args[1] || './service-dependencies.json';

console.log(`Starting dependency extraction from: ${inputDir}`);
console.log(`Output will be saved to: ${outputFile}`);

generateDependencyArray(inputDir, outputFile);