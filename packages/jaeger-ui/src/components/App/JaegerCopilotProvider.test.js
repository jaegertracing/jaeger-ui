// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('./copilot-runtime', () => ({
  getJaegerCopilotRuntimeUrl: jest.fn(),
}));

jest.mock('./JaegerCopilotUi', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@copilotkit/react-core', () => ({
  CopilotKit: ({ children }) => <div data-testid="copilot-kit-mock">{children}</div>,
}));

import { getJaegerCopilotRuntimeUrl } from './copilot-runtime';
import JaegerCopilotProvider from './JaegerCopilotProvider';

describe('JaegerCopilotProvider', () => {
  beforeEach(() => {
    getJaegerCopilotRuntimeUrl.mockReset();
  });

  it('renders children only when no runtime URL is configured', () => {
    getJaegerCopilotRuntimeUrl.mockReturnValue(undefined);
    render(
      <JaegerCopilotProvider>
        <span>child</span>
      </JaegerCopilotProvider>
    );
    expect(screen.queryByTestId('copilot-kit-mock')).not.toBeInTheDocument();
    expect(screen.getByText('child')).toBeInTheDocument();
  });

  it('wraps children with CopilotKit when a runtime URL exists', () => {
    getJaegerCopilotRuntimeUrl.mockReturnValue('https://example/runtime');
    render(
      <JaegerCopilotProvider>
        <span>child</span>
      </JaegerCopilotProvider>
    );
    expect(screen.getByTestId('copilot-kit-mock')).toBeInTheDocument();
    expect(screen.getByText('child')).toBeInTheDocument();
  });
});
