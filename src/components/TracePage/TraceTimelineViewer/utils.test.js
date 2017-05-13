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

import {
  isClientSpan,
  isErrorSpan,
  isServerSpan,
  spanContainsErredSpan,
} from './utils';
import traceGenerator from '../../../demo/trace-generators';

it('isClientSpan(...) is true only when a span.kind=client tag is present', () => {
  const tags = traceGenerator.tags();
  expect(isClientSpan({ tags })).toBe(false);
  tags.push({ key: 'span.kind', value: 'client' });
  expect(isClientSpan({ tags })).toBe(true);
});

it('isServerSpan(...) is true only when a span.kind=server tag is present', () => {
  const tags = traceGenerator.tags();
  expect(isServerSpan({ tags })).toBe(false);
  tags.push({ key: 'span.kind', value: 'server' });
  expect(isServerSpan({ tags })).toBe(true);
});

it('isErrorSpan(...) is true only when a error=true tag is present', () => {
  const tags = traceGenerator.tags();
  expect(isErrorSpan({ tags })).toBe(false);
  tags.push({ key: 'error', value: true });
  expect(isErrorSpan({ tags })).toBe(true);
});

it('spanContainsErredSpan(...) is true only when a descendant has an error tag', () => {
  const errorTag = { key: 'error', type: 'bool', value: true };
  const getTags = withError =>
    withError ? traceGenerator.tags().concat(errorTag) : traceGenerator.tags();

  // Using a string to generate the test spans. Each line results in a span. The
  // left number indicates whether or not the generated span has a descendant
  // with an error tag (the expectation). The length of the line indicates the
  // depth of the span (i.e. further right is higher depth). The right number
  // indicates whether or not the span has an error tag.
  const config = `
    1   0
    1     0
    0       1
    0     0
    1     0
    1       1
    0         1
    0           0
    1         0
    0           1
    0   0
  `
    .trim()
    .split('\n')
    .map(s => s.trim());
  // Get the expectation, str -> number -> bool
  const expectations = config.map(s => Boolean(Number(s[0])));
  const spans = config.map(line => ({
    depth: line.length,
    tags: getTags(+line.slice(-1)),
  }));

  expectations.forEach((target, i) => {
    // include the index in the expect condition to know which span failed
    // (if there is a failure, that is)
    const result = [i, spanContainsErredSpan(spans, i)];
    expect(result).toEqual([i, target]);
  });
});
