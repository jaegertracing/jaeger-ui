import React, { Component } from 'react';

import LayoutManager from './LayoutManager';

const lm = new LayoutManager();

lm.getLayout([
  { key: 0, width: 1, height: 0.76 },
  { key: 1, width: 1, height: 0.76 },
  { key: 2, width: 1, height: 0.76 },
  { key: 3, width: 1, height: 0.76 },
],
  [
    { from: 0, to: 1 },
    { from: 0, to: 2 },
    { from: 1, to: 2 },
    { from: 2, to: 3, isBidirectional: true },
  ]);


export default class extends Component {
  render() {
    return (
      <div>
        <h2>Welcome to React components</h2>
      </div>
    );
  }
}
