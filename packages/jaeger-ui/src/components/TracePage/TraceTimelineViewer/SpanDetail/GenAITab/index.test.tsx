// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';

import GenAITab from '.';
import type { IOtelSpan } from '../../../../../types/otel';

const span = {
  spanID: 'abc123',
  attributes: [
    { key: 'gen_ai.system', type: 'string', value: 'openai' },
    { key: 'gen_ai.request.model', type: 'string', value: 'gpt-4' },
  ],
  events: [],
} as unknown as IOtelSpan;

describe('GenAITab', () => {
  it('renders GenAI details correctly', () => {
    render(<GenAITab span={span} />);
    expect(screen.getAllByText('openai').length).toBeGreaterThan(0);
    expect(screen.getAllByText('gpt-4').length).toBeGreaterThan(0);
  });
});
