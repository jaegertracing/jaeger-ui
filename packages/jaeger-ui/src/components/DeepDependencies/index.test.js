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
import _set from 'lodash/set';

import { DeepDependencyGraphPageImpl, mapDispatchToProps, mapStateToProps } from '.';
import * as track from './index.track';
import * as url from './url';
import Graph from './Graph';
import Header from './Header';
import ErrorMessage from '../common/ErrorMessage';
import LoadingIndicator from '../common/LoadingIndicator';
import * as getSearchUrl from '../SearchTracePage/url';
import { fetchedState } from '../../constants';
import getStateEntryKey from '../../model/ddg/getStateEntryKey';
import * as GraphModel from '../../model/ddg/GraphModel';
import * as codec from '../../model/ddg/visibility-codec';
import * as getConfig from '../../utils/config/get-config';

import { ECheckedStatus, EDirection, EDdgDensity, EViewModifier } from '../../model/ddg/types';

describe('DeepDependencyGraphPage', () => {
  describe('DeepDependencyGraphPageImpl', () => {
    const vertexKey = 'test vertex key';
    const propsWithoutGraph = {
      addViewModifier: jest.fn(),
      fetchDeepDependencyGraph: () => {},
      fetchServices: jest.fn(),
      fetchServiceServerOps: jest.fn(),
      graphState: {
        model: {
          distanceToPathElems: new Map(),
        },
        state: fetchedState.DONE,
        viewModifiers: new Map(),
      },
      history: {
        push: jest.fn(),
      },
      serverOpsForService: {},
      removeViewModifierFromIndices: jest.fn(),
      urlState: {
        start: 'testStart',
        end: 'testEnd',
        service: 'testService',
        operation: 'testOperation',
        visEncoding: 'testVisKey',
      },
    };
    const props = {
      ...propsWithoutGraph,
      graph: {
        getVisible: () => ({
          edges: [],
          vertices: [],
        }),
        getHiddenUiFindMatches: () => new Set(),
        getGenerationVisibility: jest.fn(),
        getVertexVisiblePathElems: jest.fn(),
        getVisibleUiFindMatches: () => new Set(),
        getVisWithVertices: jest.fn(),
        getVisWithoutVertex: jest.fn(),
        getVisWithUpdatedGeneration: jest.fn(),
      },
    };
    const { operation: _o, ...urlStateWithoutOp } = props.urlState;
    const ddgPageImpl = new DeepDependencyGraphPageImpl(props);
    const ddgWithoutGraph = new DeepDependencyGraphPageImpl(propsWithoutGraph);
    const setIdx = visibilityIdx => ({ visibilityIdx });

    describe('constructor', () => {
      beforeEach(() => {
        props.fetchServices.mockReset();
        props.fetchServiceServerOps.mockReset();
      });

      it('fetches services if services are not provided', () => {
        new DeepDependencyGraphPageImpl({ ...props, services: [] }); // eslint-disable-line no-new
        expect(props.fetchServices).not.toHaveBeenCalled();
        new DeepDependencyGraphPageImpl(props); // eslint-disable-line no-new
        expect(props.fetchServices).toHaveBeenCalledTimes(1);
      });

      it('fetches operations if service is provided without operations', () => {
        const { service, ...urlState } = props.urlState;
        new DeepDependencyGraphPageImpl({ ...props, urlState }); // eslint-disable-line no-new
        expect(props.fetchServiceServerOps).not.toHaveBeenCalled();
        new DeepDependencyGraphPageImpl({ ...props, serverOpsForService: { [service]: [] } }); // eslint-disable-line no-new
        expect(props.fetchServiceServerOps).not.toHaveBeenCalled();
        new DeepDependencyGraphPageImpl(props); // eslint-disable-line no-new
        expect(props.fetchServiceServerOps).toHaveBeenLastCalledWith(service);
        expect(props.fetchServiceServerOps).toHaveBeenCalledTimes(1);
      });
    });

    describe('updateUrlState', () => {
      const visEncoding = 'test vis encoding';
      let getUrlSpy;
      let trackHideSpy;

      beforeAll(() => {
        getUrlSpy = jest.spyOn(url, 'getUrl');
        trackHideSpy = jest.spyOn(track, 'trackHide');
      });

      beforeEach(() => {
        getUrlSpy.mockReset();
        props.history.push.mockReset();
        trackHideSpy.mockClear();
      });

      it('updates provided value', () => {
        ['service', 'operation', 'start', 'end', 'visEncoding'].forEach((propName, i) => {
          const value = `new ${propName}`;
          const kwarg = { [propName]: value };
          ddgPageImpl.updateUrlState(kwarg);
          expect(getUrlSpy).toHaveBeenLastCalledWith(Object.assign({}, props.urlState, kwarg), undefined);
          expect(props.history.push).toHaveBeenCalledTimes(i + 1);
        });
      });

      it('updates multiple values', () => {
        const kwarg = {
          end: 'new end',
          start: 'new start',
        };
        ddgPageImpl.updateUrlState(kwarg);
        expect(getUrlSpy).toHaveBeenLastCalledWith(Object.assign({}, props.urlState, kwarg), undefined);
        expect(props.history.push).toHaveBeenCalledTimes(1);
      });

      it('leaves unspecified, previously-undefined values as undefined', () => {
        const { start: _s, end: _e, ...otherUrlState } = props.urlState;
        const otherProps = {
          ...props,
          urlState: otherUrlState,
        };
        const kwarg = {
          end: 'new end',
        };
        const ddgPageWithFewerProps = new DeepDependencyGraphPageImpl(otherProps);
        ddgPageWithFewerProps.updateUrlState(kwarg);
        expect(getUrlSpy).toHaveBeenLastCalledWith(Object.assign({}, otherUrlState, kwarg), undefined);
        expect(getUrlSpy).not.toHaveBeenLastCalledWith(expect.objectContaining({ start: expect.anything() }));
        expect(props.history.push).toHaveBeenCalledTimes(1);
      });

      it('includes props.graphState.model.hash iff it is truthy', () => {
        ddgPageImpl.updateUrlState({});
        expect(getUrlSpy).toHaveBeenLastCalledWith(
          expect.not.objectContaining({ hash: expect.anything() }),
          undefined
        );

        const hash = 'testHash';
        const propsWithHash = {
          ...props,
          graphState: {
            ...props.graphState,
            model: {
              ...props.graphState.model,
              hash,
            },
          },
        };
        const ddgPageWithHash = new DeepDependencyGraphPageImpl(propsWithHash);
        ddgPageWithHash.updateUrlState({});
        expect(getUrlSpy).toHaveBeenLastCalledWith(expect.objectContaining({ hash }), undefined);
      });

      describe('clearOperation', () => {
        let trackClearOperationSpy;

        beforeAll(() => {
          trackClearOperationSpy = jest.spyOn(track, 'trackClearOperation');
        });

        it('removes op from urlState', () => {
          ddgPageImpl.clearOperation();
          expect(getUrlSpy).toHaveBeenLastCalledWith(urlStateWithoutOp, undefined);
          expect(trackClearOperationSpy).toHaveBeenCalledTimes(1);
        });
      });

      describe('focusPathsThroughVertex', () => {
        let trackFocusPathsSpy;

        beforeAll(() => {
          trackFocusPathsSpy = jest.spyOn(track, 'trackFocusPaths');
        });

        beforeEach(() => {
          trackFocusPathsSpy.mockClear();
        });

        it('no-ops if props does not have graph', () => {
          ddgWithoutGraph.focusPathsThroughVertex(vertexKey);

          expect(getUrlSpy).not.toHaveBeenCalled();
          expect(trackFocusPathsSpy).not.toHaveBeenCalled();
        });

        it('updates url state and tracks focus paths', () => {
          const indices = [4, 8, 15, 16, 23, 42];
          const elems = [
            {
              memberOf: {
                members: indices.slice(0, indices.length / 2).map(setIdx),
              },
            },
            {
              memberOf: {
                members: indices.slice(indices.length / 2).map(setIdx),
              },
            },
          ];
          props.graph.getVertexVisiblePathElems.mockReturnValueOnce(elems);
          ddgPageImpl.focusPathsThroughVertex(vertexKey);

          expect(getUrlSpy).toHaveBeenLastCalledWith(
            Object.assign({}, props.urlState, { visEncoding: codec.encode(indices) }),
            undefined
          );
          expect(trackFocusPathsSpy).toHaveBeenCalledTimes(1);
        });
      });

      describe('hideVertex', () => {
        it('no-ops if props does not have graph', () => {
          ddgWithoutGraph.hideVertex(vertexKey);

          expect(getUrlSpy).not.toHaveBeenCalled();
          expect(trackHideSpy).not.toHaveBeenCalled();
        });

        it('no-ops if graph.getVisWithoutVertex returns undefined', () => {
          ddgPageImpl.hideVertex(vertexKey);

          expect(getUrlSpy).not.toHaveBeenCalled();
          expect(trackHideSpy).not.toHaveBeenCalled();
        });

        it('updates url state and tracks hide', () => {
          props.graph.getVisWithoutVertex.mockReturnValueOnce(visEncoding);
          ddgPageImpl.hideVertex(vertexKey);

          expect(props.graph.getVisWithoutVertex).toHaveBeenLastCalledWith(
            vertexKey,
            props.urlState.visEncoding
          );
          expect(getUrlSpy).toHaveBeenLastCalledWith(
            Object.assign({}, props.urlState, { visEncoding }),
            undefined
          );
          expect(trackHideSpy).toHaveBeenCalledTimes(1);
          expect(trackHideSpy.mock.calls[0]).toHaveLength(0);
        });
      });

      describe('setDecoration', () => {
        it('updates url with provided density', () => {
          const decoration = 'decoration-id';
          ddgPageImpl.setDecoration(decoration);
          expect(getUrlSpy).toHaveBeenLastCalledWith(
            Object.assign({}, props.urlState, { decoration }),
            undefined
          );
        });

        it('clears density from url', () => {
          const decoration = undefined;
          ddgPageImpl.setDecoration(decoration);
          expect(getUrlSpy).toHaveBeenLastCalledWith(
            Object.assign({}, props.urlState, { decoration }),
            undefined
          );
        });
      });

      describe('setDensity', () => {
        it('updates url with provided density', () => {
          const density = EDdgDensity.PreventPathEntanglement;
          ddgPageImpl.setDensity(density);
          expect(getUrlSpy).toHaveBeenLastCalledWith(
            Object.assign({}, props.urlState, { density }),
            undefined
          );
        });
      });

      describe('setDistance', () => {
        let encodeDistanceSpy;

        beforeAll(() => {
          encodeDistanceSpy = jest.spyOn(codec, 'encodeDistance').mockImplementation(() => visEncoding);
        });

        it('updates url with result of encodeDistance iff graph is loaded', () => {
          const direction = EDirection.Upstream;
          const distance = -3;
          const prevVisEncoding = props.urlState.visEncoding;

          const { graphState: e, ...graphStatelessProps } = props;
          const graphStateless = new DeepDependencyGraphPageImpl(graphStatelessProps);
          graphStateless.setDistance(distance, direction);
          expect(encodeDistanceSpy).not.toHaveBeenCalled();
          expect(getUrlSpy).not.toHaveBeenCalled();
          expect(props.history.push).not.toHaveBeenCalled();

          const graphStateLoading = new DeepDependencyGraphPageImpl({
            ...graphStatelessProps,
            graphState: { state: fetchedState.LOADING },
          });
          graphStateLoading.setDistance(distance, direction);
          expect(encodeDistanceSpy).not.toHaveBeenCalled();
          expect(getUrlSpy).not.toHaveBeenCalled();
          expect(props.history.push).not.toHaveBeenCalled();

          ddgPageImpl.setDistance(distance, direction);
          expect(encodeDistanceSpy).toHaveBeenLastCalledWith({
            ddgModel: props.graphState.model,
            direction,
            distance,
            prevVisEncoding,
          });
          expect(getUrlSpy).toHaveBeenLastCalledWith(
            Object.assign({}, props.urlState, { visEncoding }),
            undefined
          );
          expect(props.history.push).toHaveBeenCalledTimes(1);
        });
      });

      describe('setOperation', () => {
        it('updates operation and clears visEncoding', () => {
          const operation = 'newOperation';
          ddgPageImpl.setOperation(operation);
          expect(getUrlSpy).toHaveBeenLastCalledWith(
            Object.assign({}, props.urlState, { operation, visEncoding: undefined }),
            undefined
          );
          expect(props.history.push).toHaveBeenCalledTimes(1);
        });
      });

      describe('setService', () => {
        const service = 'newService';
        let trackSetServiceSpy;

        beforeAll(() => {
          trackSetServiceSpy = jest.spyOn(track, 'trackSetService');
        });

        beforeEach(() => {
          props.fetchServiceServerOps.mockReset();
          trackSetServiceSpy.mockClear();
        });

        it('updates service and clears operation and visEncoding', () => {
          ddgPageImpl.setService(service);
          expect(getUrlSpy).toHaveBeenLastCalledWith(
            Object.assign({}, props.urlState, { operation: undefined, service, visEncoding: undefined }),
            undefined
          );
          expect(props.history.push).toHaveBeenCalledTimes(1);
          expect(trackSetServiceSpy).toHaveBeenCalledTimes(1);
        });

        it('fetches operations for service when not yet provided', () => {
          ddgPageImpl.setService(service);
          expect(props.fetchServiceServerOps).toHaveBeenLastCalledWith(service);
          expect(props.fetchServiceServerOps).toHaveBeenCalledTimes(1);
          expect(trackSetServiceSpy).toHaveBeenCalledTimes(1);

          const pageWithOpForService = new DeepDependencyGraphPageImpl({
            ...props,
            serverOpsForService: { [service]: [props.urlState.operation] },
          });
          const { length: callCount } = props.fetchServiceServerOps.mock.calls;
          pageWithOpForService.setService(service);
          expect(props.fetchServiceServerOps).toHaveBeenCalledTimes(callCount);
          expect(trackSetServiceSpy).toHaveBeenCalledTimes(2);
        });
      });

      describe('showVertices', () => {
        const vertices = ['vertex0', 'vertex1'];

        beforeAll(() => {
          props.graph.getVisWithVertices.mockReturnValue(visEncoding);
        });

        it('updates url with visEncoding calculated by graph', () => {
          ddgPageImpl.showVertices(vertices);
          expect(props.graph.getVisWithVertices).toHaveBeenLastCalledWith(
            vertices,
            props.urlState.visEncoding
          );
          expect(getUrlSpy).toHaveBeenLastCalledWith(
            Object.assign({}, props.urlState, { visEncoding }),
            undefined
          );
        });

        it('no-ops if not given graph', () => {
          const { length: callCount } = getUrlSpy.mock.calls;
          ddgWithoutGraph.showVertices(vertices);
          expect(getUrlSpy.mock.calls.length).toBe(callCount);
        });
      });

      describe('toggleShowOperations', () => {
        it('updates url with provided boolean', () => {
          let showOp = true;
          ddgPageImpl.toggleShowOperations(showOp);
          expect(getUrlSpy).toHaveBeenLastCalledWith(
            Object.assign({}, props.urlState, { showOp }),
            undefined
          );

          showOp = false;
          ddgPageImpl.toggleShowOperations(showOp);
          expect(getUrlSpy).toHaveBeenLastCalledWith(
            Object.assign({}, props.urlState, { showOp }),
            undefined
          );
        });
      });

      describe('updateGenerationVisibility', () => {
        const direction = EDirection.Upstream;
        let trackShowSpy;

        beforeAll(() => {
          trackShowSpy = jest.spyOn(track, 'trackShow');
        });

        beforeEach(() => {
          trackShowSpy.mockClear();
        });

        it('no-ops if props does not have graph', () => {
          ddgWithoutGraph.updateGenerationVisibility(vertexKey, direction);

          expect(getUrlSpy).not.toHaveBeenCalled();
          expect(trackHideSpy).not.toHaveBeenCalled();
          expect(trackShowSpy).not.toHaveBeenCalled();
        });

        it('no-ops if graph.getVisWithUpdatedGeneration returns undefined', () => {
          ddgPageImpl.updateGenerationVisibility(vertexKey, direction);

          expect(getUrlSpy).not.toHaveBeenCalled();
          expect(trackHideSpy).not.toHaveBeenCalled();
          expect(trackShowSpy).not.toHaveBeenCalled();
        });

        it('updates url state and tracks hide if result.status is ECheckedStatus.Empty', () => {
          props.graph.getVisWithUpdatedGeneration.mockReturnValueOnce({
            visEncoding,
            update: ECheckedStatus.Empty,
          });
          ddgPageImpl.updateGenerationVisibility(vertexKey, direction);

          expect(props.graph.getVisWithUpdatedGeneration).toHaveBeenLastCalledWith(
            vertexKey,
            direction,
            props.urlState.visEncoding
          );
          expect(getUrlSpy).toHaveBeenLastCalledWith(
            Object.assign({}, props.urlState, { visEncoding }),
            undefined
          );
          expect(trackHideSpy).toHaveBeenCalledTimes(1);
          expect(trackHideSpy).toHaveBeenCalledWith(direction);
          expect(trackShowSpy).not.toHaveBeenCalled();
        });

        it('updates url state and tracks show if result.status is ECheckedStatus.Full', () => {
          props.graph.getVisWithUpdatedGeneration.mockReturnValueOnce({
            visEncoding,
            update: ECheckedStatus.Full,
          });
          ddgPageImpl.updateGenerationVisibility(vertexKey, direction);

          expect(props.graph.getVisWithUpdatedGeneration).toHaveBeenLastCalledWith(
            vertexKey,
            direction,
            props.urlState.visEncoding
          );
          expect(getUrlSpy).toHaveBeenLastCalledWith(
            Object.assign({}, props.urlState, { visEncoding }),
            undefined
          );
          expect(trackHideSpy).not.toHaveBeenCalled();
          expect(trackShowSpy).toHaveBeenCalledTimes(1);
          expect(trackShowSpy).toHaveBeenCalledWith(direction);
        });
      });
    });

    describe('select vertex', () => {
      let wrapper;
      const selectedVertex = { key: 'test vertex' };

      beforeEach(() => {
        wrapper = shallow(<DeepDependencyGraphPageImpl {...props} graphState={undefined} />);
      });

      it('selects a vertex', () => {
        expect(wrapper.state('selectedVertex')).toBeUndefined();
        wrapper.instance().selectVertex(selectedVertex);
        expect(wrapper.state('selectedVertex')).toEqual(selectedVertex);
      });

      it('clears a vertex', () => {
        wrapper.setState({ selectedVertex });
        expect(wrapper.state('selectedVertex')).toEqual(selectedVertex);
        wrapper.instance().selectVertex();
        expect(wrapper.state('selectedVertex')).toBeUndefined();
      });
    });

    describe('view modifiers', () => {
      const visibilityIndices = ['visId0', 'visId1', 'visId2'];
      const targetVM = EViewModifier.Emphasized;

      beforeEach(() => {
        props.addViewModifier.mockReset();
        props.graph.getVertexVisiblePathElems.mockClear();
        props.removeViewModifierFromIndices.mockReset();
      });

      it('adds given viewModifier to specified pathElems', () => {
        ddgPageImpl.setViewModifier(visibilityIndices, targetVM, true);
        expect(props.addViewModifier).toHaveBeenLastCalledWith({
          operation: props.urlState.operation,
          service: props.urlState.service,
          viewModifier: targetVM,
          visibilityIndices,
          end: 0,
          start: 0,
        });
      });

      it('removes given viewModifier from specified pathElems', () => {
        ddgPageImpl.setViewModifier(visibilityIndices, targetVM, false);
        expect(props.removeViewModifierFromIndices).toHaveBeenCalledWith({
          operation: props.urlState.operation,
          service: props.urlState.service,
          viewModifier: targetVM,
          visibilityIndices,
          end: 0,
          start: 0,
        });
      });

      it('no-ops if not given dispatch fn or graph or service', () => {
        const { addViewModifier: _add, ...propsWithoutAdd } = props;
        const ddgWithoutAdd = new DeepDependencyGraphPageImpl(propsWithoutAdd);
        ddgWithoutAdd.setViewModifier(vertexKey, EViewModifier.emphasized, true);

        const { removeViewModifierFromIndices: _remove, ...propsWithoutRemove } = props;
        const ddgWithoutRemove = new DeepDependencyGraphPageImpl(propsWithoutRemove);
        ddgWithoutRemove.setViewModifier(vertexKey, EViewModifier.emphasized, false);
        expect(props.removeViewModifierFromIndices).not.toHaveBeenCalled();

        ddgWithoutGraph.setViewModifier(vertexKey, EViewModifier.emphasized, true);
        expect(props.removeViewModifierFromIndices).not.toHaveBeenCalled();

        const {
          urlState: { service: _service, ...urlStateWithoutService },
          ...propsWithoutService
        } = props;
        propsWithoutService.urlState = urlStateWithoutService;
        const ddgWithoutService = new DeepDependencyGraphPageImpl(propsWithoutGraph);
        ddgWithoutService.setViewModifier(vertexKey, EViewModifier.emphasized, true);
        expect(props.removeViewModifierFromIndices).not.toHaveBeenCalled();
      });
    });

    describe('getGenerationVisibility', () => {
      const direction = EDirection.Upstream;
      const mockCheckedStatus = 'mock check status';

      beforeAll(() => {
        props.graph.getGenerationVisibility.mockReturnValue(mockCheckedStatus);
      });

      beforeEach(() => {
        props.graph.getGenerationVisibility.mockClear();
      });

      it('returns specified ECheckedStatus', () => {
        expect(ddgPageImpl.getGenerationVisibility(vertexKey, direction)).toBe(mockCheckedStatus);
        expect(props.graph.getGenerationVisibility).toHaveBeenLastCalledWith(
          vertexKey,
          direction,
          props.urlState.visEncoding
        );
      });

      it('returns null if props does not have graph', () => {
        expect(ddgWithoutGraph.getGenerationVisibility(vertexKey, direction)).toBe(null);
      });
    });

    describe('getVisiblePathElems', () => {
      const mockVisibleElems = 'mock visible elems';

      beforeAll(() => {
        props.graph.getVertexVisiblePathElems.mockReturnValue(mockVisibleElems);
      });

      it('returns visible pathElems', () => {
        expect(ddgPageImpl.getVisiblePathElems(vertexKey)).toBe(mockVisibleElems);
        expect(props.graph.getVertexVisiblePathElems).toHaveBeenLastCalledWith(
          vertexKey,
          props.urlState.visEncoding
        );
      });

      it('returns undefined if props does not have graph', () => {
        expect(ddgWithoutGraph.getVisiblePathElems(vertexKey)).toBe(undefined);
      });
    });

    describe('render', () => {
      const vertices = [{ key: 'key0' }, { key: 'key1' }, { key: 'key2' }];
      const visibleFindCount = vertices.length - 1;
      const graph = {
        getVisible: jest.fn(),
        getDerivedViewModifiers: () => ({ edges: new Map(), vertices: new Map() }),
        getHiddenUiFindMatches: () => new Set(vertices.slice(visibleFindCount)),
        getVisibleUiFindMatches: () => new Set(vertices.slice(0, visibleFindCount)),
        getVisibleIndices: () => new Set(),
      };
      graph.getVisible.mockReturnValue({
        edges: [
          {
            from: vertices[0].key,
            to: vertices[1].key,
          },
          {
            from: vertices[1].key,
            to: vertices[2].key,
          },
        ],
        vertices,
      });

      it('renders message to query a ddg when no graphState is provided', () => {
        const message = shallow(<DeepDependencyGraphPageImpl {...props} graphState={undefined} />)
          .find('h1')
          .last();
        expect(message.text()).toBe('Enter query above');
      });

      it('renders LoadingIndicator when loading', () => {
        const wrapper = shallow(
          <DeepDependencyGraphPageImpl {...props} graphState={{ state: fetchedState.LOADING }} />
        );
        expect(wrapper.find(LoadingIndicator)).toHaveLength(1);
      });

      it('renders ErrorMessage when erred', () => {
        const error = 'Some API error';
        const errorComponent = shallow(
          <DeepDependencyGraphPageImpl {...props} graphState={{ error, state: fetchedState.ERROR }} />
        ).find(ErrorMessage);
        expect(errorComponent).toHaveLength(1);
        expect(errorComponent.prop('error')).toBe(error);
      });

      describe('graphState.state === fetchedState.DONE', () => {
        function makeGraphState(specifiedDistance, vertexCount = 1) {
          graph.getVisible.mockReturnValueOnce({
            edges: [],
            vertices: vertices.slice(vertices.length - vertexCount),
          });
          return {
            graphState: {
              ...props.graphState,
              model: {
                ...props.graphState.model,
                distanceToPathElems: specifiedDistance
                  ? new Map([[specifiedDistance, 'test elem']])
                  : new Map(),
              },
            },
          };
        }
        let getConfigValueSpy;
        let getSearchUrlSpy;
        let wrapper;

        beforeAll(() => {
          getConfigValueSpy = jest.spyOn(getConfig, 'getConfigValue');
          getSearchUrlSpy = jest.spyOn(getSearchUrl, 'getUrl');
        });

        beforeEach(() => {
          getConfigValueSpy.mockClear();
          getSearchUrlSpy.mockClear();
          wrapper = shallow(<DeepDependencyGraphPageImpl {...props} graph={graph} />);
        });

        it('renders graph if there are multiple vertices visible', () => {
          const graphComponent = wrapper.find(Graph);

          expect(graphComponent).toHaveLength(1);
          expect(graphComponent.prop('vertices')).toBe(vertices);
        });

        it('renders disclaimer to show more hops if one or fewer vertices are visible and more hops were in paylaod', () => {
          const expectedHeader = 'There is nothing visible to show';
          const expectedInstruction = 'Select at least one hop to view';
          expect(wrapper.find(Graph)).toHaveLength(1);

          wrapper.setProps(makeGraphState(1));
          expect(wrapper.find(Graph)).toHaveLength(0);
          expect(wrapper.find('h1.Ddg--center').text()).toBe(expectedHeader);
          expect(wrapper.find('p.Ddg--center').text()).toBe(expectedInstruction);

          wrapper.setProps(makeGraphState(-1, 0));
          expect(wrapper.find(Graph)).toHaveLength(0);
          expect(wrapper.find('h1.Ddg--center').text()).toBe(expectedHeader);
          expect(wrapper.find('p.Ddg--center').text()).toBe(expectedInstruction);
        });

        it('renders disclaimer that service has no known dependencies with correct link to verify', () => {
          const expectedHeader = 'There are no dependencies';
          const { operation, service } = props.urlState;
          const expectedInstruction = (withOp = true) =>
            `No traces were found that contain ${service}${
              withOp ? `:${operation}` : ''
            } and any other service where span.kind is ‘server’.`;
          const lookback = 'test look back';
          getConfigValueSpy.mockReturnValue(lookback);
          const mockUrl = 'test search url';
          getSearchUrlSpy.mockReturnValue(mockUrl);

          expect(wrapper.find(Graph)).toHaveLength(1);

          wrapper.setProps(makeGraphState());
          expect(wrapper.find(Graph)).toHaveLength(0);
          expect(wrapper.find('h1.Ddg--center').text()).toBe(expectedHeader);
          expect(
            wrapper
              .find('p.Ddg--center')
              .first()
              .text()
          ).toBe(expectedInstruction());
          expect(wrapper.find('a').prop('href')).toBe(mockUrl);
          expect(getSearchUrlSpy).toHaveBeenLastCalledWith({
            lookback,
            minDuration: '0ms',
            operation,
            service,
            tags: '{"span.kind":"server"}',
          });

          wrapper.setProps({ urlState: urlStateWithoutOp, ...makeGraphState() });
          expect(wrapper.find(Graph)).toHaveLength(0);
          expect(wrapper.find('h1.Ddg--center').text()).toBe(expectedHeader);
          expect(
            wrapper
              .find('p.Ddg--center')
              .first()
              .text()
          ).toBe(expectedInstruction(false));
          expect(wrapper.find('a').prop('href')).toBe(mockUrl);
          expect(getSearchUrlSpy).toHaveBeenLastCalledWith({
            lookback,
            minDuration: '0ms',
            service,
            tags: '{"span.kind":"server"}',
          });
        });
      });

      it('renders indication of unknown graphState', () => {
        const state = 'invalid state';
        const unknownIndication = shallow(<DeepDependencyGraphPageImpl {...props} graphState={{ state }} />)
          .find('div')
          .find('div')
          .last()
          .text();
        expect(unknownIndication).toMatch(new RegExp(state));
        expect(unknownIndication).toMatch(/Unknown graphState/);
      });

      it('renders indication of unknown state when done but no graph is provided', () => {
        const wrapper = shallow(<DeepDependencyGraphPageImpl {...propsWithoutGraph} />);
        const unknownIndication = wrapper
          .find('div')
          .find('div')
          .last()
          .text();
        expect(wrapper.find(Graph)).toHaveLength(0);
        expect(unknownIndication).toMatch(/Unknown graphState/);
      });

      it('calculates uiFindCount and hiddenUiFindMatches', () => {
        const wrapper = shallow(
          <DeepDependencyGraphPageImpl {...propsWithoutGraph} uiFind="truthy uiFind" />
        );
        expect(wrapper.find(Header).prop('uiFindCount')).toBe(undefined);
        expect(wrapper.find(Header).prop('hiddenUiFindMatches')).toBe(undefined);

        wrapper.setProps({ graph });
        expect(wrapper.find(Header).prop('uiFindCount')).toBe(visibleFindCount);
        expect(wrapper.find(Header).prop('hiddenUiFindMatches').size).toBe(
          vertices.length - visibleFindCount
        );
      });

      it('passes correct operations to Header', () => {
        const wrapper = shallow(
          <DeepDependencyGraphPageImpl {...props} graph={graph} serverOpsForService={undefined} />
        );
        expect(wrapper.find(Header).prop('operations')).toBe(undefined);

        const serverOpsForService = {
          [props.urlState.service]: ['testOperation0', 'testOperation1'],
        };
        wrapper.setProps({ serverOpsForService });
        expect(wrapper.find(Header).prop('operations')).toBe(serverOpsForService[props.urlState.service]);

        const { service: _, ...urlStateWithoutService } = props.urlState;
        wrapper.setProps({ urlState: urlStateWithoutService });
        expect(wrapper.find(Header).prop('operations')).toBe(undefined);
      });
    });
  });

  describe('mapDispatchToProps()', () => {
    it('creates the actions correctly', () => {
      expect(mapDispatchToProps(() => {})).toEqual({
        addViewModifier: expect.any(Function),
        fetchDeepDependencyGraph: expect.any(Function),
        fetchServices: expect.any(Function),
        fetchServiceServerOps: expect.any(Function),
        removeViewModifierFromIndices: expect.any(Function),
      });
    });
  });

  describe('mapStateToProps()', () => {
    const start = 'testStart';
    const end = 'testEnd';
    const service = 'testService';
    const operation = 'testOperation';
    const search = '?someParam=someValue';
    const expected = {
      urlState: {
        start,
        end,
        service,
        operation,
      },
    };
    const services = [service];
    const serverOpsForService = {
      [service]: ['some operation'],
    };
    const state = {
      otherState: 'otherState',
      router: {
        location: {
          search: 'search',
        },
      },
      services: {
        serverOpsForService,
        otherState: 'otherState',
        services,
      },
    };
    const ownProps = { location: { search } };
    const mockGraph = { getVisible: () => ({}) };
    const hash = 'testHash';
    const doneState = _set(
      { ...state },
      ['ddg', getStateEntryKey({ service, operation, start: 0, end: 0 })],
      {
        model: { hash },
        state: fetchedState.DONE,
      }
    );
    let getUrlStateSpy;
    let makeGraphSpy;
    let sanitizeUrlStateSpy;

    beforeAll(() => {
      getUrlStateSpy = jest.spyOn(url, 'getUrlState');
      sanitizeUrlStateSpy = jest.spyOn(url, 'sanitizeUrlState');
      makeGraphSpy = jest.spyOn(GraphModel, 'makeGraph').mockReturnValue(mockGraph);
    });

    beforeEach(() => {
      getUrlStateSpy.mockClear();
      getUrlStateSpy.mockReturnValue(expected.urlState);
      makeGraphSpy.mockClear();
    });

    it('uses gets relevant params from location.search', () => {
      const result = mapStateToProps(state, ownProps);
      expect(result).toEqual(expect.objectContaining(expected));
      expect(getUrlStateSpy).toHaveBeenLastCalledWith(search);
    });

    it('calculates showOp off of urlState', () => {
      [true, false, undefined].forEach(showOp => {
        ['focalOperation', undefined].forEach(focalOp => {
          const urlState = {
            ...expected.urlState,
            operation: focalOp,
            showOp,
          };
          getUrlStateSpy.mockReturnValue(urlState);
          const result = mapStateToProps(state, ownProps);
          expect(result.showOp).toBe(showOp === undefined ? focalOp !== undefined : showOp);
        });
      });
    });

    it('includes graphState iff location.search has service, start, end, and optionally operation', () => {
      const graphState = 'testGraphState';
      const graphStateWithoutOp = 'testGraphStateWithoutOp';
      const reduxState = { ...state };
      // TODO: Remove 0s once time buckets are implemented
      _set(reduxState, ['ddg', getStateEntryKey({ service, operation, start: 0, end: 0 })], graphState);
      _set(reduxState, ['ddg', getStateEntryKey({ service, start: 0, end: 0 })], graphStateWithoutOp);

      const result = mapStateToProps(reduxState, ownProps);
      expect(result.graphState).toEqual(graphState);

      const { operation: _op, ...rest } = expected.urlState;
      getUrlStateSpy.mockReturnValue(rest);
      const resultWithoutOp = mapStateToProps(reduxState, ownProps);
      expect(resultWithoutOp.graphState).toEqual(graphStateWithoutOp);

      getUrlStateSpy.mockReturnValue({});
      const resultWithoutParams = mapStateToProps(reduxState, ownProps);
      expect(resultWithoutParams.graphState).toBeUndefined();
    });

    it('includes graph iff graphState.state is fetchedState.DONE', () => {
      const loadingState = { state: fetchedState.LOADING };
      const reduxState = { ...state };
      // TODO: Remove 0s once time buckets are implemented
      _set(reduxState, ['ddg', getStateEntryKey({ service, operation, start: 0, end: 0 })], loadingState);
      const result = mapStateToProps(reduxState, ownProps);
      expect(result.graph).toBe(undefined);

      const doneResult = mapStateToProps(doneState, ownProps);
      expect(doneResult.graph).toBe(mockGraph);
    });

    it('includes services and serverOpsForService', () => {
      expect(mapStateToProps(state, ownProps)).toEqual(
        expect.objectContaining({ serverOpsForService, services })
      );
    });

    it('sanitizes urlState', () => {
      mapStateToProps(doneState, ownProps);
      expect(sanitizeUrlStateSpy).toHaveBeenLastCalledWith(expected.urlState, hash);
    });
  });
});
