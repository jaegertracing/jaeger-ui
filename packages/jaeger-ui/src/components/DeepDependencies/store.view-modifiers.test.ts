// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import getStateEntryKey from '../../model/ddg/getStateEntryKey';
import { EViewModifier } from '../../model/ddg/types';
import { EMPTY_VIEW_MODIFIERS, useDdgViewModifiersStore } from './store.view-modifiers';

describe('useDdgViewModifiersStore', () => {
  const query = { service: 's', operation: 'o', start: 0, end: 0 };
  const key = getStateEntryKey(query);

  beforeEach(() => {
    useDdgViewModifiersStore.setState({ byKey: {} });
  });

  it('getViewModifiersForKey returns empty map when graphKey is null', () => {
    const map = useDdgViewModifiersStore.getState().getViewModifiersForKey(null);
    expect(map).toBe(EMPTY_VIEW_MODIFIERS);
  });

  it('getViewModifiersForKey returns empty map when key has no entry', () => {
    const missingKey = getStateEntryKey({ service: 'missing', operation: 'x', start: 0, end: 0 });
    const map = useDdgViewModifiersStore.getState().getViewModifiersForKey(missingKey);
    expect(map).toBe(EMPTY_VIEW_MODIFIERS);
  });

  it('addViewModifier then getViewModifiersForKey', () => {
    useDdgViewModifiersStore.getState().addViewModifier({
      ...query,
      visibilityIndices: [1, 2],
      viewModifier: EViewModifier.Hovered,
    });
    const map = useDdgViewModifiersStore.getState().getViewModifiersForKey(key);
    expect(map.get(1)).toBe(EViewModifier.Hovered);
    expect(map.get(2)).toBe(EViewModifier.Hovered);
  });

  it('clearViewModifiersForKey removes entry', () => {
    useDdgViewModifiersStore.getState().addViewModifier({
      ...query,
      visibilityIndices: [1],
      viewModifier: EViewModifier.Hovered,
    });
    useDdgViewModifiersStore.getState().clearViewModifiersForKey(key);
    expect(useDdgViewModifiersStore.getState().byKey[key]).toBeUndefined();
  });

  it('clearViewModifiersForKey is a no-op when key is absent', () => {
    useDdgViewModifiersStore.getState().addViewModifier({
      ...query,
      visibilityIndices: [1],
      viewModifier: EViewModifier.Hovered,
    });
    const before = useDdgViewModifiersStore.getState().byKey;
    useDdgViewModifiersStore.getState().clearViewModifiersForKey('definitely-not-a-key');
    expect(useDdgViewModifiersStore.getState().byKey).toBe(before);
    expect(useDdgViewModifiersStore.getState().byKey[key]?.get(1)).toBe(EViewModifier.Hovered);
  });

  it('removeViewModifierFromIndices drops byKey entry when map becomes empty', () => {
    useDdgViewModifiersStore.getState().addViewModifier({
      ...query,
      visibilityIndices: [1],
      viewModifier: EViewModifier.Hovered,
    });
    useDdgViewModifiersStore.getState().removeViewModifierFromIndices({
      ...query,
      visibilityIndices: [1],
      viewModifier: EViewModifier.Hovered,
    });
    expect(useDdgViewModifiersStore.getState().byKey[key]).toBeUndefined();
  });

  it('removeViewModifierFromIndices keeps byKey when map is non-empty', () => {
    useDdgViewModifiersStore.getState().addViewModifier({
      ...query,
      visibilityIndices: [1, 2],
      viewModifier: EViewModifier.Hovered,
    });
    useDdgViewModifiersStore.getState().removeViewModifierFromIndices({
      ...query,
      visibilityIndices: [1],
      viewModifier: EViewModifier.Hovered,
    });
    expect(useDdgViewModifiersStore.getState().byKey[key]?.get(1)).toBeUndefined();
    expect(useDdgViewModifiersStore.getState().byKey[key]?.get(2)).toBe(EViewModifier.Hovered);
  });

  it('pruneViewModifiersExcept clears all keys when graphKey is null', () => {
    const key2 = getStateEntryKey({ service: 'other', start: 0, end: 0 });
    useDdgViewModifiersStore.getState().addViewModifier({
      ...query,
      visibilityIndices: [1],
      viewModifier: EViewModifier.Hovered,
    });
    useDdgViewModifiersStore.getState().addViewModifier({
      service: 'other',
      start: 0,
      end: 0,
      visibilityIndices: [2],
      viewModifier: EViewModifier.Selected,
    });
    useDdgViewModifiersStore.getState().pruneViewModifiersExcept(null);
    expect(useDdgViewModifiersStore.getState().byKey).toEqual({});
    expect(useDdgViewModifiersStore.getState().byKey[key]).toBeUndefined();
    expect(useDdgViewModifiersStore.getState().byKey[key2]).toBeUndefined();
  });

  it('pruneViewModifiersExcept clears byKey when requested key has no data', () => {
    useDdgViewModifiersStore.getState().addViewModifier({
      ...query,
      visibilityIndices: [1],
      viewModifier: EViewModifier.Hovered,
    });
    const otherKey = getStateEntryKey({ service: 'ghost', start: 0, end: 0 });
    useDdgViewModifiersStore.getState().pruneViewModifiersExcept(otherKey);
    expect(useDdgViewModifiersStore.getState().byKey).toEqual({});
  });

  it('pruneViewModifiersExcept keeps only the requested key', () => {
    const key2 = getStateEntryKey({ service: 'other', start: 0, end: 0 });
    useDdgViewModifiersStore.getState().addViewModifier({
      ...query,
      visibilityIndices: [1],
      viewModifier: EViewModifier.Hovered,
    });
    useDdgViewModifiersStore.getState().addViewModifier({
      service: 'other',
      start: 0,
      end: 0,
      visibilityIndices: [2],
      viewModifier: EViewModifier.Selected,
    });
    useDdgViewModifiersStore.getState().pruneViewModifiersExcept(key2);
    expect(useDdgViewModifiersStore.getState().byKey[key]).toBeUndefined();
    expect(useDdgViewModifiersStore.getState().byKey[key2]?.get(2)).toBe(EViewModifier.Selected);
  });
});
