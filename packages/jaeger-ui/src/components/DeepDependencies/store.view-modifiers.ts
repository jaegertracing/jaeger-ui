// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

// A Zustand store that holds viewModifiers per graph key (same key Redux uses for
// state.ddg[...]: service + operation + start + end).
import { create } from 'zustand';
import getStateEntryKey from '../../model/ddg/getStateEntryKey';
import {
  TDdgAddViewModifierPayload,
  TDdgRemoveViewModifierFromIndicesPayload,
  TDdgViewModifierRemovalPayload,
} from '../../model/ddg/types';
import { applyAddViewModifier, applyViewModifierRemoval, EMPTY_VIEW_MODIFIERS } from './view-modifiers-logic';

type IDdgViewModifiersStore = {
  // Visibility-index view modifiers keyed like Redux `state.ddg` entries.
  byKey: Record<string, Map<number, number>>;
  getViewModifiersForKey: (graphKey: string | null) => ReadonlyMap<number, number>;
  addViewModifier: (payload: TDdgAddViewModifierPayload) => void;
  removeViewModifierFromIndices: (payload: TDdgRemoveViewModifierFromIndicesPayload) => void;
  viewModifierRemoval: (payload: TDdgViewModifierRemovalPayload) => void;
  clearViewModifiersForKey: (graphKey: string) => void;
  pruneViewModifiersExcept: (graphKey: string | null) => void;
};

export const useDdgViewModifiersStore = create<IDdgViewModifiersStore>()((set, get) => ({
  byKey: {},

  getViewModifiersForKey: (graphKey: string | null) => {
    if (!graphKey) {
      return EMPTY_VIEW_MODIFIERS;
    }
    return get().byKey[graphKey] ?? EMPTY_VIEW_MODIFIERS;
  },

  addViewModifier: (payload: TDdgAddViewModifierPayload) => {
    const key = getStateEntryKey(payload);
    set(s => {
      const prev = s.byKey[key] ?? EMPTY_VIEW_MODIFIERS;
      const next = applyAddViewModifier(prev, payload);
      return { byKey: { ...s.byKey, [key]: next } };
    });
  },

  removeViewModifierFromIndices: (payload: TDdgRemoveViewModifierFromIndicesPayload) => {
    get().viewModifierRemoval(payload);
  },

  viewModifierRemoval: (payload: TDdgViewModifierRemovalPayload) => {
    const key = getStateEntryKey(payload);
    set(s => {
      const prev = s.byKey[key] ?? EMPTY_VIEW_MODIFIERS;
      const next = applyViewModifierRemoval(prev, payload);
      if (next.size === 0) {
        const { [key]: _removed, ...rest } = s.byKey;
        return { byKey: rest };
      }
      return { byKey: { ...s.byKey, [key]: next } };
    });
  },

  clearViewModifiersForKey: (graphKey: string) => {
    set(s => {
      if (!(graphKey in s.byKey)) {
        return s;
      }
      const { [graphKey]: _removed, ...rest } = s.byKey;
      return { byKey: rest };
    });
  },

  pruneViewModifiersExcept: (graphKey: string | null) => {
    if (!graphKey) {
      set({ byKey: {} });
      return;
    }
    set(s => {
      const keep = s.byKey[graphKey];
      return keep ? { byKey: { [graphKey]: keep } } : { byKey: {} };
    });
  },
}));

export { EMPTY_VIEW_MODIFIERS };
