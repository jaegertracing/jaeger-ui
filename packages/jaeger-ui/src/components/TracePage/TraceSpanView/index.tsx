// Copyright (c) 2018 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useMemo, useState } from 'react';
import { Table, Button, Select, Form, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { ColumnProps } from 'antd/es/table';
import './index.css';
import { TNil } from '../../../types';
import { IOtelSpan, IOtelTrace } from '../../../types/otel';
import { formatDuration, formatDurationCompact } from '../../../utils/date';
import prefixUrl from '../../../utils/prefix-url';
import { getTargetEmptyOrBlank } from '../../../utils/config/get-target';
import SearchableSelect from '../../common/SearchableSelect';

type FilterType = 'serviceName' | 'operationName';

type Props = {
  trace: IOtelTrace;
  uiFindVertexKeys: Set<string> | TNil;
  uiFind: string | null | undefined;
  useOtelTerms: boolean;
};

export default function TraceSpanView(props: Props) {
  const [filters, setFilters] = useState<Record<FilterType, string[]>>({
    serviceName: [],
    operationName: [],
  });
  const [filteredData, setFilteredData] = useState<readonly IOtelSpan[]>([]);

  const {
    svcNamesList: serviceNamesList,
    opNames: opNamesList,
    svcToOps: svcToOperationsMap,
    maximumDuration: maxDuration,
    spanData: data,
  } = useMemo(() => {
    const serviceNamesSet = new Set<string>();
    const operationNamesSet = new Set<string>();
    const serviceToOperationsMap = new Map<string, Set<string>>();

    for (const span of props.trace.spans) {
      const serviceName = span.resource.serviceName;
      serviceNamesSet.add(serviceName);
      operationNamesSet.add(span.name);

      if (!serviceToOperationsMap.has(serviceName)) {
        serviceToOperationsMap.set(serviceName, new Set());
      }
      serviceToOperationsMap.get(serviceName)!.add(span.name);
    }

    const svcNamesList = [...serviceNamesSet].sort();
    const opNames = [...operationNamesSet].sort();

    const svcToOps = new Map<string, string[]>();
    serviceToOperationsMap.forEach((ops, svc) => {
      svcToOps.set(svc, [...ops].sort());
    });

    const maximumDuration = Math.max(...props.trace.spans.map(s => s.duration), 1);
    const spanData = props.trace.spans;

    return {
      svcNamesList,
      opNames,
      svcToOps,
      maximumDuration,
      spanData,
    };
  }, [props.trace.spans]);

  useEffect(() => {
    setFilteredData(props.trace.spans);
    setFilters({ serviceName: [], operationName: [] });
  }, [props.trace.spans]);

  function handleResetFilter() {
    setFilters({ serviceName: [], operationName: [] });
    setFilteredData(props.trace.spans);
  }

  function uniqueOperationNameOptions() {
    let operationNamesList: string[];
    if (filters.serviceName && filters.serviceName.length > 0) {
      const serviceToOperationsMap = svcToOperationsMap;
      operationNamesList = filters.serviceName.flatMap(svc => serviceToOperationsMap.get(svc) || []);
    } else {
      operationNamesList = opNamesList;
    }
    return [...new Set(operationNamesList)]; // take distinct values
  }

  function onFilteredChangeCustom(selectedValues: string[], filterType: FilterType) {
    // Update the filter state
    const newFilters = {
      ...filters,
      [filterType]: selectedValues,
    };

    // Filter spans: a span passes if it matches all active filters
    const newFilteredData = data.filter(span => {
      if (newFilters.serviceName && newFilters.serviceName.length > 0) {
        if (!newFilters.serviceName.includes(span.resource.serviceName)) {
          return false;
        }
      }

      // Check operationName filter (if active)
      if (newFilters.operationName && newFilters.operationName.length > 0) {
        if (!newFilters.operationName.includes(span.name)) {
          return false;
        }
      }

      return true;
    });

    setFilters(newFilters);
    setFilteredData(newFilteredData);
  }

  const columns: ColumnProps<IOtelSpan>[] = [
    {
      title: 'Service Name',
      width: '25%',
      sorter: (a, b) => a.resource.serviceName.localeCompare(b.resource.serviceName),
      render: (_, span) => span.resource.serviceName,
    },
    {
      title: props.useOtelTerms ? 'Span Name' : 'Operation',
      width: '25%',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (_, span) => span.name,
    },
    {
      title: 'Span ID',
      sorter: (a, b) => a.spanID.localeCompare(b.spanID),
      render: (_, span) => {
        return (
          <a
            href={prefixUrl(`/trace/${span.traceID}?uiFind=${span.spanID}`)}
            target={getTargetEmptyOrBlank()}
            rel="noopener noreferrer"
            className="span-id-cell"
          >
            {span.spanID}
          </a>
        );
      },
    },
    {
      title: 'Duration',
      sorter: (a, b) => a.duration - b.duration,
      render: (_, span) => {
        const percentage = (span.duration / maxDuration) * 100;
        const preciseValue = formatDuration(span.duration);
        const compactValue = formatDurationCompact(span.duration);

        return (
          <Tooltip title={preciseValue}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
              }}
            >
              <div
                className="duration-bar-background"
                style={{
                  flexGrow: 1,
                  height: '6px',
                  background: 'var(--surface-tertiary)',
                  marginRight: '12px',
                  position: 'relative',
                  borderRadius: '2px',
                }}
              >
                <div
                  style={{
                    width: `${Math.max(percentage, 2)}%`,
                    height: '100%',
                    background: 'var(--interactive-primary)',
                    borderRadius: '2px',
                  }}
                />
              </div>
              <div
                style={{
                  whiteSpace: 'nowrap',
                  minWidth: '60px',
                  textAlign: 'right',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                }}
              >
                {compactValue}
              </div>
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: 'Start Time',
      sorter: (a, b) => a.startTime - b.startTime,
      render: (_, span) => {
        const preciseValue = formatDuration(span.relativeStartTime);
        const compactValue = formatDurationCompact(span.relativeStartTime);

        return (
          <Tooltip
            title={`${dayjs(span.startTime / 1000).format('DD MMM YYYY hh:mm:ss A')} (${preciseValue})`}
          >
            <span style={{ fontFamily: 'monospace', fontSize: '12px', display: 'block', textAlign: 'right' }}>
              {compactValue}
            </span>
          </Tooltip>
        );
      },
    },
  ];

  return (
    <div>
      <h3 className="title--TraceSpanView"> Trace Tabular View</h3>
      <div
        className="TraceSpanView--filters"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          marginTop: '8px',
          paddingLeft: '8px',
          paddingRight: '8px',
        }}
      >
        <Form.Item
          label="Service Name"
          labelCol={{ flex: '0 0 auto' }}
          wrapperCol={{ flex: '1 1 auto' }}
          style={{ flex: '1 1 300px', maxWidth: '400px', marginBottom: 0 }}
          className="serviceNameDD"
        >
          <SearchableSelect
            allowClear
            mode="multiple"
            style={{ width: '100%' }}
            maxTagCount={4}
            value={filters.serviceName || []}
            maxTagPlaceholder={`+ ${(filters.serviceName?.length || 0) - 4} Selected`}
            placeholder="Select Service"
            onChange={entry => {
              onFilteredChangeCustom(entry as [], 'serviceName');
            }}
            data-testid="select-service"
          >
            {serviceNamesList.map(name => {
              return (
                <Select.Option value={name} key={name}>
                  {name}{' '}
                </Select.Option>
              );
            })}
          </SearchableSelect>
        </Form.Item>

        <Form.Item
          label={props.useOtelTerms ? 'Span Name' : 'Operation Name'}
          labelCol={{ flex: '0 0 auto' }}
          wrapperCol={{ flex: '1 1 auto' }}
          style={{ flex: '1 1 300px', maxWidth: '400px', marginBottom: 0 }}
          className="operationNameDD"
        >
          <SearchableSelect
            allowClear
            mode="multiple"
            style={{ width: '100%' }}
            maxTagCount={4}
            value={filters.operationName || []}
            maxTagPlaceholder={`+ ${(filters.operationName?.length || 0) - 4} Selected`}
            placeholder={props.useOtelTerms ? 'Select Span Name' : 'Select Operation'}
            onChange={entry => {
              onFilteredChangeCustom(entry as [], 'operationName');
            }}
            data-testid="select-operation"
          >
            {uniqueOperationNameOptions().map((name: string) => {
              return (
                <Select.Option value={name} key={name}>
                  {name}{' '}
                </Select.Option>
              );
            })}
          </SearchableSelect>
        </Form.Item>
        <Form.Item className="reset-filter" style={{ flex: '0 0 auto', marginBottom: 0 }}>
          <Button htmlType="button" onClick={handleResetFilter}>
            Reset Filters
          </Button>
        </Form.Item>
      </div>
      <Table
        className="span-table span-view-table"
        columns={columns}
        dataSource={filteredData}
        pagination={{
          total: filteredData.length,
          pageSizeOptions: ['10', '20', '50', '100'],
          showSizeChanger: true,
          showQuickJumper: true,
        }}
        rowKey="spanID"
      />
    </div>
  );
}
