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
    vertices,
    edges,
  };

  describe('constructor', () => {
    it('creates layout manager', () => {
      const graph = new Graph(props);
      expect(graph.layoutManager instanceof LayoutManager).toBe(true);
    });
  });

  describe('render', () => {
    it('renders provided edges and vertices', () => {
      const wrapper = shallow(<Graph {...props} />);
      const plexusGraph = wrapper.find(DirectedGraph);
      expect(plexusGraph.prop('edges')).toEqual(edges);
      expect(plexusGraph.prop('vertices')).toEqual(vertices);
      expect(wrapper).toMatchSnapshot();
    });
  });
});
