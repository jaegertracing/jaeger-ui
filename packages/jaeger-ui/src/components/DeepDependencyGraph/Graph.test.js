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
import { shallow } from 'enzyme';
import { DirectedGraph, LayoutManager } from '@jaegertracing/plexus';

import Graph from './Graph';

import GraphModel from '../../model/ddg/Graph';

describe('<Graph />', () => {
  const props = {
    ddgModel: {
      distanceToPathElems: new Map(),
      visIdxToPathElem: [],
    },
    visKey: 'test',
  };

  describe('constructor', () => {
    it('creates new managers', () => {
      const graph = new Graph(props);
      expect(graph.graphModel instanceof GraphModel).toBe(true);
      expect(graph.layoutManager instanceof LayoutManager).toBe(true);
    });
  });

  describe('render', () => {
    it('provides edges and vertices from ddgEVManager to plexus', () => {
      const wrapper = shallow(<Graph {...props} />);
      const plexusGraph = wrapper.find(DirectedGraph);

      expect(plexusGraph.prop('edges')).toEqual([]); // TODO .toBe(edges);
      expect(plexusGraph.prop('vertices')).toEqual([]); // TODO .toBe(vertices);
    });
  });
});
