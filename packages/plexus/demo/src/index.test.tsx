// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock antd components to avoid full antd rendering in jsdom.
jest.mock('antd', () => {
  const React = require('react');
  function MockTabs({ items }: { items: { key: string; label: string; children: React.ReactNode }[] }) {
    return React.createElement(
      'div',
      { 'data-testid': 'tabs-stub' },
      items.map((item: { key: string; label: string; children: React.ReactNode }) =>
        React.createElement('div', { key: item.key, 'data-testid': `tab-${item.key}` }, [
          React.createElement('span', { key: 'label' }, item.label),
          React.createElement('div', { key: 'content' }, item.children),
        ])
      )
    );
  }
  function MockRadioGroup({ children }: { children: React.ReactNode }) {
    return React.createElement('div', { 'data-testid': 'radio-group' }, children);
  }
  function MockRadioButton({ children, value }: { children: React.ReactNode; value: string }) {
    return React.createElement('label', { 'data-testid': `radio-${value}` }, children);
  }
  const Radio = () => null;
  Radio.Group = MockRadioGroup;
  Radio.Button = MockRadioButton;
  return { Tabs: MockTabs, Radio };
});

// Mock LayoutManager and Digraph from the plexus library so:
//   - LayoutManager never creates Web Workers (which use import.meta.url and
//     are unavailable in jsdom)
//   - Digraph never triggers DOM measurement APIs (getBBox, ResizeObserver…)
//     that are unavailable in jsdom
// We only test that the Demo's static HTML structure (section headings) is
// present, not the actual graph rendering.
jest.mock('../../src', () => {
  const React = require('react');

  function MockDigraph() {
    return React.createElement('div', { 'data-testid': 'digraph-stub' });
  }
  MockDigraph.propsFactories = {
    classNameIsSmall: jest.fn(),
    scaleStrokeOpacity: jest.fn(),
    scaleStrokeOpacityStrong: jest.fn(),
    scaleStrokeOpacityStrongest: jest.fn(),
  };

  return {
    LayoutManager: jest.fn().mockImplementation(() => ({
      getLayout: jest.fn(() => ({
        layout: new Promise(() => {}),
        positions: new Promise(() => {}),
      })),
      stopAndRelease: jest.fn(),
    })),
    Digraph: MockDigraph,
  };
});

// Import after the mocks so Demo picks up the stubs.
import Demo from './index';

describe('Plexus Demo', () => {
  it('renders without crashing', () => {
    expect(() => render(<Demo />)).not.toThrow();
  });

  it('renders the page title', () => {
    render(<Demo />);
    expect(screen.getByText('Plexus Demo')).toBeInTheDocument();
  });

  it('renders tab labels', () => {
    render(<Demo />);
    expect(screen.getByText('HTML node effects')).toBeInTheDocument();
    expect(screen.getByText('SVG node effects')).toBeInTheDocument();
    expect(screen.getByText('Measurable SVG nodes')).toBeInTheDocument();
    expect(screen.getByText('Neato edges (TB)')).toBeInTheDocument();
    expect(screen.getByText('Medium DAG')).toBeInTheDocument();
  });

  it('renders graph placeholder containers', () => {
    const { getAllByTestId } = render(<Demo />);
    expect(getAllByTestId('digraph-stub').length).toBeGreaterThan(0);
  });

  it('renders tabs container', () => {
    const { getByTestId } = render(<Demo />);
    expect(getByTestId('tabs-stub')).toBeInTheDocument();
  });
});
