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

import isPromise from 'is-promise';
import sinon from 'sinon';

import fileReader from './fileReader.js';

it('readJsonFile returns a promise', () => {
  const fileList = { data: {}, filename: 'whatever' };

  const promise = fileReader.readJsonFile(fileList);
  expect(isPromise(promise)).toBeTruthy();
});

it('readJsonFile fails to load a fail', async () => {
  expect.assertions(1);
  const fileList = { data: {}, filename: 'whatever' };
  try {
    await fileReader.readJsonFile(fileList);
  } catch (e) {
    expect(true).toBeTruthy();
  }
});

it('readJsonFile fails when fileList is wrong', async () => {
  expect.assertions(2);

  const mock = sinon.mock(window);
  const called = mock.expects('FileReader').once();
  const fileList = {
    action: '',
    filename: 'file',
    file: { uid: '1234' },
    data: {},
    headers: {},
    withCredentials: false,
  };

  try {
    await fileReader.readJsonFile(fileList);
  } catch (e) {
    expect(true).toBeTruthy();
    expect(called.verify()).toBeTruthy();
  }
  mock.restore();
});
