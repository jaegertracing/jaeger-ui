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

import React from 'react';
import { render } from '@testing-library/react';
import queryString from 'query-string';
import '@testing-library/jest-dom';

jest.mock('react-router-dom-v5-compat', () => ({
  useNavigate: () => jest.fn(),
}));

import { DeepDependencyGraphPageImpl } from '.';
import { TracesDdgImpl, mapStateToProps } from './traces';
import * as url from './url';
import { ROUTE_PATH } from '../SearchTracePage/url';
import * as GraphModel from '../../model/ddg/GraphModel';
import * as transformDdgData from '../../model/ddg/transformDdgData';
import * as transformTracesToPaths from '../../model/ddg/transformTracesToPaths';

jest.mock('.', () => ({
  DeepDependencyGraphPageImpl: jest.fn(() => <div data-testid="ddg-impl" />),
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
});

describe('mapStateToProps', () => {
  const hash = 'test hash';
  const mockModel = { hash };
  const mockGraph = { model: mockModel };
  const mockPayload = 'test payload';
  const urlState = {
    service: 'testService',
    operation: 'testOperation',
    visEncoding: 'testVisEncoding',
  };
  const ownProps = {
    location: {
      search: queryString.stringify(urlState),
    },
  };
  const state = {
    router: { location: ownProps.location },
    trace: {
      traces: {
        testTraceID: 'test trace data',
      },
    },
  };

  let getUrlStateSpy;
  let makeGraphSpy;
  let sanitizeUrlStateSpy;
  let transformDdgDataSpy;
  let transformTracesToPathsSpy;
  let spies;

  beforeAll(() => {
    getUrlStateSpy = jest.spyOn(url, 'getUrlState');
    makeGraphSpy = jest.spyOn(GraphModel, 'makeGraph').mockReturnValue(mockGraph);
    sanitizeUrlStateSpy = jest.spyOn(url, 'sanitizeUrlState').mockImplementation(u => u);
    transformDdgDataSpy = jest.spyOn(transformDdgData, 'default').mockReturnValue(mockModel);
    transformTracesToPathsSpy = jest.spyOn(transformTracesToPaths, 'default').mockReturnValue(mockPayload);
    spies = [
      getUrlStateSpy,
      makeGraphSpy,
      sanitizeUrlStateSpy,
      transformDdgDataSpy,
      transformTracesToPathsSpy,
    ];
  });

  beforeEach(() => {
    spies.forEach(spy => spy.mockClear());
    getUrlStateSpy.mockReturnValue(urlState);
  });

  it('gets props from url', () => {
    const result = mapStateToProps(state, ownProps);
    expect(result.urlState).toEqual(urlState);
  });

  it('calculates showOp from urlState correctly', () => {
    [true, false, undefined].forEach(showOp => {
      ['focalOperation', undefined].forEach(focalOp => {
        const mockUrlState = {
          ...urlState,
          operation: focalOp,
          showOp,
        };
        getUrlStateSpy.mockReturnValue(mockUrlState);
        const result = mapStateToProps(state, ownProps);
        expect(result.showOp).toBe(showOp === undefined ? focalOp !== undefined : showOp);
      });
    });
  });

  it('returns graph and graphState only if service is defined', () => {
    const result = mapStateToProps(state, ownProps);
    expect(result.graph).toBe(mockGraph);
    expect(result.graphState.model).toBe(mockModel);

    getUrlStateSpy.mockReturnValue({ ...urlState, service: undefined });
    const resultWithoutService = mapStateToProps(state, ownProps);
    expect(resultWithoutService.graph).toBeUndefined();
    expect(resultWithoutService.graphState).toBeUndefined();
  });

  it('memoized functions are called with the same arguments when invoked twice', () => {
    mapStateToProps(state, ownProps);
    mapStateToProps(state, ownProps);
    spies.forEach(spy => {
      const [call1, call2] = spy.mock.calls;
      if (call1 && call2 && call1.length > 0 && call2.length > 0) {
        call1.forEach((arg, i) => {
          expect(call2[i]).toBe(arg);
        });
      }
    });
  });

  it('sanitizes the url using hash from graph model', () => {
    mapStateToProps(state, ownProps);
    expect(sanitizeUrlStateSpy).toHaveBeenCalledWith(urlState, hash);
  });
});
