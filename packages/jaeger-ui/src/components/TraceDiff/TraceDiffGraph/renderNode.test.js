// Copyright (c) 2019 The Jaeger Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React from 'react';
import { render, cleanup } from '@testing-library/react';
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
      a: defaultCount,
      b: defaultCount,
      operation,
      service,
    };

    it('renders table when a and b are the same', () => {
      const { container } = render(<DiffNode {...baseProps} />);
      expect(container.querySelector('table')).toBeInTheDocument();
      expect(container.textContent).toContain(service);
      expect(container.textContent).toContain(operation);
    });

    it('renders correctly when a < b', () => {
      const { container } = render(<DiffNode {...baseProps} a={defaultCount / 2} />);
      expect(container.querySelector('.is-more')).toBeInTheDocument();
      expect(container.textContent).toContain('+');
    });

    it('renders correctly when a > b', () => {
      const { container } = render(<DiffNode {...baseProps} a={defaultCount * 2} />);
      expect(container.querySelector('.is-less')).toBeInTheDocument();
      expect(container.textContent).toContain('-');
    });

    it('renders correctly when a is 0', () => {
      const { container } = render(<DiffNode {...baseProps} a={0} />);
      expect(container.querySelector('.is-added')).toBeInTheDocument();
      expect(container.textContent).toContain('100');
    });

    it('renders correctly when b is 0', () => {
      const { container } = render(<DiffNode {...baseProps} b={0} />);
      expect(container.querySelector('.is-removed')).toBeInTheDocument();
      expect(container.textContent).toContain('100');
    });

    it('accepts unused isUiFindMatch prop without breaking', () => {
      const { container } = render(<DiffNode {...baseProps} isUiFindMatch />);
      expect(container.querySelector('table')).toBeInTheDocument();
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
