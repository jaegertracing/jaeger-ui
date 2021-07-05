import React, { Component, useRef } from 'react';
import { Row, Col, Table, Input, Button, Icon, Select } from 'antd';
import { TNil } from '../../../types';
import { Trace, Span } from '../../../types/trace';
import moment from 'moment';
import { FilterDropdownProps } from './types'
import './index.css';
import { ColumnProps } from "antd/es/table";
import { SorterResult } from 'antd/lib/table'
import { PaginationConfig } from "antd/lib/pagination"
import Highlighter from 'react-highlight-words';
import { SelectValue } from 'antd/lib/select';
import { ReactElement } from 'react';
import FormItem from 'antd/lib/form/FormItem';
const Option = Select.Option;



function getNestedProperty(path: string, span: any) : string{
  return path.split('.').reduce( (prev, curr) => {
    return prev ? prev[curr] : null
  }, span || self)
}

function isSpanValue(attribute:string, span: Span, value:any) {

 return  getNestedProperty(attribute, span)
    .toString()
    .toLowerCase()
    .includes(value.toLowerCase())
}

function timeConversion(microseconds: number) {

  let milliseconds: number = parseInt((microseconds / 1000).toFixed(2));
  let seconds: number = parseInt((milliseconds / 1000).toFixed(2));
  let minutes: number = parseInt((milliseconds / (1000 * 60)).toFixed(1));
  let hours: number = parseInt((milliseconds / (1000 * 60 * 60)).toFixed(1));
  let days: number = parseInt((milliseconds / (1000 * 60 * 60 * 24)).toFixed(1));

  if (milliseconds < 1000) {
    return milliseconds + "ms"
  } else if (seconds < 60) {
    return seconds + " Sec";
  } else if (minutes < 60) {
    return minutes + " Min";
  } else if (hours < 24) {
    return hours + " Hrs";
  } else {
    return days + " Days"
  }
}

type Props = {
  trace: Trace;
  uiFindVertexKeys: Set<string> | TNil;
  uiFind: string | null | undefined;
};

type State = {
  searchText:string;
  searchedColumn:string;
  data: Span[];
  dataLength:number;
  serviceNamesList: string[];
  operationNamesList: string[];
  filtered: { id: keyof Span, value: string[] }[],
  selectedServiceName: string[],
  selectedOperationName: string[],
  filteredData: Span[]

};


export default class TraceSpanView extends Component<Props, State> {
  
  onTablePropsChange(pagination: PaginationConfig, filters: any, sorter: SorterResult<Span>) {
    let filterAttribute= Object.keys(filters);
    let data = this.state.data.filter((span)=>{  
     return  filterAttribute.every((attribute) =>{
       return filters[attribute].every((value: string) => {
         return isSpanValue(attribute, span, value)
        })

      })
      
    })
    this.setState({
      ...this.state,
      data: data,
      dataLength:data.length,
      
    });
  }

  onFiltersChange(attribute:string, value: SelectValue){
    let selected = value as []; 
      
    let datasource= this.state.data.filter(span =>{
      let spanValue = getNestedProperty(attribute, span) as never;
        return selected.indexOf(spanValue)  > -1
    });

   
    console.log(datasource);
    this.setState({
      ...this.state,
      data: datasource,
      dataLength: datasource.length,

    });

  }
  onServiceNameFiltersChange(value: SelectValue, option: any) {
   // this.onFiltersChange('process.serviceName', value)
    let selected = value as [];
    let datasource = this.state.data.filter(span => {
      let spanValue = getNestedProperty('process.serviceName', span) as never;
      return selected.indexOf(spanValue) > -1
    });


    console.log(datasource);
    this.setState({
      ...this.state,
      data: datasource,
      dataLength: datasource.length,

    });

  }
  onOperationNameFiltersChange(value: SelectValue, option: any) {
    this.onFiltersChange('operatioName', value)

  }


  handleSearch(selectedKeys: string[] , confirm: (() => void) , dataIndex: string): void {
    confirm();
    this.setState({
      ...this.state,
      searchText: selectedKeys[0],
      searchedColumn: dataIndex,
    });
  };

  handleReset(clearFilters: (() => void) ){
    clearFilters();
    this.setState({ 
      ...this.state,
      searchText: '',
      data: this.props.trace.spans,
      dataLength: this.props.trace.spans.length
    });
  };

 
  constructor(props: Props, state: State) {
    super(props, state);
    const serviceNamesList = new Set<string>(), operationNamesList = new Set<string>();

    this.props.trace.spans.map((span) => {
      serviceNamesList.add(span.process.serviceName);
      operationNamesList.add(span.operationName);
    });

    this.state = {
      searchText: "",
      searchedColumn: "",
      data: this.props.trace.spans,
      dataLength: this.props.trace.spans.length,
      serviceNamesList: [...serviceNamesList],
      operationNamesList:[...operationNamesList],
      filteredData:this.props.trace.spans,
      filtered:[],
      selectedServiceName:[],
      selectedOperationName:[],
    }
    this.uniqueOptions = this.uniqueOptions.bind(this);
    this.handleFilter = this.handleFilter.bind(this);

  }

