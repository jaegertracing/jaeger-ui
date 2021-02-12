// Copyright (c) 2021 The Jaeger Authors.
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

const mockGA = {
  init: jest.fn(),
  context: jest.fn(),
  isEnabled: jest.fn(),
};

const mockNoopWebAnalytics = {
  init: jest.fn(),
  context: jest.fn(),
  isEnabled: jest.fn(),
};

jest.mock('./ga', () => ({
  __esModule: true,
  default: () => {
    return mockGA;
  },
}));
let internalVersionShort;
let internalVersionLong;

jest.mock('./noopWebAnalytics', () => ({
  __esModule: true,
  default: (config, versionShort, versionLong) => {
    internalVersionShort = versionShort;
    internalVersionLong = versionLong;
    return mockNoopWebAnalytics;
  },
}));

describe('generic analytics tracking', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.resetAllMocks();
  });

  it('no web analytic test', () => {
    jest.doMock('../config/get-config', () => {
      return {
        __esModule: true,
        default: () => ({}),
      };
    });

    return import('.').then(() => {
      expect(internalVersionShort).toBe('unknown');
      expect(internalVersionLong).toBe('unknown');
      expect(mockNoopWebAnalytics.init).toHaveBeenCalled();
      expect(mockGA.init).not.toHaveBeenCalled();
    });
  });

  it('Google Analytics test', () => {
    jest.doMock('../config/get-config', () => {
      return {
        __esModule: true,
        default: () => ({
          tracking: {
            gaID: 'UA123',
          },
        }),
      };
    });

    return import('.').then(() => {
      expect(mockNoopWebAnalytics.init).not.toHaveBeenCalled();
      expect(mockGA.init).toHaveBeenCalled();
    });
  });

  it('Custom Web Analytics test', () => {
    const mockCustomWA = {
      init: jest.fn(),
      context: jest.fn(),
      isEnabled: jest.fn(),
    };

    jest.doMock('../config/get-config', () => {
      return {
        __esModule: true,
        default: () => ({
          tracking: {
            gaID: 'UA123',
            customWebAnalytics: () => mockCustomWA,
          },
        }),
      };
    });

    return import('.').then(() => {
      expect(mockNoopWebAnalytics.init).not.toHaveBeenCalled();
      expect(mockGA.init).not.toHaveBeenCalled();
      expect(mockCustomWA.init).toHaveBeenCalled();
    });
  });

  it('get versions as a string or bad JSON test', () => {
    const version = '123456';
    process.env.REACT_APP_VSN_STATE = version;
    jest.doMock('../config/get-config', () => {
      return {
        __esModule: true,
        default: () => ({}),
      };
    });

    return import('.').then(() => {
      expect(internalVersionShort).toBe(version);
      expect(internalVersionLong).toBe(version);
      expect(mockNoopWebAnalytics.init).toHaveBeenCalled();
      expect(mockGA.init).not.toHaveBeenCalled();
    });
  });

  it('get versions as an object test', () => {
    const vShot = '48956d5';
    const vLong = ' | github.com/jaegertracing/jaeger-ui | 48956d5 | master';
    process.env.REACT_APP_VSN_STATE = `{"remote":"github.com/jaegertracing/jaeger-ui","objName":"${vShot}","changed":{"hasChanged":false,"files":0,"insertions":0,"deletions":0,"untracked":0,"pretty":""},"refName":"master","pretty":"${vLong}"}`;
    jest.doMock('../config/get-config', () => {
      return {
        __esModule: true,
        default: () => ({}),
      };
    });

    return import('.').then(() => {
      expect(internalVersionShort).toBe(vShot);
      expect(internalVersionLong).toBe(vLong);
      expect(mockNoopWebAnalytics.init).toHaveBeenCalled();
      expect(mockGA.init).not.toHaveBeenCalled();
    });
  });
});
