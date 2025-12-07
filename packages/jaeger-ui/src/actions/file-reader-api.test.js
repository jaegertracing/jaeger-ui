// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as fileReaderActions from './file-reader-api';
import readJsonFile from '../utils/readJsonFile';

jest.mock('../utils/readJsonFile');

describe('actions/file-reader-api', () => {
  beforeEach(() => {
    readJsonFile.mockReset();
  });

  it('loadJsonTraces calls readJsonFile', () => {
    const arg = 'example-arg';
    fileReaderActions.loadJsonTraces(arg);
    expect(readJsonFile.mock.calls).toEqual([[arg]]);
  });
});
