import { Button, CssBaseline, InputLabel, MenuItem, TextField } from '@material-ui/core'
import React, { useCallback, Component } from 'react';
import { CellProps, FilterProps, FilterValue, IdType, Row } from 'react-table'
import { Table } from './Table'
import { ITableSpan } from './types';
import { TNil } from '../../../types';
import { Trace } from '../../../types/trace';
import moment from 'moment';

function timeConversion(microseconds : number) {

  let milliseconds :number = parseInt((microseconds / 1000).toFixed(2));
  let seconds : number= parseInt((milliseconds / 1000 ).toFixed(2));

  let minutes: number = parseInt((milliseconds / (1000 * 60)).toFixed(1));

  let hours : number=parseInt((milliseconds / (1000 * 60 * 60)).toFixed(1));

  let days : number = parseInt((milliseconds / (1000 * 60 * 60 * 24)).toFixed(1));

  if(milliseconds < 1000){
    return milliseconds +"ms"
  }else if (seconds < 60) {
      return seconds + " Sec";
  } else if (minutes < 60) {
      return minutes + " Min";
  } else if (hours < 24) {
      return hours + " Hrs";
  } else {
      return days + " Days"
  }
}
// This is a custom aggregator that
// takes in an array of values and
// returns the rounded median
function roundedMedian(values: any[]) {
  let min = values[0] || ''
  let max = values[0] || ''

  values.forEach((value) => {
    min = Math.min(min, value)
    max = Math.max(max, value)
  })

  return Math.round((min + max) / 2)
}

function filterGreaterThan(rows: Array<Row<any>>, id: Array<IdType<any>>, filterValue: FilterValue) {
  return rows.filter((row) => {
    const rowValue = row.values[id[0]]
    return rowValue >= filterValue
  })
}

// This is an autoRemove method on the filter function that
// when given the new filter value and returns true, the filter
// will be automatically removed. Normally this is just an undefined
// check, but here, we want to remove the filter if it's not a number
filterGreaterThan.autoRemove = (val: any) => typeof val !== 'number'










const columns = [ 
  {
    Header:'Spans Tabular View',
    columns: [
     ,{
        Header :"Service Name",
        accessor:"process.serviceName"
      },{
        Header: "Operation",
        accessor: "operationName",
        disableGroupBy: true,
      },{
        Header: "ID",
        accessor: "spanID",
        defaultCanSort: false,
        disableSortBy: true,
        disableGroupBy: true,
      },{
        Header: "Duration",
        accessor: "duration",
        disableGroupBy: true,
        Cell: (cell: CellProps<ITableSpan>) => {
          return timeConversion(cell.value);
        },
        Aggregated: ({ cell: { value } }: CellProps<ITableSpan>) => `${value / 1000}ms`
      }, {
        Header: "start Time",
        accessor: "startTime",
        disableGroupBy: true,
        Cell: (cell: CellProps<ITableSpan>) => {
          return moment(cell.value / 1000).format("DD MMM YYYY hh:mm A");
        },
      }

    ]
  }
];
type Props = {
  trace: Trace;
  uiFindVertexKeys: Set<string> | TNil;
  uiFind: string | null | undefined;
};

type State = {
  tableValue: ITableSpan[];
  sortIndex: number;
  sortAsc: boolean;
  showPopup: boolean;
  popupContent: string;
  wholeTable: ITableSpan[];
  valueNameSelector1: string;
  valueNameSelector2: string | null;
};


export default class TraceSpanView extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
  }
  render() {
  const data =this.props.trace.spans;
  return (
    <div>
    <h3 className="title--TraceStatistics"> Trace Tabular View</h3>
      <Table
        name={"spansTable"}
        columns={columns}
        data={data}>
        </Table>
    </div>
  )
  }
}