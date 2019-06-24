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
  const replaceMock = jest.fn();
  const otherParam = 'testOtherParam';
  const otherValue = 'testOtherValue';
  const props = {
    ddgModel: {
      distanceToPathElems: new Map([
        [-2, [{ visibilityIdx: 8 }, { visibilityIdx: 9 }]],
        [-1, [{ visibilityIdx: 4 }, { visibilityIdx: 5 }]],
        [0, [{ visibilityIdx: 0 }, { visibilityIdx: 1 }]],
        [1, [{ visibilityIdx: 2 }, { visibilityIdx: 3 }]],
        [2, [{ visibilityIdx: 6 }, { visibilityIdx: 7 }]],
      ]),
      visIdxToPathElem: [],
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
      expect(graph.graphModel instanceof GraphModel).toBe(true);
      expect(graph.layoutManager instanceof LayoutManager).toBe(true);
    });

    it('adds visibilityKey to url if not given visKey', () => {
      new Graph(propsWithoutVisKey); // eslint-disable-line no-new
      expect(replaceMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: `${props.location.search}&visibilityKey=sf` })
      );
    });

    it('handles smaller than two-hop graph', () => {
      const slightlySmallerMap = new Map(props.ddgModel.distanceToPathElems);
      slightlySmallerMap.delete(-2);
      const slightlySmallerProps = {
        ...propsWithoutVisKey,
        ddgModel: {
          ...propsWithoutVisKey.ddgModel,
          distanceToPathElems: slightlySmallerMap,
        },
      };

      new Graph(slightlySmallerProps); // eslint-disable-line no-new
      expect(replaceMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: `${props.location.search}&visibilityKey=73` })
      );

      const noElemsProps = {
        ...propsWithoutVisKey,
        ddgModel: {
          ...propsWithoutVisKey.ddgModel,
          distanceToPathElems: new Map(),
        },
      };

      new Graph(noElemsProps); // eslint-disable-line no-new
      expect(replaceMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: `${props.location.search}&visibilityKey=` })
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
        .spyOn(wrapper.instance().graphModel, 'getVisible')
        .mockImplementation(() => ({ edges, vertices }));

      wrapper.setProps(props);
      const plexusGraph = wrapper.find(DirectedGraph);

      expect(getEVSpy).toHaveBeenLastCalledWith(props.visKey);
      expect(plexusGraph.prop('edges')).toBe(edges);
      expect(plexusGraph.prop('vertices')).toBe(vertices);
    });
  });
});
