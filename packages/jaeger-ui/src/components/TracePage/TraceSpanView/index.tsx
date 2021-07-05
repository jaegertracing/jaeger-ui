// Copyright (c) 2018 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React, { Component } from 'react';
import { Row, Col, Table, Input, Button, Icon, Select } from 'antd';
import moment from 'moment';
import { ColumnProps } from 'antd/es/table';
import { SelectValue } from 'antd/lib/select';
import FormItem from 'antd/lib/form/FormItem';
import './index.css';
import { TNil } from '../../../types';
import { Trace, Span } from '../../../types/trace';
import { IFilterDropdownProps } from './types';

const Option = Select.Option;

function getNestedProperty(path: string, span: any): string {
  return path.split('.').reduce((prev, curr) => {
    return prev ? prev[curr] : null;
  }, span);
}

function isSpanValue(attribute: string, span: Span, value: any) {
  return getNestedProperty(attribute, span)
    .toString()
    .toLowerCase()
    .includes(value.toLowerCase());
}

function getHighlightedText(text: string, highlight: string) {
  const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
  return (
    <span>{parts.map(part => (part.toLowerCase() === highlight.toLowerCase() ? <b>{part}</b> : part))}</span>
  );
}
function timeConversion(microseconds: number) {
  const milliseconds: number = parseInt((microseconds / 1000).toFixed(2), 10);
  const seconds: number = parseInt((milliseconds / 1000).toFixed(2), 10);
  const minutes: number = parseInt((milliseconds / (1000 * 60)).toFixed(1), 10);
  const hours: number = parseInt((milliseconds / (1000 * 60 * 60)).toFixed(1), 10);
  const days: number = parseInt((milliseconds / (1000 * 60 * 60 * 24)).toFixed(1), 10);
  let timeText;
  if (milliseconds < 1000) {
    timeText = `${milliseconds}ms`;
  } else if (seconds < 60) {
    timeText = `${seconds}Sec`;
  } else if (minutes < 60) {
    timeText = `${minutes}Min`;
  } else if (hours < 24) {
    timeText = `${hours}Hrs`;
  } else {
    timeText = `${days}Days`;
  }
  return timeText;
}

type Props = {
  trace: Trace;
  uiFindVertexKeys: Set<string> | TNil;
  uiFind: string | null | undefined;
};

type State = {
  searchText: string;
  searchedColumn: string;
  data: Span[];
  dataLength: number;
  serviceNamesList: string[];
  operationNamesList: string[];
  filtered: { id: keyof Span; value: string[] }[];
  selectedServiceName: string[];
  selectedOperationName: string[];
  filteredData: Span[];
};

export default class TraceSpanView extends Component<Props, State> {
  constructor(props: Props, state: State) {
    super(props, state);
    const serviceNamesList = new Set<string>();
    const operationNamesList = new Set<string>();

    this.props.trace.spans.map(span => {
      serviceNamesList.add(span.process.serviceName);
      operationNamesList.add(span.operationName);
      return { serviceNamesList, operationNamesList };
    });

    this.state = {
      searchText: '',
      searchedColumn: '',
      data: this.props.trace.spans,
      dataLength: this.props.trace.spans.length,
      serviceNamesList: [...serviceNamesList],
      operationNamesList: [...operationNamesList],
      filteredData: this.props.trace.spans,
      filtered: [],
      selectedServiceName: [],
      selectedOperationName: [],
    };
    this.handleFilter = this.handleFilter.bind(this);
    this.onTablePropsChange = this.onTablePropsChange.bind(this);
  }

  handleSearch(selectedKeys: string[], confirm: () => void, dataIndex: string): void {
    confirm();
    this.setState(previousState => ({
      ...previousState,
      searchText: selectedKeys[0],
      searchedColumn: dataIndex,
    }));
  }

  handleReset(clearFilters: () => void) {
    clearFilters();
    this.setState(previousState => ({
      ...previousState,
      searchText: '',
      data: this.props.trace.spans,
      dataLength: this.props.trace.spans.length,
    }));
  }

