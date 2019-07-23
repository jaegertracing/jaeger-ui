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
import { focalPayloadElem, simplePath, wrap } from '../../model/ddg/sample-paths.test.resources';
import transformDdgData from '../../model/ddg/transformDdgData';
import GraphModel from '../../model/ddg/Graph';

describe('<Graph />', () => {
  const ddgModel = transformDdgData([simplePath].map(wrap), focalPayloadElem);
  const props = {
    ddgModel,
    visEncoding: '3',
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
      const { edges: expectedEdges, vertices: expectedVertices } = new GraphModel({ ddgModel }).getVisible(
        '3'
      );

      expect(plexusGraph.prop('edges')).toEqual(expectedEdges);
      expect(plexusGraph.prop('vertices')).toEqual(expectedVertices);
    });
  });
});
