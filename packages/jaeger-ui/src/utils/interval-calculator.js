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

const time = new (function() {
  this.second = 1000;
  this.minute = 60 * this.second;
  this.hour = 60 * this.minute;
  this.day = 24 * this.hour;
})();

const intervalMin = [
  [time.second * 1, time.second * 0.5], // < 1s
  [time.second * 5, time.second * 1], // < 5s
  [time.second * 10, time.second * 5], // < 10s
  [time.second * 30, time.second * 10], // < 30s
  [time.minute * 1, time.second * 30], // < 1m
  [time.minute * 3, time.minute * 1], // < 3m
  [time.minute * 5, time.minute * 2], // < 5m
  [time.minute * 10, time.minute * 5], // < 10m
  [time.minute * 40, time.minute * 10], // < 40m
  [time.hour * 1, time.minute * 30], // < 1h
  [time.hour * 2, time.hour * 1], // < 2h
  [time.hour * 6, time.hour * 3], // < 6h
];

const roundInterval = interval => {
  const defaultInterval = [time.minute * 10, time.minute * 5];

  const chosenInterval = intervalMin.find(limit => interval < limit[0]);

  return chosenInterval || defaultInterval;
};

const getIntervalMilliSecond = (timeRange, size) => roundInterval(timeRange / size)[1];

export const intervalCalculatorService = {
  getIntervalMilliSecond,
};
