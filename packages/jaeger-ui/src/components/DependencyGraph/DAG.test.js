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
import '@testing-library/jest-dom';
import { LayoutManager } from '@jaegertracing/plexus';
import DAG, {
  renderNode,
  handleViewTraces,
  createHandleNodeClick,
  createHandleCanvasClick,
  createMenuItems,
} from './DAG';
import { DAG_MAX_NUM_SERVICES } from '../../constants';
import * as urlModule from '../SearchTracePage/url';

// Mock useEffect to handle cleanup functions and uiFind match count
jest.spyOn(React, 'useEffect').mockImplementation(f => {
  const cleanup = f();
  return () => {
    if (typeof cleanup === 'function') {
      cleanup();
    }
  };
});

jest.spyOn(React, 'useState').mockImplementation(initialValue => [initialValue, jest.fn()]);

jest.spyOn(React, 'useRef').mockImplementation(() => ({ current: null }));

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
    jest.clearAllMocks();
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
    const digraph = element.props.children[0];
    expect(digraph.props.vertices).toHaveLength(2);
    expect(digraph.props.edges).toHaveLength(1);
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
    const digraph = element.props.children[0];

    // Empty or blank strings getting skipped is desirable
    // But should not cause the component to break
    expect(digraph.props.vertices).toHaveLength(0);
    expect(digraph.props.edges).toHaveLength(0);
  });

  it('shows filtered graph when selectedService and selectedDepth are provided', () => {
    const serviceCalls = [
      { parent: 'service-a', child: 'service-b', callCount: 1 },
      { parent: 'service-b', child: 'service-c', callCount: 2 },
      { parent: 'service-c', child: 'service-d', callCount: 3 },
      { parent: 'service-x', child: 'service-y', callCount: 4 },
    ];

    renderer.render(
      <DAG serviceCalls={serviceCalls} selectedService="service-a" selectedDepth={2} selectedLayout="dot" />
    );
    const element = renderer.getRenderOutput();
    const digraph = element.props.children[0];
    expect(digraph.props.vertices).toHaveLength(3);
    expect(digraph.props.edges).toHaveLength(2);
  });

  it('handles bidirectional connections in depth filtering', () => {
    const serviceCalls = [
      { parent: 'service-a', child: 'service-b', callCount: 1 },
      { parent: 'service-c', child: 'service-b', callCount: 2 },
    ];

    renderer.render(
      <DAG serviceCalls={serviceCalls} selectedService="service-b" selectedDepth={1} selectedLayout="dot" />
    );
    const element = renderer.getRenderOutput();
    const digraph = element.props.children[0];
    expect(digraph.props.vertices).toHaveLength(3);
    expect(digraph.props.edges).toHaveLength(2);
  });

  it('respects depth limit', () => {
    const serviceCalls = [
      { parent: 'service-a', child: 'service-b', callCount: 1 },
      { parent: 'service-b', child: 'service-c', callCount: 2 },
      { parent: 'service-c', child: 'service-d', callCount: 3 },
    ];

    renderer.render(
      <DAG serviceCalls={serviceCalls} selectedService="service-a" selectedDepth={1} selectedLayout="dot" />
    );
    const element = renderer.getRenderOutput();
    const digraph = element.props.children[0];
    expect(digraph.props.vertices).toHaveLength(2);
    expect(digraph.props.edges).toHaveLength(1);
  });

  it('uses sfdp layout for large graphs', () => {
    const serviceCalls = Array.from({ length: 101 }, (_, i) => ({
      parent: `service-${i}`,
      child: `service-${i + 1}`,
      callCount: 1,
    }));

    renderer.render(<DAG serviceCalls={serviceCalls} selectedLayout="sfdp" />);
    const element = renderer.getRenderOutput();
    const digraph = element.props.children[0];
    expect(digraph.props.layoutManager.options).toMatchObject({
      engine: 'sfdp',
      dpi: expect.any(Number),
    });
  });

  it('uses dot layout for small graphs', () => {
    const serviceCalls = [
      { parent: 'service-a', child: 'service-b', callCount: 1 },
      { parent: 'service-b', child: 'service-c', callCount: 2 },
    ];

    renderer.render(<DAG serviceCalls={serviceCalls} selectedLayout="dot" />);
    const element = renderer.getRenderOutput();
    const digraph = element.props.children[0];
    expect(digraph.props.layoutManager.options).toMatchObject({
      nodesep: 1.5,
      ranksep: 1.6,
      rankdir: 'TB',
      splines: 'polyline',
      useDotEdges: true,
    });
  });

  it('handles empty serviceCalls array', () => {
    renderer.render(<DAG serviceCalls={[]} selectedLayout="dot" />);
    const element = renderer.getRenderOutput();
    const digraph = element.props.children[0];
    expect(digraph.props.vertices).toHaveLength(0);
    expect(digraph.props.edges).toHaveLength(0);
  });

  it('shows error message when too many services to render', () => {
    const serviceCalls = Array.from({ length: DAG_MAX_NUM_SERVICES + 1 }, (_, i) => ({
      parent: `service-${i}`,
      child: `service-${i + 1}`,
      callCount: 1,
    }));

    renderer.render(<DAG serviceCalls={serviceCalls} selectedLayout="dot" />);
    const element = renderer.getRenderOutput();

    expect(element.type).toBe('div');
    expect(element.props.className).toBe('DAG');
    expect(element.props.children.type).toBe('div');
    expect(element.props.children.props.className).toBe('DAG--error');
  });

  it('calls onMatchCountChange with correct count when uiFind is provided', () => {
    const onMatchCountChange = jest.fn();
    const serviceCalls = [
      { parent: 'test-service', child: 'other-service', callCount: 1 },
      { parent: 'test-service-2', child: 'other-service-2', callCount: 1 },
    ];

    renderer.render(
      <DAG
        serviceCalls={serviceCalls}
        uiFind="test"
        onMatchCountChange={onMatchCountChange}
        selectedLayout="dot"
        selectedDepth={1}
        selectedService=""
      />
    );
    expect(onMatchCountChange).toHaveBeenCalledWith(2);
  });

  it('calls onMatchCountChange with 0 when uiFind is not provided', () => {
    const onMatchCountChange = jest.fn();
    const serviceCalls = [
      { parent: 'test-service', child: 'other-service', callCount: 1 },
      { parent: 'test-service-2', child: 'other-service-2', callCount: 1 },
    ];

    renderer.render(
      <DAG
        serviceCalls={serviceCalls}
        onMatchCountChange={onMatchCountChange}
        selectedLayout="dot"
        selectedDepth={1}
        selectedService=""
      />
    );
    expect(onMatchCountChange).toHaveBeenCalledWith(0);
  });

  it('correctly passes selectedService and uiFind to renderNode in Digraph layers', () => {
    const serviceCalls = [{ parent: 'test-service', child: 'other-service', callCount: 1 }];
    const selectedService = 'test-service';
    const uiFind = 'test';

    renderer.render(
      <DAG
        serviceCalls={serviceCalls}
        selectedService={selectedService}
        selectedLayout="dot"
        selectedDepth={1}
        uiFind={uiFind}
      />
    );
    const element = renderer.getRenderOutput();
    const digraph = element.props.children[0];
    const renderNodeFn = digraph.props.layers[1].renderNode;
    const result = renderNodeFn({ key: 'test-service' });

    expect(result.props.children[1].props.className).toBe('DAG--nodeLabel');
    expect(result.props.children[0].props.className).toContain('is-focalNode');
    expect(result.props.children[0].props.className).toContain('is-match');
  });

  it('defaults serviceCalls to empty array when not provided', () => {
    renderer.render(<DAG selectedLayout="dot" selectedDepth={1} selectedService="" />);
    const element = renderer.getRenderOutput();
    const digraph = element.props.children[0];
    expect(digraph.props.vertices).toHaveLength(0);
    expect(digraph.props.edges).toHaveLength(0);
  });
});

