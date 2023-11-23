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
import ShallowRenderer from 'react-test-renderer/shallow';
import { render, screen } from '@testing-library/react';
import DAG, { renderNode } from './DAG';

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
  let renderer;

  beforeEach(() => {
    renderer = new ShallowRenderer();
  });

  it('shows correct number of nodes and vertices', () => {
    const serviceCalls = [
      {
        callCount: 1,
        child: 'child-id',
        parent: 'parent-id',
      },
    ];

    renderer.render(<DAG serviceCalls={serviceCalls} />);
    const element = renderer.getRenderOutput();

    expect(element.props.children.props.vertices.length).toBe(2);
    expect(element.props.children.props.edges.length).toBe(1);
  });

  it('does not show nodes with empty strings or string with only spaces', () => {
    const serviceCalls = [
      {
        callCount: 1,
        child: '',
        parent: ' ',
      },
    ];

    renderer.render(<DAG serviceCalls={serviceCalls} />);
    const element = renderer.getRenderOutput();

    // Empty or blank strings getting skipped is desirable
    // But should not cause the component to break
    expect(element.props.children.props.vertices.length).toBe(0);
    expect(element.props.children.props.edges.length).toBe(0);
  });
});

describe('renderNode', () => {
  it('correctly displays the vertex key', async () => {
    const vertex = {
      key: 'Test',
    };

    render(renderNode(vertex));

    const element = await screen.findByTestId('dagNodeLabel');

    expect(element.textContent).toBe('Test');
  });

  it('correctly displays the vertex key if it is number', async () => {
    const vertex = {
      key: 2,
    };

    render(renderNode(vertex));

    const element = await screen.findByTestId('dagNodeLabel');

    expect(element.textContent).toBe('2');
  });

  it('displays nothing if vertext is undefined', async () => {
    const vertex = undefined;

    render(renderNode(vertex));

    const element = await screen.findByTestId('dagNodeLabel');

    expect(element.textContent).toBe('');
  });

  it('displays nothing if vertext is null', async () => {
    const vertex = null;

    render(renderNode(vertex));

    const element = await screen.findByTestId('dagNodeLabel');

    expect(element.textContent).toBe('');
  });

  it('displays nothing if vertext key is undefined', async () => {
    const vertex = {
      key: undefined,
    };

    render(renderNode(vertex));

    const element = await screen.findByTestId('dagNodeLabel');

    expect(element.textContent).toBe('');
  });

  it('displays nothing if vertext key is null', async () => {
    const vertex = {
      key: null,
    };

    render(renderNode(vertex));

    const element = await screen.findByTestId('dagNodeLabel');

    expect(element.textContent).toBe('');
  });
});
