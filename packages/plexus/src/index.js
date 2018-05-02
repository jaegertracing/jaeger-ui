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

import React from 'react';

import LayoutManager from './LayoutManager';

const lm = new LayoutManager();

let hm = lm.getLayout(
  [
    { key: 0, width: 100, height: 76 },
    { key: 1, width: 100, height: 76 },
    { key: 2, width: 100, height: 76 },
    { key: 3, width: 100, height: 76 },
  ],
  [{ from: 0, to: 1 }, { from: 0, to: 2 }, { from: 1, to: 2 }, { from: 2, to: 3, isBidirectional: true }]
);

hm.positions.then(console.log);
hm.layout.then(console.log);

hm = lm.getLayout(
  [
    { key: 0, width: 100, height: 76 },
    { key: 1, width: 100, height: 76 },
    { key: 2, width: 100, height: 76 },
    { key: 3, width: 100, height: 76 },
  ],
  [{ from: 0, to: 1 }, { from: 0, to: 2 }, { from: 1, to: 2 }, { from: 2, to: 3, isBidirectional: true }]
);

hm.positions.then(console.log);
hm.layout.then(console.log);

export default function() {
  return (
    <div>
      <h2>Welcome to React components</h2>
    </div>
  );
}
