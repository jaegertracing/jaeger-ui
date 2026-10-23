// Copyright (c) 2026 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { render } from '@testing-library/react';
import { zoomIdentity } from 'd3-zoom';

import SvgEdge from './SvgEdge';
import { TLayoutEdge } from '../types';
import { TRendererUtils } from './types';

// Keep in sync with SELF_LOOP_LABEL_X_OFFSET in SvgEdge.tsx
const SELF_LOOP_LABEL_X_OFFSET = 35;

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

  it('shifts the label right by SELF_LOOP_LABEL_X_OFFSET for a self-referencing edge', () => {
    const label = '42';
    const normal = renderEdge(makeLayoutEdge('a', 'b'), label);
    const selfLoop = renderEdge(makeLayoutEdge('a', 'a'), label);

    const normalText = normal.container.querySelector('text')!;
    const selfLoopText = selfLoop.container.querySelector('text')!;

    expect(Number(selfLoopText.getAttribute('x'))).toBe(
      Number(normalText.getAttribute('x')) + SELF_LOOP_LABEL_X_OFFSET
    );
    expect(selfLoopText.getAttribute('y')).toBe(normalText.getAttribute('y'));
  });

  it('does not treat an edge without edge data as a self-loop', () => {
    const label = '7';
    const layoutEdge = { pathPoints } as unknown as TLayoutEdge<{}>;
    const { container } = renderEdge(layoutEdge, label);
    const text = container.querySelector('text')!;
    expect(Number(text.getAttribute('x'))).toBe(30 - label.length * 5);
  });
});
