// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';

import GenAITab from '.';
import type { IOtelSpan } from '../../../../../types/otel';

const span = { spanID: 'abc123' } as unknown as IOtelSpan;

describe('GenAITab', () => {
  it('renders the placeholder message', () => {
    render(<GenAITab span={span} />);
    expect(screen.getByText('GenAI details coming soon.')).toBeInTheDocument();
  });
});
