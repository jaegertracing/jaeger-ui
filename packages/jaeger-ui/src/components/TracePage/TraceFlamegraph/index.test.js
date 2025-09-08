// Copyright (c) 2022 The Jaeger Authors.
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
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { convertJaegerTraceToProfile } from '@pyroscope/flamegraph';
import TraceFlamegraph from './index';
import testTrace from './testTrace.json';

// Mock the FlamegraphRenderer component
jest.mock('@pyroscope/flamegraph', () => {
  const originalModule = jest.requireActual('@pyroscope/flamegraph');
  return {
    ...originalModule, // Keep original convertJaegerTraceToProfile

    FlamegraphRenderer: jest.fn(({ profile }) => (
      <div data-testid="flamegraph-renderer">
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
});
