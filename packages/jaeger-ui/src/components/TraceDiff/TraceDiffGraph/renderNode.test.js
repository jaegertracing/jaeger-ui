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
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import renderNode, { DiffNode } from './renderNode';

describe('drawNode', () => {
  const operation = 'operationName';
  const service = 'serviceName';

  describe('diffNode', () => {
    const defaultCount = 100;
    const props = {
      a: defaultCount,
      b: defaultCount,
      operation,
      service,
    };

    let rendered;
  beforeEach(() => {
    rendered = render(<DiffNode {...props} / data-testid="diffnode">));
  });

    it('renders as expected when props.a and props.b are the same', () => {
      expect(container).toMatchSnapshot();
    });

    it('renders as expected when props.a is less than props.b', () => {
      rendered = render({ a: defaultCount / 2 });
      expect(container).toMatchSnapshot();
    });

    it('renders as expected when props.a is more than props.b', () => {
      rendered = render({ a: defaultCount * 2 });
      expect(container).toMatchSnapshot();
    });

    it('renders as expected when props.a is 0', () => {
      rendered = render({ a: 0 });
      expect(container).toMatchSnapshot();
    });

    it('renders as expected when props.b is 0', () => {
      rendered = render({ b: 0 });
      expect(container).toMatchSnapshot();
    });

    it('renders as expected when props.isUiFindMatch is true', () => {
      rendered = render({ isUiFindMatch: true });
      expect(container).toMatchSnapshot();
    });
  });

  describe('renderNode()', () => {
    const lenA = 3;
    const lenB = 7;
    const key = 'vertex key';
    const vertex = {
      data: {
        a: new Array(lenA),
        b: new Array(lenB),
        operation,
        service,
      },
      key,
    };

    it('extracts values from vertex.data', () => {
      const node = renderNode(vertex);
      expect(node.props.a).toBe(lenA);
      expect(node.props.b).toBe(lenB);
      expect(node.props.operation).toBe(operation);
      expect(node.props.service).toBe(service);
    });
  });
});
