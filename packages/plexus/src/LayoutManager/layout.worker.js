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

import getLayout from './getLayout';

let currentMeta;

function handleMessage(event) {
  const { meta, edges, vertices } = event.data;
  currentMeta = meta;
  const { layoutError, ...result } = getLayout(meta.phase, edges, vertices);
  const type = layoutError ? 'layout-error' : meta.phase;
  self.postMessage({ meta, type, ...result });
  currentMeta = null;
}

function handleError(errorType, event) {
  const { colno, error, filename, lineno, message: eventMessage } = event.data;
  const { code, message, name, stack } = error || {};
  this.postMessage({
    type: 'error',
    meta: currentMeta,
    errorMessage: {
      colno,
      errorType,
      filename,
      lineno,
      message: eventMessage,
      error: error && { code, message, name, stack },
    },
  });
}

self.onmessage = handleMessage;
self.onerror = handleError.bind(null, 'error');
self.onmessageerror = handleError.bind(null, 'messageerror');
