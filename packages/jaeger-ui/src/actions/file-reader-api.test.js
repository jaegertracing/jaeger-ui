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

import sinon from 'sinon';
import isPromise from 'is-promise';

import * as fileReaderActions from './file-reader-api';
import fileReader from '../utils/fileReader';

it('loadJsonTraces should return a promise', () => {
  const fileList = { data: {}, filename: 'whatever' };

  const { payload } = fileReaderActions.loadJsonTraces(fileList);
  expect(isPromise(payload)).toBeTruthy();
  // prevent the unhandled rejection warnings
  payload.catch(() => {});
});

it('loadJsonTraces should call readJsonFile', () => {
  const fileList = { data: {}, filename: 'whatever' };
  const mock = sinon.mock(fileReader);
  const called = mock
    .expects('readJsonFile')
    .once()
    .withExactArgs(fileList);
  fileReaderActions.loadJsonTraces(fileList);
  expect(called.verify()).toBeTruthy();
  mock.restore();
});
