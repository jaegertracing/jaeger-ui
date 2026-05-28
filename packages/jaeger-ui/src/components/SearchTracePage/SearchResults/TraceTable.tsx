// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Checkbox, Table, Tag, Tooltip } from 'antd';
import type { ColumnsType, TableProps } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import Overflow from '@rc-component/overflow';
import _sortBy from 'lodash/sortBy';
import { TraceSummary } from '../../../types/trace-summary';
import { formatDuration, formatDurationCompact, formatDatetime } from '../../../utils/date';
import RelativeBar from '../../common/RelativeBar';
import * as orderBy from '../../../model/order-by';
import type { TracePageLink } from '../../TracePage/url';
import { ServicePill, type ServiceEntry } from './ServicePills';

type TraceTableProps = {
  traceSummaries: TraceSummary[];
  maxTraceDuration: number;
  getLink: (traceID: string) => TracePageLink;
  sortBy: string;
  handleSortChange: (sortBy: string) => void;
  disableComparisons: boolean;
  cohortIds: Set<string>;
  toggleComparison: (traceID: string, isInDiffCohort: boolean) => void;
};

function toOrderBy(columnKey: string | undefined, order: string | undefined): string {
  if (order == null) return orderBy.MOST_RECENT;
  if (columnKey === 'spans') {
    return order === 'ascend' ? orderBy.LEAST_SPANS : orderBy.MOST_SPANS;
  }
  if (columnKey === 'duration') {
    return order === 'ascend' ? orderBy.SHORTEST_FIRST : orderBy.LONGEST_FIRST;
  }
  // startTime descend === MOST_RECENT (default sort); ascending is not supported
  return orderBy.MOST_RECENT;
}

function fromOrderBy(sort: string): { key: string; order: 'ascend' | 'descend' } {
  switch (sort) {
    case orderBy.MOST_SPANS:
      return { key: 'spans', order: 'descend' };
    case orderBy.LEAST_SPANS:
      return { key: 'spans', order: 'ascend' };
    case orderBy.LONGEST_FIRST:
      return { key: 'duration', order: 'descend' };
    case orderBy.SHORTEST_FIRST:
      return { key: 'duration', order: 'ascend' };
    default:
      return { key: 'startTime', order: 'descend' };
  }
}

export { toOrderBy, fromOrderBy };

function ServicePills({ services }: { services: TraceSummary['services'] }) {
  const sorted = _sortBy(services, s => s.name);
  return (
    <Overflow<ServiceEntry>
      data={sorted}
      itemKey="name"
      maxCount={Overflow.RESPONSIVE}
      renderItem={service => <ServicePill service={service} />}
      renderRest={omitted => (
        <Tooltip
          title={
            <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4 }}>
              {omitted.map(service => (
                <ServicePill key={service.name} service={service} />
              ))}
            </span>
          }
        >
          <Tag variant="outlined" style={{ margin: 0 }}>
            +{omitted.length}
          </Tag>
        </Tooltip>
      )}
      style={{ display: 'flex', flexWrap: 'nowrap', gap: 4, width: '100%' }}
    />
  );
}

