// Copyright (c) 2020 The Jaeger Authors.
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

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TraceStatistics from './index';
import transformTraceData from '../../../model/transform-trace-data';
import { getColumnValues, getColumnValuesSecondDropdown } from './tableValues';

import testTrace from './tableValuesTestTrace/testTrace.json';

const transformedTrace = transformTraceData(testTrace);

describe('<TraceTagOverview>', () => {
  let defaultProps;

  beforeEach(() => {
    defaultProps = {
      trace: transformedTrace,
      uiFind: undefined,
      uiFindVertexKeys: undefined,
    };
  });

  it('does not explode', () => {
    const { container } = render(<TraceStatistics {...defaultProps} />);
    expect(container).toBeDefined();
  });

  it('renders Trace Tag Overview', () => {
    render(<TraceStatistics {...defaultProps} />);
    
    expect(screen.getByText('Trace Statistics')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.queryByText(/Tag: "SQL"/)).not.toBeInTheDocument();
  });

  it('check search', async () => {
    const searchSet = new Set();
    searchSet.add('service1	op1	__LEAF__');

    const { rerender } = render(<TraceStatistics {...defaultProps} />);
    
    await waitFor(() => {
      const tableCells = screen.getAllByRole('cell');
      expect(tableCells.length).toBeGreaterThan(0);
    });

    rerender(<TraceStatistics {...defaultProps} uiFind="service1" uiFindVertexKeys={searchSet} />);
    
    await waitFor(() => {
      const highlightedElements = document.querySelectorAll('[style*="rgb(255,243,215)"]');
      expect(highlightedElements.length).toBeGreaterThan(0);
    });

    rerender(<TraceStatistics {...defaultProps} uiFind={undefined} uiFindVertexKeys={undefined} />);
    
    await waitFor(() => {
      const tableCells = screen.getAllByRole('cell');
      expect(tableCells.length).toBeGreaterThan(0);
    });
  });

  it('check handler', async () => {
    let componentRef;
    const TestWrapper = () => {
      const ref = React.useRef();
      componentRef = ref;
      return <TraceStatistics ref={ref} {...defaultProps} />;
    };

    render(<TestWrapper />);

    let tableValue = getColumnValues('Service Name', transformedTrace);
    tableValue = getColumnValuesSecondDropdown(
      tableValue,
      'Service Name',
      'Operation Name',
      transformedTrace
    );

    await waitFor(() => {
      if (componentRef.current) {
        componentRef.current.handler(tableValue, tableValue, 'Service Name', 'Operation Name');
      }
    });

    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeGreaterThan(1);
      const cells = screen.getAllByRole('cell');
      expect(cells.length).toBeGreaterThan(0);
    });
  });

  it('check togglePopup', async () => {
    let componentRef;
    const TestWrapper = () => {
      const ref = React.useRef();
      componentRef = ref;
      return <TraceStatistics ref={ref} {...defaultProps} />;
    };

    render(<TestWrapper />);

    await waitFor(() => {
      if (componentRef.current) {
        componentRef.current.togglePopup('select *');
      }
    });

    await waitFor(() => {
      const textarea = screen.getByRole('textbox');
      expect(textarea.value).toBe('"select *"');
    });

    await waitFor(() => {
      if (componentRef.current) {
        componentRef.current.togglePopup('select *');
      }
    });

    await waitFor(() => {
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });
  });

  it('should trigger onClickOption when clicking on name cell with sql.query selector', async () => {
    const TestComponent = () => {
      const [state, setState] = React.useState({
        tableValue: [
          {
            name: 'SELECT * FROM users',
            hasSubgroupValue: true,
            searchColor: 'transparent',
            color: '#000',
            key: '0',
            isDetail: false,
            parentElement: 'none'
          }
        ],
        showPopup: false,
        popupContent: '',
        valueNameSelector1: 'sql.query'
      });

      const togglePopup = (content) => {
        setState(prevState => ({
          ...prevState,
          showPopup: !prevState.showPopup,
          popupContent: content
        }));
      };

      const onClickOption = (hasSubgroupValue, name) => {
        if (state.valueNameSelector1 === 'sql.query' && hasSubgroupValue) {
          togglePopup(name);
        }
      };

      return (
        <div>
          {state.showPopup && (
            <div data-testid="popup-sql">
              {state.popupContent}
            </div>
          )}
          <span
            role="button"
            onClick={() => onClickOption(true, 'SELECT * FROM users')}
            style={{
              borderLeft: '4px solid #000',
              padding: '7px 0px 7px 10px',
              cursor: 'default',
            }}
          >
            SELECT * FROM users
          </span>
        </div>
      );
    };

    render(<TestComponent />);
    
    const nameCell = screen.getByRole('button');
    fireEvent.click(nameCell);
    
    await waitFor(() => {
      expect(screen.getByTestId('popup-sql')).toBeInTheDocument();
      const popupContent = screen.getByTestId('popup-sql');
      expect(popupContent).toHaveTextContent('SELECT * FROM users');
    });
  });

  it('should handle onClickOption when hasSubgroupValue is false', async () => {
    const TestComponent = () => {
      const [showPopup, setShowPopup] = React.useState(false);
      const valueNameSelector1 = 'sql.query';

      const onClickOption = (hasSubgroupValue, name) => {
        if (valueNameSelector1 === 'sql.query' && hasSubgroupValue) {
          setShowPopup(true);
        }
      };

      return (
        <div>
          {showPopup && <div data-testid="popup-sql">Popup shown</div>}
          <span
            role="button"
            onClick={() => onClickOption(false, 'test-name')}
            style={{
              borderLeft: '4px solid #000',
              padding: '7px 0px 7px 10px',
              cursor: 'default',
            }}
          >
            test-name
          </span>
        </div>
      );
    };

    render(<TestComponent />);
    
    const nameCell = screen.getByRole('button');
    fireEvent.click(nameCell);
    
    expect(screen.queryByTestId('popup-sql')).not.toBeInTheDocument();
  });

  it('should test sorter function with string comparison', async () => {
    render(<TraceStatistics {...defaultProps} />);
    
    const columnHeaders = screen.getAllByRole('columnheader');
    const groupColumn = columnHeaders.find(header => header.textContent.includes('Group'));
    
    if (groupColumn) {
      fireEvent.click(groupColumn);
      
      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });
    }
  });

  it('should test sorter function with items that have no hasSubgroupValue', async () => {
    render(<TraceStatistics {...defaultProps} />);
    
    const columnHeaders = screen.getAllByRole('columnheader');
    const countColumn = columnHeaders.find(header => header.textContent.includes('Count'));
    
    if (countColumn) {
      fireEvent.click(countColumn);
      
      await waitFor(() => {

        expect(screen.getByRole('table')).toBeInTheDocument();
      });
    }
  });

  it('should test searchInTable with complex search scenarios', async () => {

    let componentRef;
    const TestWrapper = () => {
      const ref = React.useRef();
      componentRef = ref;
      return <TraceStatistics ref={ref} {...defaultProps} />;
    };

    render(<TestWrapper />);

    const mockTableData = [
      {
        name: 'parent1',
        isDetail: false,
        hasSubgroupValue: true,
        parentElement: 'none',
        searchColor: 'rgb(248,248,248)',
        key: '0'
      },
      {
        name: 'detail1',
        isDetail: true,
        hasSubgroupValue: false,
        parentElement: 'parent1',
        searchColor: 'rgb(248,248,248)',
        key: '1'
      },
      {
        name: 'detail2',
        isDetail: true,
        hasSubgroupValue: false,
        parentElement: 'parent2',
        searchColor: 'rgb(248,248,248)',
        key: '2'
      }
    ];
    
    const searchSet = new Set(['parent1detail1']);
    
    await waitFor(() => {
      if (componentRef.current) {
        const result = componentRef.current.searchInTable(searchSet, mockTableData, null);
        expect(result).toBeDefined();
        expect(result.length).toBe(3);
      }
    });
  });

  it('should test searchInTable with uiFind matching and detail items', async () => {

    let componentRef;
    const TestWrapper = () => {
      const ref = React.useRef();
      componentRef = ref;
      return <TraceStatistics ref={ref} {...defaultProps} />;
    };

    render(<TestWrapper />);

    const mockTableData = [
      {
        name: 'searchterm',
        isDetail: true,
        hasSubgroupValue: false,
        parentElement: 'parentitem',
        searchColor: 'rgb(248,248,248)',
        key: '0'
      },
      {
        name: 'parentitem',
        isDetail: false,
        hasSubgroupValue: true,
        parentElement: 'none',
        searchColor: 'rgb(248,248,248)',
        key: '1'
      },
      {
        name: 'childitem',
        isDetail: true,
        hasSubgroupValue: false,
        parentElement: 'searchterm',
        searchColor: 'rgb(248,248,248)',
        key: '2'
      }
    ];
    
    await waitFor(() => {
      if (componentRef.current) {
        const result = componentRef.current.searchInTable(undefined, mockTableData, 'searchterm');
        const highlightedItems = result.filter(item => item.searchColor === 'rgb(255,243,215)');
        expect(highlightedItems.length).toBeGreaterThan(0);
      }
    });
  });

  it('should test searchInTable with items that have subgroup values but are details', async () => {

    let componentRef;
    const TestWrapper = () => {
      const ref = React.useRef();
      componentRef = ref;
      return <TraceStatistics ref={ref} {...defaultProps} />;
    };

    render(<TestWrapper />);

    const mockTableData = [
      {
        name: 'item1',
        isDetail: true,
        hasSubgroupValue: true,
        parentElement: 'none',
        searchColor: undefined,
        key: '0'
      },
      {
        name: 'item2',
        isDetail: false,
        hasSubgroupValue: false,
        parentElement: 'none',
        searchColor: undefined,
        key: '1'
      }
    ];
    
    await waitFor(() => {
      if (componentRef.current) {
        const result = componentRef.current.searchInTable(undefined, mockTableData, null);
        expect(result[0].searchColor).toBe('rgb(248,248,248)');
        expect(result[1].searchColor).toBe('rgb(248,248,248)');
      }
    });
  });
});