describe('renderNode', () => {
  it('correctly displays the vertex key', async () => {
    const vertex = {
      key: 'Test',
    };

    render(renderNode(vertex, null));

    const element = await screen.findByTestId('dagNodeLabel');

    expect(element.textContent).toBe('Test');
  });

  it('correctly displays the vertex key if it is number', async () => {
    const vertex = {
      key: 2,
    };

    render(renderNode(vertex, null));

    const element = await screen.findByTestId('dagNodeLabel');

    expect(element.textContent).toBe('2');
  });

  it('displays nothing if vertext is undefined', () => {
    const vertex = undefined;
    const result = renderNode(vertex, null);
    expect(result).toBeNull();
  });

  it('displays nothing if vertext is null', () => {
    const vertex = null;
    const result = renderNode(vertex, null);
    expect(result).toBeNull();
  });

  it('displays nothing if vertext key is undefined', async () => {
    const vertex = {
      key: undefined,
    };

    render(renderNode(vertex, null));

    const element = await screen.findByTestId('dagNodeLabel');

    expect(element.textContent).toBe('');
  });

  it('displays nothing if vertext key is null', async () => {
    const vertex = {
      key: null,
    };

    render(renderNode(vertex, null));

    const element = await screen.findByTestId('dagNodeLabel');

    expect(element.textContent).toBe('');
  });

  it('should call onClick when provided', () => {
    const vertex = { key: 'test-service' };
    const event = { clientX: 100, clientY: 200 };
    const onClick = jest.fn();
    const uiFind = '';

    const result = renderNode(vertex, null, uiFind, null, null, onClick);
    result.props.onClick(event);

    expect(onClick).toHaveBeenCalledWith(vertex, event);
  });

  it('should handle onMouseEnter with optional chaining when onMouseEnter is undefined', () => {
    const vertex = { key: 'test-service' };
    const event = { clientX: 100, clientY: 200 };
    const uiFind = '';

    const result = renderNode(vertex, null, uiFind, undefined);

    expect(() => result.props.onMouseEnter(event)).not.toThrow();
  });
});

