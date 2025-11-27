// Copyright (c) 2019 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, cleanup, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import renderNode, { DiffNode, getNodeEmphasisRenderer } from './renderNode';
import EmphasizedNode from '../../common/EmphasizedNode';

describe('drawNode', () => {
  const operation = 'operationName';
  const service = 'serviceName';
  const defaultCount = 100;

  afterEach(cleanup);

  describe('diffNode', () => {
    const baseProps = {
      a: 100,
      b: 100,
      operation: 'operationName',
      service: 'serviceName',
    };

    it('renders table when a and b are the same', () => {
      render(<DiffNode {...baseProps} />);
      const metricCell = screen.getByTestId('diff-metric-cell');
      expect(metricCell).toHaveClass('is-same');
      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByText('serviceName')).toBeInTheDocument();
      expect(screen.getByText('operationName')).toBeInTheDocument();
    });

    it('applies is-more class when a < b', () => {
      render(<DiffNode {...baseProps} a={50} b={100} />);
      const metricCell = screen.getByTestId('diff-metric-cell');
      expect(metricCell).toHaveClass('is-more');
    });

    it('applies is-less class when a > b', () => {
      render(<DiffNode {...baseProps} a={200} b={100} />);
      const metricCell = screen.getByTestId('diff-metric-cell');
      expect(metricCell).toHaveClass('is-less');
    });

    it('applies is-added class when a is 0', () => {
      render(<DiffNode {...baseProps} a={0} b={100} />);
      const metricCell = screen.getByTestId('diff-metric-cell');
      expect(metricCell).toHaveClass('is-added');
    });

    it('applies is-removed class when b is 0', () => {
      render(<DiffNode {...baseProps} a={100} b={0} />);
      const metricCell = screen.getByTestId('diff-metric-cell');
      expect(metricCell).toHaveClass('is-removed');
    });

    it('accepts unused isUiFindMatch prop without breaking', () => {
      render(<DiffNode {...baseProps} isUiFindMatch />);
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });

  describe('renderNode()', () => {
    const lenA = 3;
    const lenB = 7;
    const key = 'vertex-key';
    const vertex = {
      data: {
        a: new Array(lenA),
        b: new Array(lenB),
        operation,
        service,
      },
      key,
    };

    it('extracts values from vertex.data and passes them as props', () => {
      const node = renderNode(vertex);
      expect(node.props.a).toBe(lenA);
      expect(node.props.b).toBe(lenB);
      expect(node.props.operation).toBe(operation);
      expect(node.props.service).toBe(service);
    });
  });

  describe('getNodeEmphasisRenderer', () => {
    const matchKey = 'match-key';
    const nonMatchKey = 'no-match';
    const renderer = getNodeEmphasisRenderer(new Set([matchKey]));

    it('returns EmphasizedNode when key matches', () => {
      const lv = { height: 100, width: 200, vertex: { key: matchKey } };
      const result = renderer(lv);
      expect(result.type).toBe(EmphasizedNode);
      expect(result.props.height).toBe(100);
      expect(result.props.width).toBe(200);
    });

    it('returns null when key does not match', () => {
      const lv = { height: 100, width: 200, vertex: { key: nonMatchKey } };
      const result = renderer(lv);
      expect(result).toBeNull();
    });
  });
});
