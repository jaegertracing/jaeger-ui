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

jest.mock('@jaegertracing/plexus', () => {
  const MockDigraph = jest.fn().mockImplementation(() => null);
  MockDigraph.propsFactories = {
    classNameIsSmall: jest.fn().mockReturnValue({ className: 'u-isSmall' }),
  };

  function MockLayoutManager(options) {
    this.options = options || {};
    this.stopAndRelease = jest.fn();
  }

  return {
    Digraph: MockDigraph,
    LayoutManager: MockLayoutManager,
  };
});

jest.mock('../common/ActionMenu/ActionsMenu', () => {
  return jest.fn().mockImplementation(() => null);
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Digraph, LayoutManager } from '@jaegertracing/plexus';
import ActionsMenu from '../common/ActionMenu/ActionsMenu';
import DAG, {
  renderNode,
  handleViewTraces,
  createHandleNodeClick,
  createHandleCanvasClick,
  createMenuItems,
  DAGMenu,
} from './DAG';
import { DAG_MAX_NUM_SERVICES } from '../../constants';
import * as urlModule from '../SearchTracePage/url';

Digraph.mockImplementation(props => (
  <div data-testid="digraph">
    <div data-testid="digraph-layers">{JSON.stringify(props.layers?.map(l => l.key))}</div>
    <div data-testid="digraph-vertices">{JSON.stringify(props.vertices?.map(v => v.key))}</div>
    <div data-testid="digraph-edges">{JSON.stringify(props.edges)}</div>
    <div data-testid="digraph-layoutManager-type">{props.layoutManager?.options?.engine || 'dot'}</div>
    {props.children}
  </div>
));

ActionsMenu.mockImplementation(props => <div data-testid="actions-menu">{JSON.stringify(props.items)}</div>);

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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows correct number of nodes and vertices', () => {
    const data = {
      nodes: [{ key: 'parent-id' }, { key: 'child-id' }],
      edges: [{ from: 'parent-id', to: 'child-id', label: '1' }],
    };

    render(<DAG data={data} />);

    const verticesData = screen.getByTestId('digraph-vertices');
    const edgesData = screen.getByTestId('digraph-edges');

    expect(verticesData.textContent).toContain('parent-id');
    expect(verticesData.textContent).toContain('child-id');
    expect(edgesData.textContent).toContain('parent-id');
    expect(edgesData.textContent).toContain('child-id');
  });

  it('does not show nodes with empty strings or string with only spaces', () => {
    const data = { nodes: [], edges: [] };

    render(<DAG data={data} />);

    const verticesData = screen.getByTestId('digraph-vertices');
    const edgesData = screen.getByTestId('digraph-edges');

    expect(verticesData.textContent).toBe('[]');
    expect(edgesData.textContent).toBe('[]');
  });

  it('shows filtered graph when selectedService and selectedDepth are provided', () => {
    const data = {
      nodes: [{ key: 'service-a' }, { key: 'service-b' }, { key: 'service-c' }],
      edges: [
        { from: 'service-a', to: 'service-b', label: '1' },
        { from: 'service-b', to: 'service-c', label: '2' },
      ],
    };

    render(<DAG data={data} selectedService="service-a" selectedDepth={2} selectedLayout="dot" />);

    const verticesData = screen.getByTestId('digraph-vertices');
    const edgesData = screen.getByTestId('digraph-edges');

    expect(verticesData.textContent).toContain('service-a');
    expect(verticesData.textContent).toContain('service-b');
    expect(verticesData.textContent).toContain('service-c');
    expect(edgesData.textContent).toContain('service-a');
    expect(edgesData.textContent).toContain('service-b');
    expect(edgesData.textContent).toContain('service-c');
  });

  it('handles bidirectional connections in depth filtering', () => {
    const data = {
      nodes: [{ key: 'service-a' }, { key: 'service-b' }, { key: 'service-c' }],
      edges: [
        { from: 'service-a', to: 'service-b', label: '1' },
        { from: 'service-c', to: 'service-b', label: '2' },
      ],
    };

    render(<DAG data={data} selectedService="service-b" selectedDepth={1} selectedLayout="dot" />);

    const verticesData = screen.getByTestId('digraph-vertices');
    const edgesData = screen.getByTestId('digraph-edges');

    expect(verticesData.textContent).toContain('service-a');
    expect(verticesData.textContent).toContain('service-b');
    expect(verticesData.textContent).toContain('service-c');
    expect(edgesData.textContent).toContain('service-a');
    expect(edgesData.textContent).toContain('service-b');
    expect(edgesData.textContent).toContain('service-c');
  });

  it('respects depth limit', () => {
    const data = {
      nodes: [{ key: 'service-a' }, { key: 'service-b' }],
      edges: [{ from: 'service-a', to: 'service-b', label: '1' }],
    };

    render(<DAG data={data} selectedService="service-a" selectedDepth={1} selectedLayout="dot" />);

    const verticesData = screen.getByTestId('digraph-vertices');
    const edgesData = screen.getByTestId('digraph-edges');

    expect(verticesData.textContent).toContain('service-a');
    expect(verticesData.textContent).toContain('service-b');
    expect(edgesData.textContent).toContain('service-a');
    expect(edgesData.textContent).toContain('service-b');
  });

  it('uses sfdp layout for large graphs', () => {
    const serviceCalls = Array.from({ length: 101 }, (_, i) => ({
      parent: `service-${i}`,
      child: `service-${i + 1}`,
      callCount: 1,
    }));
    const nodes = new Set();
    const edges = serviceCalls.map(call => {
      nodes.add(call.parent);
      nodes.add(call.child);
      return { from: call.parent, to: call.child, label: `${call.callCount}` };
    });
    const data = {
      nodes: Array.from(nodes).map(key => ({ key })),
      edges,
    };

    const originalUseMemo = React.useMemo;
    jest.spyOn(React, 'useMemo').mockImplementationOnce(() => {
      return new LayoutManager({ engine: 'sfdp' });
    });

    render(<DAG data={data} selectedLayout="sfdp" />);

    const layoutManagerType = screen.getByTestId('digraph-layoutManager-type');
    expect(layoutManagerType.textContent).toBe('sfdp');

    React.useMemo = originalUseMemo;
  });

  it('uses dot layout for small graphs', () => {
    const data = {
      nodes: [{ key: 'service-a' }, { key: 'service-b' }, { key: 'service-c' }],
      edges: [
        { from: 'service-a', to: 'service-b', label: '1' },
        { from: 'service-b', to: 'service-c', label: '2' },
      ],
    };

    render(<DAG data={data} selectedLayout="dot" />);

    const layoutManagerType = screen.getByTestId('digraph-layoutManager-type');
    expect(layoutManagerType.textContent).toBe('dot');
  });

  it('handles empty serviceCalls array', () => {
    render(<DAG data={{ nodes: [], edges: [] }} selectedLayout="dot" />);

    const verticesData = screen.getByTestId('digraph-vertices');
    const edgesData = screen.getByTestId('digraph-edges');

    expect(verticesData.textContent).toBe('[]');
    expect(edgesData.textContent).toBe('[]');
  });

  it('handles null or undefined maxDepth values', () => {
    const data = {
      nodes: [{ key: 'service-a' }, { key: 'service-b' }, { key: 'service-c' }],
      edges: [
        { from: 'service-a', to: 'service-b', label: '1' },
        { from: 'service-b', to: 'service-c', label: '2' },
      ],
    };

    render(<DAG data={data} selectedService="service-a" selectedDepth={null} selectedLayout="dot" />);

    const verticesData = screen.getByTestId('digraph-vertices');
    const edgesData = screen.getByTestId('digraph-edges');

    expect(verticesData.textContent).toContain('service-a');
    expect(verticesData.textContent).toContain('service-b');
    expect(verticesData.textContent).toContain('service-c');
    expect(edgesData.textContent).toContain('service-a');
    expect(edgesData.textContent).toContain('service-b');
    expect(edgesData.textContent).toContain('service-c');
  });

  it('shows error message when too many services to render', () => {
    const serviceCalls = Array.from({ length: DAG_MAX_NUM_SERVICES + 1 }, (_, i) => ({
      parent: `service-${i}`,
      child: `service-${i + 1}`,
      callCount: 1,
    }));

    const nodes = new Set();
    const edges = serviceCalls.map(call => {
      nodes.add(call.parent);
      nodes.add(call.child);
      return { from: call.parent, to: call.child, label: `${call.callCount}` };
    });
    const data = {
      nodes: Array.from(nodes).map(key => ({ key })),
      edges,
    };
    expect(data.nodes.length).toBeGreaterThan(DAG_MAX_NUM_SERVICES);

    render(<DAG data={data} selectedLayout="dot" selectedDepth={1} selectedService="" />);

    const errorMessage = screen.getByText(/Too many services to render/);
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage.className).toBe('DAG--error');
  });

  it('correctly passes selectedService and uiFind to renderNode in Digraph layers', () => {
    const selectedService = 'test-service';
    const uiFind = 'test';
    const vertex = { key: 'test-service' };

    const { container } = render(renderNode(vertex, selectedService, uiFind));

    const nodeCircle = container.querySelector('.DAG--nodeCircle');
    const nodeLabel = container.querySelector('.DAG--nodeLabel');

    expect(nodeCircle).toHaveClass('is-focalNode');
    expect(nodeCircle).toHaveClass('is-match');
    expect(nodeLabel).toHaveTextContent('test-service');
  });

  it('defaults serviceCalls to empty array when not provided', () => {
    render(<DAG data={{ nodes: [], edges: [] }} selectedLayout="dot" selectedDepth={1} selectedService="" />);

    const verticesData = screen.getByTestId('digraph-vertices');
    const edgesData = screen.getByTestId('digraph-edges');

    expect(verticesData.textContent).toBe('[]');
    expect(edgesData.textContent).toBe('[]');
  });

  it('invokes renderNode prop with correct arguments', () => {
    const data = {
      nodes: [{ key: 'test-node' }],
      edges: [],
    };

    let renderNodeFn;

    const originalMockImplementation = Digraph.mockImplementation;
    Digraph.mockImplementation(props => {
      renderNodeFn = props.layers?.find(l => l.key === 'nodes')?.renderNode;
      return <div data-testid="digraph-mock" />;
    });
    render(
      <DAG data={data} selectedLayout="dot" selectedDepth={1} selectedService="test-node" uiFind="test" />
    );

    Digraph.mockImplementation = originalMockImplementation;

    expect(typeof renderNodeFn).toBe('function');

    const mockVertex = { key: 'test-node' };
    const result = renderNodeFn(mockVertex);

    const { getByTestId } = render(result);
    expect(getByTestId('dagNodeLabel')).toHaveTextContent('test-node');
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

    const { container } = render(renderNode(vertex, null, uiFind, null, null, onClick));
    const nodeElement = container.querySelector('.DAG--node');

    fireEvent.click(nodeElement, event);

    expect(onClick).toHaveBeenCalled();
  });

  it('should handle onMouseEnter with optional chaining when onMouseEnter is undefined', () => {
    const vertex = { key: 'test-service' };
    const event = { clientX: 100, clientY: 200 };
    const uiFind = '';

    const { container } = render(renderNode(vertex, null, uiFind, undefined));
    const nodeElement = container.querySelector('.DAG--node');

    expect(() => fireEvent.mouseEnter(nodeElement, event)).not.toThrow();
  });
});

