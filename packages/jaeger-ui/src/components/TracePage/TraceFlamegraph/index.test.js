// Copyright (c) 2022 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { convertJaegerTraceToProfile } from '@pyroscope/flamegraph';
import TraceFlamegraph from './index';
import testTrace from './testTrace.json';
import { useThemeMode } from '../../App/ThemeProvider';

// Mock the ThemeProvider
jest.mock('../../App/ThemeProvider', () => ({
  useThemeMode: jest.fn(),
}));

// Mock the FlamegraphRenderer component
jest.mock('@pyroscope/flamegraph', () => {
  const originalModule = jest.requireActual('@pyroscope/flamegraph');
  return {
    ...originalModule, // Keep original convertJaegerTraceToProfile

    FlamegraphRenderer: jest.fn(({ profile, colorMode }) => (
      <div data-testid="flamegraph-renderer" data-color-mode={colorMode}>
        {profile ? `Profile Loaded - Units: ${profile.metadata?.units}` : 'No Profile Data'}
      </div>
    )),
  };
});

// Re-import FlamegraphRenderer after mocking

const { FlamegraphRenderer } = require('@pyroscope/flamegraph');

const profile = convertJaegerTraceToProfile(testTrace.data);

describe('convertJaegerTraceToProfile', () => {
  it('returns correct profile format', () => {
    expect(profile.version).toBe(1);

    expect(Array.isArray(profile.flamebearer.levels)).toBe(true);
    expect(profile.flamebearer.levels[0].every(el => typeof el === 'number')).toBe(true);
    expect(Array.isArray(profile.flamebearer.names)).toBe(true);
    expect(profile.flamebearer.names.every(el => typeof el === 'string')).toBe(true);
    expect(typeof profile.flamebearer.numTicks).toBe('number');

    expect(typeof profile.metadata.format).toBe('string');
    expect(typeof profile.metadata.sampleRate).toBe('number');
    expect(typeof profile.metadata.spyName).toBe('string');
    expect(typeof profile.metadata.units).toBe('string');
  });
});

describe('<TraceFlamegraph />', () => {
  beforeEach(() => {
    FlamegraphRenderer.mockClear();
    useThemeMode.mockReturnValue({ mode: 'light' });
  });

  it('renders the flamegraph wrapper', () => {
    render(<TraceFlamegraph trace={testTrace} />);
    expect(screen.getByTestId('flamegraph-wrapper')).toBeInTheDocument();
  });

  it('renders the FlamegraphRenderer with converted profile when trace is provided', () => {
    render(<TraceFlamegraph trace={testTrace} />);

    // Check if the mocked renderer is in the document
    const renderer = screen.getByTestId('flamegraph-renderer');
    expect(renderer).toBeInTheDocument();

    // Check if the mocked renderer received the profile
    expect(FlamegraphRenderer).toHaveBeenCalledTimes(1);
    const receivedProps = FlamegraphRenderer.mock.calls[0][0];
    expect(receivedProps.profile).toBeDefined();
    expect(receivedProps.profile.metadata.units).toEqual(profile.metadata.units); // Check if correct profile was passed

    // Check the content rendered by the mock based on the profile
    expect(renderer).toHaveTextContent(`Profile Loaded - Units: ${profile.metadata.units}`);
  });

  it('renders the FlamegraphRenderer with null profile when trace is not provided', () => {
    render(<TraceFlamegraph trace={null} />);

    // Check if the mocked renderer is in the document
    const renderer = screen.getByTestId('flamegraph-renderer');
    expect(renderer).toBeInTheDocument();

    // Check if the mocked renderer received null profile
    expect(FlamegraphRenderer).toHaveBeenCalledTimes(1);
    const receivedProps = FlamegraphRenderer.mock.calls[0][0];
    expect(receivedProps.profile).toBeNull();

    // Check the content rendered by the mock for no profile
    expect(renderer).toHaveTextContent('No Profile Data');
  });

  it('renders the FlamegraphRenderer with null profile when trace data is missing', () => {
    render(<TraceFlamegraph trace={{}} />); // trace without 'data' property

    // Check if the mocked renderer is in the document
    const renderer = screen.getByTestId('flamegraph-renderer');
    expect(renderer).toBeInTheDocument();

    // Check if the mocked renderer received null profile
    expect(FlamegraphRenderer).toHaveBeenCalledTimes(1);
    const receivedProps = FlamegraphRenderer.mock.calls[0][0];
    expect(receivedProps.profile).toBeNull();

    // Check the content rendered by the mock for no profile
    expect(renderer).toHaveTextContent('No Profile Data');
  });

  it('passes light colorMode to FlamegraphRenderer in light mode', () => {
    useThemeMode.mockReturnValue({ mode: 'light' });
    render(<TraceFlamegraph trace={testTrace} />);

    const renderer = screen.getByTestId('flamegraph-renderer');
    expect(renderer).toHaveAttribute('data-color-mode', 'light');

    const receivedProps = FlamegraphRenderer.mock.calls[0][0];
    expect(receivedProps.colorMode).toBe('light');
  });

  it('passes dark colorMode to FlamegraphRenderer in dark mode', () => {
    useThemeMode.mockReturnValue({ mode: 'dark' });
    render(<TraceFlamegraph trace={testTrace} />);

    const renderer = screen.getByTestId('flamegraph-renderer');
    expect(renderer).toHaveAttribute('data-color-mode', 'dark');

    const receivedProps = FlamegraphRenderer.mock.calls[0][0];
    expect(receivedProps.colorMode).toBe('dark');
  });
});
