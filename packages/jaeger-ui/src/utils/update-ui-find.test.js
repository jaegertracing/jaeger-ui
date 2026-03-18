// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import queryString from 'query-string';

import updateUiFind from './update-ui-find';

describe('updateUiFind', () => {
  const existingUiFind = 'existingUiFind';
  const newUiFind = 'newUiFind';
  const unrelatedQueryParamName = 'unrelatedQueryParamName';
  const unrelatedQueryParamValue = 'unrelatedQueryParamValue';

  const navigate = jest.fn();
  const queryStringParseSpy = jest.spyOn(queryString, 'parse').mockReturnValue({
    uiFind: existingUiFind,
    [unrelatedQueryParamName]: unrelatedQueryParamValue,
  });
  const queryStringStringifySpyMockReturnValue = 'queryStringStringifySpyMockReturnValue';
  const queryStringStringifySpy = jest
    .spyOn(queryString, 'stringify')
    .mockReturnValue(queryStringStringifySpyMockReturnValue);

  const location = {
    pathname: '/trace/traceID',
    search: 'location.search',
  };
  const expectedNavigateArg = {
    pathname: location.pathname,
    search: `?${queryStringStringifySpyMockReturnValue}`,
  };

  beforeEach(() => {
    navigate.mockReset();
    queryStringParseSpy.mockClear();
    queryStringStringifySpy.mockClear();
  });

  it('adds truthy graphSearch to existing params', () => {
    updateUiFind({
      navigate,
      location,
      uiFind: newUiFind,
    });
    expect(queryStringParseSpy).toHaveBeenCalledWith(location.search);
    expect(queryStringStringifySpy).toHaveBeenCalledWith({
      uiFind: newUiFind,
      [unrelatedQueryParamName]: unrelatedQueryParamValue,
    });
    expect(navigate).toHaveBeenCalledWith(expectedNavigateArg, { replace: true });
  });

  it('omits falsy graphSearch from query params', () => {
    updateUiFind({
      navigate,
      location,
      uiFind: '',
    });
    expect(queryStringParseSpy).toHaveBeenCalledWith(location.search);
    expect(queryStringStringifySpy).toHaveBeenCalledWith({
      [unrelatedQueryParamName]: unrelatedQueryParamValue,
    });
    expect(navigate).toHaveBeenCalledWith(expectedNavigateArg, { replace: true });
  });

  it('omits absent graphSearch from query params', () => {
    updateUiFind({
      navigate,
      location,
    });
    expect(queryStringParseSpy).toHaveBeenCalledWith(location.search);
    expect(queryStringStringifySpy).toHaveBeenCalledWith({
      [unrelatedQueryParamName]: unrelatedQueryParamValue,
    });
    expect(navigate).toHaveBeenCalledWith(expectedNavigateArg, { replace: true });
  });

  describe('trackFindFunction provided', () => {
    const trackFindFunction = jest.fn();

    beforeEach(() => {
      trackFindFunction.mockClear();
    });

    it('tracks undefined when uiFind value is omitted', () => {
      updateUiFind({
        navigate,
        location,
        trackFindFunction,
      });
      expect(trackFindFunction).toHaveBeenCalledWith(undefined);
    });

    it('tracks given value', () => {
      updateUiFind({
        navigate,
        location,
        trackFindFunction,
        uiFind: newUiFind,
      });
      expect(trackFindFunction).toHaveBeenCalledWith(newUiFind);
    });
  });
});
