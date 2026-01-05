// Copyright (c) 2018 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React, { Component } from 'react';
import { Row, Col, Table, Button, Select, Form } from 'antd';
import dayjs from 'dayjs';
import { ColumnProps } from 'antd/es/table';
import './index.css';
import { TNil } from '../../../types';
import { IOtelSpan, IOtelTrace } from '../../../types/otel';
import { timeConversion } from '../../../utils/date';
import prefixUrl from '../../../utils/prefix-url';
import { getTargetEmptyOrBlank } from '../../../utils/config/get-target';
import SearchableSelect from '../../common/SearchableSelect';

const Option = Select.Option;

function getNestedProperty(path: string, span: any): string {
  return path.split('.').reduce((prev, curr) => {
    return prev ? prev[curr] : null;
  }, span);
}

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
  filtered: Record<string, string[]>;
  selectedServiceName: string[];
  selectedOperationName: string[];
  filteredData: ReadonlyArray<IOtelSpan>;
};

export default class TraceSpanView extends Component<Props, State> {
  constructor(props: Props, state: State) {
    super(props, state);
    const serviceNamesList = new Set<string>();
    const operationNamesList = new Set<string>();
    const serviceNameOperationsMap = new Map<string, string[]>();

    this.props.trace.spans.forEach(span => {
      const serviceName = span.resource.serviceName;
      serviceNamesList.add(serviceName);
      operationNamesList.add(span.name);
      const operationNames = serviceNameOperationsMap.get(serviceName) || [];
      operationNames.push(span.name);
      serviceNameOperationsMap.set(serviceName, operationNames);
    });

    this.state = {
      searchText: '',
      searchedColumn: '',
      data: this.props.trace.spans,
      serviceNamesList: [...serviceNamesList],
      operationNamesList: [...operationNamesList],
      serviceNameOperationsMap,
      filteredData: this.props.trace.spans,
      filtered: {},
      selectedServiceName: [],
      selectedOperationName: [],
    };
    this.handleResetFilter = this.handleResetFilter.bind(this);
    this.uniqueOperationNameOptions = this.uniqueOperationNameOptions.bind(this);
  }

  handleResetFilter() {
    this.setState(previousState => ({
      selectedServiceName: [],
      selectedOperationName: [],
      filteredData: previousState.data,
    }));
  }

  uniqueOperationNameOptions() {
    let operationNamesList: string[] = [];
    const serviceNameOperationsMap = this.state.serviceNameOperationsMap;
    // OTEL uses resource.serviceName
    if (this.state.filtered['resource.serviceName']) {
      this.state.filtered['resource.serviceName'].forEach((currentValue: string) => {
        operationNamesList = operationNamesList.concat(serviceNameOperationsMap.get(currentValue) || []);
      });
    } else {
      operationNamesList = this.state.operationNamesList;
    }
    return [...new Set(operationNamesList)];
  }

  onFilteredChangeCustom(selectedValues: string[], accessor: string) {
    const filtered = this.state.filtered;
    filtered[accessor] = selectedValues;
    const data = this.state.data.filter(span => {
      let isSpanIncluded;
      Object.keys(filtered).every(filterColumn => {
        if (filtered[filterColumn].length) {
          const spanValue = getNestedProperty(filterColumn, span);
          isSpanIncluded = filtered[filterColumn].includes(spanValue);
        } else {
          isSpanIncluded = true;
        }
        return isSpanIncluded;
      });

      return isSpanIncluded;
    });

    this.setState(previousState => ({
      ...previousState,
      filtered,
      filteredData: data,
    }));
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
        <Row style={{ marginTop: '8px' }}>
          <Col span={7}>
            <Form.Item
              label="Service Name"
              labelCol={{ span: 6 }}
              wrapperCol={{ span: 18 }}
              className="serviceNameDD"
            >
              <SearchableSelect
                allowClear
                mode="multiple"
                style={{ width: '100%' }}
                maxTagCount={4}
                value={this.state.selectedServiceName}
                maxTagPlaceholder={`+ ${this.state.selectedServiceName.length - 4} Selected`}
                placeholder="Please Select Service "
                onChange={entry => {
                  this.setState(previousState => ({
                    ...previousState,
                    selectedServiceName: entry as [],
                  }));
                  // Use resource.serviceName instead of process.serviceName
                  this.onFilteredChangeCustom(entry as [], 'resource.serviceName');
                }}
                data-testid="select-service"
              >
                {this.state.serviceNamesList.map(name => {
                  return (
                    <Option value={name} key={name}>
                      {name}{' '}
                    </Option>
                  );
                })}
              </SearchableSelect>
            </Form.Item>
          </Col>
          <Col span={9}>
            <Form.Item
              label="Operation Name"
              labelCol={{ span: 6 }}
              wrapperCol={{ span: 18 }}
              className="operationNameDD"
            >
              <SearchableSelect
                allowClear
                mode="multiple"
                style={{ width: '100%' }}
                maxTagCount={4}
                value={this.state.selectedOperationName}
                maxTagPlaceholder={`+ ${this.state.selectedOperationName.length - 4} Selected`}
                placeholder="Please Select Operation"
                onChange={entry => {
                  this.setState(previousState => ({
                    ...previousState,
                    selectedOperationName: entry as [],
                  }));
                  // Use name instead of operationName
                  this.onFilteredChangeCustom(entry as [], 'name');
                }}
                data-testid="select-operation"
              >
                {this.uniqueOperationNameOptions().map((name: string) => {
                  return (
                    <Option value={name} key={name}>
                      {name}{' '}
                    </Option>
                  );
                })}
              </SearchableSelect>
            </Form.Item>
          </Col>
          <Col span={2} push={6}>
            <Form.Item className="reset-filter">
              <Button type="primary" htmlType="button" onClick={this.handleResetFilter}>
                Reset Filters
              </Button>
            </Form.Item>
          </Col>
        </Row>

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
