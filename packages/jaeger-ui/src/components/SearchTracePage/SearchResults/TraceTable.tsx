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
import { IoArrowUp, IoArrowDown } from 'react-icons/io5';
import { TraceSummary } from '../../../types/trace-summary';
import { formatDuration, formatDurationCompact, formatDatetime } from '../../../utils/date';
import RelativeBar from '../../common/RelativeBar';
import * as orderBy from '../../../model/order-by';
import type { TracePageLink } from '../../TracePage/url';
import { ServicePill, type ServiceEntry } from './ServicePills';

import './TraceTable.css';

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
  if (columnKey === 'traceName') {
    return order === 'ascend' ? orderBy.TRACE_NAME_ASC : orderBy.TRACE_NAME_DESC;
  }
  if (columnKey === 'spans') {
    return order === 'ascend' ? orderBy.LEAST_SPANS : orderBy.MOST_SPANS;
  }
  if (columnKey === 'errors') {
    return order === 'ascend' ? orderBy.LEAST_ERRORS : orderBy.MOST_ERRORS;
  }
  if (columnKey === 'duration') {
    return order === 'ascend' ? orderBy.SHORTEST_FIRST : orderBy.LONGEST_FIRST;
  }
  if (columnKey === 'startTime') {
    return order === 'ascend' ? orderBy.OLDEST_FIRST : orderBy.MOST_RECENT;
  }
  return orderBy.MOST_RECENT;
}

function fromOrderBy(sort: string): { key: string; order: 'ascend' | 'descend' } {
  switch (sort) {
    case orderBy.TRACE_NAME_ASC:
      return { key: 'traceName', order: 'ascend' };
    case orderBy.TRACE_NAME_DESC:
      return { key: 'traceName', order: 'descend' };
    case orderBy.MOST_SPANS:
      return { key: 'spans', order: 'descend' };
    case orderBy.LEAST_SPANS:
      return { key: 'spans', order: 'ascend' };
    case orderBy.MOST_ERRORS:
      return { key: 'errors', order: 'descend' };
    case orderBy.LEAST_ERRORS:
      return { key: 'errors', order: 'ascend' };
    case orderBy.LONGEST_FIRST:
      return { key: 'duration', order: 'descend' };
    case orderBy.SHORTEST_FIRST:
      return { key: 'duration', order: 'ascend' };
    case orderBy.OLDEST_FIRST:
      return { key: 'startTime', order: 'ascend' };
    default:
      return { key: 'startTime', order: 'descend' };
  }
}

export { toOrderBy, fromOrderBy };

/**
 * Renders an IoArrowUp or IoArrowDown icon next to the column title when that column is the
 * active sort column. Returns plain text otherwise.
 */
function sortableTitle(
  label: string,
  columnKey: string,
  activeSortKey: string,
  activeSortOrder: 'ascend' | 'descend'
) {
  if (columnKey !== activeSortKey) return label;
  const Icon = activeSortOrder === 'ascend' ? IoArrowUp : IoArrowDown;
  return (
    <span>
      {label}
      <Icon className="TraceTable--sortIcon" aria-hidden />
    </span>
  );
}

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

  // Hide columns when no summary in the result set supports them.
  // A backend that omits errorSpanCount/spanCount leaves those fields undefined;
  // a backend that genuinely returned 0 will have a numeric value.
  const showServicesColumn = traceSummaries.some(t => t.services.length > 0);
  const showErrorsColumn = traceSummaries.some(t => t.errorSpanCount !== undefined);

  const columns: ColumnsType<TraceSummary> = useMemo(() => {
    const cols: ColumnsType<TraceSummary> = [
      {
        title: sortableTitle('Trace Name', 'traceName', sortKey, sortOrder),
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
        sorter: true,
        sortOrder: sortKey === 'traceName' ? sortOrder : undefined,
        sortDirections: ['ascend', 'descend'],
      },
      ...(showServicesColumn
        ? [
            {
              title: 'Services',
              key: 'services',
              width: '35%',
              onCell: () => ({ style: { overflow: 'hidden' } }),
              render: (_: unknown, trace: TraceSummary) =>
                trace.services.length > 0 ? <ServicePills services={trace.services} /> : '-',
            } as const,
          ]
        : []),
      {
        title: sortableTitle('Spans', 'spans', sortKey, sortOrder),
        key: 'spans',
        width: '5rem',
        align: 'center',
        render: (_: unknown, trace: TraceSummary) => trace.spanCount,
        sorter: true,
        sortOrder: sortKey === 'spans' ? sortOrder : undefined,
        sortDirections: ['ascend', 'descend'],
      },
      ...(showErrorsColumn
        ? [
            {
              title: sortableTitle('Errors', 'errors', sortKey, sortOrder),
              key: 'errors',
              width: '5rem',
              align: 'center' as const,
              render: (_: unknown, trace: TraceSummary) =>
                trace.errorSpanCount === undefined ? (
                  '-'
                ) : trace.errorSpanCount > 0 ? (
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
              sorter: true,
        sortOrder: sortKey === 'errors' ? sortOrder : undefined,
        sortDirections: ['ascend', 'descend'],
      },
          ]
        : []),
      {
        title: sortableTitle('Duration', 'duration', sortKey, sortOrder),
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
        title: sortableTitle('Start Time', 'startTime', sortKey, sortOrder),
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
        sortOrder: sortKey === 'startTime' ? sortOrder : undefined,
        sortDirections: ['ascend', 'descend'],
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
  }, [
    sortKey,
    sortOrder,
    maxTraceDuration,
    getLink,
    disableComparisons,
    cohortIds,
    toggleComparison,
    showServicesColumn,
    showErrorsColumn,
  ]);

  const onChange: TableProps<TraceSummary>['onChange'] = (_pagination, _filters, sorter) => {
    const s = Array.isArray(sorter) ? sorter[0] : (sorter as SorterResult<TraceSummary>);
    const columnKey = s.columnKey as string | undefined;
    const order = s.order ?? undefined;
    // When Ant Design's 3rd click fires a "cancel" (order === undefined, columnKey === undefined),
    // flip the current sort direction instead of deactivating sorting.
    if (order == null) {
      const flipped = sortOrder === 'descend' ? 'ascend' : 'descend';
      handleSortChange(toOrderBy(sortKey, flipped));
      return;
    }
    handleSortChange(toOrderBy(columnKey, order));
  };

  return (
    <Table<TraceSummary>
      className="TraceTable"
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
