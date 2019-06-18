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

import DdgEVManager from '../../model/ddg/DdgEVManager';

describe('<Graph />', () => {
  const replaceMock = jest.fn();
  const otherParam = 'testOtherParam';
  const otherValue = 'testOtherValue';
  const props = {
    ddgModel: {
      visIdxToPathElem: new Array(10)
        .fill()
        .map((_empty, i) => ({ visibilityIdx: i, distance: Math.ceil(i / 3) })),
    },
    history: {
      replace: replaceMock,
    },
    location: {
      search: `?${otherParam}=${otherValue}`,
    },
    visKey: 'testVisKey',
  };
  const { visKey: _unused, ...propsWithoutVisKey } = props;

  describe('constructor', () => {
    it('creates new managers', () => {
      const graph = new Graph(props);
      expect(graph.ddgEVManager instanceof DdgEVManager).toBe(true);
      expect(graph.layoutManager instanceof LayoutManager).toBe(true);
    });

    it('adds visibilityKey to url if not given visKey', () => {
      new Graph(propsWithoutVisKey); // eslint-disable-line no-new
      expect(replaceMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: `${props.location.search}&visibilityKey=3j` })
      );
    });
  });

  describe('render', () => {
    it('renders stand in message when not given visKey', () => {
      const message = shallow(<Graph {...propsWithoutVisKey} />).find('h1');
      expect(message).toHaveLength(1);
      expect(message.text()).toBe('Calculating Initial Graph');
    });

    it('provides edges and vertices from ddgEVManager to plexus', () => {
      const edges = ['test edges array'];
      const vertices = ['test vertices array'];
      const wrapper = shallow(<Graph {...propsWithoutVisKey} />);
      const getEVSpy = jest
        .spyOn(wrapper.instance().ddgEVManager, 'getEdgesAndVertices')
        .mockImplementation(() => ({ edges, vertices }));

      wrapper.setProps(props);
      const plexusGraph = wrapper.find(DirectedGraph);

      expect(getEVSpy).toHaveBeenLastCalledWith(props.visKey);
      expect(plexusGraph.prop('edges')).toBe(edges);
      expect(plexusGraph.prop('vertices')).toBe(vertices);
    });
  });
});
