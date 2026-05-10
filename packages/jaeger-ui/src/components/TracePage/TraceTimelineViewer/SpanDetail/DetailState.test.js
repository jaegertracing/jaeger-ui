// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import DetailState from './DetailState';

describe('DetailState', () => {
  describe('constructor defaults', () => {
    it('starts with attributes, resource, warnings, and links closed', () => {
      const state = new DetailState();
      expect(state.isAttributesOpen).toBe(false);
      expect(state.isResourceOpen).toBe(false);
      expect(state.isWarningsOpen).toBe(false);
      expect(state.isLinksOpen).toBe(false);
    });

    it('starts with events open and no opened items', () => {
      const state = new DetailState();
      expect(state.events.isOpen).toBe(true);
      expect(state.events.openedItems.size).toBe(0);
    });
  });

  describe('forDetailPanelMode()', () => {
    it('expands attributes and resource for sidepanel mode', () => {
      const state = DetailState.forDetailPanelMode('sidepanel');
      expect(state.isAttributesOpen).toBe(true);
      expect(state.isResourceOpen).toBe(true);
    });

    it('leaves warnings, links, and events at standard defaults for sidepanel mode', () => {
      const state = DetailState.forDetailPanelMode('sidepanel');
      expect(state.isWarningsOpen).toBe(false);
      expect(state.isLinksOpen).toBe(false);
      expect(state.events.isOpen).toBe(true);
      expect(state.events.openedItems.size).toBe(0);
    });

    it('returns collapsed defaults for inline mode', () => {
      const state = DetailState.forDetailPanelMode('inline');
      expect(state.isAttributesOpen).toBe(false);
      expect(state.isResourceOpen).toBe(false);
    });
  });
});
