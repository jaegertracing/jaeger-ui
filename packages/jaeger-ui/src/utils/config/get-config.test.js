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

  describe('config priority', () => {
    it('returns true when config.archiveEnabled is explicitly true, regardless of capabilities', () => {
      // Should return true even for in-memory storage
      const memoryCapabilities = {
        storage: { type: 'memory' },
        archiveStorage: { enabled: true }
      };
      expect(getArchivedEnabled({ archiveEnabled: true }, memoryCapabilities)).toBe(true);
      
      // Should return true even when backend capability is false
      const disabledCapabilities = {
        storage: { type: 'elasticsearch' },
        archiveStorage: { enabled: false }
      };
      expect(getArchivedEnabled({ archiveEnabled: true }, disabledCapabilities)).toBe(true);
      
      // Should return true even with no capabilities
      expect(getArchivedEnabled({ archiveEnabled: true }, null)).toBe(true);
    });

    it('returns false when config.archiveEnabled is explicitly false, regardless of capabilities', () => {
      // Should return false even when backend capability is true
      const enabledCapabilities = {
        storage: { type: 'elasticsearch' },
        archiveStorage: { enabled: true }
      };
      expect(getArchivedEnabled({ archiveEnabled: false }, enabledCapabilities)).toBe(false);
      
      // Should return false with no capabilities
      expect(getArchivedEnabled({ archiveEnabled: false }, null)).toBe(false);
    });
  });

  describe('in-memory storage handling', () => {
    it('returns false for in-memory storage when config.archiveEnabled is not set', () => {
      // Should return false even when archiveStorage capability is enabled
      const capabilities = {
        storage: { type: 'memory' },
        archiveStorage: { enabled: true }
      };
      
      // Test with various config values
      expect(getArchivedEnabled({}, capabilities)).toBe(false);
      expect(getArchivedEnabled({ archiveEnabled: null }, capabilities)).toBe(false);
      expect(getArchivedEnabled(null, capabilities)).toBe(false);
      expect(getArchivedEnabled(undefined, capabilities)).toBe(false);
    });
  });

  describe('non-memory storage handling', () => {
    it('respects backend capability for non-memory storage types', () => {
      // When archiveStorage is enabled
      const capabilitiesEnabled = {
        storage: { type: 'elasticsearch' },
        archiveStorage: { enabled: true }
      };
      expect(getArchivedEnabled({}, capabilitiesEnabled)).toBe(true);
      expect(getArchivedEnabled({ archiveEnabled: null }, capabilitiesEnabled)).toBe(true);
      
      // When archiveStorage is disabled
      const capabilitiesDisabled = {
        storage: { type: 'elasticsearch' },
        archiveStorage: { enabled: false }
      };
      expect(getArchivedEnabled({}, capabilitiesDisabled)).toBe(false);
      expect(getArchivedEnabled({ archiveEnabled: null }, capabilitiesDisabled)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles missing or incomplete capabilities gracefully', () => {
      // No capabilities
      expect(getArchivedEnabled({}, null)).toBe(false);
      expect(getArchivedEnabled({}, undefined)).toBe(false);
      
      // Empty capabilities
      expect(getArchivedEnabled({}, {})).toBe(false);
      
      // Partial capabilities
      expect(getArchivedEnabled({}, { storage: {} })).toBe(false);
      expect(getArchivedEnabled({}, { archiveStorage: {} })).toBe(false);
      expect(getArchivedEnabled({}, { archiveStorage: { enabled: true } })).toBe(true);
      expect(getArchivedEnabled({}, { storage: { type: 'cassandra' } })).toBe(false);
    });
  });
});