#!/usr/bin/env python3

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
from datetime import date

def run_command(command, cwd=None, capture_output=True):
    try:
        result = subprocess.run(
            command,
            cwd=cwd,
            check=True,
            shell=True,
            text=True,
            stdout=subprocess.PIPE if capture_output else None,
            stderr=subprocess.PIPE if capture_output else None
        )
        return result.stdout.strip() if capture_output else ""
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {command}")
        if capture_output:
            print(f"STDOUT: {e.stdout}")
            print(f"STDERR: {e.stderr}")
        raise

def check_dependencies():
    try:
        run_command("gh --version")
    except:
        print("Error: 'gh' CLI is not installed or not in PATH.")
        sys.exit(1)

def get_gh_token():
    try:
        return run_command("gh auth token")
    except:
        print("Error: Could not retrieve GitHub token using 'gh auth token'. Please login via 'gh auth login'.")
        sys.exit(1)

def validate_version(version):
    if not re.match(r'^v\d+\.\d+\.\d+$', version):
        print(f"Error: Version '{version}' does not match format 'vX.Y.Z'")
        sys.exit(1)

def check_git_status():
    status = run_command("git status --porcelain")
    if status:
        print("Error: Git working directory is not clean. Please commit or stash changes.")
        sys.exit(1)

def create_branch(version):
    branch_name = f"release-{version}"
    print(f"Creating branch {branch_name}...")
    run_command(f"git checkout -b {branch_name}")
    return branch_name

def generate_release_notes(token):
    print("Generating release notes...")
    # Ensure release-notes.py exists (download logic from Makefile)
    script_path = "./scripts/release-notes.py"
    if not os.path.exists(script_path):
        print("Downloading release-notes.py...")
        run_command("wget https://raw.githubusercontent.com/jaegertracing/jaeger/main/scripts/release/notes.py -O ./scripts/release-notes.py -q")
        run_command("chmod 755 ./scripts/release-notes.py")

    # Create a temp token file as release-notes.py expects a file
    with tempfile.NamedTemporaryFile(mode='w', delete=False) as token_file:
        token_file.write(token)
        token_file_path = token_file.name

    try:
        # Run release-notes.py
        # Using --exclude-dependabot --repo jaeger-ui as per Makefile
        # We capture stdout
        output = run_command(f"./scripts/release-notes.py --exclude-dependabot --repo jaeger-ui --token-file {token_file_path}")
        return output
    finally:
        os.remove(token_file_path)

def update_changelog(version, notes):
    print("Updating CHANGELOG.md...")
    changelog_path = "CHANGELOG.md"
    with open(changelog_path, 'r') as f:
        lines = f.readlines()

    # Find insertion point: after </details>
    insertion_index = -1
    for i, line in enumerate(lines):
        if "</details>" in line:
            insertion_index = i + 1
            break
    
    if insertion_index == -1:
        print("Error: Could not find insertion point (</details>) in CHANGELOG.md")
        sys.exit(1)

    today = date.today().strftime("%Y-%m-%d")
    header = f"\n## {version} ({today})\n\n"
    
    # Check if we need to add newlines to notes
    if not notes.endswith('\n'):
        notes += "\n"

    new_content = [header, notes]
    
    updated_lines = lines[:insertion_index] + new_content + lines[insertion_index:]
    
    with open(changelog_path, 'w') as f:
        f.writelines(updated_lines)

def update_package_json(version):
    print("Updating package.json...")
    path = "packages/jaeger-ui/package.json"
    
    # Strip 'v' for package.json
    semver = version[1:]
    
    with open(path, 'r') as f:
        data = json.load(f)
    
    data['version'] = semver
    
    with open(path, 'w') as f:
        json.dump(data, f, indent=2)
        f.write('\n') # Add trailing newline

def git_commit_and_pr(version, branch_name):
    print("Committing changes...")
    run_command("git add CHANGELOG.md packages/jaeger-ui/package.json")
    commit_msg = f"Prepare release {version}"
    run_command(f"git commit -m '{commit_msg}'")
    
    print("Pushing branch...")
    run_command(f"git push origin {branch_name}")
    
    print("Creating Pull Request...")
    pr_body = f"Prepare release {version}.\n\nAutomated release preparation."
    run_command(f"gh pr create --title '{commit_msg}' --body '{pr_body}' --label 'changelog:skip'")

def main():
    parser = argparse.ArgumentParser(description="Prepare Jaeger UI release")
    parser.add_argument("--version", required=True, help="Release version (e.g., v2.14.0)")
    parser.add_argument("--dry-run", action="store_true", help="Skip git push and PR creation")
    args = parser.parse_args()

    version = args.version
    
    check_dependencies()
    # check_git_status() # Optional: strict check, but might be annoying in dev. Uncomment if needed.
    validate_version(version)
    token = get_gh_token()
    
    branch_name = create_branch(version)
    
    notes = generate_release_notes(token)
    update_changelog(version, notes)
    update_package_json(version)
    
    if args.dry_run:
        print("Dry run finished. Changes are local in branch " + branch_name)
    else:
        git_commit_and_pr(version, branch_name)

if __name__ == "__main__":
    main()
