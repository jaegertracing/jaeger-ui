// Copyright (c) 2019 Uber Technologies, Inc.
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

import * as React from 'react';
import { render, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Digraph, LayoutManager } from '@jaegertracing/plexus';

import Graph, { setOnEdgesContainer, setOnVectorBorderContainerWithViewModifiers } from './index';
import { EViewModifier } from '../../../model/ddg/types';

jest.mock('@jaegertracing/plexus', () => ({
  Digraph: Object.assign(
    jest.fn(() => <div data-testid="digraph" />),
    {
      propsFactories: {
        scaleStrokeOpacityStrongest: { className: 'mock-scale-stroke-opacity' },
      },
    }
  ),
  LayoutManager: jest.fn().mockImplementation(() => ({
    stopAndRelease: jest.fn(),
  })),
}));

jest.mock('./DdgNodeContent', () => ({
  getNodeRenderer: jest.fn(() => jest.fn()),
  measureNode: jest.fn(),
}));

jest.mock('./getNodeRenderers', () =>
  jest.fn(() => ({
    vectorFindColorBand: jest.fn(),
    htmlEmphasis: jest.fn(),
    vectorBorder: jest.fn(),
  }))
);

jest.mock('./getSetOnEdge', () => jest.fn(() => jest.fn()));

describe('<Graph />', () => {
  const vertices = [...new Array(10)].map((_, i) => ({ key: `key${i}` }));
  const edges = [
    {
      from: vertices[0].key,
      to: vertices[1].key,
    },
    {
      from: vertices[1].key,
      to: vertices[2].key,
    },
  ];

  const props = {
    edges,
    edgesViewModifiers: new Map(),
    vertices,
    verticesViewModifiers: new Map(),
  };

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('creates layout manager', () => {
      render(<Graph {...props} />);
      expect(LayoutManager).toHaveBeenCalledWith({
        nodesep: 0.55,
        ranksep: 1.5,
        rankdir: 'TB',
        shape: 'circle',
        splines: 'polyline',
        useDotEdges: true,
      });
    });
  });

  describe('render', () => {
    let digraphProps;

    beforeEach(() => {
      render(<Graph {...props} />);
      digraphProps = Digraph.mock.calls[0][0];
    });

    it('renders provided edges and vertices', () => {
      expect(digraphProps.edges).toEqual(edges);
      expect(digraphProps.vertices).toEqual(vertices);
    });

    it('de-emphasizes non-matching edges iff edgeVMs are present', () => {
      expect(digraphProps.layers[3].setOnContainer).toBe(setOnEdgesContainer.withoutViewModifiers);

      cleanup();
      jest.clearAllMocks();

      render(<Graph {...props} edgesViewModifiers={new Map([[0, EViewModifier.Emphasized]])} />);
      const updatedDigraphProps = Digraph.mock.calls[0][0];
      expect(updatedDigraphProps.layers[3].setOnContainer).toBe(setOnEdgesContainer.withViewModifiers);
    });

    it('de-emphasizes non-matching vertices iff vertexVMs are present', () => {
      expect(digraphProps.layers[2].setOnContainer).toBe(Digraph.propsFactories.scaleStrokeOpacityStrongest);

      cleanup();
      jest.clearAllMocks();

      render(<Graph {...props} verticesViewModifiers={new Map([[0, EViewModifier.Emphasized]])} />);
      const updatedDigraphProps = Digraph.mock.calls[0][0];
      expect(updatedDigraphProps.layers[2].setOnContainer).toBe(setOnVectorBorderContainerWithViewModifiers);
    });
  });

  describe('clean up', () => {
    it('stops LayoutManager before unmounting', () => {
      const mockStopAndRelease = jest.fn();
      const mockLayoutManager = {
        stopAndRelease: mockStopAndRelease,
      };

      LayoutManager.mockImplementation(() => mockLayoutManager);

      const { unmount } = render(<Graph {...props} />);
      unmount();
      expect(mockStopAndRelease).toHaveBeenCalledTimes(1);
    });
  });
});