describe('clean up', () => {
  let renderer;

  beforeEach(() => {
    renderer = new ShallowRenderer();
    jest.clearAllMocks();
  });

  it('stops LayoutManager before unmounting', () => {
    const stopAndReleaseSpy = jest.spyOn(LayoutManager.prototype, 'stopAndRelease');
    renderer.render(<DAG serviceCalls={[]} />);
    const cleanupFunctions = React.useEffect.mock.results
      .map(result => result.value)
      .filter(fn => typeof fn === 'function');

    cleanupFunctions.forEach(cleanup => cleanup());

    expect(stopAndReleaseSpy).toHaveBeenCalledTimes(1);
  });
});

describe('handleViewTraces', () => {
  let windowOpenSpy;
  let getSearchUrlSpy;

  beforeEach(() => {
    windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => {});
    getSearchUrlSpy = jest.spyOn(urlModule, 'getUrl').mockReturnValue('http://test-url');
  });

  afterEach(() => {
    windowOpenSpy.mockRestore();
    getSearchUrlSpy.mockRestore();
  });

  it('should open a new window with the correct URL when a node is provided', () => {
    const hoveredNode = { key: 'test-service' };

    handleViewTraces(hoveredNode);

    expect(getSearchUrlSpy).toHaveBeenCalledWith({ service: 'test-service' });
    expect(windowOpenSpy).toHaveBeenCalledWith('http://test-url', '_blank');
  });

  it('should handle null node gracefully', () => {
    handleViewTraces(null);

    expect(getSearchUrlSpy).toHaveBeenCalledWith({ service: undefined });
    expect(windowOpenSpy).toHaveBeenCalledWith('http://test-url', '_blank');
  });
});

