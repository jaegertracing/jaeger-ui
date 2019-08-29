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

import transformTracesToPaths from './transformTracesToPaths';
import transformTraceData from '../transform-trace-data';
import { fetchedState } from '../../constants';

describe('transform traces to ddg paths', () => {
  const tracesResults = [
    {
      traceID: 'Trace-1',
      spans: [
        {
          traceID: '1',
          spanID: '1',
          startTime: 1570040938479366,
          operationName: 'HTTP GET /customer',
          references: [
            {
              refType: 'CHILD_OF',
              traceID: '1',
              spanID: '2',
            },
          ],
          processID: 'p1',
        },
        {
          traceID: '1',
          spanID: '2',
          startTime: 1570040938479369,
          operationName: 'HTTP GET /',
          processID: 'p1',
        },
      ],
      processes: {
        p1: {
          serviceName: 'customer',
        },
      },
    },
  ];
  it('transforms trace results payload', () => {
    const processed = tracesResults.map(transformTraceData);
    const resultTraces = {};
    for (let i = 0; i < processed.length; i++) {
      const data = processed[i];
      const id = data.traceID;
      resultTraces[id] = { data, id, state: fetchedState.DONE };
    }

    const payload = transformTracesToPaths(resultTraces, 'customer');
    expect(payload.length).toBe(1);
    expect(payload[0].path.length).toBe(2);
  });
});
