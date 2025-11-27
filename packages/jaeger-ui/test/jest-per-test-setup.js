// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { TextEncoder } from 'util';
import { polyfill as rafPolyfill } from '../src/utils/test/requestAnimationFrame';
import '@testing-library/jest-dom';

// react requires requestAnimationFrame polyfill when using jsdom
rafPolyfill();
// Jest 28+ makes use of the TextEncoder API, which is not provided by JSDOM
global.TextEncoder = TextEncoder;

// Calls to get-config.tsx and get-version.tsx warn if these globals are not functions.
// This file is executed before each test file, so they may be overridden safely.
window.getJaegerUiConfig = () => ({});
window.getJaegerStorageCapabilities = () => ({});
window.getJaegerVersion = () => ({
  gitCommit: '',
  gitVersion: '',
  buildDate: '',
});

// Provide a matchMedia() stub as some Ant Design components attempt to use this
window.matchMedia = jest.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(), // deprecated
  removeListener: jest.fn(), // deprecated
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
}));

global.__APP_ENVIRONMENT__ = 'test';
global.__REACT_APP_GA_DEBUG__ = '';
global.__REACT_APP_VSN_STATE__ = '';
