// Copyright (c) 2017 Uber Technologies, Inc.
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

import { TextEncoder } from 'util';
// NOTE: This must be above the enzyme related code below, and the enzyme
// related imports MUST use `require`
import { polyfill as rafPolyfill } from '../src/utils/test/requestAnimationFrame';
// react requires requestAnimationFrame polyfill when using jsdom
rafPolyfill();
// Jest 28+ makes use of the TextEncoder API, which is not provided by JSDOM
global.TextEncoder = TextEncoder;

const Enzyme = require('enzyme');
const EnzymeAdapter = require('@wojtekmaj/enzyme-adapter-react-17');
const createSerializer = require('enzyme-to-json').createSerializer;

Enzyme.configure({ adapter: new EnzymeAdapter() });
expect.addSnapshotSerializer(createSerializer({ mode: 'deep' }));

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
