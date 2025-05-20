#!/bin/bash
# readme.sh - A simple script to display README files

# Function to display usage information
show_usage() {
    echo "Usage: $0 [path/to/readme]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -l, --list     List all README files in current directory and subdirectories"
    echo ""
    echo "If no path is provided, the script will look for README files in the current directory"
}

# Function to list all README files
list_readme_files() {
    echo "Searching for README files..."
    find . -type f -name "README*" | sort
}

# Function to display a README file
display_readme() {
    if [ -f "$1" ]; then
        echo "=== $1 ==="
        echo ""
        cat "$1"
    else
        echo "Error: File '$1' not found."
        exit 1
    fi
}

# Process command line arguments
if [ "$1" == "-h" ] || [ "$1" == "--help" ]; then
    show_usage
    exit 0
elif [ "$1" == "-l" ] || [ "$1" == "--list" ]; then
    list_readme_files
    exit 0
elif [ -n "$1" ]; then
    # If a path is provided, display that README file
    display_readme "$1"
else
    # If no arguments, look for README files in current directory
    if [ -f "README.md" ]; then
        display_readme "README.md"
    elif [ -f "README" ]; then
        display_readme "README"
    elif [ -f "README.txt" ]; then
        display_readme "README.txt"
    else
        echo "No README file found in current directory."
        echo "Use '$0 --list' to find README files in this project."
        exit 1
    fi
fi