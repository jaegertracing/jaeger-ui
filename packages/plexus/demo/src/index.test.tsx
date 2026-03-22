// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

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

  it('renders the main Digraph section heading', () => {
    render(<Demo />);
    expect(screen.getByText('Digraph')).toBeInTheDocument();
  });

  it('renders the "Digraph with measurable SVG nodes" heading', () => {
    render(<Demo />);
    expect(screen.getByText('Digraph with measurable SVG nodes')).toBeInTheDocument();
  });

  it('renders the "Digraph with neato edges and rankdir = TB" heading', () => {
    render(<Demo />);
    expect(screen.getByText('Digraph with neato edges and rankdir = TB')).toBeInTheDocument();
  });

  it('renders the "Medium DAG" heading', () => {
    render(<Demo />);
    expect(screen.getByText('Medium DAG')).toBeInTheDocument();
  });

  it('renders graph placeholder containers', () => {
    const { getAllByTestId } = render(<Demo />);
    expect(getAllByTestId('digraph-stub').length).toBeGreaterThan(0);
  });
});
