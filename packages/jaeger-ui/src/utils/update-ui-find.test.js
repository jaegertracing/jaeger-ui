// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import queryString from 'query-string';

import updateUiFind from './update-ui-find';

describe('updateUiFind', () => {
  const existingUiFind = 'existingUiFind';
  const newUiFind = 'newUiFind';
  const unrelatedQueryParamName = 'unrelatedQueryParamName';
  const unrelatedQueryParamValue = 'unrelatedQueryParamValue';

  const replaceMock = jest.fn();
  const queryStringParseSpy = jest.spyOn(queryString, 'parse').mockReturnValue({
    uiFind: existingUiFind,
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

  beforeEach(() => {
    replaceMock.mockReset();
    queryStringParseSpy.mockClear();
    queryStringStringifySpy.mockClear();
  });

  it('adds truthy graphSearch to existing params', () => {
    updateUiFind({
      history,
      location,
      uiFind: newUiFind,
    });
    expect(queryStringParseSpy).toHaveBeenCalledWith(location.search);
    expect(queryStringStringifySpy).toHaveBeenCalledWith({
      uiFind: newUiFind,
      [unrelatedQueryParamName]: unrelatedQueryParamValue,
    });
    expect(replaceMock).toHaveBeenCalledWith(expectedReplaceMockArgument);
  });

  it('omits falsy graphSearch from query params', () => {
    updateUiFind({
      history,
      location,
      uiFind: '',
    });
    expect(queryStringParseSpy).toHaveBeenCalledWith(location.search);
    expect(queryStringStringifySpy).toHaveBeenCalledWith({
      [unrelatedQueryParamName]: unrelatedQueryParamValue,
    });
    expect(replaceMock).toHaveBeenCalledWith(expectedReplaceMockArgument);
  });

  it('omits absent graphSearch from query params', () => {
    updateUiFind({
      history,
      location,
    });
    expect(queryStringParseSpy).toHaveBeenCalledWith(location.search);
    expect(queryStringStringifySpy).toHaveBeenCalledWith({
      [unrelatedQueryParamName]: unrelatedQueryParamValue,
    });
    expect(replaceMock).toHaveBeenCalledWith(expectedReplaceMockArgument);
  });

  describe('trackFindFunction provided', () => {
    const trackFindFunction = jest.fn();

    beforeEach(() => {
      trackFindFunction.mockClear();
    });

    it('tracks undefined when uiFind value is omitted', () => {
      updateUiFind({
        history,
        location,
        trackFindFunction,
      });
      expect(trackFindFunction).toHaveBeenCalledWith(undefined);
    });

    it('tracks given value', () => {
      updateUiFind({
        history,
        location,
        trackFindFunction,
        uiFind: newUiFind,
      });
      expect(trackFindFunction).toHaveBeenCalledWith(newUiFind);
    });
  });
});
