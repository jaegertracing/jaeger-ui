// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import getStateEntryKey from '../../model/ddg/getStateEntryKey';
import { EViewModifier } from '../../model/ddg/types';
import { useDdgViewModifiersStore } from './store.view-modifiers';

describe('useDdgViewModifiersStore', () => {
  const query = { service: 's', operation: 'o', start: 0, end: 0 };
  const key = getStateEntryKey(query);

  beforeEach(() => {
    useDdgViewModifiersStore.setState({ byKey: {} });
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
