// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import _set from 'lodash/set';

jest.mock('node-fetch', () =>
  jest.fn(() =>
    Promise.resolve({
      status: 200,
      ok: true,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
    })
  )
);

jest.mock('react-router-dom-v5-compat', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ search: '?service=test-service&operation=test-op' }),
  useParams: () => ({}),
}));

jest.mock('../../hooks/useTraceDiscovery', () => ({
  useServices: jest.fn(() => ({ data: ['svc1', 'svc2'], isLoading: false })),
  useSpanNames: jest.fn(() => ({
    data: [
      { name: 'op1', spanKind: 'server' },
      { name: 'op2', spanKind: 'server' },
    ],
  })),
}));

import { DeepDependencyGraphPageImpl, mapDispatchToProps, mapStateToProps } from '.';
import DefaultDeepDependencyGraphPage from '.';
import * as track from './index.track';
import * as url from './url';
import * as getSearchUrl from '../SearchTracePage/url';
import { fetchedState } from '../../constants';
import getStateEntryKey from '../../model/ddg/getStateEntryKey';
import * as GraphModel from '../../model/ddg/GraphModel';
import * as codec from '../../model/ddg/visibility-codec';
import * as getConfig from '../../utils/config/get-config';
import { useServices, useSpanNames } from '../../hooks/useTraceDiscovery';

import { ECheckedStatus, EDirection, EDdgDensity, EViewModifier } from '../../model/ddg/types';

// Capture callbacks passed to mocked child components so tests can invoke them.
let latestHeaderProps = {};
let latestGraphProps = {};
let latestSidePanelProps = {};

jest.mock('./Graph', () => {
  return function MockGraph(props) {
    latestGraphProps = props;
    return <div data-testid="graph" />;
  };
});

jest.mock('./Header', () => {
  return function MockHeader(props) {
    latestHeaderProps = props;
    return <div data-testid="header" />;
  };
});

