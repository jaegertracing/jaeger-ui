#!/usr/bin/env node

// SPDX-License-Identifier: Apache-2.0

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

// Validate version format
function validateVersion(version) {
    const versionRegex = /^\d+\.\d+\.\d+$/;
    if (!versionRegex.test(version)) {
        logError(`Invalid version format: ${version}. Expected format: X.Y.Z`);
        process.exit(1);
    }
}

// Check if GitHub CLI is available and authenticated
function checkGitHubCLI() {
    try {
        // Check if gh is installed
        execSync('gh --version', { stdio: 'pipe' });
        
        // Check if user is authenticated
        execSync('gh auth status', { stdio: 'pipe' });
        
        logSuccess('GitHub CLI is available and authenticated');
        return true;
    } catch (error) {
        logError('GitHub CLI is not available or not authenticated');
        logError('Please install GitHub CLI and run: gh auth login');
        return false;
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

// Push branch to remote
function pushBranch(branchName) {
    logInfo(`Pushing branch ${branchName} to remote...`);
    
    try {
        execSync(`git push origin ${branchName}`, { stdio: 'inherit' });
        logSuccess(`Pushed branch ${branchName} to remote`);
    } catch (error) {
        logError(`Failed to push branch: ${error.message}`);
        process.exit(1);
    }
}

// Create GitHub pull request
function createPullRequest(version, branchName) {
    logInfo('Creating GitHub pull request...');
    
    const prTitle = `Prepare release v${version}`;
    const prBody = `This PR prepares the release for version v${version}

## Changes
- Updates package.json versions
- Updates CHANGELOG.md with new version header
- Prepares for release automation

## Next Steps
After merging this PR:
1. Run \`make changelog\` to populate changelog content
2. Run \`make draft-release\` to create the GitHub release

Closes #3056`;

    try {
        // Write PR body to temporary file to avoid shell escaping issues
        const tempFile = path.join(__dirname, `pr-body-${Date.now()}.md`);
        fs.writeFileSync(tempFile, prBody);
        
        try {
            // Use body file to avoid command line argument issues
            execSync(`gh pr create --title "${prTitle}" --body-file "${tempFile}" --label "changelog:skip" --head "${branchName}"`, { stdio: 'inherit' });
            
            logSuccess('GitHub pull request created successfully');
        } finally {
            // Clean up temporary file
            if (fs.existsSync(tempFile)) {
                fs.unlinkSync(tempFile);
            }
        }
    } catch (error) {
        logError(`Failed to create pull request: ${error.message}`);
        logWarning('You can create the PR manually using GitHub CLI or web interface');
        process.exit(1);
    }
}

// Show summary
function showSummary(newVersion, branchName) {
    console.log('');
    logSuccess('Release preparation completed successfully!');
    console.log('');
    console.log('Summary of changes:');
    console.log('===================');
    console.log(`New version: v${newVersion}`);
    console.log(`Branch: ${branchName}`);
    console.log('');
    console.log('Files updated:');
    console.log('- packages/jaeger-ui/package.json');
    console.log('- CHANGELOG.md');
    console.log('- packages/plexus/package.json (if major version bump)');
    console.log('');
    console.log('Next steps:');
    console.log('1. Review the created PR');
    console.log('2. Merge the PR when ready');
    console.log('3. Run \'make changelog\' to populate changelog content');
    console.log('4. Run \'make draft-release\' to create the GitHub release');
    console.log('');
    console.log('The release process is now fully automated!');
}

// Main function
function main() {
    logInfo('Starting Jaeger UI release preparation process...');
    console.log('');
    
    // Check if version argument is provided
    const newVersion = process.argv[2];
    if (!newVersion) {
        logError('Usage: node prepare.js <version>');
        logError('Example: node prepare.js 1.74.0');
        process.exit(1);
    }
    
    // Validate version format
    validateVersion(newVersion);
    
    // Check if we're in the right directory
    if (!fs.existsSync('packages/jaeger-ui/package.json')) {
        logError('This script must be run from the root of the Jaeger UI repository');
        process.exit(1);
    }
    
    // Get current version
    const currentVersion = getCurrentVersion();
    logInfo(`Current version: ${currentVersion}`);
    logInfo(`Target version: ${newVersion}`);
    
    // Check if GitHub CLI is available
    if (!checkGitHubCLI()) {
        process.exit(1);
    }
    
    // Check git status BEFORE making any changes
    checkGitStatus();
    
    // Run version updater AFTER confirming clean git state
    runVersionUpdater(newVersion);
    
    // Create release branch
    const branchName = createReleaseBranch(newVersion);
    
    // Commit changes
    commitChanges(newVersion);
    
    // Push branch to remote
    pushBranch(branchName);
    
    // Create GitHub pull request
    createPullRequest(newVersion, branchName);
    
    // Show summary
    showSummary(newVersion, branchName);
}

// Run main function
main();