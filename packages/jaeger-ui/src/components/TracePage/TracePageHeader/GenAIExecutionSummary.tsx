// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Button, Popover } from 'antd';

import { IOtelSpan } from '../../../types/otel';
import { formatTokenCount } from '../TraceTimelineViewer/SpanDetail/GenAITab/genAiData';
import { GEN_AI_CALL_ROWS, getGenAIExecutionSummary } from './execution-summary';

type GenAIExecutionSummaryProps = { spans: ReadonlyArray<IOtelSpan> };

function GenAIExecutionSummaryFn({ spans }: GenAIExecutionSummaryProps) {
  const summary = React.useMemo(() => getGenAIExecutionSummary(spans), [spans]);
  if (!summary) return null;

  const callRows = GEN_AI_CALL_ROWS.filter(({ key }) => (summary[key] ?? 0) > 0);

  const content = (
    <div className="TracePageHeader--genAIExecutionContent">
      <div className="TracePageHeader--genAIExecutionHeading">GenAI execution summary</div>
      <dl className="TracePageHeader--genAIExecutionList">
        {callRows.map(({ key, label }) => (
          <React.Fragment key={key}>
            <dt>{label}</dt>
            <dd>{summary[key]}</dd>
          </React.Fragment>
        ))}
      </dl>
      <div className="TracePageHeader--genAIExecutionHeading">Recorded tokens</div>
      <dl className="TracePageHeader--genAIExecutionList">
        <dt>Input</dt>
        <dd>{formatTokenCount(summary.inputTokens) ?? '—'}</dd>
        <dt>Output</dt>
        <dd>{formatTokenCount(summary.outputTokens) ?? '—'}</dd>
      </dl>
      <dl className="TracePageHeader--genAIExecutionList TracePageHeader--genAIExecutionFailures">
        <dt>Failed calls</dt>
        <dd>{summary.failedCallCount}</dd>
      </dl>
    </div>
  );

  return (
    <Popover content={content} placement="bottomLeft" trigger="click">
      <Button className="TracePageHeader--genAIExecutionButton" type="link">
        <span className="TracePageHeader--genAIExecutionLabel">
          GenAI calls: <span className="TracePageHeader--genAIExecutionCount">{summary.callCount}</span>
        </span>
      </Button>
    </Popover>
  );
}

export default React.memo(GenAIExecutionSummaryFn);
