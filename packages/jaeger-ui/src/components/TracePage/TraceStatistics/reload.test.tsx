// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TraceStatistics from './index';
import transformTraceData from '../../../model/transform-trace-data';
import type { SpanData, TraceData } from '../../../types/trace';

function makeTrace(refreshed: boolean) {
  const root: SpanData = {
    traceID: '00000000000000000000000000004574',
    spanID: '0000000000000001',
    processID: 'p1',
    operationName: 'OrderVehicle',
    startTime: 1700000000000000,
    duration: refreshed ? 20000 : 10000,
  };
  const data: TraceData & { spans: SpanData[] } = {
    traceID: root.traceID,
    processes: { p1: { serviceName: 'load-generator', tags: [] } },
    spans: [root],
  };
  if (refreshed) {
    data.spans.push({
      ...root,
      spanID: '0000000000004574',
      startTime: root.startTime + 1000,
      duration: 2000,
      references: [{ refType: 'CHILD_OF', traceID: root.traceID, spanID: root.spanID, span: null }],
    });
  }
  return transformTraceData(data)!.asOtelTrace();
}

it('refreshes real statistics after same-ID reload while preserving grouping and coloring', async () => {
  const user = userEvent.setup();
  const props = { uiFind: undefined, uiFindVertexKeys: undefined, useOtelTerms: false };
  const { rerender } = render(<TraceStatistics {...props} trace={makeTrace(false)} />);
  const selectOption = async (index: number, name: string) => {
    await user.click(screen.getAllByRole('combobox')[index]);
    const option = Array.from(
      document.querySelectorAll<HTMLElement>(
        `.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option[title="${name}"]`
      )
    ).at(-1);
    expect(option).toBeDefined();
    fireEvent.click(option!);
  };

  await selectOption(0, 'Operation Name');
  expect(screen.getAllByRole('combobox')[0].closest('.ant-select')).toHaveTextContent('Operation Name');
  await selectOption(1, 'Service Name');
  await selectOption(2, 'Total');
  await user.click(screen.getByRole('checkbox'));

  const cells = () =>
    within(screen.getByRole('button', { name: 'OrderVehicle' }).closest('tr')!).getAllByRole('cell');
  expect(cells()[1]).toHaveTextContent(/^1$/);
  expect(cells()[2]).toHaveTextContent(/^10ms$/);

  rerender(<TraceStatistics {...props} trace={makeTrace(true)} />);

  expect(cells()[1]).toHaveTextContent(/^2$/);
  expect(cells()[2]).toHaveTextContent(/^22ms$/);
  expect(screen.getAllByRole('combobox')[0].closest('.ant-select')).toHaveTextContent('Operation Name');
  expect(screen.getAllByRole('combobox')[1].closest('.ant-select')).toHaveTextContent('Service Name');
  expect(screen.getAllByRole('combobox')[2].closest('.ant-select')).toHaveTextContent('Total');
  expect(screen.getByRole('checkbox')).toBeChecked();
  expect(cells()[0].getAttribute('style')).toContain('color-mix');
});
