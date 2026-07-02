// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Checkbox, Table, Tag, Tooltip } from 'antd';
import type { ColumnsType, TableProps } from 'antd/es/table';
import type { SorterResult, SortOrder } from 'antd/es/table/interface';
import Overflow from '@rc-component/overflow';
import _sortBy from 'lodash/sortBy';
import { IoSwapHorizontalOutline } from 'react-icons/io5';
import { TraceSummary } from '../../../types/trace-summary';
import {
  formatDuration,
  formatDurationCompact,
  formatDatetime,
  formatRelativeTime,
} from '../../../utils/date';
import RelativeBar from '../../common/RelativeBar';
import { toOrderBy, fromOrderBy } from '../../../model/search';
import type { SortableColumnKey, SortDirection } from '../../../model/search';
import type { OrderBy } from '../order-by';
import type { TracePageLink } from '../../TracePage/url';
import { ServicePill, type ServiceEntry } from './ServicePills';
import { useSearchResultsStore } from '../store.search-results';

const BOTH_DIRECTIONS: SortOrder[] = ['ascend', 'descend'];

type TraceTableProps = {
  traceSummaries: TraceSummary[];
  maxTraceDuration: number;
  getLink: (traceID: string) => TracePageLink;
  sortBy: OrderBy;
  handleSortChange: (sortBy: OrderBy) => void;
  disableComparisons: boolean;
  cohortIds: Set<string>;
  toggleComparison: (traceID: string, isInDiffCohort: boolean) => void;
};

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
  const startTimeDisplay = useSearchResultsStore(s => s.startTimeDisplay);
  const setStartTimeDisplay = useSearchResultsStore(s => s.setStartTimeDisplay);

  // Hide columns when no summary in the result set supports them.
  // A backend that omits errorSpanCount/spanCount leaves those fields undefined;
  // a backend that genuinely returned 0 will have a numeric value.
  const showServicesColumn = traceSummaries.some(t => t.services.length > 0);
  const showErrorsColumn = traceSummaries.some(t => t.errorSpanCount !== undefined);

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
        sorter: true,
        sortOrder: sortKey === 'traceName' ? sortOrder : undefined,
        sortDirections: BOTH_DIRECTIONS,
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
        title: 'Spans',
        key: 'spans',
        width: '5rem',
        align: 'center',
        render: (_: unknown, trace: TraceSummary) => trace.spanCount,
        sorter: true,
        sortOrder: sortKey === 'spans' ? sortOrder : undefined,
        sortDirections: BOTH_DIRECTIONS,
      },
      ...(showErrorsColumn
        ? [
            {
              title: 'Errors',
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
              sortDirections: BOTH_DIRECTIONS,
            },
          ]
        : []),
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
        sortDirections: BOTH_DIRECTIONS,
      },
      {
        title: (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            Start Time
            <Tooltip title={startTimeDisplay === 'absolute' ? 'Show relative time' : 'Show absolute time'}>
              <Button
                type="text"
                size="small"
                icon={<IoSwapHorizontalOutline />}
                aria-label="Toggle start time format"
                onClick={e => {
                  e.stopPropagation();
                  setStartTimeDisplay(startTimeDisplay === 'absolute' ? 'relative' : 'absolute');
                }}
              />
            </Tooltip>
          </span>
        ),
        key: 'startTime',
        onCell: () => ({ style: { overflow: 'hidden' } }),
        render: (_: unknown, trace: TraceSummary) => {
          const formatted = formatDatetime(trace.startTime);
          const displayed = startTimeDisplay === 'relative' ? formatRelativeTime(trace.startTime) : formatted;
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
                {displayed}
              </span>
            </Tooltip>
          );
        },
        sorter: true,
        sortOrder: sortKey === 'startTime' ? sortOrder : undefined,
        sortDirections: BOTH_DIRECTIONS,
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
    startTimeDisplay,
    setStartTimeDisplay,
  ]);

  const onChange: TableProps<TraceSummary>['onChange'] = (_pagination, _filters, sorter) => {
    const s = Array.isArray(sorter) ? sorter[0] : (sorter as SorterResult<TraceSummary>);
    const columnKey = s.columnKey as SortableColumnKey | undefined;
    const order = (s.order ?? undefined) as SortDirection | undefined;
    // When Ant Design's 3rd click fires a "cancel" (order === undefined, columnKey === undefined),
    // flip the current sort direction instead of deactivating sorting.
    if (order == null) {
      const flipped: SortDirection = sortOrder === 'descend' ? 'ascend' : 'descend';
      handleSortChange(toOrderBy(sortKey, flipped));
      return;
    }
    handleSortChange(toOrderBy(columnKey, order));
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
