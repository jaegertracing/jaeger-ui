// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { StatusCode } from '../../../types/otel';
import { makeAttributes } from '../../../model/attributes';
import { makeGenAISpan } from '../../../utils/genai/test-utils';
import GenAIExecutionSummary from './GenAIExecutionSummary';

describe('<GenAIExecutionSummary>', () => {
  it('is absent when the trace has no GenAI spans', () => {
    const { container } = render(<GenAIExecutionSummary spans={[makeGenAISpan()]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('opens its trace-wide, non-sensitive summary from the keyboard', async () => {
    const user = userEvent.setup();
    render(
      <GenAIExecutionSummary
        spans={[
          makeGenAISpan({ genAIKind: 'AGENT' }),
          makeGenAISpan({
            genAIKind: 'LLM_CALL',
            attributes: makeAttributes([
              { key: 'gen_ai.usage.input_tokens', value: 1840 },
              { key: 'gen_ai.usage.output_tokens', value: 260 },
            ]),
          }),
          makeGenAISpan({ genAIKind: 'TOOL_CALL', status: { code: StatusCode.ERROR } }),
        ]}
      />
    );

    const button = screen.getByRole('button', { name: 'GenAI calls: 3' });
    button.focus();
    await user.keyboard('{Enter}');

    expect(await screen.findByText('GenAI execution summary')).toBeInTheDocument();
    expect(screen.getByText('Agents')).toBeInTheDocument();
    expect(screen.getByText('Model calls')).toBeInTheDocument();
    expect(screen.getByText('Tool calls')).toBeInTheDocument();
    expect(screen.queryByText('Retrieval calls')).not.toBeInTheDocument();
    expect(screen.getByText('1,840')).toBeInTheDocument();
    expect(screen.getByText('260')).toBeInTheDocument();
    expect(screen.getByText('Failed calls')).toBeInTheDocument();
  });
});
