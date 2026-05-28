// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Checkbox, Table, Tag, Tooltip } from 'antd';
import type { ColumnsType, TableProps } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import _sortBy from 'lodash/sortBy';
import { IoAlert } from 'react-icons/io5';
import { TraceSummary } from '../../../types/trace-summary';
import { formatDuration, formatDurationCompact, formatDatetime } from '../../../utils/date';
import colorGenerator from '../../../utils/color-generator';
import RelativeBar from '../../common/RelativeBar';
import * as orderBy from '../../../model/order-by';
import type { TracePageLink } from '../../TracePage/url';

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

const MAX_VISIBLE_SERVICES = 4;

function ServicePills({ services }: { services: TraceSummary['services'] }) {
  const sorted = _sortBy(services, s => s.name);
  const visible = sorted.slice(0, MAX_VISIBLE_SERVICES);
  const hidden = sorted.slice(MAX_VISIBLE_SERVICES);
  return (
    <span style={{ display: 'inline-flex', flexWrap: 'nowrap', gap: 4 }}>
      {visible.map(service => (
        <Tag
          key={service.name}
          variant="outlined"
          style={{
            borderLeftColor: colorGenerator.getColorByKey(service.name),
            borderLeftWidth: 6,
            margin: 0,
          }}
        >
          {service.errorSpanCount > 0 && <IoAlert style={{ color: 'red', marginRight: 2 }} />}
          {service.name} ({service.spanCount})
        </Tag>
      ))}
      {hidden.length > 0 && (
        <Tooltip title={hidden.map(s => s.name).join(', ')}>
          <Tag variant="outlined" style={{ margin: 0 }}>
            +{hidden.length}
          </Tag>
        </Tooltip>
      )}
    </span>
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
        render: (name: string, trace: TraceSummary) => {
          const link = getLink(trace.traceID);
          return (
            <Link
              to={link.pathname + (link.search ? `?${link.search}` : '')}
              state={link.state}
              onClick={e => e.stopPropagation()}
            >
              {name || trace.traceID}
            </Link>
          );
        },
      },
      {
        title: 'Services',
        key: 'services',
        render: (_: unknown, trace: TraceSummary) =>
          trace.services.length > 0 ? <ServicePills services={trace.services} /> : '-',
      },
      {
        title: 'Spans',
        key: 'spans',
        align: 'center',
        render: (_: unknown, trace: TraceSummary) => trace.spanCount,
        sorter: true,
        sortOrder: sortKey === 'spans' ? sortOrder : undefined,
        sortDirections: ['ascend', 'descend'],
      },
      {
        title: 'Errors',
        key: 'errors',
        align: 'center',
        render: (_: unknown, trace: TraceSummary) =>
          trace.errorSpanCount > 0 ? (
            <Tag color="red" variant="outlined" style={{ margin: 0 }}>
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
        render: (_: unknown, trace: TraceSummary) => formatDatetime(trace.startTime),
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
    // When Ant Design's 3rd-click "cancel" fires (order === undefined), treat it as a toggle
    // back to the opposite direction rather than removing the sort.
    const order = s.order ?? (sortOrder === 'ascend' ? 'descend' : 'ascend');
    handleSortChange(toOrderBy(s.columnKey as string | undefined, order));
  };

  return (
    <Table<TraceSummary>
      columns={columns}
      dataSource={traceSummaries}
      rowKey="traceID"
      size="small"
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
          role: 'button',
          'aria-label': `Navigate to trace ${trace.traceName || trace.traceID}`,
          style: { cursor: 'pointer' },
        };
      }}
    />
  );
}
