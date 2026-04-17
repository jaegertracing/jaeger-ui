// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import {
  EViewModifier,
  TDdgAddViewModifierPayload,
  TDdgViewModifierRemovalPayload,
} from '../../model/ddg/types';

export const EMPTY_VIEW_MODIFIERS = new Map<number, number>();

// Functions to apply view modifiers to a map of view modifiers.
export function applyAddViewModifier(
  viewModifiers: Map<number, number>,
  payload: TDdgAddViewModifierPayload
): Map<number, number> {
  const { visibilityIndices, viewModifier } = payload;
  const next = new Map(viewModifiers);
  visibilityIndices.forEach(idx => {
    next.set(idx, (next.get(idx) || 0) | viewModifier);
  });
  return next;
}

export function applyViewModifierRemoval(
  viewModifiers: Map<number, number>,
  payload: TDdgViewModifierRemovalPayload
): Map<number, number> {
  const { visibilityIndices, viewModifier } = payload;
  const next = new Map(viewModifiers);
  const indicesToUpdate = visibilityIndices || Array.from(next.keys());

  indicesToUpdate.forEach(idx => {
    const newValue = viewModifier ? (next.get(idx) || 0) & ~viewModifier : EViewModifier.None;

    if (newValue === EViewModifier.None) {
      next.delete(idx);
    } else {
      next.set(idx, newValue);
    }
  });

  return next;
}
