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

function SelectColumnFilter({
  column: { filterValue, render, setFilter, preFilteredRows, id },
}: FilterProps<ITableSpan>) {
  const options = React.useMemo(() => {
    const options = new Set<any>()
    preFilteredRows.forEach((row) => {
      options.add(row.values[id])
    })
    return [...Array.from(options.values())]
  }, [id, preFilteredRows])

  return (
    <TextField
      select
      label={render('Header')}
      value={filterValue || ''}
      onChange={(e) => {
        setFilter(e.target.value || undefined)
      }}
    >
      <MenuItem value={''}>All</MenuItem>
      {options.map((option, i) => (
        <MenuItem key={i} value={option}>
          {option}
        </MenuItem>
      ))}
    </TextField>
  )
}

const getMinMax = (rows: Row<ITableSpan>[], id: IdType<ITableSpan>) => {
  let min = rows.length ? rows[0].values[id] : 0
  let max = rows.length ? rows[0].values[id] : 0
  rows.forEach((row) => {
    min = Math.min(row.values[id], min)
    max = Math.max(row.values[id], max)
  })
  return [min, max]
}

function SliderColumnFilter({
  column: { render, filterValue, setFilter, preFilteredRows, id },
}: FilterProps<ITableSpan>) {
  const [min, max] = React.useMemo(() => getMinMax(preFilteredRows, id), [id, preFilteredRows])

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
      }}
    >
      <TextField
        name={id}
        label={render('Header')}
        type='range'
        inputProps={{
          min,
          max,
        }}
        value={filterValue || min}
        onChange={(e) => {
          setFilter(parseInt(e.target.value, 10))
        }}
      />
      <Button variant='outlined' style={{ width: 60, height: 36 }} onClick={() => setFilter(undefined)}>
        Off
      </Button>
    </div>
  )
}

const useActiveElement = () => {
  const [active, setActive] = React.useState(document.activeElement)

  const handleFocusIn = () => {
    setActive(document.activeElement)
  }

  React.useEffect(() => {
    document.addEventListener('focusin', handleFocusIn)
    return () => {
      document.removeEventListener('focusin', handleFocusIn)
    }
  }, [])

  return active
}

// This is a custom UI for our 'between' or number range
// filter. It uses two number boxes and filters rows to
// ones that have values between the two
function NumberRangeColumnFilter({
  column: { filterValue = [], render, preFilteredRows, setFilter, id },
}: FilterProps<ITableSpan>) {
  const [min, max] = React.useMemo(() => getMinMax(preFilteredRows, id), [id, preFilteredRows])
  const focusedElement = useActiveElement()
  const hasFocus = focusedElement && (focusedElement.id === `${id}_1` || focusedElement.id === `${id}_2`)
  return (
    <>
      <InputLabel htmlFor={id} shrink focused={!!hasFocus}>
        {render('Header')}
      </InputLabel>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          paddingTop: 5,
        }}
      >
        <TextField
          id={`${id}_1`}
          value={filterValue[0] || ''}
          type='number'
          onChange={(e) => {
            const val = e.target.value
            setFilter((old: any[] = []) => [val ? parseInt(val, 10) : undefined, old[1]])
          }}
          placeholder={`Min (${min})`}
          style={{
            width: '70px',
            marginRight: '0.5rem',
          }}
        />
        to
        <TextField
          id={`${id}_2`}
          value={filterValue[1] || ''}
          type='number'
          onChange={(e) => {
            const val = e.target.value
            setFilter((old: any[] = []) => [old[0], val ? parseInt(val, 10) : undefined])
          }}
          placeholder={`Max (${max})`}
          style={{
            width: '70px',
            marginLeft: '0.5rem',
          }}
        />
      </div>
    </>
  )
}


const columns = [ 
  {
    Header:'Spans Tabular View',
    columns: [
      {
        Header: "ID",
        accessor: "spanID",
        defaultCanSort: false,
        disableSortBy: true,
        disableGroupBy: true,
      }, {
        Header: "Duration",
        accessor: "duration",
        Cell: (cell : CellProps<ITableSpan> ) => {
         return  timeConversion(cell.value);
        },
        Aggregated: ({ cell: { value } }: CellProps<ITableSpan>) => `${value/1000}ms`,
        disableGroupBy: true,
      },{
        Header :"start Time",
        accessor:"startTime",
        disableGroupBy: true,
        Cell: (cell : CellProps<ITableSpan> ) => {
          return  moment(cell.value/1000).format("DD MMM YYYY hh:mm A");
         },
      },{
        Header:"Operation",
        accessor:"operationName"
      },{
        Header :"Service Name",
        accessor:"process.serviceName"
      }

    ]
  }
];//,{
//   Header :"Service Name",
//   accessor:"process.serviceName"
// },{
//   Header :"Service Name",
//   accessor:"process.serviceName"
// }.flatMap((c:any)=>c.columns) // remove comment to drop header groups

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
    console.log(props);
    console.log(columns);
  }
  render() {
  //const [data] = React.useState<ITableSpan[]>(() => this.props.trace.spans;
  const data =this.props.trace.spans;
  console.log(data);
  return (
    <div>
    <h3 className="title--TraceStatistics"> Trace Tabular View</h3>
      <CssBaseline />
      <Table
        name={"testTable"}
        columns={columns}
        data={data}>
        </Table>
    </div>
  )
  }
}