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
import { mount } from 'enzyme';
import DAG from './DAG';

// mock canvas API (we don't care about canvas results)

window.HTMLCanvasElement.prototype.getContext = function getContext() {
  return {
    fillRect() {},
    clearRect() {},
    getImageData(x, y, w, h) {
      return {
        data: new Array(w * h * 4),
      };
    },
    putImageData() {},
    createImageData() {
      return [];
    },
    setTransform() {},
    drawImage() {},
    save() {},
    fillText() {},
    restore() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    closePath() {},
    stroke() {},
    translate() {},
    scale() {},
    rotate() {},
    arc() {},
    fill() {},
    measureText() {
      return { width: 0 };
    },
    transform() {},
    rect() {},
    clip() {},
  };
};
describe('<DAG>', () => {
  it('does not explode', () => {
    const serviceCalls = [
      {
        callCount: 1,
        child: 'child-id',
        parent: 'parent-id',
      },
    ];
    expect(mount(<DAG serviceCalls={serviceCalls} />)).toBeDefined();
  });

  it('does not explode with empty strings or string with only spaces', () => {
    const serviceCalls = [
      {
        callCount: 1,
        child: '',
        parent: ' ',
      },
    ];
    expect(mount(<DAG serviceCalls={serviceCalls} />)).toBeDefined();
  });
});
