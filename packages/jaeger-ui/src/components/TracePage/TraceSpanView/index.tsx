// Copyright (c) 2018 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React, { Component } from 'react';
import { Table, Button, Select, Form } from 'antd';
import dayjs from 'dayjs';
import { ColumnProps } from 'antd/es/table';
import './index.css';
import { TNil } from '../../../types';
import { IOtelSpan, IOtelTrace } from '../../../types/otel';
import { timeConversion } from '../../../utils/date';
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
  serviceNameOperationsMap: Map<string, string[]>;
  filters: Record<FilterType, string[]>;
  filteredData: ReadonlyArray<IOtelSpan>;
};

export default class TraceSpanView extends Component<Props, State> {
  constructor(props: Props, state: State) {
    super(props, state);
    const serviceNamesSet = new Set<string>();
    const operationNamesSet = new Set<string>();
    const serviceNameOperationsMap = new Map<string, Set<string>>();

    this.props.trace.spans.forEach(span => {
      const serviceName = span.resource.serviceName;
      serviceNamesSet.add(serviceName);
      operationNamesSet.add(span.name);

      if (!serviceNameOperationsMap.has(serviceName)) {
        serviceNameOperationsMap.set(serviceName, new Set<string>());
      }
      serviceNameOperationsMap.get(serviceName)!.add(span.name);
    });

    // Sort alphabetically for better UX
    const serviceNamesList = [...serviceNamesSet].sort();
    const operationNamesList = [...operationNamesSet].sort();

    // Convert operation sets to sorted arrays
    const sortedServiceNameOperationsMap = new Map<string, string[]>();
    serviceNameOperationsMap.forEach((operations, serviceName) => {
      sortedServiceNameOperationsMap.set(serviceName, [...operations].sort());
    });

    this.state = {
      searchText: '',
      searchedColumn: '',
      data: this.props.trace.spans,
      serviceNamesList,
      operationNamesList,
      serviceNameOperationsMap: sortedServiceNameOperationsMap,
      filteredData: this.props.trace.spans,
      filters: {} as Record<FilterType, string[]>,
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
    let operationNamesList: string[] = [];
    const serviceNameOperationsMap = this.state.serviceNameOperationsMap;
    if (this.state.filters.serviceName) {
      operationNamesList = this.state.filters.serviceName.flatMap(
        svc => serviceNameOperationsMap.get(svc) || []
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
        dataIndex: ['resource', 'serviceName'],
        width: '25%',
        sorter: (a, b) => a.resource.serviceName.localeCompare(b.resource.serviceName),
      },
      {
        title: 'Operation',
        dataIndex: 'name',
        width: '25%',
        sorter: (a, b) => a.name.localeCompare(b.name),
      },
      {
        title: 'ID',
        dataIndex: 'spanID',
        sorter: (a, b) => a.spanID.localeCompare(b.spanID),
        render: (text: string, record: IOtelSpan) => {
          return (
            <a
              href={prefixUrl(`/trace/${record.traceID}?uiFind=${text}`)}
              target={getTargetEmptyOrBlank()}
              rel="noopener noreferrer"
            >
              {text}
            </a>
          );
        },
      },
      {
        title: 'Duration',
        dataIndex: 'duration',
        sorter: (a, b) => a.duration - b.duration,
        render: (cell: number) => {
          return timeConversion(cell);
        },
      },
      {
        title: 'Start Time',
        dataIndex: 'startTime',
        sorter: (a, b) => a.startTime - b.startTime,
        render: (cell: number) => {
          return dayjs(cell / 1000).format('DD MMM YYYY hh:mm A');
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