describe('handleNodeClick and handleCanvasClick', () => {
  let setHoveredNodeMock;
  let setMenuPositionMock;
  let setIsMenuVisibleMock;

  beforeEach(() => {
    setHoveredNodeMock = jest.fn();
    setMenuPositionMock = jest.fn();
    setIsMenuVisibleMock = jest.fn();
  });

  it('should toggle menu visibility when clicking the same node', () => {
    const vertex = { key: 'test-service' };
    const event = {
      stopPropagation: jest.fn(),
      clientX: 100,
      clientY: 200,
    };

    const handleNodeClick = createHandleNodeClick(
      null,
      setHoveredNodeMock,
      setMenuPositionMock,
      setIsMenuVisibleMock
    );
    handleNodeClick(vertex, event);

    expect(event.stopPropagation).toHaveBeenCalled();
    expect(setHoveredNodeMock).toHaveBeenCalledWith(vertex);
    expect(setMenuPositionMock).toHaveBeenCalledWith({ x: 100, y: 200 });
    expect(setIsMenuVisibleMock).toHaveBeenCalledWith(true);

    setHoveredNodeMock.mockClear();
    setMenuPositionMock.mockClear();
    setIsMenuVisibleMock.mockClear();
    event.stopPropagation.mockClear();

    const handleNodeClickWithHoveredNode = createHandleNodeClick(
      vertex,
      setHoveredNodeMock,
      setMenuPositionMock,
      setIsMenuVisibleMock
    );
    handleNodeClickWithHoveredNode(vertex, event);

    expect(event.stopPropagation).toHaveBeenCalled();
    expect(setHoveredNodeMock).toHaveBeenCalledWith(null);
    expect(setMenuPositionMock).toHaveBeenCalledWith(null);
    expect(setIsMenuVisibleMock).toHaveBeenCalledWith(false);
  });

  it('should close menu when clicking canvas', () => {
    const handleCanvasClick = createHandleCanvasClick(
      setHoveredNodeMock,
      setMenuPositionMock,
      setIsMenuVisibleMock
    );
    handleCanvasClick();

    expect(setIsMenuVisibleMock).toHaveBeenCalledWith(false);
    expect(setHoveredNodeMock).toHaveBeenCalledWith(null);
    expect(setMenuPositionMock).toHaveBeenCalledWith(null);
  });
});

describe('createMenuItems', () => {
  it('should return empty array when hoveredNode is null', () => {
    const result = createMenuItems(null);
    expect(result).toEqual([]);
  });

  it('should return menu items when hoveredNode is provided', () => {
    const hoveredNode = { key: 'test-service' };
    const onServiceSelect = jest.fn();

    const result = createMenuItems(hoveredNode, onServiceSelect);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('set-focus');
    expect(result[0].label).toBe('Set focus');
    expect(result[1].id).toBe('view-traces');
    expect(result[1].label).toBe('View traces');

    result[0].onClick();
    expect(onServiceSelect).toHaveBeenCalledWith('test-service');

    const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => {});
    result[1].onClick();
    expect(windowOpenSpy).toHaveBeenCalled();
    windowOpenSpy.mockRestore();
  });
});

describe('DAGMenu', () => {
  let renderer;

  beforeEach(() => {
    renderer = new ShallowRenderer();
  });

  it('should render menu when all conditions are met', () => {
    const menuPosition = { x: 100, y: 200 };
    const hoveredNode = { key: 'test-service' };
    const isMenuVisible = true;
    const menuItems = [
      { id: 'set-focus', label: 'Set focus', icon: <div />, onClick: jest.fn() },
      { id: 'view-traces', label: 'View traces', icon: <div />, onClick: jest.fn() },
    ];

    const DAGComponent = renderer.render(
      <DAG serviceCalls={[]} selectedLayout="dot" selectedDepth={1} selectedService="" />
    );

    const DAGMenuComponent = DAGComponent.props.children[1];

    const result = DAGMenuComponent.type({
      menuPosition,
      hoveredNode,
      isMenuVisible,
      menuItems,
    });

    expect(result).toBeTruthy();
    expect(result.props.role).toBe('menu');
    expect(result.props.style).toEqual({
      position: 'fixed',
      left: 100,
      top: 190,
      zIndex: 1000,
      pointerEvents: 'auto',
    });

    const renderedMenuItems = result.props.children.props.items;
    expect(renderedMenuItems).toEqual(menuItems);
  });

  it('should not render menu when any condition is not met', () => {
    const DAGComponent = renderer.render(
      <DAG serviceCalls={[]} selectedLayout="dot" selectedDepth={1} selectedService="" />
    );

    const DAGMenuComponent = DAGComponent.props.children[1];

    const result1 = DAGMenuComponent.type({
      menuPosition: null,
      hoveredNode: { key: 'test-service' },
      isMenuVisible: true,
      menuItems: [],
    });
    expect(result1).toBeNull();

    const result2 = DAGMenuComponent.type({
      menuPosition: { x: 100, y: 200 },
      hoveredNode: null,
      isMenuVisible: true,
      menuItems: [],
    });
    expect(result2).toBeNull();

    const result3 = DAGMenuComponent.type({
      menuPosition: { x: 100, y: 200 },
      hoveredNode: { key: 'test-service' },
      isMenuVisible: false,
      menuItems: [],
    });
    expect(result3).toBeNull();
  });
});
