// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { render } from '@testing-library/react';
import { zoomIdentity } from 'd3-zoom';

import SvgEdge, { SELF_LOOP_LABEL_X_OFFSET } from './SvgEdge';
import { TLayoutEdge } from '../types';
import { TRendererUtils } from './types';

type TMarkerProps = {
  markerEndId?: string;
  markerStartId?: string;
};

describe('SvgEdge', () => {
  const pathPoints: [number, number][] = [
    [10, 20],
    [30, 40],
    [50, 60],
  ];

  const renderUtils: TRendererUtils = {
    getGlobalId: (id: string) => `global-${id}`,
    getZoomTransform: () => zoomIdentity,
  };

  const getClassName = (name: string) => `plexus-${name}`;

  const makeLayoutEdge = (from: string, to: string): TLayoutEdge<{}> => ({
    edge: { from, to },
    pathPoints,
  });

  const renderEdge = (layoutEdge: TLayoutEdge<{}>, label?: string, markerProps: TMarkerProps = {}) =>
    render(
      <svg>
        <SvgEdge
          getClassName={getClassName}
          layoutEdge={layoutEdge}
          renderUtils={renderUtils}
          label={label}
          {...markerProps}
        />
      </svg>
    );

  it('renders the path with the class name and no label when label is omitted', () => {
    const { container } = renderEdge(makeLayoutEdge('a', 'b'));
    const path = container.querySelector('path');
    expect(path).not.toBeNull();
    expect(path!.getAttribute('class')).toBe('plexus-SvgEdge');
    expect(path!.getAttribute('d')).toBe('M 10 20 C 30 40 50 60');
    expect(container.querySelector('text')).toBeNull();
  });

  it('resolves marker ids through renderUtils.getGlobalId', () => {
    const { container } = renderEdge(makeLayoutEdge('a', 'b'), undefined, {
      markerEndId: 'arrow-end',
      markerStartId: 'arrow-start',
    });
    const path = container.querySelector('path')!;
    expect(path.getAttribute('marker-end')).toBe('url(#global-arrow-end)');
    expect(path.getAttribute('marker-start')).toBe('url(#global-arrow-start)');
  });

  it('places the label at the midpoint of the path for a normal edge', () => {
    const label = '42';
    const { container } = renderEdge(makeLayoutEdge('a', 'b'), label);
    const text = container.querySelector('text')!;
    // midpoint of [10,20] and [50,60] is [30,40]; x is shifted left by 5px per label character
    const expectedX = 30 - label.length * 5;
    expect(text.textContent).toBe(label);
    expect(Number(text.getAttribute('x'))).toBe(expectedX);
    expect(Number(text.getAttribute('y'))).toBe(40);
  });

  it('places the label at midpoint + SELF_LOOP_LABEL_X_OFFSET for a self-referencing edge regardless of count length', () => {
    const expectedX = 30 + SELF_LOOP_LABEL_X_OFFSET;
    const expectedY = 40;

    const shortCount = renderEdge(makeLayoutEdge('a', 'a'), '5');
    const shortText = shortCount.container.querySelector('text')!;
    expect(Number(shortText.getAttribute('x'))).toBe(expectedX);
    expect(Number(shortText.getAttribute('y'))).toBe(expectedY);

    const longCount = renderEdge(makeLayoutEdge('a', 'a'), '1234567890');
    const longText = longCount.container.querySelector('text')!;
    expect(Number(longText.getAttribute('x'))).toBe(expectedX);
    expect(Number(longText.getAttribute('y'))).toBe(expectedY);

    expect(shortText.getAttribute('x')).toBe(longText.getAttribute('x'));
  });

  it('does not treat an edge without edge data as a self-loop', () => {
    const label = '7';
    const layoutEdge = { pathPoints } as unknown as TLayoutEdge<{}>;
    const { container } = renderEdge(layoutEdge, label);
    const text = container.querySelector('text')!;
    expect(Number(text.getAttribute('x'))).toBe(30 - label.length * 5);
  });
});
