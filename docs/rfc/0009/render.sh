#!/usr/bin/env bash
# This script renders every PlantUML source in this directory to an SVG of the same name.
# It runs PlantUML in the official Docker image, so nothing leaves the machine. The .puml
# file is the source of a figure; edit it, run this script, and commit both files.
set -euo pipefail
cd "$(dirname "$0")"
docker run --rm -v "$PWD:/data" plantuml/plantuml:1.2025.4 -tsvg '/data/*.puml'
ls -1 ./*.svg