  getColumnSearchProps = (dataIndex: keyof Span) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: IFilterDropdownProps) => (
      <div className="search-box">
        <Input
          placeholder={`Search ${dataIndex}`}
          value={selectedKeys && selectedKeys[0]}
          onChange={e => setSelectedKeys && setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => this.handleSearch(selectedKeys, confirm, dataIndex)}
          style={{ width: 220, marginBottom: 8, display: 'block' }}
        />
        <Button
          type="primary"
          onClick={() => this.handleSearch(selectedKeys, confirm, dataIndex)}
          icon="search"
          size="small"
          style={{ width: '51%', marginRight: 8 }}
        >
          Search
        </Button>
        <Button onClick={() => this.handleReset(clearFilters)} size="small" style={{ width: 90 }}>
          Reset
        </Button>
      </div>
    ),
    filterIcon: (filtered: boolean) => (
      <Icon type="search" style={{ color: filtered ? '#1890ff' : undefined }} />
    ),
    onFilter: (value: string, record: Span) => {
      return isSpanValue(dataIndex, record, value);
    },

    render: (text: string) =>
      this.state.searchedColumn === dataIndex
        ? getHighlightedText(text.toString(), this.state.searchText)
        : text,
  });

  handleFilter(item: any, itemName: string) {
    this.setState(previousState => ({
      ...previousState,
      [itemName]: previousState.selectedServiceName.filter(a => item.value.indexOf(a) < 0),
      filtered: previousState.filtered.filter(a => {
        if (item[itemName] === a.value) {
          return false;
        }
        return true;
      }),
    }));
  }

  uniqueOperationNameOptions(objectsArray: Span[], objectKey: keyof Span) {
    let operationsList;
    const a = objectsArray.map(o => {
      if (
        this.state.selectedOperationName.length &&
        this.state.selectedOperationName.includes(getNestedProperty('process.serviceName', o))
      ) {
        operationsList = getNestedProperty(objectKey, o);
      } else {
        operationsList = getNestedProperty(objectKey, o);
      }
      return operationsList;
    });

    return a.filter((i, index) => {
      return a.indexOf(i) >= index;
    });
  }

  uniqueOptions(objectKey: keyof Span) {
    const a = this.state.data.map(o => {
      return getNestedProperty(objectKey, o);
    });
    return a.filter((i, index) => {
      return a.indexOf(i) >= index;
    });
  }

  onFilteredChangeCustom(value: string[], accessor: keyof Span) {
    const filtered = this.state.filtered;
    let insertNewFilter = 1;
    if (filtered.length) {
      filtered.forEach((filter, i) => {
        if (filter.id === accessor) {
          if (!value) filtered.splice(i, 1);
          // else filter.value = value;
          insertNewFilter = 0;
        }
      });
    }

    if (insertNewFilter) {
      filtered.push({ id: accessor, value });
    }

    this.setState(previousState => ({
      ...previousState,
      filtered,
    }));
    const data = this.state.data.filter(span =>
      this.state.filtered.every(filter => {
        const spanValue = getNestedProperty(filter.id, span);
        return filter.value.includes(spanValue);
      })
    );

    this.setState(previousState => ({
      ...previousState,
      filteredData: data,
    }));
  }

  onTablePropsChange(filters: any) {
    const filterAttribute = Object.keys(filters);
    const data = this.state.data.filter(span => {
      return filterAttribute.every(attribute => {
        return filters[attribute].every((value: string) => {
          return isSpanValue(attribute, span, value);
        });
      });
    });
    this.setState(previousState => ({
      ...previousState,
      data,
      dataLength: data.length,
    }));
  }

  onFiltersChange(attribute: string, value: SelectValue) {
    const selected = value as [];
    const datasource = this.state.data.filter(span => {
      const spanValue = getNestedProperty(attribute, span) as never;
      return selected.indexOf(spanValue) > -1;
    });
    this.setState(previousState => ({
      ...previousState,
      data: datasource,
      dataLength: datasource.length,
    }));
  }

  onServiceNameFiltersChange(value: SelectValue) {
    // this.onFiltersChange('process.serviceName', value)
    const selected = value as [];
    const datasource = this.state.data.filter(span => {
      const spanValue = getNestedProperty('process.serviceName', span) as never;
      return selected.indexOf(spanValue) > -1;
    });

    this.setState(previousState => ({
      ...previousState,
      data: datasource,
      dataLength: datasource.length,
    }));
  }

  onOperationNameFiltersChange(value: SelectValue) {
    this.onFiltersChange('operatioName', value);
  }

  render() {
    const columns: ColumnProps<Span>[] = [
      {
        title: 'Service Name',
        dataIndex: 'process.serviceName',
        width: '25%',
        ...this.getColumnSearchProps('process.serviceName' as keyof Span),
      },
      {
        title: 'Operation',
        dataIndex: 'operationName',
        width: '25%',
        ...this.getColumnSearchProps('operationName'),
      },
      {
        title: 'ID',
        dataIndex: 'spanID',
        render: (record: Span) => {
          return (
            <a
              href={`/trace/${record.traceID}?uiFind=${record.spanID}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {' '}
              {record.spanID}{' '}
            </a>
          );
        },
      },
      {
        title: 'Duration',
        dataIndex: 'duration',
        sorter: (a, b) => a.duration - b.duration,
        render: (cell: string) => {
          return timeConversion(parseInt(cell, 10));
        },
      },
      {
        title: 'Start Time',
        dataIndex: 'startTime',
        sorter: (a, b) => a.startTime - b.startTime,
        render: (cell: number) => {
          return moment(cell / 1000).format('DD MMM YYYY hh:mm A');
        },
      },
    ];
    return (
      <div>
        <h3 className="title--TraceStatistics"> Trace Tabular View</h3>
        <Row>
          <Col span={7}>
            <FormItem label="Service Name" labelCol={{ span: 6 }} wrapperCol={{ span: 18 }}>
              <Select
                allowClear
                showSearch
                mode="multiple"
                style={{ width: '100%' }}
                maxTagCount={4}
                maxTagPlaceholder={`+ ${this.state.selectedServiceName.length - 4} Selected`}
                placeholder="Please Select Service "
                onChange={entry => {
                  this.setState(previousState => ({
                    ...previousState,
                    selectedServiceName: entry as [],
                  }));
                  this.onFilteredChangeCustom(entry as [], 'process.serviceName' as keyof Span);
                }}
              >
                {this.uniqueOptions('process.serviceName' as keyof Span).map(name => {
                  return <Option key={name}>{name} </Option>;
                })}
              </Select>
            </FormItem>
          </Col>
          <Col span={9}>
            <FormItem label="Operation Name" labelCol={{ span: 6 }} wrapperCol={{ span: 18 }}>
              <Select
                allowClear
                showSearch
                mode="multiple"
                style={{ width: '100%' }}
                maxTagCount={4}
                maxTagPlaceholder={`+ ${this.state.selectedOperationName.length - 4} Selected`}
                placeholder="Please Select Operation"
                onChange={entry => {
                  this.setState(previousState => ({
                    ...previousState,
                    selectedOperationName: entry as [],
                  }));
                  this.onFilteredChangeCustom(entry as [], 'operationName');
                }}
              >
                {this.uniqueOperationNameOptions(this.state.data, 'operationName').map(name => {
                  return <Option key={name}>{name} </Option>;
                })}
              </Select>
            </FormItem>
          </Col>
          <Col span={2} push={6}>
            <FormItem>
              <Button type="primary">Reset Filters</Button>
            </FormItem>
          </Col>
        </Row>

        <Table
          className="span-table"
          columns={columns}
          dataSource={this.state.filteredData}
          onChange={this.onTablePropsChange}
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
