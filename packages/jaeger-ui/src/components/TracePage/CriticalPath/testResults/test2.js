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

/*
 + ┌───────────────────────────────────────────────────────────────────────┐+
 + │                               Span X                                  │+
 + └────┬───────┬───────────────────▲────────▲───────┬────────────▲────────┘+
 +++++++│+++++++│                   │        │+++++++│            │++++++++++
        ◄───────┼───────────────────┤        │+     +│            │+
        │       │ Span A            │        │+     +│            │+
        └───────┼──────┬──────▲─────┘        │+     +│            │+
               +│      │      │              │+     +│            │+
               +│      ◄──────┤              │+     +│            │+
               +│      │Span B│              │+     +│            │+
               +│      └──────┘              │+     +│            │+
               +│                            │+     +│            │+
               +└▲───────────────────────────┤+     +│            │+
               + │        Span C             │+     +│            │+
               + └───────────────────────────┘+     +|            │+
               ++++++++++++++++++++++++++++++++     +└►───────────┤+
                                                    ++│   Span D  │+
                                                    + └───────────┘+
                                                    ++++++++++++++++
                                                    
Here ++++++ is critical path
*/

const happyTraceCriticalPathSections = [
  {
    spanId: 'span-X',
    section_start: 9,
    section_end: 10,
  },
  {
    spanId: 'span-D',
    section_start: 8,
    section_end: 9,
  },
  {
    spanId: 'span-X',
    section_start: 7,
    section_end: 8,
  },
  {
    spanId: 'span-C',
    section_start: 3,
    section_end: 7,
  },
  {
    spanId: 'span-X',
    section_start: 1,
    section_end: 3,
  },
];

export default happyTraceCriticalPathSections;
