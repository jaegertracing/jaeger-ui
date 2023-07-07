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

const startTime = 1579070675083000;

const criticalPathSections = [
  {
    spanId: '150c193cf155b46b',
    section_start: startTime + 3319,
    section_end: startTime + 4902,
  },
  {
    spanId: '22be69e72cbcde0b',
    section_start: startTime + 2939,
    section_end: startTime + 3319,
  },
  {
    spanId: 'e821b549888cbc3b',
    section_start: startTime + 2892,
    section_end: startTime + 2939,
  },
  {
    spanId: '622a5079b565623e',
    section_start: startTime + 2840,
    section_end: startTime + 2892,
  },
  {
    spanId: 'e821b549888cbc3b',
    section_start: startTime + 2080,
    section_end: startTime + 2840,
  },
  {
    spanId: '4085dddb47429851',
    section_start: startTime + 2059,
    section_end: startTime + 2080,
  },
  {
    spanId: 'e821b549888cbc3b',
    section_start: startTime + 1200,
    section_end: startTime + 2059,
  },
  {
    spanId: '22be69e72cbcde0b',
    section_start: startTime + 820,
    section_end: startTime + 1200,
  },
  {
    spanId: '150c193cf155b46b',
    section_start: startTime,
    section_end: startTime + 820,
  },
];

export default criticalPathSections;