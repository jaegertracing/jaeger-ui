// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { IOtelSpan, StatusCode } from '../../../types/otel';
import { makeAttributes } from '../../../model/attributes';
import GenAIExecutionSummary from './GenAIExecutionSummary';

function makeSpan(overrides: Partial<IOtelSpan> = {}): IOtelSpan {
  const zero = 0 as IOtelSpan['startTime'];
  return {
    attributes: makeAttributes(),
    childSpans: [],
    depth: 0,
    duration: zero,
    endTime: zero,
    events: [],
    hasChildren: false,
    inboundLinks: [],
    instrumentationScope: { name: 'test' },
    kind: 'INTERNAL' as IOtelSpan['kind'],
    links: [],
    name: 'test',
    relativeStartTime: zero,
    resource: { attributes: makeAttributes(), serviceName: 'test' },
    spanID: 'span',
    startTime: zero,
    status: { code: StatusCode.OK },
    traceID: 'trace',
    warnings: null,
    ...overrides,
  };
}

describe('<GenAIExecutionSummary>', () => {
  it('is absent when the trace has no GenAI spans', () => {
    const { container } = render(<GenAIExecutionSummary spans={[makeSpan()]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('opens its trace-wide, non-sensitive summary from the keyboard', async () => {
    const user = userEvent.setup();
    render(
      <GenAIExecutionSummary
        spans={[
          makeSpan({ genAIKind: 'AGENT' }),
          makeSpan({
            genAIKind: 'LLM_CALL',
            attributes: makeAttributes([
              { key: 'gen_ai.usage.input_tokens', value: 1840 },
              { key: 'gen_ai.usage.output_tokens', value: 260 },
            ]),
          }),
          makeSpan({ genAIKind: 'TOOL_CALL', status: { code: StatusCode.ERROR } }),
        ]}
      />
    );

    const button = screen.getByRole('button', { name: 'GenAI operations: 3' });
    button.focus();
    await user.keyboard('{Enter}');

    expect(await screen.findByText('GenAI execution summary')).toBeInTheDocument();
    expect(screen.getByText('Agents')).toBeInTheDocument();
    expect(screen.getByText('Model operations')).toBeInTheDocument();
    expect(screen.getByText('Tool operations')).toBeInTheDocument();
    expect(screen.queryByText('Retrieval operations')).not.toBeInTheDocument();
    expect(screen.getByText('1,840')).toBeInTheDocument();
    expect(screen.getByText('260')).toBeInTheDocument();
    expect(screen.getByText('Failed operations')).toBeInTheDocument();
  });
});
