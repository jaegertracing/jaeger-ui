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

import TraceCriticalPath from './index';
import transformTraceData from '../../../model/transform-trace-data';
import criticalPathSections from './testResults/test1';

const testTrace = require('../TraceStatistics/tableValuesTestTrace/testTraceNormal.json');

const transformedTrace = transformTraceData(testTrace);

const defaultProps = {
  trace: transformedTrace,
};

describe('<TraceCriticalPath />', () => {
  it('Critical path sections', () => {
    const consoleLogMock = jest.spyOn(console, 'log').mockImplementation();
    TraceCriticalPath(defaultProps);
    expect(consoleLogMock).toHaveBeenCalledWith(criticalPathSections);
  });
});
