// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest';
import storage from '../../../utils/storage';
import {
  DEFAULT_TAG_KEYS,
  getInitialSelectedTagKeys,
  SPAN_TAG_KEYS_STORAGE_KEY,
  useSpanTagStore,
} from './store.tags';

vi.mock('../../../utils/config/get-config', () => ({
  default: vi.fn(() => ({})),
}));

describe('store.tags', () => {
  beforeEach(() => {
    storage.removeItem(SPAN_TAG_KEYS_STORAGE_KEY);
    useSpanTagStore.setState({ selectedTagKeys: null });
  });

  describe('getInitialSelectedTagKeys', () => {
    it('returns null when storage is empty and config has no default', () => {
      expect(getInitialSelectedTagKeys()).toBeNull();
    });

    it('returns parsed array when storage contains JSON string array', () => {
      storage.setItem(SPAN_TAG_KEYS_STORAGE_KEY, JSON.stringify(['custom.tag', 'http.method']));
      expect(getInitialSelectedTagKeys()).toEqual(['custom.tag', 'http.method']);
    });

    it('returns null when storage contains invalid JSON', () => {
      storage.setItem(SPAN_TAG_KEYS_STORAGE_KEY, '{invalid json');
      expect(getInitialSelectedTagKeys()).toBeNull();
    });
  });

  describe('useSpanTagStore actions', () => {
    it('updates selectedTagKeys on setSelectedTagKeys', () => {
      useSpanTagStore.getState().setSelectedTagKeys(['http.status_code']);
      expect(useSpanTagStore.getState().selectedTagKeys).toEqual(['http.status_code']);
    });

    it('persists to storage and sets state on saveAsDefault', () => {
      const keys = ['http.status_code', 'http.method'];
      useSpanTagStore.getState().saveAsDefault(keys);
      expect(useSpanTagStore.getState().selectedTagKeys).toEqual(keys);
      expect(storage.getItem(SPAN_TAG_KEYS_STORAGE_KEY)).toBe(JSON.stringify(keys));
    });

    it('removes storage key when saveAsDefault is called with null', () => {
      storage.setItem(SPAN_TAG_KEYS_STORAGE_KEY, JSON.stringify(['foo']));
      useSpanTagStore.getState().saveAsDefault(null);
      expect(useSpanTagStore.getState().selectedTagKeys).toBeNull();
      expect(storage.getItem(SPAN_TAG_KEYS_STORAGE_KEY)).toBeNull();
    });

    it('clears storage and resets state to null on resetToDefault', () => {
      storage.setItem(SPAN_TAG_KEYS_STORAGE_KEY, JSON.stringify(['foo']));
      useSpanTagStore.setState({ selectedTagKeys: ['foo'] });
      useSpanTagStore.getState().resetToDefault();
      expect(useSpanTagStore.getState().selectedTagKeys).toBeNull();
      expect(storage.getItem(SPAN_TAG_KEYS_STORAGE_KEY)).toBeNull();
    });

    it('exposes DEFAULT_TAG_KEYS', () => {
      expect(DEFAULT_TAG_KEYS).toContain('http.status_code');
      expect(DEFAULT_TAG_KEYS).toContain('http.method');
    });
  });
});