jest.mock('./SidePanel', () => {
  return function MockSidePanel(props) {
    latestSidePanelProps = props;
    return <div data-testid="side-panel" />;
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
  beforeEach(() => {
    latestHeaderProps = {};
    latestGraphProps = {};
    latestSidePanelProps = {};
  });

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
      navigate: jest.fn(),
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
    const setIdx = visibilityIdx => ({ visibilityIdx });

    /**
     * Helper: render DeepDependencyGraphPageImpl with the given props and
     * return a function that retrieves the latest captured Header callback
     * by name. Call the returned getter *after* render so the mocks have run.
     */
    function renderAndGetCallbacks(renderProps) {
      render(<DeepDependencyGraphPageImpl {...renderProps} />);
      return {
        header: latestHeaderProps,
        graph: latestGraphProps,
        sidePanel: latestSidePanelProps,
      };
    }

    describe('updateUrlState (via clearOperation)', () => {
      let getUrlSpy;
      let trackHideSpy;

      beforeAll(() => {
        getUrlSpy = jest.spyOn(url, 'getUrl');
        trackHideSpy = jest.spyOn(track, 'trackHide');
      });

      beforeEach(() => {
        getUrlSpy.mockReset();
        props.navigate.mockReset();
        trackHideSpy.mockClear();
      });

      it('updates provided value (service, operation, visEncoding) via Header callbacks', () => {
        const { header } = renderAndGetCallbacks(props);

        // setService calls updateUrlState with { service }
        const newService = 'new service';
        header.setService(newService);
        expect(getUrlSpy).toHaveBeenLastCalledWith(
          Object.assign({}, props.urlState, {
            operation: undefined,
            service: newService,
            visEncoding: undefined,
          }),
          url.ROUTE_PATH
        );
        expect(props.navigate).toHaveBeenCalledTimes(1);
      });

      it('updates multiple values via setOperation', () => {
        const { header } = renderAndGetCallbacks(props);
        const operation = 'new operation';
        header.setOperation(operation);
        expect(getUrlSpy).toHaveBeenLastCalledWith(
          Object.assign({}, props.urlState, { operation, visEncoding: undefined }),
          url.ROUTE_PATH
        );
        expect(props.navigate).toHaveBeenCalledTimes(1);
      });

      it('includes props.graphState.model.hash iff it is truthy', () => {
        // Without hash
        renderAndGetCallbacks(props);
        latestHeaderProps.setDensity(EDdgDensity.PreventPathEntanglement);
        expect(getUrlSpy).toHaveBeenLastCalledWith(
          expect.not.objectContaining({ hash: expect.anything() }),
          url.ROUTE_PATH
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
        renderAndGetCallbacks(propsWithHash);
        latestHeaderProps.setDensity(EDdgDensity.PreventPathEntanglement);
        expect(getUrlSpy).toHaveBeenLastCalledWith(expect.objectContaining({ hash }), url.ROUTE_PATH);
      });

      describe('clearOperation', () => {
        let trackClearOperationSpy;

        beforeAll(() => {
          trackClearOperationSpy = jest.spyOn(track, 'trackClearOperation');
        });

        it('removes op from urlState', () => {
          const { header } = renderAndGetCallbacks(props);
          header.clearOperation();
          expect(getUrlSpy).toHaveBeenLastCalledWith(urlStateWithoutOp, url.ROUTE_PATH);
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
          props.graph.getVertexVisiblePathElems.mockClear();
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

          // Need a graph with >1 vertex to render the Graph component
          const graphWithVertices = {
            ...props.graph,
            getVisible: () => ({ edges: [], vertices: [{ key: 'v0' }, { key: 'v1' }] }),
          };
          renderAndGetCallbacks({ ...props, graph: graphWithVertices });
          latestGraphProps.focusPathsThroughVertex(vertexKey);

          expect(getUrlSpy).toHaveBeenLastCalledWith(
            Object.assign({}, props.urlState, { visEncoding: codec.encode(indices) }),
            url.ROUTE_PATH
          );
          expect(trackFocusPathsSpy).toHaveBeenCalledTimes(1);
        });
      });

      describe('hideVertex', () => {
        it('no-ops if graph.getVisWithoutVertex returns undefined', () => {
          const graphWithVertices = {
            ...props.graph,
            getVisible: () => ({ edges: [], vertices: [{ key: 'v0' }, { key: 'v1' }] }),
          };
          renderAndGetCallbacks({ ...props, graph: graphWithVertices });
          // getVisWithoutVertex returns undefined by default (no mockReturnValue)
          latestGraphProps.hideVertex(vertexKey);

          expect(getUrlSpy).not.toHaveBeenCalled();
          expect(trackHideSpy).not.toHaveBeenCalled();
        });

        it('updates url state and tracks hide', () => {
          const visEncoding = 'test vis encoding';
          const graphWithVertices = {
            ...props.graph,
            getVisible: () => ({ edges: [], vertices: [{ key: 'v0' }, { key: 'v1' }] }),
          };
          graphWithVertices.getVisWithoutVertex = jest.fn().mockReturnValueOnce(visEncoding);
          renderAndGetCallbacks({ ...props, graph: graphWithVertices });
          latestGraphProps.hideVertex(vertexKey);

          expect(graphWithVertices.getVisWithoutVertex).toHaveBeenLastCalledWith(
            vertexKey,
            props.urlState.visEncoding
          );
          expect(getUrlSpy).toHaveBeenLastCalledWith(
            Object.assign({}, props.urlState, { visEncoding }),
            url.ROUTE_PATH
          );
          expect(trackHideSpy).toHaveBeenCalledTimes(1);
          expect(trackHideSpy.mock.calls[0]).toHaveLength(0);
        });
      });

      describe('setDecoration', () => {
        it('updates url with provided decoration via SidePanel', () => {
          // SidePanel only renders when graph has >1 vertex
          const graphWithVertices = {
            ...props.graph,
            getVisible: () => ({ edges: [], vertices: [{ key: 'v0' }, { key: 'v1' }] }),
          };
          renderAndGetCallbacks({ ...props, graph: graphWithVertices });
          const decoration = 'decoration-id';
          latestSidePanelProps.selectDecoration(decoration);
          expect(getUrlSpy).toHaveBeenLastCalledWith(
            Object.assign({}, props.urlState, { decoration }),
            url.ROUTE_PATH
          );
        });

        it('clears decoration from url', () => {
          const graphWithVertices = {
            ...props.graph,
            getVisible: () => ({ edges: [], vertices: [{ key: 'v0' }, { key: 'v1' }] }),
          };
          renderAndGetCallbacks({ ...props, graph: graphWithVertices });
          latestSidePanelProps.selectDecoration(undefined);
          expect(getUrlSpy).toHaveBeenLastCalledWith(
            Object.assign({}, props.urlState, { decoration: undefined }),
            url.ROUTE_PATH
          );
        });
      });

      describe('setDensity', () => {
        it('updates url with provided density', () => {
          const density = EDdgDensity.PreventPathEntanglement;
          const { header } = renderAndGetCallbacks(props);
          header.setDensity(density);
          expect(getUrlSpy).toHaveBeenLastCalledWith(
            Object.assign({}, props.urlState, { density }),
            url.ROUTE_PATH
          );
        });
      });

      describe('setDistance', () => {
        let encodeDistanceSpy;

        beforeAll(() => {
          encodeDistanceSpy = jest
            .spyOn(codec, 'encodeDistance')
            .mockImplementation(() => 'test vis encoding');
        });

        it('updates url with result of encodeDistance iff graph is loaded', () => {
          const direction = EDirection.Upstream;
          const distance = -3;
          const prevVisEncoding = props.urlState.visEncoding;

          // Without graphState - should not call encodeDistance
          const { graphState: _, ...graphStatelessProps } = props;
          renderAndGetCallbacks(graphStatelessProps);
          latestHeaderProps.setDistance(distance, direction);
          expect(encodeDistanceSpy).not.toHaveBeenCalled();
          expect(getUrlSpy).not.toHaveBeenCalled();
          expect(props.navigate).not.toHaveBeenCalled();

          // With LOADING graphState - should not call
          renderAndGetCallbacks({
            ...graphStatelessProps,
            graphState: { state: fetchedState.LOADING },
          });
          latestHeaderProps.setDistance(distance, direction);
          expect(encodeDistanceSpy).not.toHaveBeenCalled();
          expect(getUrlSpy).not.toHaveBeenCalled();
          expect(props.navigate).not.toHaveBeenCalled();

          // With DONE graphState - should call
          renderAndGetCallbacks(props);
          latestHeaderProps.setDistance(distance, direction);
          expect(encodeDistanceSpy).toHaveBeenLastCalledWith({
            ddgModel: props.graphState.model,
            direction,
            distance,
            prevVisEncoding,
          });
          expect(props.navigate).toHaveBeenCalledTimes(1);
        });
      });

      describe('setOperation', () => {
        it('updates operation and clears visEncoding', () => {
          const operation = 'newOperation';
          const { header } = renderAndGetCallbacks(props);
          header.setOperation(operation);
          expect(getUrlSpy).toHaveBeenLastCalledWith(
            Object.assign({}, props.urlState, { operation, visEncoding: undefined }),
            url.ROUTE_PATH
          );
          expect(props.navigate).toHaveBeenCalledTimes(1);
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
          const { header } = renderAndGetCallbacks(props);
          header.setService(service);
          expect(getUrlSpy).toHaveBeenLastCalledWith(
            Object.assign({}, props.urlState, { operation: undefined, service, visEncoding: undefined }),
            url.ROUTE_PATH
          );
          expect(props.navigate).toHaveBeenCalledTimes(1);
          expect(trackSetServiceSpy).toHaveBeenCalledTimes(1);
        });
      });

      describe('showVertices', () => {
        const vertices = ['vertex0', 'vertex1'];
        const visEncoding = 'test vis encoding';

        it('updates url with visEncoding calculated by graph', () => {
          const graphWithVertices = {
            ...props.graph,
            getVisible: () => ({ edges: [], vertices: [{ key: 'v0' }, { key: 'v1' }] }),
            getVisWithVertices: jest.fn().mockReturnValue(visEncoding),
          };
          renderAndGetCallbacks({ ...props, graph: graphWithVertices });
          latestHeaderProps.showVertices(vertices);
          expect(graphWithVertices.getVisWithVertices).toHaveBeenLastCalledWith(
            vertices,
            props.urlState.visEncoding
          );
          expect(getUrlSpy).toHaveBeenLastCalledWith(
            Object.assign({}, props.urlState, { visEncoding }),
            url.ROUTE_PATH
          );
        });
      });

      describe('toggleShowOperations', () => {
        it('updates url with provided boolean', () => {
          const { header } = renderAndGetCallbacks(props);

          header.toggleShowOperations(true);
          expect(getUrlSpy).toHaveBeenLastCalledWith(
            Object.assign({}, props.urlState, { showOp: true }),
            url.ROUTE_PATH
          );

          header.toggleShowOperations(false);
          expect(getUrlSpy).toHaveBeenLastCalledWith(
            Object.assign({}, props.urlState, { showOp: false }),
            url.ROUTE_PATH
          );
        });
      });

      describe('updateGenerationVisibility', () => {
        const direction = EDirection.Upstream;
        const visEncoding = 'test vis encoding';
        let trackShowSpy;

        beforeAll(() => {
          trackShowSpy = jest.spyOn(track, 'trackShow');
        });

        beforeEach(() => {
          trackShowSpy.mockClear();
        });

        it('no-ops if graph.getVisWithUpdatedGeneration returns undefined', () => {
          const graphWithVertices = {
            ...props.graph,
            getVisible: () => ({ edges: [], vertices: [{ key: 'v0' }, { key: 'v1' }] }),
            getVisWithUpdatedGeneration: jest.fn(), // returns undefined by default
          };
          renderAndGetCallbacks({ ...props, graph: graphWithVertices });
          latestGraphProps.updateGenerationVisibility(vertexKey, direction);

          expect(getUrlSpy).not.toHaveBeenCalled();
          expect(trackHideSpy).not.toHaveBeenCalled();
          expect(trackShowSpy).not.toHaveBeenCalled();
        });

        it('updates url state and tracks hide if result.update is ECheckedStatus.Empty', () => {
          const graphWithVertices = {
            ...props.graph,
            getVisible: () => ({ edges: [], vertices: [{ key: 'v0' }, { key: 'v1' }] }),
            getVisWithUpdatedGeneration: jest.fn().mockReturnValueOnce({
              visEncoding,
              update: ECheckedStatus.Empty,
            }),
          };
          renderAndGetCallbacks({ ...props, graph: graphWithVertices });
          latestGraphProps.updateGenerationVisibility(vertexKey, direction);

          expect(graphWithVertices.getVisWithUpdatedGeneration).toHaveBeenLastCalledWith(
            vertexKey,
            direction,
            props.urlState.visEncoding
          );
          expect(getUrlSpy).toHaveBeenLastCalledWith(
            Object.assign({}, props.urlState, { visEncoding }),
            url.ROUTE_PATH
          );
          expect(trackHideSpy).toHaveBeenCalledTimes(1);
          expect(trackHideSpy).toHaveBeenCalledWith(direction);
          expect(trackShowSpy).not.toHaveBeenCalled();
        });

        it('updates url state and tracks show if result.update is ECheckedStatus.Full', () => {
          const graphWithVertices = {
            ...props.graph,
            getVisible: () => ({ edges: [], vertices: [{ key: 'v0' }, { key: 'v1' }] }),
            getVisWithUpdatedGeneration: jest.fn().mockReturnValueOnce({
              visEncoding,
              update: ECheckedStatus.Full,
            }),
          };
          renderAndGetCallbacks({ ...props, graph: graphWithVertices });
          latestGraphProps.updateGenerationVisibility(vertexKey, direction);

          expect(getUrlSpy).toHaveBeenLastCalledWith(
            Object.assign({}, props.urlState, { visEncoding }),
            url.ROUTE_PATH
          );
          expect(trackHideSpy).not.toHaveBeenCalled();
          expect(trackShowSpy).toHaveBeenCalledTimes(1);
          expect(trackShowSpy).toHaveBeenCalledWith(direction);
        });
      });
    });

    describe('select vertex', () => {
      it('sets selectedVertex when selectVertex is called', () => {
        const selectedVertex = { key: 'test vertex' };
        const graphWithVertices = {
          ...props.graph,
          getVisible: () => ({ edges: [], vertices: [{ key: 'v0' }, { key: 'v1' }] }),
        };
        render(
          <DeepDependencyGraphPageImpl {...props} graph={graphWithVertices} graphState={props.graphState} />
        );
        // Initially selectedVertex is undefined in SidePanel
        expect(latestSidePanelProps.selectedVertex).toBeUndefined();

        act(() => {
          latestGraphProps.selectVertex(selectedVertex);
        });
        // After selectVertex, SidePanel receives the selected vertex
        expect(latestSidePanelProps.selectedVertex).toEqual(selectedVertex);
      });

      it('clears selectedVertex when selectVertex is called with undefined', () => {
        const graphWithVertices = {
          ...props.graph,
          getVisible: () => ({ edges: [], vertices: [{ key: 'v0' }, { key: 'v1' }] }),
        };
        render(
          <DeepDependencyGraphPageImpl {...props} graph={graphWithVertices} graphState={props.graphState} />
        );
        act(() => {
          latestGraphProps.selectVertex(undefined);
        });
        expect(latestSidePanelProps.selectedVertex).toBeUndefined();
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
        const graphWithVertices = {
          ...props.graph,
          getVisible: () => ({ edges: [], vertices: [{ key: 'v0' }, { key: 'v1' }] }),
        };
        renderAndGetCallbacks({ ...props, graph: graphWithVertices });
        latestGraphProps.setViewModifier(visibilityIndices, targetVM, true);
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
        const graphWithVertices = {
          ...props.graph,
          getVisible: () => ({ edges: [], vertices: [{ key: 'v0' }, { key: 'v1' }] }),
        };
        renderAndGetCallbacks({ ...props, graph: graphWithVertices });
        latestGraphProps.setViewModifier(visibilityIndices, targetVM, false);
        expect(props.removeViewModifierFromIndices).toHaveBeenCalledWith({
          operation: props.urlState.operation,
          service: props.urlState.service,
          viewModifier: targetVM,
          visibilityIndices,
          end: 0,
          start: 0,
        });
      });
    });

    describe('getGenerationVisibility', () => {
      const direction = EDirection.Upstream;
      const mockCheckedStatus = 'mock check status';

      it('returns specified ECheckedStatus via Graph callback', () => {
        const graphWithVertices = {
          ...props.graph,
          getVisible: () => ({ edges: [], vertices: [{ key: 'v0' }, { key: 'v1' }] }),
          getGenerationVisibility: jest.fn().mockReturnValue(mockCheckedStatus),
        };
        renderAndGetCallbacks({ ...props, graph: graphWithVertices });
        const result = latestGraphProps.getGenerationVisibility(vertexKey, direction);
        expect(result).toBe(mockCheckedStatus);
        expect(graphWithVertices.getGenerationVisibility).toHaveBeenLastCalledWith(
          vertexKey,
          direction,
          props.urlState.visEncoding
        );
      });
    });

    describe('getVisiblePathElems', () => {
      const mockVisibleElems = 'mock visible elems';

      it('returns visible pathElems via Graph callback', () => {
        const graphWithVertices = {
          ...props.graph,
          getVisible: () => ({ edges: [], vertices: [{ key: 'v0' }, { key: 'v1' }] }),
          getVertexVisiblePathElems: jest.fn().mockReturnValue(mockVisibleElems),
        };
        renderAndGetCallbacks({ ...props, graph: graphWithVertices });
        const result = latestGraphProps.getVisiblePathElems(vertexKey);
        expect(result).toBe(mockVisibleElems);
        expect(graphWithVertices.getVertexVisiblePathElems).toHaveBeenLastCalledWith(
          vertexKey,
          props.urlState.visEncoding
        );
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
          getConfigValueSpy = jest.spyOn(getConfig, 'default');
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
          getConfigValueSpy.mockReturnValue({ search: { maxLookback: { value: lookback } } });
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

    it('sanitizes urlState', () => {
      mapStateToProps(doneState, ownProps);
      expect(sanitizeUrlStateSpy).toHaveBeenLastCalledWith(expected.urlState, hash);
    });
  });

  describe('DeepDependencyGraphPage (default export wrapper)', () => {
    const { MemoryRouter } = require('react-router-dom');

    const { Provider } = require('react-redux');

    const { createStore } = require('redux');

    const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');

    const mockReduxStore = createStore(() => ({
      ddg: {},
      router: { location: { search: '?service=test-service' } },
    }));

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const renderWithAllProviders = component => {
      return render(
        <QueryClientProvider client={queryClient}>
          <Provider store={mockReduxStore}>
            <MemoryRouter initialEntries={['/?service=test-service']}>{component}</MemoryRouter>
          </Provider>
        </QueryClientProvider>
      );
    };

    beforeEach(() => {
      // Restore spies from other tests (like getUrlState)
      jest.restoreAllMocks();
      useServices.mockClear();
      useSpanNames.mockClear();
    });

    it('calls useServices and useSpanNames hooks', () => {
      renderWithAllProviders(<DefaultDeepDependencyGraphPage />);
      expect(useServices).toHaveBeenCalled();
      expect(useSpanNames).toHaveBeenCalledWith('test-service', 'server');
    });

    it('passes custom props to wrapped component', () => {
      renderWithAllProviders(
        <DefaultDeepDependencyGraphPage baseUrl="/custom-path" showSvcOpsHeader={false} />
      );
      expect(useServices).toHaveBeenCalled();
    });
  });
});
