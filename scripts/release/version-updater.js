#!/usr/bin/env node

// SPDX-License-Identifier: Apache-2.0

// Version updater for Jaeger UI monorepo
// Updates package.json versions and CHANGELOG.md

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for output (Windows compatible)
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

// Logging functions
function logInfo(message) {
    console.log(`${colors.blue}[INFO]${colors.reset} ${message}`);
}

function logSuccess(message) {
    console.log(`${colors.green}[SUCCESS]${colors.reset} ${message}`);
}

function logWarning(message) {
    console.log(`${colors.yellow}[WARNING]${colors.reset} ${message}`);
}

function logError(message) {
    console.log(`${colors.red}[ERROR]${colors.reset} ${message}`);
}

// Get current version from jaeger-ui package.json
function getCurrentVersion() {
    try {
        const packagePath = path.join(__dirname, '../../packages/jaeger-ui/package.json');
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        return packageJson.version;
    } catch (error) {
        logError(`Failed to read package.json: ${error.message}`);
        process.exit(1);
    }
}

// Validate semantic version
function validateVersion(version) {
    const versionRegex = /^[0-9]+\.[0-9]+\.[0-9]+$/;
    if (!versionRegex.test(version)) {
        logError(`Invalid version format: ${version}. Expected format: X.Y.Z`);
        process.exit(1);
    }
    logSuccess(`Version format validated: ${version}`);
}

// Update package.json version
function updatePackageVersion(packagePath, newVersion) {
    try {
        logInfo(`Updating version in ${packagePath} to ${newVersion}`);
        
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        packageJson.version = newVersion;
        
        fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
        
        logSuccess(`Updated ${packagePath} to version ${newVersion}`);
    } catch (error) {
        logError(`Failed to update ${packagePath}: ${error.message}`);
        process.exit(1);
    }
}

// Update CHANGELOG.md
function updateChangelog(newVersion) {
    try {
        logInfo(`Updating CHANGELOG.md for version ${newVersion}`);
        
        const changelogPath = path.join(__dirname, '../../CHANGELOG.md');
        const changelogContent = fs.readFileSync(changelogPath, 'utf8');
        
        const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        
        // Split content into lines
        const lines = changelogContent.split('\n');
        const newLines = [];
        let inTemplate = false;
        let headerAdded = false;
        
        for (const line of lines) {
            // Skip the template section
            if (line.includes('next release template')) {
                inTemplate = true;
                continue;
            }
            
            if (inTemplate && line.includes('</details>')) {
                inTemplate = false;
                continue;
            }
            
            if (inTemplate) {
                continue;
            }
            
            // Add new version header before first existing version
            if (line.match(/^## v[0-9]+\.[0-9]+\.[0-9]+/) && !headerAdded) {
                newLines.push(`## v${newVersion} (${currentDate})`);
                newLines.push('');
                newLines.push('Run `make changelog` to generate content.');
                newLines.push('');
                headerAdded = true;
            }
            
            newLines.push(line);
        }
        
        // Write updated content
        fs.writeFileSync(changelogPath, newLines.join('\n'));
        
        logSuccess(`Updated CHANGELOG.md with version ${newVersion}`);
    } catch (error) {
        logError(`Failed to update CHANGELOG.md: ${error.message}`);
        process.exit(1);
    }
}

// Main function
function main() {
    const newVersion = process.argv[2];
    
    if (!newVersion) {
        logError('Usage: node version-updater.js <new_version>');
        process.exit(1);
    }
    
    logInfo(`Starting version update process for version: ${newVersion}`);
    
    // Validate version format
    validateVersion(newVersion);
    
    // Get current version for comparison
    const currentVersion = getCurrentVersion();
    logInfo(`Current version: ${currentVersion}`);
    
    if (currentVersion === newVersion) {
        logWarning(`Version is already ${newVersion}. No changes needed.`);
        process.exit(0);
    }
    
    // Update jaeger-ui package.json
    const jaegerUIPath = path.join(__dirname, '../../packages/jaeger-ui/package.json');
    updatePackageVersion(jaegerUIPath, newVersion);
    
    // Update plexus package.json if it's a major version bump
    const currentMajor = parseInt(currentVersion.split('.')[0]);
    const newMajor = parseInt(newVersion.split('.')[0]);
    
    if (newMajor > currentMajor) {
        logInfo('Major version bump detected. Updating plexus package.json');
        
        const plexusPath = path.join(__dirname, '../../packages/plexus/package.json');
        const plexusPackage = JSON.parse(fs.readFileSync(plexusPath, 'utf8'));
        const plexusVersion = plexusPackage.version;
        const plexusMajor = parseInt(plexusVersion.split('.')[0]);
        const newPlexusVersion = `${plexusMajor + 1}.0.0`;
        
        updatePackageVersion(plexusPath, newPlexusVersion);
    }
    
    // Update CHANGELOG.md
    updateChangelog(newVersion);
    
    logSuccess('Version update completed successfully!');
    logInfo('Updated packages:');
    logInfo(`  - packages/jaeger-ui/package.json: ${newVersion}`);
    
    if (newMajor > currentMajor) {
        const plexusPath = path.join(__dirname, '../../packages/plexus/package.json');
        const plexusPackage = JSON.parse(fs.readFileSync(plexusPath, 'utf8'));
        logInfo(`  - packages/plexus/package.json: ${plexusPackage.version}`);
    }
    
    logInfo(`  - CHANGELOG.md: Added version ${newVersion} header`);
}

// Run main function
main();
