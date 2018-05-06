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

import * as React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import { render } from 'react-dom';

// import large from './data-large.ignore';
import { colored, getColorNodeLabel, setOnColorEdge, setOnColorNode } from './data-small';
import { DirectedGraph, LayoutManager } from '../../src';

import './index.css';

const addAnAttr = () => ({ 'data-rando': Math.random() });

function Demo() {
  return (
    <div>
      <h1>plexus Demo</h1>
      <DirectedGraph
        layoutManager={new LayoutManager()}
        getNodeLabel={getColorNodeLabel}
        setOnEdgePath={setOnColorEdge}
        setOnNode={setOnColorNode}
        setOnEdgesContainer={addAnAttr}
        setOnNodesContainer={addAnAttr}
        setOnRoot={addAnAttr}
        {...colored}
      />
      {/* <DirectedGraph layoutManager={new LayoutManager()} {...large} /> */}
    </div>
  );
}

render(<Demo />, document.querySelector('#demo'));
