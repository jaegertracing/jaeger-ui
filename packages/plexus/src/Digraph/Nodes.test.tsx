// Copyright (c) 2026 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import Nodes, { areEqual } from './Nodes';
import { ELayerType } from './types';

const mocks = vi.hoisted(() => ({
  node: vi.fn(),
}));

vi.mock('./Node', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  return {
    default: (props: any) => {
      mocks.node(props.layoutVertex);
      return React.createElement('div', { 'data-testid': `node-${props.layoutVertex.vertex.key}` });
    },
  };
});

describe('Nodes', () => {
  const setOnNode = () => ({});
  const baseProps: any = {
    getClassName: () => 'test',
    layerType: ELayerType.Svg,
    layoutVertices: [{ vertex: { key: 'first' } }, { vertex: { key: 'second' } }],
    renderNode: () => <circle />,
    renderUtils: { getGlobalId: () => 'id', getZoomTransform: () => ({}) },
    setOnNode: [setOnNode],
  };

  beforeEach(() => {
    mocks.node.mockClear();
  });

  describe('areEqual comparator', () => {
    it('returns true for identical props', () => {
      expect(areEqual(baseProps, baseProps)).toBe(true);
    });

    it('returns true for setter arrays with the same items', () => {
      expect(areEqual(baseProps, { ...baseProps, setOnNode: [...baseProps.setOnNode] })).toBe(true);
    });

    it.each([
      ['renderNode', () => <path />],
      ['getClassName', () => 'other'],
      ['layerType', ELayerType.Html],
      ['layoutVertices', []],
      ['renderUtils', { getGlobalId: () => 'other', getZoomTransform: () => ({}) }],
    ])('returns false when %s changes', (prop, value) => {
      expect(areEqual(baseProps, { ...baseProps, [prop]: value })).toBe(false);
    });

    it('returns false for setter arrays with a different length or item', () => {
      expect(areEqual(baseProps, { ...baseProps, setOnNode: [...baseProps.setOnNode, setOnNode] })).toBe(
        false
      );
      expect(areEqual(baseProps, { ...baseProps, setOnNode: [() => ({})] })).toBe(false);
    });
  });

  it('renders one Node per layout vertex', () => {
    render(<Nodes {...baseProps} />);

    expect(mocks.node).toHaveBeenCalledTimes(2);
    expect(mocks.node).toHaveBeenNthCalledWith(1, baseProps.layoutVertices[0]);
    expect(mocks.node).toHaveBeenNthCalledWith(2, baseProps.layoutVertices[1]);
  });

  it('skips rerenders with equal props and renders when props change', () => {
    const { rerender } = render(<Nodes {...baseProps} />);
    expect(mocks.node).toHaveBeenCalledTimes(2);

    rerender(<Nodes {...baseProps} />);
    expect(mocks.node).toHaveBeenCalledTimes(2);

    rerender(<Nodes {...baseProps} layerType={ELayerType.Html} />);
    expect(mocks.node).toHaveBeenCalledTimes(4);
  });
});
