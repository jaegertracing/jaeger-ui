// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';

const mockUseAui = vi.fn();
const mockToolsResult = { __tools: true };

vi.mock('@assistant-ui/react', () => ({
  useAui: (...args) => mockUseAui(...args),
  Tools: vi.fn(() => mockToolsResult),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(() => vi.fn()),
  useLocation: vi.fn(() => ({ pathname: '/search', search: '', hash: '', state: null, key: 'default' })),
}));

vi.mock('./jaegerAssistantTools', () => ({
  createJaegerAssistantToolkit: vi.fn(() => ({ highlight_span: {} })),
}));

import JaegerAssistantToolsRegistrar from './JaegerAssistantToolsRegistrar';
import { createJaegerAssistantToolkit } from './jaegerAssistantTools';
import { Tools } from '@assistant-ui/react';

describe('JaegerAssistantToolsRegistrar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing', () => {
    const { container } = render(<JaegerAssistantToolsRegistrar />);
    expect(container.firstChild).toBeNull();
  });

  it('calls createJaegerAssistantToolkit with navigate and location', () => {
    render(<JaegerAssistantToolsRegistrar />);
    expect(createJaegerAssistantToolkit).toHaveBeenCalledWith(
      expect.objectContaining({ navigate: expect.any(Function), location: expect.any(Object) })
    );
  });

  it('calls useAui with the Tools-wrapped toolkit', () => {
    render(<JaegerAssistantToolsRegistrar />);
    expect(Tools).toHaveBeenCalledWith({ toolkit: { highlight_span: {} } });
    expect(mockUseAui).toHaveBeenCalledWith({ tools: mockToolsResult });
  });
});