  onFilteredChangeCustom(value: string[], accessor: keyof Span) {

  
    let filtered = this.state.filtered;
    let insertNewFilter = 1;
    if (filtered.length) {
      console.log("filtered.length " + filtered.length);
      filtered.forEach((filter, i) => {
        if (filter.id === accessor) {
          if (!value) filtered.splice(i, 1);
          else filter.value = value;
          insertNewFilter = 0;
        }
      });
    }

    if (insertNewFilter) {
      filtered.push({ id: accessor, value: value });
    }

    this.setState({...this.state, filtered: filtered });
    let data =this.state.data.filter(span => this.state.filtered.every(filter => {
      let spanValue = getNestedProperty(filter.id, span);
      return filter.value.includes(spanValue)
    }));
    
    this.setState({ ...this.state, filteredData: data });
  }
  uniqueOperationNameOptions(objectsArray: Span[], objectKey: keyof Span) {
    debugger;
    var a = objectsArray.map((o) => {
      if (this.state.selectedOperationName.length && this.state.selectedOperationName.includes(getNestedProperty( 'process.serviceName', o))){
        return getNestedProperty(objectKey, o);
      }else{
        return getNestedProperty(objectKey, o);
      }
    });
    console.log(a);
    return a.filter(function (i, index) {
      return a.indexOf(i) >= index;
    });
  }
  uniqueOptions(objectsArray: Span[], objectKey: keyof Span) {
  var a = objectsArray.map((o, i) => {
   return getNestedProperty(objectKey, o);
  });

  return a.filter(function (i, index) {
    return a.indexOf(i) >= index;
  });
};

  handleFilter(item:any, itemName:string) {
    console.log(item);
    this.setState({
      ...this.state,
      [itemName]: this.state.selectedServiceName.filter(
        a => item.value.indexOf(a) < 0
      ),
      filtered: this.state.filtered.filter(a => {
        if (item[itemName] === a.value) {
          return false;
        }
        return true;
      })
    });
  }


  getColumnSearchProps = (dataIndex : keyof Span )=> ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: FilterDropdownProps) => (
      <div className='search-box'>
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
    filterIcon: (filtered : boolean) => (
      <Icon type="search" style={{ color: filtered ? '#1890ff' : undefined }} />
    ),
    onFilter: (value :string, record: Span) =>{
      return isSpanValue(dataIndex, record, value);
    },


    render: (text: string) =>
      this.state.searchedColumn === dataIndex ? (
        <Highlighter
          highlightStyle={{ backgroundColor: '#ffc069', padding: 0 }}
          searchWords={[this.state.searchText]}
          autoEscape
          textToHighlight={text.toString()}
        />
      ) : (
          text
        ),
  });

  
  render() {
    
    const columns: ColumnProps<Span>[] = [
      {
        title: "Service Name",
        dataIndex: "process.serviceName",
        width: '25%',
        ...this.getColumnSearchProps("process.serviceName" as keyof Span)

      }, {
        title: "Operation",
        dataIndex: "operationName",
        width: '25%',
        ...this.getColumnSearchProps("operationName")

      }, {
        title: "ID",
        dataIndex: "spanID",
        render: (cell: string, record: Span) => {
          return <a href={`/trace/${record.traceID}?uiFind=${record.spanID}`} target="_blank" > {record.spanID} </a>;
        }
      }, {
        title: "Duration",
        dataIndex: "duration",
        sorter: (a, b) => a.duration - b.duration,
        render: (cell: string, record: Span) => {
          return timeConversion(parseInt(cell));
        }
      }, {
        title: "Start Time",
        dataIndex: "startTime",
        sorter: (a, b) => a.startTime - b.startTime,
        render: (cell: number, record: Span) => {
          return moment(cell / 1000).format("DD MMM YYYY hh:mm A");
        }
      }
    ];
    return (
      <div>
        <h3 className="title--TraceStatistics"> Trace Tabular View</h3>
        <Row>
          <Col span={7}>
            <FormItem
              label="Service Name"
              labelCol={{ span: 6}}
              wrapperCol={{ span: 18 }}
            >
              <Select
                allowClear
                showSearch
                mode="multiple"
                style={{ width: '100%' }}
                maxTagCount={4}
                maxTagPlaceholder={`+ ${this.state.selectedServiceName.length - 4} Selected`}
                placeholder="Please Select Service "
                onChange={(entry) => {
                  this.setState(
                    {
                      selectedServiceName: entry as []
                    }
                  );
                  this.onFilteredChangeCustom(entry as [], "process.serviceName" as keyof Span);
                }}
              >
                {this.uniqueOptions(this.state.data, "process.serviceName" as keyof Span).map(
                  (name) => {
                    return <Option key={name}>{name} </Option>;
                  }
                )}
              </Select>
            </FormItem>
          </Col>
          <Col span={9} >         
          <FormItem
            label="Operation Name"
            labelCol={{ span:6 }}
            wrapperCol={{ span: 18 }}
          >
          <Select
            allowClear
            showSearch
            mode="multiple"
            style={{ width: '100%' }}
            maxTagCount={4}
            maxTagPlaceholder={`+ ${this.state.selectedOperationName.length - 4} Selected`}
            placeholder="Please Select Operation"
            onChange={(entry) => {
                  this.setState(
                    {
                      selectedOperationName: entry as []
                    }
                  );
                  this.onFilteredChangeCustom(entry as [], "operationName");
                }}
          >
                {this.uniqueOperationNameOptions(this.state.data, "operationName").map(
                  (name) => {
                    return  <Option key={name}>{name} </Option>;
                  }
                )}
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
          className='span-table'
          columns={columns}
          dataSource={this.state.filteredData}
          onChange={this.onTablePropsChange.bind(this)}
          pagination={{
            total: this.state.filteredData.length, 
            pageSizeOptions: ["10", "20", "50", "100"], 
            showSizeChanger: true, 
            showQuickJumper: true
          }}
          rowKey="spanID" >
        </Table>
      </div>
    )
  }
}