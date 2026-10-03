// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Button, Popover } from 'antd';

import { IOtelSpan } from '../../../types/otel';
import { getGenAIExecutionSummary } from '../../../utils/genai/execution-summary';

type GenAIExecutionSummaryProps = { spans: ReadonlyArray<IOtelSpan> };

const formatNumber = (value: number | undefined) => (value === undefined ? '—' : value.toLocaleString());

function GenAIExecutionSummaryFn({ spans }: GenAIExecutionSummaryProps) {
  const summary = React.useMemo(() => getGenAIExecutionSummary(spans), [spans]);
  if (!summary) return null;

  const operationRows = (
    [
      ['Agents', summary.agentCount],
      ['Model operations', summary.modelOperationCount],
      ['Tool operations', summary.toolOperationCount],
      ['Retrieval operations', summary.retrievalOperationCount],
      ['Other GenAI', summary.otherGenAIOperationCount],
    ] as Array<[string, number]>
  ).filter(([, count]) => count > 0);

  const content = (
    <div className="TracePageHeader--genAIExecutionContent">
      <div className="TracePageHeader--genAIExecutionHeading">GenAI execution summary</div>
      <dl className="TracePageHeader--genAIExecutionList">
        {operationRows.map(([label, count]) => (
          <React.Fragment key={label}>
            <dt>{label}</dt>
            <dd>{count}</dd>
          </React.Fragment>
        ))}
      </dl>
      <div className="TracePageHeader--genAIExecutionHeading">Recorded tokens</div>
      <dl className="TracePageHeader--genAIExecutionList">
        <dt>Input</dt>
        <dd>{formatNumber(summary.inputTokens)}</dd>
        <dt>Output</dt>
        <dd>{formatNumber(summary.outputTokens)}</dd>
      </dl>
      <dl className="TracePageHeader--genAIExecutionList TracePageHeader--genAIExecutionFailures">
        <dt>Failed operations</dt>
        <dd>{summary.failedOperationCount}</dd>
      </dl>
    </div>
  );

  const ariaLabel = `GenAI operations: ${summary.operationCount}`;
  return (
    <Popover content={content} placement="bottomLeft" trigger="click">
      <Button aria-label={ariaLabel} className="TracePageHeader--genAIExecutionButton" type="link">
        <span className="TracePageHeader--genAIExecutionLabel">GenAI operations:</span>
        {summary.operationCount}
      </Button>
    </Popover>
  );
}

export default React.memo(GenAIExecutionSummaryFn);
