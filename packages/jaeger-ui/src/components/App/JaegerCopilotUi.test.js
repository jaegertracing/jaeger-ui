// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockUseCopilotReadable = jest.fn();
const mockUseCopilotAdditionalInstructions = jest.fn();
const mockUseFrontendTool = jest.fn();

jest.mock('@copilotkit/react-core', () => ({
  useCopilotReadable: (...args) => mockUseCopilotReadable(...args),
  useCopilotAdditionalInstructions: (...args) => mockUseCopilotAdditionalInstructions(...args),
  useFrontendTool: (...args) => mockUseFrontendTool(...args),
}));

import JaegerCopilotUi from './JaegerCopilotUi';

describe('JaegerCopilotUi', () => {
  beforeEach(() => {
    mockUseCopilotReadable.mockClear();
    mockUseCopilotAdditionalInstructions.mockClear();
    mockUseFrontendTool.mockClear();
  });

  it('renders null', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/search']}>
        <JaegerCopilotUi />
      </MemoryRouter>
    );
    expect(container.firstChild).toBeNull();
  });

  it('registers readable context for a single-trace route', () => {
    render(
      <MemoryRouter initialEntries={['/trace/a1b2c3d4e5f6789']}>
        <JaegerCopilotUi />
      </MemoryRouter>
    );
    expect(mockUseCopilotReadable).toHaveBeenCalled();
    const firstArg = mockUseCopilotReadable.mock.calls[0][0];
    expect(firstArg.value).toEqual({ view: 'trace', traceId: 'a1b2c3d4e5f6789' });
  });

  it('registers readable context for compare route', () => {
    render(
      <MemoryRouter initialEntries={['/trace/aaaabbbb...ccccdddd']}>
        <JaegerCopilotUi />
      </MemoryRouter>
    );
    const firstArg = mockUseCopilotReadable.mock.calls[0][0];
    expect(firstArg.value).toEqual({
      view: 'compare',
      traceIdA: 'aaaabbbb',
      traceIdB: 'ccccdddd',
    });
  });

  it('registers navigation tools', () => {
    render(
      <MemoryRouter initialEntries={['/search']}>
        <JaegerCopilotUi />
      </MemoryRouter>
    );
    const toolNames = mockUseFrontendTool.mock.calls.map(c => c[0].name);
    expect(toolNames).toEqual(expect.arrayContaining(['jaegerNavigateToSearch', 'jaegerNavigateToCompare']));
  });
});
