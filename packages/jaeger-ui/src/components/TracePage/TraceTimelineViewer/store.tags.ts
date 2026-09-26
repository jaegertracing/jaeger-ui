// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { create } from 'zustand';
import getConfig from '../../../utils/config/get-config';
import storage from '../../../utils/storage';

export const SPAN_TAG_KEYS_STORAGE_KEY = 'jaeger-ui/timeline/selected-tag-keys';

export const DEFAULT_TAG_KEYS: readonly string[] = [
  'http.status_code',
  'http.method',
  'db.system',
  'rpc.system',
  'gen_ai.request.model',
];

export interface ISpanTagStoreState {
  selectedTagKeys: readonly string[] | null;
  setSelectedTagKeys: (keys: readonly string[] | null) => void;
  resetToDefault: () => void;
  saveAsDefault: (keys: readonly string[] | null) => void;
}

export function getInitialSelectedTagKeys(): readonly string[] | null {
  const saved = storage.getItem(SPAN_TAG_KEYS_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Ignore invalid JSON in localStorage.
    }
  }
  const config = getConfig();
  if (config.traceTimeline?.defaultTagKeys) {
    return config.traceTimeline.defaultTagKeys;
  }
  return null;
}

export const useSpanTagStore = create<ISpanTagStoreState>()(set => ({
  selectedTagKeys: getInitialSelectedTagKeys(),
  setSelectedTagKeys: (keys: readonly string[] | null) => set({ selectedTagKeys: keys }),
  resetToDefault: () => {
    storage.removeItem(SPAN_TAG_KEYS_STORAGE_KEY);
    set({ selectedTagKeys: null });
  },
  saveAsDefault: (keys: readonly string[] | null) => {
    if (keys === null) {
      storage.removeItem(SPAN_TAG_KEYS_STORAGE_KEY);
    } else {
      storage.setItem(SPAN_TAG_KEYS_STORAGE_KEY, JSON.stringify(keys));
    }
    set({ selectedTagKeys: keys });
  },
}));
