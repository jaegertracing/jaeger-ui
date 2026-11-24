// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useCallback, useMemo } from 'react';
import { Select, Table, Tag } from 'antd';
import type { TableColumnsType } from 'antd';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';

import ErrorMessage from '../common/ErrorMessage';
import LoadingIndicator from '../common/LoadingIndicator';
import SearchableSelect from '../common/SearchableSelect';
import TraceName from '../common/TraceName';
import { ALL_SERVICES } from '../../constants/search-form';
import { useConfig } from '../../hooks/useConfig';
import { CONVERSATION_TURN_LIMIT, useConversationTraces } from '../../hooks/useConversationTraces';
import { useServices } from '../../hooks/useTraceDiscovery';
import { toApiError } from '../../types/api-error';
import type { TraceSummary } from '../../types/trace-summary';
import type { Microseconds } from '../../types/units';
import DocumentTitle from '../../utils/documentTitle';
import { formatDatetime, formatDuration, formatDurationCompact } from '../../utils/date';
import { TIME_RANGE_OPTIONS } from '../../utils/time-range-options';
import { getUrl as getTraceUrl } from '../TracePage/url';
import { CONVERSATION_ID_ATTRIBUTES } from './conversation';
import { getUrl, getUrlState } from './url';

import './index.css';

type TurnRow = TraceSummary & { turn: number; offset: Microseconds };

const LOOKBACK_OPTIONS = TIME_RANGE_OPTIONS.map(({ label, lookback }) => ({
  label: `Last ${label}`,
  value: lookback,
}));

function lookbackLabel(lookback: string): string {
  return LOOKBACK_OPTIONS.find(o => o.value === lookback)?.label.toLowerCase() ?? lookback;
}

const COLUMNS: TableColumnsType<TurnRow> = [
  {
    title: 'Turn',
    dataIndex: 'turn',
    className: 'ConversationPage--turnCell',
    width: 72,
  },
  {
    title: 'Trace',
    key: 'trace',
    render: (_, row) => (
      <Link className="ConversationPage--traceLink" to={getTraceUrl(row.traceID)}>
        <TraceName traceName={row.traceName} />
        <span className="ConversationPage--traceID">{row.traceID.slice(0, 7)}</span>
      </Link>
    ),
  },
  {
    title: 'Start time',
    key: 'start',
    render: (_, row) => (
      <>
        <div>{formatDatetime(row.startTime)}</div>
        <div className="ConversationPage--offset">
          {row.turn > 1 ? `+${formatDuration(row.offset)} after turn 1` : 'First turn'}
        </div>
      </>
    ),
  },
  {
    title: 'Duration',
    key: 'duration',
    align: 'right',
    render: (_, row) => formatDurationCompact(row.duration),
  },
  {
    title: 'Spans',
    dataIndex: 'spanCount',
    align: 'right',
    render: (spanCount?: number) => spanCount ?? '-',
  },
  {
    title: 'Errors',
    dataIndex: 'errorSpanCount',
    align: 'right',
    // The search API leaves the count out when a trace has no error spans.
    render: (errorSpanCount?: number) =>
      errorSpanCount ? (
        <Tag color="error" variant="outlined" className="ConversationPage--errorTag">
          {errorSpanCount}
        </Tag>
      ) : (
        <span className="ConversationPage--muted">0</span>
      ),
  },
];