describe('clean up', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('stops LayoutManager before unmounting', () => {
    const stopAndReleaseMock = jest.fn();

    const mockLayoutManagerInstance = { stopAndRelease: stopAndReleaseMock, options: {} };

    jest.spyOn(React, 'useMemo').mockImplementation(() => mockLayoutManagerInstance);

    const { unmount } = render(
      <DAG data={{ nodes: [], edges: [] }} selectedLayout="dot" selectedDepth={1} selectedService="" />
    );

    unmount();

    expect(stopAndReleaseMock).toHaveBeenCalled();

    jest.restoreAllMocks();
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
  it('should render menu when all conditions are met', () => {
    const hoveredNode = { key: 'test-service' };
    const menuPosition = { x: 100, y: 200 };
    const isMenuVisible = true;
    const menuItems = [{ id: 'test-item', label: 'Test Item' }];

    render(
      <DAGMenu
        hoveredNode={hoveredNode}
        menuPosition={menuPosition}
        isMenuVisible={isMenuVisible}
        menuItems={menuItems}
      />
    );

    const menuElement = screen.getByRole('menu');
    expect(menuElement).toBeInTheDocument();
    expect(menuElement).toHaveStyle('left: 100px');
    expect(menuElement).toHaveStyle('top: 190px');
  });

  it('should not render menu when conditions are not met', () => {
    const menuItems = [{ id: 'test-item', label: 'Test Item' }];

    const { rerender } = render(
      <DAGMenu
        hoveredNode={null}
        menuPosition={{ x: 100, y: 200 }}
        isMenuVisible={true}
        menuItems={menuItems}
      />
    );
    expect(screen.queryByRole('menu')).toBeNull();

    rerender(
      <DAGMenu
        hoveredNode={{ key: 'test-service' }}
        menuPosition={null}
        isMenuVisible={true}
        menuItems={menuItems}
      />
    );
    expect(screen.queryByRole('menu')).toBeNull();

    rerender(
      <DAGMenu
        hoveredNode={{ key: 'test-service' }}
        menuPosition={{ x: 100, y: 200 }}
        isMenuVisible={false}
        menuItems={menuItems}
      />
    );
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
