// Copyright (c) 2018 The Jaeger Authors.
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
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

import transformTraceData from '../../../model/transform-trace-data';
import calculateTraceDagEV from './calculateTraceDagEV';
import TraceGraph, { setOnEdgePath } from './TraceGraph';

import testTrace from './testTrace.json';
import { LayoutManager } from '@jaegertracing/plexus';

jest.mock('@jaegertracing/plexus', () => {
  const React = require('react');

  class LayoutManagerMock {
    stopAndRelease() {}
  }

  const DigraphMock = React.forwardRef(() => {
    return <div data-testid="mock-digraph" />;
  });

  DigraphMock.propsFactories = {
    classNameIsSmall: () => ({}),
    scaleOpacity: () => ({}),
    scaleStrokeOpacity: () => ({}),
  };

  return {
    Digraph: DigraphMock,
    LayoutManager: LayoutManagerMock,
    cacheAs: (_key, fn) => fn,
  };
});

const transformedTrace = transformTraceData(testTrace);
const ev = calculateTraceDagEV(transformedTrace);

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});

describe('<TraceGraph>', () => {
  it('renders buttons and menu properly', () => {
    render(<TraceGraph headerHeight={60} ev={ev} uiFind={null} uiFindVertexKeys={null} />);
    expect(screen.getByRole('button', { name: 'S' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'T' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ST' })).toBeInTheDocument();
    expect(document.querySelector('.TraceGraph--menu')).toBeInTheDocument();
  });

  it('renders fallback when no trace is found', () => {
    render(<TraceGraph headerHeight={60} uiFind={null} uiFindVertexKeys={null} />);
    expect(screen.getByText('No trace found')).toBeInTheDocument();
  });

  it('calls toggleNodeMode with correct mode on button clicks', () => {
    render(<TraceGraph headerHeight={60} ev={ev} uiFind={null} uiFindVertexKeys={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'S' }));
    fireEvent.click(screen.getByRole('button', { name: 'T' }));
    fireEvent.click(screen.getByRole('button', { name: 'ST' }));
  });

  it('shows help content on clicking help icon', () => {
    const { container } = render(
      <TraceGraph headerHeight={60} ev={ev} uiFind={null} uiFindVertexKeys={null} />
    );
    const helpIcon = container.querySelector('svg');
    fireEvent.click(helpIcon);
    expect(screen.getByText('Help')).toBeInTheDocument();
  });

  it('closes help sidebar when close icon clicked', () => {
    const { container } = render(
      <TraceGraph headerHeight={60} ev={ev} uiFind={null} uiFindVertexKeys={null} />
    );
    const helpIcon = container.querySelector('svg');
    fireEvent.click(helpIcon);
    expect(screen.getByText('Help')).toBeInTheDocument();
    const closeBtn = container.querySelector('.ant-card-extra a');
    fireEvent.click(closeBtn);
    expect(screen.queryByText('Help')).not.toBeInTheDocument();
  });

  it('calls layoutManager.stopAndRelease() on unmount', () => {
    const stopAndReleaseMock = jest.fn();
    LayoutManager.prototype.stopAndRelease = stopAndReleaseMock;

    const { unmount } = render(
      <TraceGraph headerHeight={60} ev={ev} uiFind={null} uiFindVertexKeys={null} />
    );
    unmount();
    expect(stopAndReleaseMock).toHaveBeenCalledTimes(1);
  });

  it('returns correct edge styles from setOnEdgePath', () => {
    const edge1 = { from: 0, to: 1, followsFrom: true };
    expect(setOnEdgePath(edge1)).toEqual({ strokeDasharray: 4 });

    const edge2 = { from: 0, to: 1, followsFrom: false };
    expect(setOnEdgePath(edge2)).toEqual({});
  });
});
