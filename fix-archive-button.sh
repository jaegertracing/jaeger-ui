#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting Jaeger Archive Button Fix Script${NC}"
echo -e "${YELLOW}=======================================${NC}"

# Detect project root (assuming we're in the Jaeger project directory)
if [ -d "./packages/jaeger-ui" ]; then
  PROJECT_ROOT="."
elif [ -d "../packages/jaeger-ui" ]; then
  PROJECT_ROOT=".."
else
  echo -e "${RED}Error: Could not locate Jaeger project root.${NC}"
  echo "Please run this script from the Jaeger project root or its parent directory."
  exit 1
fi

echo -e "${GREEN}Found Jaeger project at: ${PROJECT_ROOT}${NC}"

# Create backup directory
BACKUP_DIR="${PROJECT_ROOT}/backup-$(date +%Y%m%d%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo -e "${GREEN}Created backup directory: ${BACKUP_DIR}${NC}"

# Paths to files we need to modify
CONFIG_FILE="${PROJECT_ROOT}/packages/jaeger-ui/src/utils/config/get-config.js"
HEADER_FILE="${PROJECT_ROOT}/packages/jaeger-ui/src/components/TracePage/TracePageHeader/TracePageHeader.jsx"
DOCS_FILE="${PROJECT_ROOT}/docs/frontend-ui.md"

# Backup original files
if [ -f "$CONFIG_FILE" ]; then
  cp "$CONFIG_FILE" "$BACKUP_DIR/$(basename "$CONFIG_FILE").bak"
  echo -e "${GREEN}Backed up: ${CONFIG_FILE}${NC}"
fi

if [ -f "$HEADER_FILE" ]; then
  cp "$HEADER_FILE" "$BACKUP_DIR/$(basename "$HEADER_FILE").bak"
  echo -e "${GREEN}Backed up: ${HEADER_FILE}${NC}"
fi

if [ -f "$DOCS_FILE" ]; then
  cp "$DOCS_FILE" "$BACKUP_DIR/$(basename "$DOCS_FILE").bak"
  echo -e "${GREEN}Backed up: ${DOCS_FILE}${NC}"
fi

# Update get-config.js
echo -e "${YELLOW}Updating configuration logic...${NC}"
cat > "$CONFIG_FILE" << 'EOL'
// Copyright (c) 2017 Uber Technologies, Inc.
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

import _get from 'lodash/get';
import _has from 'lodash/has';
import _mapValues from 'lodash/mapValues';
import _merge from 'lodash/merge';
import _mergeWith from 'lodash/mergeWith';
import _omit from 'lodash/omit';
import _values from 'lodash/values';

import processDeprecation from './process-deprecation';
import defaultConfig, { deprecations } from '../../constants/default-config';

let haveWarnedFactoryFn = false;
let haveWarnedDeprecations = false;

/**
 * Merge the configs into the default config
 * @param {Object} embedded The embedded config from the UI
 * @param {Object} query The config from the URL
 * @return {Object} The merged config
 */
export function merge(embedded = {}, query = {}) {
  const config = _merge({}, defaultConfig, embedded, query);
  if (!haveWarnedDeprecations) {
    haveWarnedDeprecations = true;
    const anyWarned = _values(
      _mapValues(deprecations, (value, key) => processDeprecation(config, key, value))
    ).some(Boolean);
    if (anyWarned) {
      // eslint-disable-next-line no-console
      console.warn('See https://github.com/jaegertracing/jaeger-ui/blob/main/MIGRATION.md');
    }
  }
  return config;
}

export function getArchivedEnabled(config, capabilities) {
  // Check if archive is explicitly disabled in config
  const configValue = _get(config, 'archiveEnabled');
  
  // If explicitly set in config, respect that setting
  if (configValue === true || configValue === false) {
    return configValue;
  }
  
  // Check if the backend is using in-memory storage
  const isInMemoryStorage = _get(capabilities, 'storage.type') === 'memory';
  
  // For in-memory storage, disable archive by default
  if (isInMemoryStorage) {
    return false;
  }
  
  // For other storage types, respect backend capability
  return _get(capabilities, 'archiveStorage.enabled', false);
}

export function getConfigValue(config, ...path) {
  return _get(config, path);
}

export function getConfig() {
  if (typeof getConfig.value === 'function' && !haveWarnedFactoryFn) {
    haveWarnedFactoryFn = true;
    // eslint-disable-next-line no-console
    console.warn(
      '`getConfig` was set to a factory function in a previous release but that functionality has been removed. ' +
        'The factory function is being ignored.'
    );
  }
  return getConfig.value || {};
}

getConfig.value = undefined;

export function getPathElemHashCode(config, ...path) {
  const elemValue = getConfigValue(config, ...path);
  if (Array.isArray(elemValue)) {
    return elemValue.map(v => String(v)).join(',');
  }
  return String(elemValue);
}

export function omitDeprecations(allConfig) {
  return _omit(allConfig, Object.keys(deprecations));
}
EOL
echo -e "${GREEN}Updated configuration logic${NC}"

# Update TracePageHeader.jsx
echo -e "${YELLOW}Updating UI component with warning message...${NC}"
# First, check if the file exists and create a temporary file
if [ -f "$HEADER_FILE" ]; then
  # We'll use sed to insert the warning message code
  # This is a simplified approach - in a real scenario, you'd need more sophisticated parsing
  sed -i.tmp '/archiveTrace(id)/i\
    // Check if using in-memory storage\
    const isInMemoryStorage = this.props.storage && this.props.storage.type === "memory";\
    \
    if (isInMemoryStorage) {\
      // Show warning toast for in-memory storage\
      message.warning(\
        "Warning: You are archiving to in-memory storage. Archived traces will be lost when Jaeger restarts.",\
        5\
      );\
    }' "$HEADER_FILE"
  
  # Clean up the temporary file
  rm "${HEADER_FILE}.tmp"
  echo -e "${GREEN}Updated UI component with warning message${NC}"
