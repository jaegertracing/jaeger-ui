// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import SvgEdges from './SvgEdges';

// mock SvgEdge 子組件，這樣測試才不會受到子組件的影響
jest.mock('./SvgEdge', () => {
  const MockSvgEdge = props => (
    <g data-testid="svg-edge" data-from={props.layoutEdge.edge.from} data-to={props.layoutEdge.edge.to} />
  );
  return MockSvgEdge;
});

describe('SvgEdges', () => {
  // 準備測試用的 mock 資料
  const mockGetClassName = name => `plexus--${name}`;

  const mockRenderUtils = {
    getGlobalId: id => `global-${id}`,
    getZoomTransform: () => ({ k: 1, x: 0, y: 0 }),
  };

  // 建立幾條測試用的 edge
  const createMockEdge = (from, to) => ({
    edge: { from, to },
    pathPoints: [
      [0, 0],
      [100, 100],
    ],
  });

  const mockLayoutEdges = [createMockEdge('node-a', 'node-b'), createMockEdge('node-b', 'node-c')];

  // 包一個 svg 容器，因為 SvgEdge 會渲染 SVG 元素
  const renderInSvg = edges => {
    return render(
      <svg>
        <SvgEdges getClassName={mockGetClassName} layoutEdges={edges} renderUtils={mockRenderUtils} />
      </svg>
    );
  };

  it('renders SvgEdge for each layout edge', () => {
    const { getAllByTestId } = renderInSvg(mockLayoutEdges);
    const edges = getAllByTestId('svg-edge');
    expect(edges).toHaveLength(2);
  });

  it('renders nothing when layoutEdges is empty', () => {
    const { queryAllByTestId } = renderInSvg([]);
    const edges = queryAllByTestId('svg-edge');
    expect(edges).toHaveLength(0);
  });

  it('passes from and to correctly to SvgEdge', () => {
    const { getAllByTestId } = renderInSvg(mockLayoutEdges);
    const edges = getAllByTestId('svg-edge');

    // 檢查第一條 edge
    expect(edges[0]).toHaveAttribute('data-from', 'node-a');
    expect(edges[0]).toHaveAttribute('data-to', 'node-b');

    // 檢查第二條
    expect(edges[1]).toHaveAttribute('data-from', 'node-b');
    expect(edges[1]).toHaveAttribute('data-to', 'node-c');
  });

  it('handles optional marker props', () => {
    // 這個測試確認有 marker 的情況也能正常 render
    const { getAllByTestId } = render(
      <svg>
        <SvgEdges
          getClassName={mockGetClassName}
          layoutEdges={mockLayoutEdges}
          renderUtils={mockRenderUtils}
          markerEndId="arrow-end"
          markerStartId="arrow-start"
        />
      </svg>
    );
    // 只要不 crash 就算過
    expect(getAllByTestId('svg-edge')).toHaveLength(2);
  });
});
