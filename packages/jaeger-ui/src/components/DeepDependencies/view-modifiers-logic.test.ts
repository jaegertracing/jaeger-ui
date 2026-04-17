// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { EViewModifier, TDdgViewModifierRemovalPayload } from '../../model/ddg/types';
import { applyAddViewModifier, applyViewModifierRemoval } from './view-modifiers-logic';

describe('view-modifiers-logic', () => {
  const service = 'serviceName';
  const operation = 'operationName';
  const start = 400;
  const end = 800;
  const meta = {
    service,
    operation,
    start,
    end,
  };
  const visibilityIndices = [4, 8, 15, 16, 23, 42];
  const emphasizedPayload = {
    ...meta,
    visibilityIndices,
    viewModifier: EViewModifier.Emphasized,
  };
  const emphasizedViewModifierMap = new Map();
  visibilityIndices.forEach(idx => emphasizedViewModifierMap.set(idx, emphasizedPayload.viewModifier));

  const selectedPayload = {
    ...meta,
    visibilityIndices,
    viewModifier: EViewModifier.Selected,
  };
  const selectedViewModifierMap = new Map();
  visibilityIndices.forEach(idx => selectedViewModifierMap.set(idx, selectedPayload.viewModifier));

  const multiPayload = {
    ...meta,
    visibilityIndices,
    viewModifier: EViewModifier.Emphasized | EViewModifier.Selected,
  };
  const multiViewModifierMap = new Map();
  visibilityIndices.forEach(idx => multiViewModifierMap.set(idx, multiPayload.viewModifier));

  describe('applyAddViewModifier', () => {
    it('adds viewModifier to an empty map', () => {
      const next = applyAddViewModifier(new Map(), emphasizedPayload);
      expect(next).toEqual(emphasizedViewModifierMap);
    });

    it('adds multiple viewModifiers at once', () => {
      const next = applyAddViewModifier(new Map(), multiPayload);
      expect(next).toEqual(multiViewModifierMap);
    });

    it('adds provided viewModifier to existing viewModifier', () => {
      const next = applyAddViewModifier(emphasizedViewModifierMap, selectedPayload);
      expect(next).toEqual(multiViewModifierMap);
    });

    it('handles absent operation in payload', () => {
      const { operation: _op, ...emphasizedPayloadWithoutOp } = emphasizedPayload;
      const next = applyAddViewModifier(new Map(), emphasizedPayloadWithoutOp);
      expect(next).toEqual(emphasizedViewModifierMap);
    });
  });

  describe('applyViewModifierRemoval', () => {
    const partialIndices = visibilityIndices.slice(0, visibilityIndices.length - 1);
    const omittedIdx = visibilityIndices[visibilityIndices.length - 1];

    it('clears the provided viewModifier preserving other viewModifiers', () => {
      const next = applyViewModifierRemoval(multiViewModifierMap, selectedPayload);
      expect(next).toEqual(emphasizedViewModifierMap);
    });

    it('clears provided indices if viewModifier is omitted', () => {
      const next = applyViewModifierRemoval(multiViewModifierMap, {
        ...meta,
        visibilityIndices: partialIndices,
      } as TDdgViewModifierRemovalPayload);
      const expectedMap = new Map([[omittedIdx, multiPayload.viewModifier]]);
      expect(next).toEqual(expectedMap);
    });

    it('clears provided viewModifier from all indices if visibilityIndices array is omitted', () => {
      const next = applyViewModifierRemoval(multiViewModifierMap, {
        ...meta,
        viewModifier: EViewModifier.Selected,
      } as TDdgViewModifierRemovalPayload);
      expect(next).toEqual(emphasizedViewModifierMap);
    });

    it('removes indices that become 0', () => {
      const mixedViewModifierMap = new Map(multiViewModifierMap);
      for (let i = 0; i < partialIndices.length - 1; i++) {
        mixedViewModifierMap.set(partialIndices[i], EViewModifier.Emphasized);
      }
      const next = applyViewModifierRemoval(mixedViewModifierMap, {
        ...meta,
        visibilityIndices: partialIndices,
        viewModifier: EViewModifier.Emphasized,
      });
      const expectedMap = new Map([
        [partialIndices[partialIndices.length - 1], EViewModifier.Selected],
        [omittedIdx, multiPayload.viewModifier],
      ]);
      expect(next).toEqual(expectedMap);
    });

    it('does not add previously absent idx if included in payload', () => {
      const partialViewModifierMap = new Map();
      for (let i = 0; i < partialIndices.length; i++) {
        partialViewModifierMap.set(partialIndices[i], EViewModifier.Emphasized);
      }
      const next = applyViewModifierRemoval(partialViewModifierMap, emphasizedPayload);
      expect(next).toEqual(new Map());
    });

    it('handles absent operation in payload', () => {
      const operationlessMap = new Map(multiViewModifierMap);
      const { operation: _op, ...selectedPayloadWithoutOp } = selectedPayload;
      const next = applyViewModifierRemoval(operationlessMap, selectedPayloadWithoutOp);
      expect(next).toEqual(emphasizedViewModifierMap);
    });
  });
});
