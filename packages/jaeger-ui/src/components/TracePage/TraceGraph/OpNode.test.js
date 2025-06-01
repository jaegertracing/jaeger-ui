// Copyright (c) 2018 The Jaeger Authors.
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
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

import OpNode, {
  getNodeRenderer,
  getNodeFindEmphasisRenderer,
  renderNodeVectorBorder,
  MODE_SERVICE,
  MODE_TIME,
  MODE_SELFTIME,
} from './OpNode';
import EmphasizedNode from '../../common/EmphasizedNode';

const baseProps = {
  count: 5,
  errors: 0,
  isUiFindMatch: false,
  operation: 'op1',
  percent: 7.89,
  percentSelfTime: 90,
  selfTime: 180000,
  service: 'service1',
  time: 200000,
};

afterEach(cleanup);

describe('<OpNode>', () => {
  it('renders correctly in MODE_SERVICE', () => {
    const { container } = render(<OpNode {...baseProps} mode={MODE_SERVICE} />);
    expect(container.querySelector('.OpNode--mode-service')).toBeInTheDocument();
    expect(container).toHaveTextContent('5 / 0');
    expect(container).toHaveTextContent('200 ms (7.89 %)');
    expect(container).toHaveTextContent('40 ms');
    expect(container).toHaveTextContent('180 ms (90 %)');
    expect(container).toHaveTextContent('op1');
    expect(container).toHaveTextContent('service1');
  });

  it('renders correctly in MODE_TIME', () => {
    const { container } = render(<OpNode {...baseProps} mode={MODE_TIME} />);
    expect(container.querySelector('.OpNode--mode-time')).toBeInTheDocument();
    expect(container).toHaveTextContent('5 / 0');
    expect(container).toHaveTextContent('200 ms (7.89 %)');
    expect(container).toHaveTextContent('40 ms');
    expect(container).toHaveTextContent('180 ms (90 %)');
    expect(container).toHaveTextContent('op1');
    expect(container).toHaveTextContent('service1');
  });

  it('renders correctly in MODE_SELFTIME', () => {
    const { container } = render(<OpNode {...baseProps} mode={MODE_SELFTIME} />);
    expect(container.querySelector('.OpNode--mode-selftime')).toBeInTheDocument();
    expect(container).toHaveTextContent('5 / 0');
    expect(container).toHaveTextContent('200 ms (7.89 %)');
    expect(container).toHaveTextContent('40 ms');
    expect(container).toHaveTextContent('180 ms (90 %)');
    expect(container).toHaveTextContent('op1');
    expect(container).toHaveTextContent('service1');
  });

  it('renders a copy icon with correct props', () => {
    const { container } = render(<OpNode {...baseProps} mode={MODE_SERVICE} />);
    const icon = container.querySelector('.OpNode--copyIcon');
    expect(icon).toBeInTheDocument();
  });
});

describe('getNodeRenderer()', () => {
  it('creates OpNode with passed mode', () => {
    const vertex = {
      data: { ...baseProps },
      key: 'key1',
    };
    const drawNode = getNodeRenderer(MODE_SERVICE);
    const element = drawNode(vertex);
    expect(element.type).toBe(OpNode);
    expect(element.props.mode).toBe(MODE_SERVICE);
  });
});

describe('getNodeFindEmphasisRenderer()', () => {
  const key = 'highlight-key';
  const lv = { height: 100, width: 200, vertex: { key } };

  it('returns EmphasizedNode when key matches', () => {
    const renderer = getNodeFindEmphasisRenderer(new Set([key]));
    const result = renderer(lv);
    expect(result).toBeDefined();
    expect(result.type).toBe(EmphasizedNode);
    expect(result.props.height).toBe(100);
    expect(result.props.width).toBe(200);
  });

  it('returns null when key does not match', () => {
    const renderer = getNodeFindEmphasisRenderer(new Set(['other-key']));
    const result = renderer(lv);
    expect(result).toBeNull();
  });

  it('returns null when key set is null or undefined', () => {
    expect(getNodeFindEmphasisRenderer(null)(lv)).toBeNull();
    expect(getNodeFindEmphasisRenderer(undefined)(lv)).toBeNull();
  });
});

describe('renderNodeVectorBorder()', () => {
  it('returns rect element with correct dimensions', () => {
    const lv = { width: 150, height: 75 };
    const result = renderNodeVectorBorder(lv);
    expect(result.type).toBe('rect');
    expect(result.props.width).toBe(150);
    expect(result.props.height).toBe(75);
    expect(result.props.className).toBe('OpNode--vectorBorder');
  });
});