export default function TraceTable({
  traceSummaries,
  maxTraceDuration,
  getLink,
  sortBy,
  handleSortChange,
  disableComparisons,
  cohortIds,
  toggleComparison,
}: TraceTableProps) {
  const navigate = useNavigate();
  const { key: sortKey, order: sortOrder } = fromOrderBy(sortBy);

  const columns: ColumnsType<TraceSummary> = useMemo(() => {
    const cols: ColumnsType<TraceSummary> = [
      {
        title: 'Trace Name',
        dataIndex: 'traceName',
        key: 'traceName',
        onCell: () => ({ style: { overflow: 'hidden' } }),
        render: (name: string, trace: TraceSummary) => {
          const link = getLink(trace.traceID);
          const label = name || trace.traceID;
          return (
            <Tooltip title={label}>
              <Link
                to={link.pathname + (link.search ? `?${link.search}` : '')}
                state={link.state}
                onClick={e => e.stopPropagation()}
                style={{
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </Link>
            </Tooltip>
          );
        },
      },
      {
        title: 'Services',
        key: 'services',
        width: '35%',
        onCell: () => ({ style: { overflow: 'hidden' } }),
        render: (_: unknown, trace: TraceSummary) =>
          trace.services.length > 0 ? <ServicePills services={trace.services} /> : '-',
      },
      {
        title: 'Spans',
        key: 'spans',
        width: '5rem',
        align: 'center',
        render: (_: unknown, trace: TraceSummary) => trace.spanCount,
        sorter: true,
        sortOrder: sortKey === 'spans' ? sortOrder : undefined,
        sortDirections: ['ascend', 'descend'],
      },
      {
        title: 'Errors',
        key: 'errors',
        width: '5rem',
        align: 'center',
        render: (_: unknown, trace: TraceSummary) =>
          trace.errorSpanCount > 0 ? (
            <Tag
              variant="outlined"
              style={{
                margin: 0,
                color: 'var(--feedback-error-text)',
                borderColor: 'var(--feedback-error-text)',
              }}
            >
              {trace.errorSpanCount}
            </Tag>
          ) : (
            0
          ),
      },
      {
        title: 'Duration',
        key: 'duration',
        render: (_: unknown, trace: TraceSummary) => (
          <Tooltip title={formatDuration(trace.duration)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <RelativeBar value={trace.duration} maxValue={maxTraceDuration} />
              <span style={{ fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'nowrap' }}>
                {formatDurationCompact(trace.duration)}
              </span>
            </div>
          </Tooltip>
        ),
        sorter: true,
        sortOrder: sortKey === 'duration' ? sortOrder : undefined,
        sortDirections: ['ascend', 'descend'],
      },
      {
        title: 'Start Time',
        key: 'startTime',
        onCell: () => ({ style: { overflow: 'hidden' } }),
        render: (_: unknown, trace: TraceSummary) => {
          const formatted = formatDatetime(trace.startTime);
          return (
            <Tooltip title={formatted}>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'block',
                }}
              >
                {formatted}
              </span>
            </Tooltip>
          );
        },
        sorter: true,
        // startTime descend maps to MOST_RECENT (the default); always show the sort indicator
        sortOrder: sortKey === 'startTime' ? 'descend' : undefined,
        sortDirections: ['descend'],
      },
    ];

    if (!disableComparisons) {
      cols.unshift({
        key: 'compare',
        width: 40,
        onCell: (trace: TraceSummary) => ({
          onClick: (e: React.MouseEvent) => {
            e.stopPropagation();
            // If the click landed on the checkbox input itself, onChange already handles it
            if ((e.target as HTMLElement).tagName === 'INPUT') return;
            toggleComparison(trace.traceID, cohortIds.has(trace.traceID));
          },
          style: { cursor: 'pointer' },
        }),
        render: (_: unknown, trace: TraceSummary) => (
          <Checkbox
            checked={cohortIds.has(trace.traceID)}
            onChange={() => toggleComparison(trace.traceID, cohortIds.has(trace.traceID))}
            onClick={e => e.stopPropagation()}
          />
        ),
      });
    }

    return cols;
  }, [sortKey, sortOrder, maxTraceDuration, getLink, disableComparisons, cohortIds, toggleComparison]);

  const onChange: TableProps<TraceSummary>['onChange'] = (_pagination, _filters, sorter) => {
    const s = Array.isArray(sorter) ? sorter[0] : (sorter as SorterResult<TraceSummary>);
    // When Ant Design's 3rd-click "cancel" fires, columnKey is undefined and order is undefined.
    // toOrderBy(undefined, undefined) returns MOST_RECENT, which is the correct fallback.
    handleSortChange(toOrderBy(s.columnKey as string | undefined, s.order ?? undefined));
  };

  return (
    <Table<TraceSummary>
      columns={columns}
      dataSource={traceSummaries}
      rowKey="traceID"
      size="small"
      tableLayout="fixed"
      pagination={false}
      showSorterTooltip={false}
      onChange={onChange}
      onRow={(trace: TraceSummary) => {
        const link = getLink(trace.traceID);
        const go = () =>
          navigate(link.pathname + (link.search ? `?${link.search}` : ''), { state: link.state });
        return {
          onClick: go,
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              go();
            }
          },
          tabIndex: 0,
          style: { cursor: 'pointer' },
        };
      }}
    />
  );
}
