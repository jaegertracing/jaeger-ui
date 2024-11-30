// Copyright (c) 2024 The Jaeger Authors.
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

import { getParameterAndFormatter } from './link-formatting';

describe('getParameterAndFormatter()', () => {
  test('epoch_micros_to_date_iso', () => {
    const result = getParameterAndFormatter('startTime | epoch_micros_to_date_iso');
    expect(result).toEqual({
      parameterName: 'startTime',
      formatFunction: expect.any(Function),
    });

    expect(result.formatFunction(new Date('2020-01-01').getTime() * 1000)).toEqual(
      '2020-01-01T00:00:00.000Z'
    );
  });

  test('No function', () => {
    const result = getParameterAndFormatter('startTime');
    expect(result).toEqual({
      parameterName: 'startTime',
      formatFunction: null,
    });
  });

  test('Invalid function', () => {
    const result = getParameterAndFormatter('startTime | invalid');
    expect(result).toEqual({
      parameterName: 'startTime',
      formatFunction: null,
    });
  });
});
