// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TraceStatistics from './index';
import transformTraceData from '../../../model/transform-trace-data';

const query = 'SELECT 1';
const transformed = transformTraceData({
  traceID: '00000000000000000000000000000001',
  processes: { p1: { serviceName: 'database', tags: [] } },
  spans: [
    {
      traceID: '00000000000000000000000000000001',
      spanID: '0000000000000001',
      processID: 'p1',
      operationName: 'query',
      startTime: 1700000000000000,
      duration: 10000,
      tags: [{ key: 'sql.query', value: query }],
      logs: [],
      references: [],
    },
  ],
});
if (!transformed) throw new Error('The SQL fixture must produce a trace');
const trace = transformed.asOtelTrace();

afterEach(cleanup);

async function showSqlGroup() {
  const user = userEvent.setup();
  render(
    <TraceStatistics trace={trace} uiFind={undefined} uiFindVertexKeys={undefined} useOtelTerms={false} />
  );
  await user.click(screen.getAllByRole('combobox')[0]);
  fireEvent.click(await screen.findByText('sql.query'));
  return { user, cell: await screen.findByRole('button', { name: query }) };
}

describe('real TraceStatistics SQL keyboard behavior', () => {
  it('opens the real SQL popup on mouse click', async () => {
    const { user, cell } = await showSqlGroup();
    await user.click(cell);
    expect(await screen.findByRole('textbox')).toHaveValue(JSON.stringify(query));
  });

  it.each([
    ['Enter', '{Enter}'],
    ['Space', ' '],
  ])('opens SQL using %s', async (_name, key) => {
    const { user, cell } = await showSqlGroup();
    cell.focus();
    expect(cell).toHaveFocus();
    await user.keyboard(key);
    expect(await screen.findByRole('textbox')).toHaveValue(JSON.stringify(query));
  });

  it('includes the actionable SQL cell in keyboard tab order', async () => {
    const { user, cell } = await showSqlGroup();
    // Start after the grouping input and traverse the actual rendered controls.
    screen.getAllByRole('combobox')[0].focus();
    for (let i = 0; i < 30 && document.activeElement !== cell; i += 1) await user.tab();
    expect(cell).toHaveFocus();
  });

  it('does not expose ordinary service names as action buttons', () => {
    render(
      <TraceStatistics trace={trace} uiFind={undefined} uiFindVertexKeys={undefined} useOtelTerms={false} />
    );
    expect(screen.getByText('database')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'database' })).not.toBeInTheDocument();
  });
});