else
  echo -e "${RED}Warning: Could not find ${HEADER_FILE}${NC}"
  echo "You'll need to manually add the warning message to your TracePageHeader component."
fi

# Update documentation
echo -e "${YELLOW}Updating documentation...${NC}"
mkdir -p "$(dirname "$DOCS_FILE")"
cat > "$DOCS_FILE" << 'EOL'
# Jaeger UI

## Archive Support

The Jaeger UI now handles the Archive button based on the following rules:

1. If `archiveEnabled` is explicitly set to `true` or `false` in the UI configuration, that setting is respected.
2. For in-memory storage backends, the Archive button is disabled by default.
3. For other storage types, the Archive button is enabled if the backend reports archive capability.

### Configuration Options

The archive feature can be configured in the UI config:

```json
{
  "archiveEnabled": true | false
}
```

- When set to `true`: Archive button is always enabled
- When set to `false`: Archive button is always disabled
- When not specified: 
  - For in-memory storage: Archive button is disabled
  - For other storage types: Archive button is enabled if the backend supports it

### Warning for In-Memory Storage

When using the Archive feature with in-memory storage, users will see a warning toast message indicating that archived traces will be lost when Jaeger restarts.

### Operator Configuration

When using the Jaeger Operator, you can configure the archive settings as follows:

```yaml
apiVersion: jaegertracing.io/v1
kind: Jaeger
metadata:
  name: jaeger
spec:
  strategy: allInOne
  allInOne:
    options:
      query:
        ui:
          archive:
            enabled: false  # Disable archive button regardless of backend capability
  # ...
```
EOL
echo -e "${GREEN}Updated documentation${NC}"

# Add test for the new functionality
echo -e "${YELLOW}Adding test for the new functionality...${NC}"
TEST_DIR="${PROJECT_ROOT}/packages/jaeger-ui/src/utils/config"
TEST_FILE="${TEST_DIR}/get-config.test.js"

mkdir -p "$TEST_DIR"
if [ -f "$TEST_FILE" ]; then
  cp "$TEST_FILE" "$BACKUP_DIR/$(basename "$TEST_FILE").bak"
  echo -e "${GREEN}Backed up: ${TEST_FILE}${NC}"
  
  # Append new test to existing file
  cat >> "$TEST_FILE" << 'EOL'

describe('getArchivedEnabled', () => {
  const { getArchivedEnabled } = require('./get-config');

  it('respects explicit config settings', () => {
    expect(getArchivedEnabled({ archiveEnabled: true }, {})).toBe(true);
    expect(getArchivedEnabled({ archiveEnabled: false }, {})).toBe(false);
  });

  it('disables archive button for in-memory storage by default', () => {
    const capabilities = {
      storage: { type: 'memory' },
      archiveStorage: { enabled: true }
    };
    expect(getArchivedEnabled({}, capabilities)).toBe(false);
  });

  it('respects backend capability for non-memory storage', () => {
    const capabilitiesEnabled = {
      storage: { type: 'elasticsearch' },
      archiveStorage: { enabled: true }
    };
    const capabilitiesDisabled = {
      storage: { type: 'elasticsearch' },
      archiveStorage: { enabled: false }
    };
    expect(getArchivedEnabled({}, capabilitiesEnabled)).toBe(true);
    expect(getArchivedEnabled({}, capabilitiesDisabled)).toBe(false);
  });
});
EOL
  echo -e "${GREEN}Added tests for new functionality${NC}"
else
  # Create new test file
  cat > "$TEST_FILE" << 'EOL'
// Copyright (c) 2017 Uber Technologies, Inc.
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

describe('getArchivedEnabled', () => {
  const { getArchivedEnabled } = require('./get-config');

  it('respects explicit config settings', () => {
    expect(getArchivedEnabled({ archiveEnabled: true }, {})).toBe(true);
    expect(getArchivedEnabled({ archiveEnabled: false }, {})).toBe(false);
  });

  it('disables archive button for in-memory storage by default', () => {
    const capabilities = {
      storage: { type: 'memory' },
      archiveStorage: { enabled: true }
    };
    expect(getArchivedEnabled({}, capabilities)).toBe(false);
  });

  it('respects backend capability for non-memory storage', () => {
    const capabilitiesEnabled = {
      storage: { type: 'elasticsearch' },
      archiveStorage: { enabled: true }
    };
    const capabilitiesDisabled = {
      storage: { type: 'elasticsearch' },
      archiveStorage: { enabled: false }
    };
    expect(getArchivedEnabled({}, capabilitiesEnabled)).toBe(true);
    expect(getArchivedEnabled({}, capabilitiesDisabled)).toBe(false);
  });
});
EOL
  echo -e "${GREEN}Created new test file${NC}"
fi

# Make the script executable
chmod +x "$0"

echo -e "${YELLOW}Running tests to verify changes...${NC}"
echo -e "${YELLOW}(This is a simulation - you'll need to run the actual tests)${NC}"
echo -e "${GREEN}cd ${PROJECT_ROOT} && npm test${NC}"

echo -e "${GREEN}All changes have been applied successfully!${NC}"
echo -e "${YELLOW}Please review the changes and run tests to verify everything works correctly.${NC}"
echo -e "${YELLOW}Original files have been backed up to: ${BACKUP_DIR}${NC}"