// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import queryString from 'query-string';
import '@testing-library/jest-dom';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('react-redux', () => ({
  useSelector: fn => fn({ trace: { search: { results: [] } } }),
}));

vi.mock('../../hooks/useTraceLoading', () => ({
  useTraces: () => new Map(),
}));

import { DeepDependencyGraphPageImpl } from '.';
import { TracesDdgImpl } from './traces';
import { ROUTE_PATH } from '../SearchTracePage/url';
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
  it('renders DeepDependencyGraphPageImpl with specific props', () => {
    const extraUrlArgs = ['end', 'start', 'limit', 'lookback', 'maxDuration', 'minDuration', 'view'].reduce(
      (acc, key) => ({ ...acc, [key]: `test ${key}` }),
      {}
    );
    const search = queryString.stringify({ ...extraUrlArgs, extraParam: 'extraParam' });
    const location = { search };

    const { getByTestId } = render(
      <TracesDdgImpl location={location} propName0="propValue0" propName1="propValue1" />
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

        render(<TracesDdgImpl location={{ search: '' }} />);

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
    render(<TracesDdgImpl location={{ search: '' }} />);
    const [withService] = DeepDependencyGraphPageImpl.mock.calls[0];
    expect(withService.graph).toBeDefined();
    expect(withService.graphState).toBeDefined();

    jest.spyOn(url, 'getUrlState').mockReturnValue({ service: undefined });
    DeepDependencyGraphPageImpl.mockClear();
    render(<TracesDdgImpl location={{ search: '' }} />);
    const [withoutService] = DeepDependencyGraphPageImpl.mock.calls[0];
    expect(withoutService.graph).toBeUndefined();
    expect(withoutService.graphState).toBeUndefined();
  });
});
