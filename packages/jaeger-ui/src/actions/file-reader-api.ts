// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createAction } from 'redux-actions';

import readJsonFile from '../utils/readJsonFile';

export const loadJsonTraces = createAction(
  '@FILE_READER_API/LOAD_JSON',
  fileList => readJsonFile(fileList),
  fileList => ({ fileList })
);
