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

import Chance from 'chance';

import { getSpanId } from '../selectors/span';

const chance = new Chance();

export const SERVICE_LIST = ['serviceA', 'serviceB', 'serviceC', 'serviceD', 'serviceE', 'serviceF'];
export const OPERATIONS_LIST = [
  'GET',
  'PUT',
  'POST',
  'DELETE',
  'MySQL::SELECT',
  'MySQL::INSERT',
  'MongoDB::find',
  'MongoDB::update',
];

function setupParentSpan(spans, parentSpanValues) {
  Object.assign(spans[0], parentSpanValues);
  return spans;
}

function getParentSpanId(span, levels) {
  let nestingLevel = chance.integer({ min: 1, max: levels.length });

  // pick the correct nesting level if allocated by the levels calculation
  levels.forEach((level, idx) => {
    if (level.indexOf(getSpanId(span)) >= 0) {
      nestingLevel = idx;
    }
  });

  return nestingLevel - 1 >= 0 ? chance.pickone(levels[nestingLevel - 1]) : null;
}

/* this simulates the hierarchy created by CHILD_OF tags */
function attachReferences(spans) {
  const depth = chance.integer({ min: 1, max: 10 });
  let levels = [[getSpanId(spans[0])]];

  const duplicateLevelFilter = currentLevels => spanID =>
    !currentLevels.find(level => level.indexOf(spanID) >= 0);

  while (levels.length < depth) {
    const newLevel = chance
      .pickset(spans, chance.integer({ min: 4, max: 8 }))
      .map(getSpanId)
      .filter(duplicateLevelFilter(levels));
    levels.push(newLevel);
  }

  // filter out empty levels
  levels = levels.filter(level => level.length > 0);

  return spans.map(span => {
    const parentSpanId = getParentSpanId(span, levels);
    return parentSpanId
      ? {
          ...span,
          references: [
            {
              refType: 'CHILD_OF',
              traceID: span.traceID,
              spanID: parentSpanId,
            },
          ],
        }
      : span;
  });
}

export default chance.mixin({
  trace({
    // long trace
    // very short trace
    // average case
    numberOfSpans = chance.pickone([
      Math.ceil(chance.normal({ mean: 200, dev: 10 })) + 1,
      Math.ceil(chance.integer({ min: 3, max: 10 })),
      Math.ceil(chance.normal({ mean: 45, dev: 15 })) + 1,
    ]),
    numberOfProcesses = chance.integer({ min: 1, max: 10 }),
  }) {
    const traceID = chance.guid();
    const duration = chance.integer({ min: 10000, max: 5000000 });
    const timestamp = (new Date().getTime() - chance.integer({ min: 0, max: 1000 }) * 1000) * 1000;

    const processArray = chance.processes({ numberOfProcesses });
    const processes = processArray.reduce((pMap, p) => ({ ...pMap, [p.processID]: p }), {});

    let spans = chance.n(chance.span, numberOfSpans, {
      traceID,
      processes,
      traceStartTime: timestamp,
      traceEndTime: timestamp + duration,
    });
    spans = attachReferences(spans);
    if (spans.length > 1) {
      spans = setupParentSpan(spans, { startTime: timestamp, duration });
    }

    return {
      traceID,
      spans,
      duration,
      timestamp,
      processes,
    };
  },
  tag() {
    return {
      key: 'http.url',
      type: 'String',
      value: `/v2/${chance.pickone(['alpha', 'beta', 'gamma'])}/${chance.guid()}`,
    };
  },
  span({
    traceID = chance.guid(),
    processes = {},
    traceStartTime = chance.timestamp() * 1000 * 1000,
    traceEndTime = traceStartTime + 100000,
    operations = OPERATIONS_LIST,
  }) {
    const startTime = chance.integer({
      min: traceStartTime,
      max: traceEndTime,
    });

    return {
      traceID,
      processID: chance.pickone(Object.keys(processes)),
      spanID: chance.guid(),
      flags: 0,
      operationName: chance.pickone(operations),
      references: [],
      startTime,
      duration: chance.integer({ min: 1, max: traceEndTime - startTime }),
      tags: chance.tags(),
      logs: [],
    };
  },
  process({ services = SERVICE_LIST }) {
    return {
      processID: chance.guid(),
      serviceName: chance.pickone(services),
      tags: chance.tags(),
    };
  },
  traces({ numberOfTraces = chance.integer({ min: 5, max: 15 }) }) {
    return chance.n(chance.trace, numberOfTraces, {});
  },
  tags() {
    return chance.n(chance.tag, chance.integer({ min: 1, max: 10 }), {});
  },
  processes({ numberOfProcesses = chance.integer({ min: 1, max: 25 }) }) {
    return chance.n(chance.process, numberOfProcesses, {});
  },
});
