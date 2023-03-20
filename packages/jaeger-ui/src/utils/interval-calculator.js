// Copyright (c) 2021 The Jaeger Authors.
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

const millisecond = 1000;
const second = 1000 +  millisecond;
const minute = 60 *  second
const hour = 60 *  minute;
const day = 24 *  hour;
const week = 7 *  day;

const intervalMin= [
  [second * 0.5, second * 0.1], // < 0.5s
  [second * 5, second * 1], // < 5s
  [second * 7.5, second * 5], // < 7.5s
  [second * 15, second * 10], // < 15s
  [second * 45, second * 30], // < 45s
  [minute * 3, minute * 1], // < 3m
  [minute * 9, minute * 5], // < 9m
  [minute * 20, minute * 10], // < 20m
  [minute * 45, minute * 30], // < 45m
  [hour * 2, hour * 1], // < 2h
  [hour * 6, hour * 3], // < 6h
  [hour * 24, hour * 12], // < 24h
  [day * 2, day * 1], // < 2d
  [week, day * 2], // < 1w
];

const roundInterval = interval => {
  let chosen = [day * 2, day * 1];

  intervalMin.forEach(limit => {
    if (interval < limit[0]) {
      chosen = limit;
    }
  });

  return chosen;
};

const getIntervalMilliSecond = (timeRange, size = 200) => roundInterval(timeRange / size)[1];

export const intervalCalculatorService = {
  getIntervalMilliSecond,
};
