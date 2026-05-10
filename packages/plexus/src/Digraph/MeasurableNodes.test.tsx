// Copyright (c) 2026 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import MeasurableNodes, { areEqual } from './MeasurableNodes';
import { TLayerType } from './types';

describe('MeasurableNodes', () => {
  const baseProps: any = {
    getClassName: () => 'test',
    layerType: 'html' as TLayerType,
    layoutVertices: null,
    nodeRefs: [],
    renderUtils: { getGlobalId: () => 'id', getZoomTransform: () => '' } as any,
    vertices: [{ key: 'v1' }] as any,
    renderNode: () => <div />,
    setOnNode: () => {},
  };

  it('renders without crashing', () => {
    const { container } = render(<MeasurableNodes {...baseProps} />);
    expect(container).toBeTruthy();
  });

  describe('areEqual comparator', () => {
    it('returns true for identical props', () => {
      expect(areEqual(baseProps, baseProps)).toBe(true);
    });

    it('returns false if renderNode changes', () => {
      const nextProps = { ...baseProps, renderNode: () => <span /> };
      expect(areEqual(baseProps, nextProps)).toBe(false);
    });

    it('returns false if getClassName changes', () => {
      const nextProps = { ...baseProps, getClassName: () => 'other' };
      expect(areEqual(baseProps, nextProps)).toBe(false);
    });

    it('returns false if layerType changes', () => {
      const nextProps = { ...baseProps, layerType: 'svg' };
      expect(areEqual(baseProps, nextProps)).toBe(false);
    });

    it('returns false if layoutVertices changes', () => {
      const nextProps = { ...baseProps, layoutVertices: [] };
      expect(areEqual(baseProps, nextProps)).toBe(false);
    });

    it('returns false if nodeRefs changes', () => {
      const nextProps = { ...baseProps, nodeRefs: [{ current: null }] };
      expect(areEqual(baseProps, nextProps)).toBe(false);
    });

    it('returns false if renderUtils changes', () => {
      const nextProps = { ...baseProps, renderUtils: { getGlobalId: () => 'other' } };
      expect(areEqual(baseProps, nextProps)).toBe(false);
    });

    it('returns false if vertices changes', () => {
      const nextProps = { ...baseProps, vertices: [{ key: '1' }] };
      expect(areEqual(baseProps, nextProps)).toBe(false);
    });

    it('returns false if setOnNode changes significantly', () => {
      const nextProps = { ...baseProps, setOnNode: () => {} };
      // isSamePropSetter compares setters by reference (or shallow array equality),
      // so a new function identity will always cause areEqual to return false
      expect(areEqual(baseProps, nextProps)).toBe(false);
    });
  });
});
