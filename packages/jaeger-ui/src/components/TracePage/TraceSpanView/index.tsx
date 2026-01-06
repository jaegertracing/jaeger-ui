// Copyright (c) 2018 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React, { Component } from 'react';
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
};

type State = {
  searchText: string;
  searchedColumn: string;
  data: ReadonlyArray<IOtelSpan>;
  serviceNamesList: string[];
  operationNamesList: string[];
  serviceToOperationsMap: Map<string, string[]>;
  filters: Record<FilterType, string[]>;
  filteredData: ReadonlyArray<IOtelSpan>;
  maxDuration: number;
};

export default class TraceSpanView extends Component<Props, State> {
  constructor(props: Props, state: State) {
    super(props, state);
    const serviceNamesSet = new Set<string>();
    const operationNamesSet = new Set<string>();
    const serviceToOperationsMap = new Map<string, Set<string>>();

    this.props.trace.spans.forEach(span => {
      const serviceName = span.resource.serviceName;
      serviceNamesSet.add(serviceName);
      operationNamesSet.add(span.name);

      if (!serviceToOperationsMap.has(serviceName)) {
        serviceToOperationsMap.set(serviceName, new Set<string>());
      }
      serviceToOperationsMap.get(serviceName)!.add(span.name);
    });

    // Sort alphabetically for better UX
    const serviceNamesList = [...serviceNamesSet].sort();
    const operationNamesList = [...operationNamesSet].sort();

    // Convert operation sets to sorted arrays
    const sortedServiceToOperationsMap = new Map<string, string[]>();
    serviceToOperationsMap.forEach((operations, serviceName) => {
      sortedServiceToOperationsMap.set(serviceName, [...operations].sort());
    });

    // Compute max duration once for the entire trace
    const maxDuration = Math.max(...this.props.trace.spans.map(s => s.duration), 1);

    this.state = {
      searchText: '',
      searchedColumn: '',
      data: this.props.trace.spans,
      serviceNamesList,
      operationNamesList,
      serviceToOperationsMap: sortedServiceToOperationsMap,
      filteredData: this.props.trace.spans,
      filters: {} as Record<FilterType, string[]>,
      maxDuration,
    };
    this.handleResetFilter = this.handleResetFilter.bind(this);
    this.uniqueOperationNameOptions = this.uniqueOperationNameOptions.bind(this);
  }

  handleResetFilter() {
    this.setState(previousState => ({
      filters: {} as Record<FilterType, string[]>,
      filteredData: previousState.data,
    }));
  }

  uniqueOperationNameOptions() {
    let operationNamesList: string[];
    if (this.state.filters.serviceName) {
      const serviceToOperationsMap = this.state.serviceToOperationsMap;
      operationNamesList = this.state.filters.serviceName.flatMap(
        svc => serviceToOperationsMap.get(svc) || []
      );
    } else {
      operationNamesList = this.state.operationNamesList;
    }
    return [...new Set(operationNamesList)]; // take distinct values
  }

  onFilteredChangeCustom(selectedValues: string[], filterType: FilterType) {
    // Update the filter state
    const newFilters = { ...this.state.filters, [filterType]: selectedValues };

    // Filter spans: a span passes if it matches all active filters
    const filteredData = this.state.data.filter(span => {
      // Check serviceName filter (if active)
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

    this.setState({
      filters: newFilters,
      filteredData,
    });
  }

  render() {
    const columns: ColumnProps<IOtelSpan>[] = [
      {
        title: 'Service Name',
        width: '25%',
        sorter: (a, b) => a.resource.serviceName.localeCompare(b.resource.serviceName),
        render: (_, span) => span.resource.serviceName,
      },
      {
        title: 'Operation',
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
          const percentage = (span.duration / this.state.maxDuration) * 100;
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
              <span
                style={{ fontFamily: 'monospace', fontSize: '12px', display: 'block', textAlign: 'right' }}
              >
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
              value={this.state.filters.serviceName || []}
              maxTagPlaceholder={`+ ${(this.state.filters.serviceName?.length || 0) - 4} Selected`}
              placeholder="Select Service"
              onChange={entry => {
                this.onFilteredChangeCustom(entry as [], 'serviceName');
              }}
              data-testid="select-service"
            >
              {this.state.serviceNamesList.map(name => {
                return (
                  <Select.Option value={name} key={name}>
                    {name}{' '}
                  </Select.Option>
                );
              })}
            </SearchableSelect>
          </Form.Item>
          <Form.Item
            label="Operation Name"
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
              value={this.state.filters.operationName || []}
              maxTagPlaceholder={`+ ${(this.state.filters.operationName?.length || 0) - 4} Selected`}
              placeholder="Select Operation"
              onChange={entry => {
                this.onFilteredChangeCustom(entry as [], 'operationName');
              }}
              data-testid="select-operation"
            >
              {this.uniqueOperationNameOptions().map((name: string) => {
                return (
                  <Select.Option value={name} key={name}>
                    {name}{' '}
                  </Select.Option>
                );
              })}
            </SearchableSelect>
          </Form.Item>
          <Form.Item className="reset-filter" style={{ flex: '0 0 auto', marginBottom: 0 }}>
            <Button htmlType="button" onClick={this.handleResetFilter}>
              Reset Filters
            </Button>
          </Form.Item>
        </div>

        <Table
          className="span-table span-view-table"
          columns={columns}
          dataSource={this.state.filteredData}
          pagination={{
            total: this.state.filteredData.length,
            pageSizeOptions: ['10', '20', '50', '100'],
            showSizeChanger: true,
            showQuickJumper: true,
          }}
          rowKey="spanID"
        />
      </div>
    );
  }
}