export default function ConversationPage() {
  const { id: conversationID = '' } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { service, lookback } = useMemo(() => getUrlState(location.search), [location.search]);

  const { backendCapabilities } = useConfig();
  const allowAllServices = Boolean(backendCapabilities?.searchWithoutServiceName);
  const { data: services } = useServices();

  const needsService = !service && !allowAllServices;
  const query = needsService || !conversationID ? null : { conversationID, service, lookback };
  const { data, error, isFetching } = useConversationTraces(query);

  const setUrlState = useCallback(
    (next: { service?: string; lookback?: string }) => {
      navigate(getUrl(conversationID, { service, lookback, ...next }), { replace: true });
    },
    [conversationID, lookback, navigate, service]
  );

  const rows: TurnRow[] = useMemo(() => {
    const turns = data?.turns ?? [];
    const firstStart = turns[0]?.startTime ?? 0;
    return turns.map((summary, i) => ({
      ...summary,
      turn: i + 1,
      offset: (summary.startTime - firstStart) as Microseconds,
    }));
  }, [data]);

  const lastRow = rows[rows.length - 1];
  const span = (lastRow ? lastRow.startTime + lastRow.duration - rows[0].startTime : 0) as Microseconds;

  let body: React.ReactNode;
  if (needsService) {
    body = (
      <p className="ConversationPage--message">
        The storage backend of this Jaeger deployment cannot search across all services. Select the service
        that records this conversation.
      </p>
    );
  } else if (error) {
    body = <ErrorMessage error={toApiError(error)} />;
  } else if (isFetching && !data) {
    body = <LoadingIndicator centered label="Loading conversation" />;
  } else if (rows.length === 0) {
    body = (
      <div className="ConversationPage--message">
        <p>
          No traces in the {lookbackLabel(lookback)}
          {service ? ` from ${service}` : ''} have <code>{CONVERSATION_ID_ATTRIBUTES[0]}</code> or{' '}
          <code>{CONVERSATION_ID_ATTRIBUTES[1]}</code> equal to <code>{conversationID}</code>.
        </p>
        <p className="ConversationPage--muted">
          The value is matched exactly, as a plain string. Instrumentation that JSON-encodes the ID, for
          example with surrounding quotes, records a different value.
        </p>
      </div>
    );
  } else {
    body = (
      <>
        <div className="ConversationPage--summary">
          <span>
            <strong>{rows.length}</strong> {rows.length === 1 ? 'turn' : 'turns'} over{' '}
            <strong>{formatDurationCompact(span)}</strong>
          </span>
          {data?.attribute && (
            <span className="ConversationPage--muted">
              Matched on <code>{data.attribute}</code>
            </span>
          )}
        </div>
        {rows.length >= CONVERSATION_TURN_LIMIT && (
          <p className="ConversationPage--warning" role="status">
            Showing the first {CONVERSATION_TURN_LIMIT} traces the search returned. Some turns may be missing;
            narrow the lookback to find them.
          </p>
        )}
        <Table<TurnRow>
          className="ConversationPage--table"
          columns={COLUMNS}
          dataSource={rows}
          loading={isFetching}
          pagination={false}
          rowKey="traceID"
          size="middle"
        />
      </>
    );
  }

  return (
    <div className="ConversationPage">
      <DocumentTitle title={`Conversation ${conversationID} - Jaeger UI`} />
      <header className="ConversationPage--header">
        <div className="ConversationPage--title">
          <h1>Conversation</h1>
          <code className="ConversationPage--id" title={conversationID}>
            {conversationID}
          </code>
        </div>
        <div className="ConversationPage--controls">
          <label className="ConversationPage--control">
            <span>Service</span>
            <SearchableSelect
              className="ConversationPage--serviceSelect"
              value={service ?? (allowAllServices ? ALL_SERVICES : null)}
              onChange={(value: string) =>
                setUrlState({ service: value === ALL_SERVICES ? undefined : value })
              }
              placeholder="Select a service"
              popupMatchSelectWidth={false}
              status={needsService ? 'error' : undefined}
              fuzzy
            >
              {allowAllServices && (
                <Select.Option key={ALL_SERVICES} value={ALL_SERVICES}>
                  All Services
                </Select.Option>
              )}
              {(services ?? []).map(name => (
                <Select.Option key={name} value={name}>
                  {name}
                </Select.Option>
              ))}
            </SearchableSelect>
          </label>
          <label className="ConversationPage--control">
            <span>Lookback</span>
            <Select
              className="ConversationPage--lookbackSelect"
              value={lookback}
              options={LOOKBACK_OPTIONS}
              onChange={(value: string) => setUrlState({ lookback: value })}
              popupMatchSelectWidth={false}
            />
          </label>
        </div>
      </header>
      <main className="ConversationPage--body">{body}</main>
    </div>
  );
}
