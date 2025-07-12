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
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import _set from 'lodash/set';

import { DeepDependencyGraphPageImpl, mapDispatchToProps, mapStateToProps } from '.';
import * as track from './index.track';
import * as url from './url';
import * as getSearchUrl from '../SearchTracePage/url';
import { fetchedState } from '../../constants';
import getStateEntryKey from '../../model/ddg/getStateEntryKey';
import * as GraphModel from '../../model/ddg/GraphModel';
import * as codec from '../../model/ddg/visibility-codec';
import * as getConfig from '../../utils/config/get-config';

import { ECheckedStatus, EDirection, EDdgDensity, EViewModifier } from '../../model/ddg/types';

jest.mock('./Graph', () => {
  return function MockGraph(props) {
    return <div data-testid="graph" {...props} />;
  };
});

jest.mock('./Header', () => {
  return function MockHeader(props) {
    return <div data-testid="header" {...props} />;
  };
});

jest.mock('./SidePanel', () => {
  return function MockSidePanel(props) {
    return <div data-testid="side-panel" {...props} />;
  };
});

jest.mock('../common/ErrorMessage', () => {
  return function MockErrorMessage(props) {
    return <div data-testid="error-message" error={JSON.stringify(props.error)} />;
  };
});

jest.mock('../common/LoadingIndicator', () => {
  return function MockLoadingIndicator(props) {
    return <div data-testid="loading-indicator" {...props} />;
  };
});

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
        getDerivedViewModifiers: () => ({ edges: new Map(), vertices: new Map() }),
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
        new DeepDependencyGraphPageImpl({ ...props, services: [] });
        expect(props.fetchServices).not.toHaveBeenCalled();
        new DeepDependencyGraphPageImpl(props);
        expect(props.fetchServices).toHaveBeenCalledTimes(1);
      });

      it('fetches operations if service is provided without operations', () => {
        const { service, ...urlState } = props.urlState;
        new DeepDependencyGraphPageImpl({ ...props, urlState });
        expect(props.fetchServiceServerOps).not.toHaveBeenCalled();
        new DeepDependencyGraphPageImpl({ ...props, serverOpsForService: { [service]: [] } });
        expect(props.fetchServiceServerOps).not.toHaveBeenCalled();
        new DeepDependencyGraphPageImpl(props);
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

          const { graphState: _, ...graphStatelessProps } = props;
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
      const selectedVertex = { key: 'test vertex' };

      it('calls setState with the selected vertex', () => {
        const ddgInstance = new DeepDependencyGraphPageImpl({ ...props, graphState: undefined });
        const setStateSpy = jest.spyOn(ddgInstance, 'setState');
        ddgInstance.selectVertex(selectedVertex);
        expect(setStateSpy).toHaveBeenCalledWith({ selectedVertex });
      });

      it('calls setState to clear the selected vertex', () => {
        const ddgInstance = new DeepDependencyGraphPageImpl({ ...props, graphState: undefined });
        const setStateSpy = jest.spyOn(ddgInstance, 'setState');
        ddgInstance.selectVertex();
        expect(setStateSpy).toHaveBeenCalledWith({ selectedVertex: undefined });
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
        render(<DeepDependencyGraphPageImpl {...props} graphState={undefined} />);
        expect(screen.getByText('Enter query above')).toBeInTheDocument();
      });

      it('renders LoadingIndicator when loading', () => {
        render(<DeepDependencyGraphPageImpl {...props} graphState={{ state: fetchedState.LOADING }} />);
        expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
      });

      it('renders ErrorMessage when erred', () => {
        const error = 'Some API error';
        render(<DeepDependencyGraphPageImpl {...props} graphState={{ error, state: fetchedState.ERROR }} />);
        const errorComponent = screen.getByTestId('error-message');
        expect(errorComponent).toBeInTheDocument();
        expect(errorComponent).toHaveAttribute('error', JSON.stringify(error));
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

        beforeAll(() => {
          getConfigValueSpy = jest.spyOn(getConfig, 'getConfigValue');
          getSearchUrlSpy = jest.spyOn(getSearchUrl, 'getUrl');
        });

        beforeEach(() => {
          getConfigValueSpy.mockClear();
          getSearchUrlSpy.mockClear();
        });

        it('renders graph if there are multiple vertices visible', () => {
          render(<DeepDependencyGraphPageImpl {...props} graph={graph} />);
          expect(screen.getByTestId('graph')).toBeInTheDocument();
        });

        it('renders disclaimer to show more hops if one or fewer vertices are visible and more hops were in paylaod', () => {
          const expectedHeader = 'There is nothing visible to show';
          const expectedInstruction = 'Select at least one hop to view';

          const { rerender } = render(<DeepDependencyGraphPageImpl {...props} graph={graph} />);
          expect(screen.getByTestId('graph')).toBeInTheDocument();

          rerender(<DeepDependencyGraphPageImpl {...props} graph={graph} {...makeGraphState(1)} />);
          expect(screen.queryByTestId('graph')).not.toBeInTheDocument();
          expect(screen.getByText(expectedHeader)).toBeInTheDocument();
          expect(screen.getByText(expectedInstruction)).toBeInTheDocument();

          rerender(<DeepDependencyGraphPageImpl {...props} graph={graph} {...makeGraphState(-1, 0)} />);
          expect(screen.queryByTestId('graph')).not.toBeInTheDocument();
          expect(screen.getByText(expectedHeader)).toBeInTheDocument();
          expect(screen.getByText(expectedInstruction)).toBeInTheDocument();
        });

        it('renders disclaimer that service has no known dependencies with correct link to verify', () => {
          const expectedHeader = 'There are no dependencies';
          const { operation, service } = props.urlState;
          const lookback = 'test look back';
          getConfigValueSpy.mockReturnValue(lookback);
          const mockUrl = 'test search url';
          getSearchUrlSpy.mockReturnValue(mockUrl);

          const { rerender } = render(<DeepDependencyGraphPageImpl {...props} graph={graph} />);
          expect(screen.getByTestId('graph')).toBeInTheDocument();

          rerender(<DeepDependencyGraphPageImpl {...props} graph={graph} {...makeGraphState()} />);
          expect(screen.queryByTestId('graph')).not.toBeInTheDocument();
          expect(screen.getByText(expectedHeader)).toBeInTheDocument();
          expect(
            screen.getByText(content => {
              return (
                content.includes('No traces were found that contain') &&
                content.includes('testService:testOperation') &&
                content.includes('span.kind is') &&
                content.includes('server')
              );
            })
          ).toBeInTheDocument();
          expect(screen.getByRole('link', { name: 'Confirm by searching' })).toHaveAttribute('href', mockUrl);
          expect(getSearchUrlSpy).toHaveBeenLastCalledWith({
            lookback,
            minDuration: '0ms',
            operation,
            service,
            tags: '{"span.kind":"server"}',
          });

          rerender(
            <DeepDependencyGraphPageImpl
              {...props}
              graph={graph}
              urlState={urlStateWithoutOp}
              {...makeGraphState()}
            />
          );
          expect(screen.queryByTestId('graph')).not.toBeInTheDocument();
          expect(screen.getByText(expectedHeader)).toBeInTheDocument();
          expect(
            screen.getByText(content => {
              return (
                content.includes('No traces were found that contain') &&
                content.includes('testService') &&
                !content.includes(':') &&
                content.includes('span.kind is') &&
                content.includes('server')
              );
            })
          ).toBeInTheDocument();
          expect(screen.getByRole('link', { name: 'Confirm by searching' })).toHaveAttribute('href', mockUrl);
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
        render(<DeepDependencyGraphPageImpl {...props} graphState={{ state }} />);
        expect(screen.getByText(/Unknown graphState/)).toBeInTheDocument();
        expect(screen.getByText(new RegExp(state))).toBeInTheDocument();
      });

      it('renders indication of unknown state when done but no graph is provided', () => {
        render(<DeepDependencyGraphPageImpl {...propsWithoutGraph} />);
        expect(screen.queryByTestId('graph')).not.toBeInTheDocument();
        expect(screen.getByText(/Unknown graphState/)).toBeInTheDocument();
      });

      it('calculates uiFindCount and hiddenUiFindMatches', () => {
        const TestComponent = ({ uiFind, graph: testGraph }) => {
          const testProps = { ...propsWithoutGraph, uiFind, graph: testGraph };
          return <DeepDependencyGraphPageImpl {...testProps} />;
        };

        const { rerender } = render(<TestComponent uiFind="truthy uiFind" graph={undefined} />);
        expect(screen.getByTestId('header')).toBeInTheDocument();

        rerender(<TestComponent uiFind="truthy uiFind" graph={graph} />);
        expect(screen.getByTestId('header')).toBeInTheDocument();
      });

      it('passes correct operations to Header', () => {
        const TestComponent = ({ serverOpsForService, urlState }) => {
          const testProps = { ...props, graph, serverOpsForService, urlState };
          return <DeepDependencyGraphPageImpl {...testProps} />;
        };

        const { rerender } = render(
          <TestComponent serverOpsForService={undefined} urlState={props.urlState} />
        );
        expect(screen.getByTestId('header')).toBeInTheDocument();

        const serverOpsForService = {
          [props.urlState.service]: ['testOperation0', 'testOperation1'],
        };
        rerender(<TestComponent serverOpsForService={serverOpsForService} urlState={props.urlState} />);
        expect(screen.getByTestId('header')).toBeInTheDocument();

        const { service: _, ...urlStateWithoutService } = props.urlState;
        rerender(
          <TestComponent serverOpsForService={serverOpsForService} urlState={urlStateWithoutService} />
        );
        expect(screen.getByTestId('header')).toBeInTheDocument();
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
