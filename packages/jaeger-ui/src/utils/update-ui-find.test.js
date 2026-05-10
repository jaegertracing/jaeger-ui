// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

// vi.spyOn cannot patch ESM named exports; mock the whole module instead.
// vi.hoisted ensures mock functions are available when the factory runs.
const { parseMock, stringifyMock } = vi.hoisted(() => ({
  parseMock: vi.fn(),
  stringifyMock: vi.fn(),
}));

vi.mock('query-string', () => ({
  default: { parse: parseMock, stringify: stringifyMock },
}));

import updateUiFind from './update-ui-find';

describe('updateUiFind', () => {
  const existingUiFind = 'existingUiFind';
  const newUiFind = 'newUiFind';
  const unrelatedQueryParamName = 'unrelatedQueryParamName';
  const unrelatedQueryParamValue = 'unrelatedQueryParamValue';
  const queryStringStringifySpyMockReturnValue = 'queryStringStringifySpyMockReturnValue';

  const navigate = jest.fn();

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
    parseMock.mockClear();
    stringifyMock.mockClear();
    parseMock.mockReturnValue({
      uiFind: existingUiFind,
      [unrelatedQueryParamName]: unrelatedQueryParamValue,
    });
    stringifyMock.mockReturnValue(queryStringStringifySpyMockReturnValue);
  });

  it('adds truthy graphSearch to existing params', () => {
    updateUiFind({
      navigate,
      location,
      uiFind: newUiFind,
    });
    expect(parseMock).toHaveBeenCalledWith(location.search);
    expect(stringifyMock).toHaveBeenCalledWith({
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
    expect(parseMock).toHaveBeenCalledWith(location.search);
    expect(stringifyMock).toHaveBeenCalledWith({
      [unrelatedQueryParamName]: unrelatedQueryParamValue,
    });
    expect(navigate).toHaveBeenCalledWith(expectedNavigateArg, { replace: true });
  });

  it('omits absent graphSearch from query params', () => {
    updateUiFind({
      navigate,
      location,
    });
    expect(parseMock).toHaveBeenCalledWith(location.search);
    expect(stringifyMock).toHaveBeenCalledWith({
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
