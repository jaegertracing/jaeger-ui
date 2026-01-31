// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Table, Tag } from 'antd';

import TraceTimelineLink from './TraceTimelineLink';
import RelativeDate from '../../common/RelativeDate';
import TraceName from '../../common/TraceName';
import { fetchedState } from '../../../constants';
import { formatDuration } from '../../../utils/date';

import { FetchedTrace, TNil } from '../../../types';

import './CohortTable.css';

type Props = {
  selection: Record<string, { label: string }>;
  current: string | TNil;
  cohort: FetchedTrace[];
  selectTrace: (traceID: string) => void;
};

const { Column } = Table;

const defaultRowSelection = {
  hideDefaultSelections: true,
  type: 'radio' as const,
};

export const NEED_MORE_TRACES_MESSAGE = (
  <h3 key="msg" className="CohortTable--needMoreMsg">
    Enter a Trace ID or perform a search and select from the results.
  </h3>
);

const CohortTable: React.FC<Props> = ({ cohort, current, selection, selectTrace }) => {
  const getCheckboxProps = (record: FetchedTrace) => {
    const { id, state } = record;
    if (state === fetchedState.ERROR || (id in selection && id !== current)) {
      return { disabled: true };
    }
    return {};
  };

  const rowSelection = {
    ...defaultRowSelection,
    getCheckboxProps,
    onChange: (selectedRowKeys: React.Key[], selectedRows: FetchedTrace[]) => selectTrace(selectedRows[0].id),
    selectedRowKeys: current ? [current] : [],
  };

  return (
    <>
      <Table
        key="table"
        size="middle"
        dataSource={cohort}
        rowKey="id"
        pagination={false}
        rowSelection={rowSelection}
      >
        <Column
          key="traceID"
          title=""
          dataIndex="id"
          data-testid="id"
          render={value => <span className="u-tx-muted">{value && value.slice(0, 7)}</span>}
        />
        <Column
          key="traceName"
          title="Service &amp; Operation"
          sortOrder="descend"
          dataIndex={['data', 'traceName']}
          data-testid="traceName"
          render={(_, record: FetchedTrace) => {
            const { data, error, id, state } = record;
            const { traceName = undefined } = data || {};
            const { label = undefined } = selection[id] || {};
            return (
              <React.Fragment>
                {label != null && (
                  <Tag key="lbl" className="ub-bold" color="#139999">
                    {label}
                  </Tag>
                )}
                <TraceName
                  key="name"
                  className="CohortTable--traceName"
                  error={error}
                  state={state}
                  traceName={traceName}
                />
              </React.Fragment>
            );
          }}
        />
        <Column
          title="Date"
          dataIndex={['data', 'startTime']}
          data-testid="startTime"
          key="startTime"
          render={(value, record: FetchedTrace) =>
            record.state === fetchedState.DONE && (
              <RelativeDate fullMonthName includeTime value={value / 1000} />
            )
          }
        />
        <Column
          title="Duration"
          dataIndex={['data', 'duration']}
          data-testid="duration"
          key="duration"
          render={(value, record: FetchedTrace) =>
            record.state === fetchedState.DONE && formatDuration(value)
          }
        />
        <Column title="Spans" dataIndex={['data', 'spans', 'length']} key="spans" />
        <Column
          className="ub-tx-center"
          dataIndex={['data', 'traceID']}
          data-testid="traceID"
          key="link"
          render={value => <TraceTimelineLink traceID={value} />}
        />
      </Table>
      {cohort.length < 2 && NEED_MORE_TRACES_MESSAGE}
    </>
  );
};

export default React.memo(CohortTable);
