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

import queryString from 'query-string';

import updateUIFind from './update-ui-find';
import * as trackFilter from '../components/TracePage/index.track';

describe('updateUIFind', () => {
  const existingUIFind = 'existingUIFind';
  const newUIFind = 'newUIFind';
  const unrelatedQueryParamName = 'unrelatedQueryParamName';
  const unrelatedQueryParamValue = 'unrelatedQueryParamValue';

  const replaceMock = jest.fn();
  const queryStringParseSpy = jest.spyOn(queryString, 'parse').mockReturnValue({
    uiFind: existingUIFind,
    [unrelatedQueryParamName]: unrelatedQueryParamValue,
  });
  const queryStringStringifySpyMockReturnValue = 'queryStringStringifySpyMockReturnValue';
  const queryStringStringifySpy = jest
    .spyOn(queryString, 'stringify')
    .mockReturnValue(queryStringStringifySpyMockReturnValue);

  const history = {
    replace: replaceMock,
  };
  const location = {
    pathname: '/trace/traceID',
    search: 'location.search',
  };
  const expectedReplaceMockArgument = {
    ...location,
    search: `?${queryStringStringifySpyMockReturnValue}`,
  };
  let trackFilterSpy;

  beforeAll(() => {
    trackFilterSpy = jest.spyOn(trackFilter, 'trackFilter');
  });

  beforeEach(() => {
    replaceMock.mockReset();
    trackFilterSpy.mockClear();
    queryStringParseSpy.mockClear();
    queryStringStringifySpy.mockClear();
  });

  it('adds truthy graphSearch to existing params', () => {
    updateUIFind({
      history,
      location,
      uiFind: newUIFind,
    });
    expect(queryStringParseSpy).toHaveBeenCalledWith(location.search);
    expect(queryStringStringifySpy).toHaveBeenCalledWith({
      uiFind: newUIFind,
      [unrelatedQueryParamName]: unrelatedQueryParamValue,
    });
    expect(trackFilterSpy).toHaveBeenCalledWith(newUIFind);
    expect(replaceMock).toHaveBeenCalledWith(expectedReplaceMockArgument);
  });

  it('omits falsy graphSearch from query params', () => {
    updateUIFind({
      history,
      location,
      uiFind: '',
    });
    expect(queryStringParseSpy).toHaveBeenCalledWith(location.search);
    expect(queryStringStringifySpy).toHaveBeenCalledWith({
      [unrelatedQueryParamName]: unrelatedQueryParamValue,
    });
    expect(trackFilterSpy).toHaveBeenCalledWith('');
    expect(replaceMock).toHaveBeenCalledWith(expectedReplaceMockArgument);
  });

  it('omits absent graphSearch from query params', () => {
    updateUIFind({
      history,
      location,
    });
    expect(queryStringParseSpy).toHaveBeenCalledWith(location.search);
    expect(queryStringStringifySpy).toHaveBeenCalledWith({
      [unrelatedQueryParamName]: unrelatedQueryParamValue,
    });
    expect(trackFilterSpy).toHaveBeenCalledWith(undefined);
    expect(replaceMock).toHaveBeenCalledWith(expectedReplaceMockArgument);
  });
});
