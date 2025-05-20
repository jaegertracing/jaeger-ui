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

/**
 * Determines if the archive button should be enabled based on configuration and backend capabilities
 * 
 * This function implements the logic to determine if the Archive button should be shown:
 * 1. If config explicitly sets archiveEnabled (boolean), respect that setting
 * 2. For in-memory storage, disable the Archive button regardless of backend capability
 * 3. For other storage types, respect the backend capability
 * 
 * @param {Object} config The UI configuration
 * @param {Object} capabilities The backend capabilities
 * @return {boolean} Whether the archive button should be enabled
 */
export const getArchivedEnabled = (config, capabilities) => {
  // First check if archive is explicitly set in config (highest priority)
  const configValue = _get(config, 'archiveEnabled');
  
  // If explicitly set in config, respect that setting
  if (configValue === true || configValue === false) {
    return configValue;
  }
  
  // For in-memory storage, always disable archive button regardless of backend capability
  // This prevents confusion since archived traces won't persist between restarts
  const isInMemoryStorage = _get(capabilities, 'storage.type') === 'memory';
  
  // For in-memory storage, disable archive by default
  if (isInMemoryStorage) {
    return false;
  }
  
  // For other storage types, respect backend capability
  return Boolean(_get(capabilities, 'archiveStorage.enabled', false));
};

// Export other configuration getters
// ...
