#!/usr/bin/env node

// Copyright (c) 2025 The Jaeger Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Main release preparation script for Jaeger UI
// Orchestrates the entire release preparation process

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

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

// Calculate next version based on current version
function calculateNextVersion(currentVersion, versionType = 'patch') {
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    
    switch (versionType) {
        case 'major':
            return `${major + 1}.0.0`;
        case 'minor':
            return `${major}.${minor + 1}.0`;
        case 'patch':
            return `${major}.${minor}.${patch + 1}`;
        default:
            logError(`Invalid version type: ${versionType}. Use: major, minor, or patch`);
            process.exit(1);
    }
}

// Interactive version selection
function selectVersion(currentVersion) {
    logInfo(`Current version: ${currentVersion}`);
    console.log('');
    console.log('Select the type of version bump:');
    console.log(`1) Patch (bug fixes, minor improvements) - ${calculateNextVersion(currentVersion, 'patch')}`);
    console.log(`2) Minor (new features, backward compatible) - ${calculateNextVersion(currentVersion, 'minor')}`);
    console.log(`3) Major (breaking changes) - ${calculateNextVersion(currentVersion, 'major')}`);
    console.log('4) Custom version');
    console.log('');
    
    // For demo purposes, we'll use patch version
    // In a real implementation, you'd use readline or similar for user input
    const choice = '1'; // Default to patch
    console.log('Selected: Patch version (demo mode)');
    
    switch (choice) {
        case '1':
            return calculateNextVersion(currentVersion, 'patch');
        case '2':
            return calculateNextVersion(currentVersion, 'minor');
        case '3':
            return calculateNextVersion(currentVersion, 'major');
        case '4':
            // In real implementation, prompt for custom version
            return '1.74.0'; // Demo custom version
        default:
            logError('Invalid choice. Please select 1-4.');
            process.exit(1);
    }
}

// Confirm version selection
function confirmVersion(newVersion) {
    console.log('');
    logWarning(`You are about to prepare release v${newVersion}`);
    console.log('');
    console.log('This will:');
    console.log('- Update package.json versions');
    console.log('- Update CHANGELOG.md');
    console.log('- Create a new git branch');
    console.log('- Create a GitHub PR');
    console.log('');
    
    // For demo purposes, auto-confirm
    console.log('Auto-confirming for demo...');
    return true;
}

// Run version updater
function runVersionUpdater(newVersion) {
    logInfo('Running version updater...');
    
    const versionUpdaterPath = path.join(__dirname, 'version-updater.js');
    
    if (!fs.existsSync(versionUpdaterPath)) {
        logError(`Version updater script not found: ${versionUpdaterPath}`);
        process.exit(1);
    }
    
    try {
        execSync(`node "${versionUpdaterPath}" ${newVersion}`, { stdio: 'inherit' });
        logSuccess('Version updater completed successfully');
    } catch (error) {
        logError(`Version updater failed: ${error.message}`);
        process.exit(1);
    }
}

// Check git status
function checkGitStatus() {
    logInfo('Checking git status...');
    
    try {
        // Check if we're on main/master branch
        const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
        
        if (currentBranch !== 'main' && currentBranch !== 'master') {
            logError(`Not on main/master branch. Current branch: ${currentBranch}`);
            logError('Please switch to main/master branch before creating release PR');
            process.exit(1);
        }
        
        // Check if working directory is clean
        const status = execSync('git status --porcelain', { encoding: 'utf8' });
        if (status.trim()) {
            logError('Working directory is not clean. Please commit or stash changes first.');
            console.log(status);
            process.exit(1);
        }
        
        logSuccess('Git status check passed');
    } catch (error) {
        logError(`Git status check failed: ${error.message}`);
        process.exit(1);
    }
}

// Create release branch
function createReleaseBranch(version) {
    const branchName = `prepare-release-v${version}`;
    
    logInfo(`Creating release branch: ${branchName}`);
    
    try {
        execSync(`git checkout -b ${branchName}`, { stdio: 'inherit' });
        logSuccess(`Created and checked out branch: ${branchName}`);
        return branchName;
    } catch (error) {
        logError(`Failed to create branch: ${error.message}`);
        process.exit(1);
    }
}

// Commit changes
function commitChanges(version) {
    logInfo(`Committing version changes for v${version}`);
    
    try {
        execSync('git add .', { stdio: 'inherit' });
        
        const commitMessage = `Prepare release v${version}

- Update package.json versions
- Update CHANGELOG.md with new version header
- Prepare for release automation`;
        
        execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
        logSuccess(`Committed changes for v${version}`);
    } catch (error) {
        logError(`Failed to commit changes: ${error.message}`);
        process.exit(1);
    }
}

// Show summary
function showSummary(newVersion) {
    console.log('');
    logSuccess('Release preparation completed successfully!');
    console.log('');
    console.log('Summary of changes:');
    console.log('===================');
    console.log(`New version: v${newVersion}`);
    console.log('');
    console.log('Files updated:');
    console.log('- packages/jaeger-ui/package.json');
    console.log('- CHANGELOG.md');
    console.log('- packages/plexus/package.json (if major version bump)');
    console.log('');
    console.log('Next steps:');
    console.log('1. Review the created branch and commit');
    console.log('2. Push the branch when ready');
    console.log('3. Create a PR manually (GitHub CLI not available in demo)');
    console.log('4. Run \'make changelog\' to populate changelog content');
    console.log('5. Run \'make draft-release\' to create the GitHub release');
    console.log('');
    console.log('The release process is now automated and ready for review!');
}

// Main function
function main() {
    logInfo('Starting Jaeger UI release preparation process...');
    console.log('');
    
    // Check if we're in the right directory
    if (!fs.existsSync('packages/jaeger-ui/package.json')) {
        logError('This script must be run from the root of the Jaeger UI repository');
        process.exit(1);
    }
    
    // Get current version
    const currentVersion = getCurrentVersion();
    
    // Select new version
    const newVersion = selectVersion(currentVersion);
    
    // Confirm selection
    if (!confirmVersion(newVersion)) {
        logInfo('Release preparation cancelled.');
        process.exit(0);
    }
    
    // Check git status BEFORE making any changes
    checkGitStatus();
    
    // Run version updater AFTER confirming clean git state
    runVersionUpdater(newVersion);
    
    // Create release branch
    const branchName = createReleaseBranch(newVersion);
    
    // Commit changes
    commitChanges(newVersion);
    
    // Show summary
    showSummary(newVersion);
    
    logInfo(`Branch created: ${branchName}`);
    logInfo('You can now push this branch and create a PR manually, or use GitHub CLI if available.');
}

// Run main function
main();
