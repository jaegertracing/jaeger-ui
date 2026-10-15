// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import queryString from 'query-string';
import '@testing-library/jest-dom';

const { useTracesMock } = vi.hoisted(() => ({
  useTracesMock: jest.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('../../hooks/useTraceLoading', () => ({
  useTraces: (...args) => useTracesMock(...args),
}));

import { DeepDependencyGraphPageImpl } from '.';
import TracesDdgImpl from './traces';
import { ROUTE_PATH } from '../SearchTracePage/url';
import { fetchedState } from '../../constants';
import * as url from './url';
import * as GraphModel from '../../model/ddg/GraphModel';
import * as transformDdgData from '../../model/ddg/transformDdgData';
import * as transformTracesToPaths from '../../model/ddg/transformTracesToPaths';

vi.mock('.', () => ({
  DeepDependencyGraphPageImpl: jest.fn(() => <div data-testid="ddg-impl" />),
  useDdgViewModifierBridgeProps: () => ({
    addViewModifier: jest.fn(),
    removeViewModifierFromIndices: jest.fn(),
    viewModifiers: new Map(),
  }),
}));

describe('TracesDdgImpl', () => {
  beforeEach(() => {
    useTracesMock.mockReturnValue(new Map());
  });

  it('renders DeepDependencyGraphPageImpl with specific props', () => {
    const extraUrlArgs = ['end', 'start', 'limit', 'lookback', 'maxDuration', 'minDuration', 'view'].reduce(
      (acc, key) => ({ ...acc, [key]: `test ${key}` }),
      {}
    );
    const search = queryString.stringify({ ...extraUrlArgs, extraParam: 'extraParam' });
    const location = { search };

    const { getByTestId } = render(
      <TracesDdgImpl location={location} traceIDs={[]} propName0="propValue0" propName1="propValue1" />
    );

    const [firstArg] = DeepDependencyGraphPageImpl.mock.calls[0];
    expect(firstArg).toEqual(
      expect.objectContaining({
        propName0: 'propValue0',
        propName1: 'propValue1',
        location,
        baseUrl: ROUTE_PATH,
        extraUrlArgs,
        showSvcOpsHeader: false,
      })
    );
    expect(getByTestId('ddg-impl')).toBeInTheDocument();
  });

  it('calculates showOp from urlState correctly', () => {
    const makeGraphSpy = jest.spyOn(GraphModel, 'makeGraph').mockReturnValue({});
    jest.spyOn(transformDdgData, 'default').mockReturnValue({ hash: 'h' });
    jest.spyOn(transformTracesToPaths, 'default').mockReturnValue('payload');

    [true, false, undefined].forEach(showOp => {
      ['focalOperation', undefined].forEach(focalOp => {
        const mockUrlState = { service: 'svc', operation: focalOp, showOp };
        jest.spyOn(url, 'getUrlState').mockReturnValue(mockUrlState);
        jest.spyOn(url, 'sanitizeUrlState').mockImplementation(u => u);
        DeepDependencyGraphPageImpl.mockClear();

        render(<TracesDdgImpl location={{ search: '' }} traceIDs={[]} />);

        const [firstArg] = DeepDependencyGraphPageImpl.mock.calls[0];
        expect(firstArg.showOp).toBe(showOp === undefined ? focalOp !== undefined : showOp);
      });
    });

    makeGraphSpy.mockRestore();
  });

  it('passes graph and graphState only if service is defined', () => {
    const mockModel = { hash: 'test hash' };
    jest.spyOn(GraphModel, 'makeGraph').mockReturnValue({ model: mockModel });
    jest.spyOn(transformDdgData, 'default').mockReturnValue(mockModel);
    jest.spyOn(transformTracesToPaths, 'default').mockReturnValue('payload');
    jest.spyOn(url, 'sanitizeUrlState').mockImplementation(u => u);

    jest.spyOn(url, 'getUrlState').mockReturnValue({ service: 'svc', operation: 'op' });
    DeepDependencyGraphPageImpl.mockClear();
    render(<TracesDdgImpl location={{ search: '' }} traceIDs={[]} />);
    const [withService] = DeepDependencyGraphPageImpl.mock.calls[0];
    expect(withService.graph).toBeDefined();
    expect(withService.graphState).toBeDefined();

    jest.spyOn(url, 'getUrlState').mockReturnValue({ service: undefined });
    DeepDependencyGraphPageImpl.mockClear();
    render(<TracesDdgImpl location={{ search: '' }} traceIDs={[]} />);
    const [withoutService] = DeepDependencyGraphPageImpl.mock.calls[0];
    expect(withoutService.graph).toBeUndefined();
    expect(withoutService.graphState).toBeUndefined();
  });

  it.each([
    ['the trace error', 'Trace could not be loaded'],
    ['an absent trace error', undefined],
  ])('passes an error graphState when useTraces returns %s', (_description, error) => {
    useTracesMock.mockReturnValue(
      new Map([['trace-id', { id: 'trace-id', state: fetchedState.ERROR, error }]])
    );
    jest.spyOn(url, 'getUrlState').mockReturnValue({ service: 'svc' });
    DeepDependencyGraphPageImpl.mockClear();

    render(<TracesDdgImpl location={{ search: '' }} traceIDs={['trace-id']} />);

    const [props] = DeepDependencyGraphPageImpl.mock.calls[0];
    expect(props.graph).toBeUndefined();
    expect(props.graphState).toEqual({
      state: fetchedState.ERROR,
      error: error || 'Unknown error',
    });
  });

  it('passes a loading graphState when useTraces returns a loading trace', () => {
    useTracesMock.mockReturnValue(new Map([['trace-id', { id: 'trace-id', state: fetchedState.LOADING }]]));
    jest.spyOn(url, 'getUrlState').mockReturnValue({ service: 'svc' });
    DeepDependencyGraphPageImpl.mockClear();

    render(<TracesDdgImpl location={{ search: '' }} traceIDs={['trace-id']} />);

    const [props] = DeepDependencyGraphPageImpl.mock.calls[0];
    expect(props.graph).toBeUndefined();
    expect(props.graphState).toEqual({ state: fetchedState.LOADING });
  });
});
