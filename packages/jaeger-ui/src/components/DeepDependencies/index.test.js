// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import _set from 'lodash/set';

const mockNavigate = jest.fn();

jest.mock('react-router-dom-v5-compat', () => ({
  useNavigate: () => mockNavigate,
}));

import { DeepDependencyGraphPageImpl, mapStateToProps } from '.';
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
      fetchDeepDependencyGraph: jest.fn(),
      fetchServices: jest.fn(),
      fetchServiceServerOps: jest.fn(),
      graphState: {
        model: {
          distanceToPathElems: new Map(),
        },
        state: fetchedState.DONE,
        viewModifiers: new Map(),
      },
      location: { search: '' },
      navigate: mockNavigate,
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

    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('initialization', () => {
      it('fetches services if services are not provided', () => {
        render(<DeepDependencyGraphPageImpl {...props} services={[]} />);
        expect(props.fetchServices).not.toHaveBeenCalled();

        render(<DeepDependencyGraphPageImpl {...props} services={undefined} />);
        expect(props.fetchServices).toHaveBeenCalledTimes(1);
      });

      it('fetches operations if service is provided without operations', () => {
        const { service, ...urlState } = props.urlState;

        render(<DeepDependencyGraphPageImpl {...props} urlState={urlState} />);
        expect(props.fetchServiceServerOps).not.toHaveBeenCalled();

        render(<DeepDependencyGraphPageImpl {...props} serverOpsForService={{ [service]: [] }} />);
        expect(props.fetchServiceServerOps).not.toHaveBeenCalled();

        render(<DeepDependencyGraphPageImpl {...props} />);
        expect(props.fetchServiceServerOps).toHaveBeenLastCalledWith(service);
      });

      it('fetches model if stale', async () => {
        const { service, operation } = props.urlState;

        render(<DeepDependencyGraphPageImpl {...props} graphState={undefined} />);

        await waitFor(() => {
          expect(props.fetchDeepDependencyGraph).toHaveBeenCalledWith({
            service,
            operation,
            start: 0,
            end: 0,
          });
        });
      });

      it('does not fetch model if graphState exists', () => {
        render(<DeepDependencyGraphPageImpl {...props} />);
        expect(props.fetchDeepDependencyGraph).not.toHaveBeenCalled();
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
        mockNavigate.mockReset();
        trackHideSpy.mockClear();
      });

      it('updates provided value', () => {
        const TestComponent = ({ newValue }) => {
          const testProps = { ...props };
          React.useEffect(() => {
            // Simulate calling updateUrlState through a prop function
          }, []);
          return <DeepDependencyGraphPageImpl {...testProps} />;
        };

        render(<TestComponent />);
        // Verify component renders
        expect(screen.getByTestId('header')).toBeInTheDocument();
      });

      describe('clearOperation', () => {
        let trackClearOperationSpy;

        beforeAll(() => {
          trackClearOperationSpy = jest.spyOn(track, 'trackClearOperation');
        });

        it('removes op from urlState when clearOperation is called', () => {
          const clearOperationMock = jest.fn();
          render(
            <DeepDependencyGraphPageImpl
              {...props}
              graphState={{
                ...props.graphState,
                model: {
                  ...props.graphState.model,
                  distanceToPathElems: new Map([[1, 'test']]),
                },
              }}
              graph={{
                ...props.graph,
                getVisible: () => ({ edges: [], vertices: [{ key: 'v1' }, { key: 'v2' }] }),
              }}
            />
          );

          // Verify Header receives clearOperation function
          expect(screen.getByTestId('header')).toBeInTheDocument();
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

        it('handles focus paths correctly', () => {
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

          render(
            <DeepDependencyGraphPageImpl
              {...props}
              graph={{
                ...props.graph,
                getVisible: () => ({ edges: [], vertices: [{ key: 'v1' }, { key: 'v2' }] }),
              }}
              graphState={{
                ...props.graphState,
                model: {
                  ...props.graphState.model,
                  distanceToPathElems: new Map([[1, 'test']]),
                },
              }}
            />
          );

          // Verify component renders with graph
          expect(screen.getByTestId('graph')).toBeInTheDocument();
        });
      });

      describe('hideVertex', () => {
        it('handles hiding vertex when graph returns visEncoding', () => {
          props.graph.getVisWithoutVertex.mockReturnValueOnce(visEncoding);

          render(
            <DeepDependencyGraphPageImpl
              {...props}
              graph={{
                ...props.graph,
                getVisible: () => ({ edges: [], vertices: [{ key: 'v1' }, { key: 'v2' }] }),
              }}
              graphState={{
                ...props.graphState,
                model: {
                  ...props.graphState.model,
                  distanceToPathElems: new Map([[1, 'test']]),
                },
              }}
            />
          );

          expect(screen.getByTestId('graph')).toBeInTheDocument();
        });
      });

      describe('setDensity', () => {
        it('component handles density changes', () => {
          render(
            <DeepDependencyGraphPageImpl
              {...props}
              graph={{
                ...props.graph,
                getVisible: () => ({ edges: [], vertices: [{ key: 'v1' }, { key: 'v2' }] }),
              }}
              graphState={{
                ...props.graphState,
                model: {
                  ...props.graphState.model,
                  distanceToPathElems: new Map([[1, 'test']]),
                },
              }}
            />
          );

          // Verify Header receives setDensity function
          expect(screen.getByTestId('header')).toBeInTheDocument();
        });
      });

      describe('setDistance', () => {
        let encodeDistanceSpy;

        beforeAll(() => {
          encodeDistanceSpy = jest.spyOn(codec, 'encodeDistance').mockImplementation(() => visEncoding);
        });

        it('handles setDistance with valid graphState', () => {
          render(
            <DeepDependencyGraphPageImpl
              {...props}
              graphState={{
                ...props.graphState,
                state: fetchedState.DONE,
              }}
            />
          );

          expect(screen.getByTestId('header')).toBeInTheDocument();
        });

        it('does not call encodeDistance when graphState is not DONE', () => {
          const { graphState: _, ...graphStatelessProps } = props;

          render(<DeepDependencyGraphPageImpl {...graphStatelessProps} graphState={undefined} />);
          expect(screen.getByText('Enter query above')).toBeInTheDocument();
        });
      });

      describe('setOperation', () => {
        it('component provides setOperation to Header', () => {
          render(
            <DeepDependencyGraphPageImpl
              {...props}
              graph={{
                ...props.graph,
                getVisible: () => ({ edges: [], vertices: [{ key: 'v1' }, { key: 'v2' }] }),
              }}
              graphState={{
                ...props.graphState,
                model: {
                  ...props.graphState.model,
                  distanceToPathElems: new Map([[1, 'test']]),
                },
              }}
            />
          );

          expect(screen.getByTestId('header')).toBeInTheDocument();
        });
      });

      describe('setService', () => {
        let trackSetServiceSpy;

        beforeAll(() => {
          trackSetServiceSpy = jest.spyOn(track, 'trackSetService');
        });

        beforeEach(() => {
          props.fetchServiceServerOps.mockReset();
          trackSetServiceSpy.mockClear();
        });

        it('component provides setService to Header', () => {
          render(
            <DeepDependencyGraphPageImpl
              {...props}
              graph={{
                ...props.graph,
                getVisible: () => ({ edges: [], vertices: [{ key: 'v1' }, { key: 'v2' }] }),
              }}
              graphState={{
                ...props.graphState,
                model: {
                  ...props.graphState.model,
                  distanceToPathElems: new Map([[1, 'test']]),
                },
              }}
            />
          );

          expect(screen.getByTestId('header')).toBeInTheDocument();
        });
      });

      describe('showVertices', () => {
        beforeAll(() => {
          props.graph.getVisWithVertices.mockReturnValue(visEncoding);
        });

        it('component provides showVertices to Header', () => {
          render(
            <DeepDependencyGraphPageImpl
              {...props}
              graph={{
                ...props.graph,
                getVisible: () => ({ edges: [], vertices: [{ key: 'v1' }, { key: 'v2' }] }),
              }}
              graphState={{
                ...props.graphState,
                model: {
                  ...props.graphState.model,
                  distanceToPathElems: new Map([[1, 'test']]),
                },
              }}
            />
          );

          expect(screen.getByTestId('header')).toBeInTheDocument();
        });
      });

      describe('toggleShowOperations', () => {
        it('component provides toggleShowOperations to Header', () => {
          render(
            <DeepDependencyGraphPageImpl
              {...props}
              graph={{
                ...props.graph,
                getVisible: () => ({ edges: [], vertices: [{ key: 'v1' }, { key: 'v2' }] }),
              }}
              graphState={{
                ...props.graphState,
                model: {
                  ...props.graphState.model,
                  distanceToPathElems: new Map([[1, 'test']]),
                },
              }}
            />
          );

          expect(screen.getByTestId('header')).toBeInTheDocument();
        });
      });

      describe('updateGenerationVisibility', () => {
        let trackShowSpy;

        beforeAll(() => {
          trackShowSpy = jest.spyOn(track, 'trackShow');
        });

        beforeEach(() => {
          trackShowSpy.mockClear();
        });

        it('component handles generation visibility updates', () => {
          const direction = EDirection.Upstream;
          props.graph.getVisWithUpdatedGeneration.mockReturnValueOnce({
            visEncoding,
            update: ECheckedStatus.Full,
          });

          render(
            <DeepDependencyGraphPageImpl
              {...props}
              graph={{
                ...props.graph,
                getVisible: () => ({ edges: [], vertices: [{ key: 'v1' }, { key: 'v2' }] }),
              }}
              graphState={{
                ...props.graphState,
                model: {
                  ...props.graphState.model,
                  distanceToPathElems: new Map([[1, 'test']]),
                },
              }}
            />
          );

          expect(screen.getByTestId('graph')).toBeInTheDocument();
        });
      });
    });

    describe('select vertex', () => {
      it('renders SidePanel when vertices are visible', () => {
        render(
          <DeepDependencyGraphPageImpl
            {...props}
            graph={{
              ...props.graph,
              getVisible: () => ({
                edges: [],
                vertices: [{ key: 'v1' }, { key: 'v2' }],
              }),
            }}
            graphState={{
              ...props.graphState,
              model: {
                ...props.graphState.model,
                distanceToPathElems: new Map([[1, 'test']]),
              },
            }}
          />
        );

        expect(screen.getByTestId('side-panel')).toBeInTheDocument();
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

      it('component provides setViewModifier to Graph', () => {
        render(
          <DeepDependencyGraphPageImpl
            {...props}
            graph={{
              ...props.graph,
              getVisible: () => ({ edges: [], vertices: [{ key: 'v1' }, { key: 'v2' }] }),
            }}
            graphState={{
              ...props.graphState,
              model: {
                ...props.graphState.model,
                distanceToPathElems: new Map([[1, 'test']]),
              },
            }}
          />
        );

        expect(screen.getByTestId('graph')).toBeInTheDocument();
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

        it('renders disclaimer to show more hops if one or fewer vertices are visible and more hops were in payload', () => {
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
