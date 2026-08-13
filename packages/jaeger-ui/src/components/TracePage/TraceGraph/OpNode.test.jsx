// Copyright (c) 2018 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, cleanup } from '@testing-library/react';
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

  // The service color must stay a token reference rather than resolved numbers:
  // OpNode is memoized on props that do not include the theme, so a resolved
  // value would survive a theme switch as the previous theme's color.
  it('backs MODE_SERVICE with color-mix over the palette token', () => {
    const { container } = render(<OpNode {...baseProps} mode={MODE_SERVICE} />);
    const body = container.querySelector('.OpNode--body');
    expect(body.getAttribute('style')).toMatch(
      /^background:\s*color-mix\(in srgb, var\(--span-color-\d+\) 80%, transparent\);?$/
    );
  });

  it('keeps the theme-independent red for MODE_TIME and MODE_SELFTIME', () => {
    const time = render(<OpNode {...baseProps} mode={MODE_TIME} />);
    expect(time.container.querySelector('.OpNode--body').getAttribute('style')).toContain('rgba(255, 0, 0,');
    cleanup();
    const self = render(<OpNode {...baseProps} mode={MODE_SELFTIME} />);
    expect(self.container.querySelector('.OpNode--body').getAttribute('style')).toContain('rgba(255, 0, 0,');
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
