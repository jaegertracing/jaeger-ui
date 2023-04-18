// Copyright (c) 2023 The Jaeger Authors.
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

  const second = 1000;
  const minute = 60 * second;
  const hour = 60 * minute;
  const day = 24 * hour;

const intervalMin = [
  [second * 1, second * 2.5], // < 1s
  [second * 5, second * 1], // < 5s
  [second * 10, second * 5], // < 10s
  [second * 30, second * 10], // < 30s
  [minute * 1, second * 30], // < 1m
  [minute * 3, minute * 1], // < 3m
  [minute * 5, minute * 2], // < 5m
  [minute * 10, minute * 5], // < 10m
  [minute * 40, minute * 10], // < 40m
  [hour * 1, minute * 30], // < 1h
  [hour * 2, hour * 1], // < 2h
  [hour * 6, hour * 3], // < 6h
];

const roundInterval = (interval: number) => {
  const defaultInterval = [minute * 10, minute * 5];

  const chosenInterval = intervalMin.find(limit => interval < limit[0]);

  return chosenInterval || defaultInterval;
};

export const getIntervalMilliSecond = (timeRange: number, size: number) => roundInterval(timeRange / size)[1];
