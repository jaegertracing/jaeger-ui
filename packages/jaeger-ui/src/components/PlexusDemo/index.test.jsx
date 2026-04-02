// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the plexus demo module so the test does not depend on the plexus
// package build and avoids Web Worker creation in jsdom.
// { virtual: true } is required because the module is resolved by a Vite alias
// at build time but does not exist as a real path in node_modules.
jest.mock(
  '@jaegertracing/plexus/demo',
  () => ({
    __esModule: true,
    default: function PlexusDemoStub() {
      return <div data-testid="plexus-demo-content">Plexus Demo</div>;
    },
  }),
  { virtual: true }
);

// Import after the mock is registered.
const { default: PlexusDemo } = require('./index');

describe('PlexusDemo', () => {
  it('renders without crashing', () => {
    expect(() => render(<PlexusDemo />)).not.toThrow();
  });

  it('renders the plexus demo content', () => {
    render(<PlexusDemo />);
    expect(screen.getByTestId('plexus-demo-content')).toBeInTheDocument();
  });

  it('renders visible text content', () => {
    render(<PlexusDemo />);
    expect(screen.getByText('Plexus Demo')).toBeInTheDocument();
  });
});
