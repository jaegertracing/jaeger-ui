// Copyright (c) 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import * as processSelectors from '../selectors/process';
import traceGenerator from '../demo/trace-generators';

const generatedTrace = traceGenerator.trace({ numberOfSpans: 45 });

it('getProcessServiceName() should return the serviceName of the process', () => {
  const proc = generatedTrace.processes[Object.keys(generatedTrace.processes)[0]];

  expect(processSelectors.getProcessServiceName(proc)).toBe(proc.serviceName);
});

it('getProcessTags() should return the tags on the process', () => {
  const proc = generatedTrace.processes[Object.keys(generatedTrace.processes)[0]];

  expect(processSelectors.getProcessTags(proc)).toBe(proc.tags);
});
