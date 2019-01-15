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
import prefixUrlSpy from './prefix-url';

jest.mock('./prefix-url');

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
  const prefixUrlSpyMockReturnValue = 'prefixUrlSpyMockReturnValue';
  prefixUrlSpy.mockReturnValue(prefixUrlSpyMockReturnValue);

  const history = {
    replace: replaceMock,
  };
  const location = {
    search: 'location.search',
  };

  beforeEach(() => {
    replaceMock.mockReset();
    queryStringParseSpy.mockClear();
    queryStringStringifySpy.mockClear();
    prefixUrlSpy.mockClear();
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
    expect(prefixUrlSpy).toHaveBeenCalledWith(`?${queryStringStringifySpyMockReturnValue}`);
    expect(replaceMock).toHaveBeenCalledWith(prefixUrlSpyMockReturnValue);
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
    expect(prefixUrlSpy).toHaveBeenCalledWith(`?${queryStringStringifySpyMockReturnValue}`);
    expect(replaceMock).toHaveBeenCalledWith(prefixUrlSpyMockReturnValue);
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
    expect(prefixUrlSpy).toHaveBeenCalledWith(`?${queryStringStringifySpyMockReturnValue}`);
    expect(replaceMock).toHaveBeenCalledWith(prefixUrlSpyMockReturnValue);
  });
});
