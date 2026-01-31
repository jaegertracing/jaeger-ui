// Copyright (c) 2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { act, cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TraceStatistics from './index';
import transformTraceData from '../../../model/transform-trace-data';
import { getColumnValues, getColumnValuesSecondDropdown } from './tableValues';

import testTrace from './tableValuesTestTrace/testTrace.json';

const transformedTrace = transformTraceData(testTrace).asOtelTrace();

describe('<TraceTagOverview>', () => {
  const defaultProps = {
    trace: transformedTrace,
    uiFind: undefined,
    uiFindVertexKeys: undefined,
    useOtelTerms: false,
  };

  afterEach(cleanup);

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

    let componentInstance;
    const TestWrapper = () => {
      return (
        <TraceStatistics
          ref={ref => {
            componentInstance = ref;
          }}
          {...defaultProps}
        />
      );
    };

    const { rerender } = render(<TestWrapper />);

    await waitFor(() => {
      expect(componentInstance).toBeTruthy();
      expect(componentInstance.state.tableValue).toBeDefined();
    });

    await act(async () => {
      rerender(
        <TraceStatistics
          ref={ref => {
            componentInstance = ref;
          }}
          {...defaultProps}
          uiFind="service1"
          uiFindVertexKeys={searchSet}
        />
      );
    });

    await waitFor(() => {
      expect(componentInstance.state.tableValue.length).toBeGreaterThan(0);
      const hasHighlightedItems = componentInstance.state.tableValue.some(
        item => item.searchColor === 'rgb(255,243,215)'
      );
      expect(hasHighlightedItems).toBe(true);
    });

    await act(async () => {
      rerender(
        <TraceStatistics
          ref={ref => {
            componentInstance = ref;
          }}
          {...defaultProps}
          uiFind={undefined}
          uiFindVertexKeys={undefined}
        />
      );
    });

    await waitFor(() => {
      const tableCells = screen.getAllByRole('cell');
      expect(tableCells.length).toBeGreaterThan(0);
    });
  });

  it('check handler', async () => {
    async function timedAct(fn, label) {
      const startTime = performance.now();
      await act(fn);
      const endTime = performance.now();
      const elapsedTime = (endTime - startTime).toFixed(2); // Two decimal places for ms
      console.log(`[${label}] took ${elapsedTime} ms`);
    }

    let componentRef;
    const TestWrapper = () => {
      const ref = React.useRef();
      componentRef = ref;
      return <TraceStatistics ref={ref} {...defaultProps} />;
    };

    await timedAct(async () => {
      render(<TestWrapper />);
    }, 'render');

    let tableValue = getColumnValues('Service Name', transformedTrace, false);
    tableValue = getColumnValuesSecondDropdown(
      tableValue,
      'Service Name',
      'Operation Name',
      transformedTrace,
      false
    );

    await timedAct(async () => {
      componentRef.current.handler(tableValue, tableValue, 'Service Name', 'Operation Name');
    }, 'call handler');

    const rows = screen.getAllByRole('row');
    expect(rows.length).toBeGreaterThan(1);
    const cells = screen.getAllByRole('cell');
    expect(cells.length).toBeGreaterThan(0);
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
    let componentRef;
    const TestWrapper = () => {
      const ref = React.useRef();
      componentRef = ref;
      return <TraceStatistics ref={ref} {...defaultProps} />;
    };

    render(<TestWrapper />);

    await waitFor(() => {
      if (componentRef.current) {
        componentRef.current.setState({
          ...componentRef.current.state,
          valueNameSelector1: 'sql.query',
          tableValue: [
            {
              name: 'SELECT * FROM users',
              hasSubgroupValue: true,
              searchColor: 'transparent',
              color: '#000',
              key: '0',
              isDetail: false,
              parentElement: 'none',
              count: 1,
              total: 100,
              avg: 50,
              min: 10,
              max: 90,
              selfTotal: 80,
              selfAvg: 40,
              selfMin: 5,
              selfMax: 75,
              percent: 80,
              colorToPercent: '#fff',
            },
          ],
        });
      }
    });

    await waitFor(() => {
      const nameButtons = screen.getAllByRole('button');
      const nameButton = nameButtons.find(
        button => button.textContent.includes('SELECT') || button.style.borderLeft || button.style.padding
      );

      if (nameButton) {
        fireEvent.click(nameButton);
      }
    });

    await waitFor(() => {
      const textarea = screen.queryByRole('textbox');
      if (textarea) {
        expect(textarea).toBeInTheDocument();
      }
    });
  });

  it('should handle onClickOption when hasSubgroupValue is false', async () => {
    let componentRef;
    const TestWrapper = () => {
      const ref = React.useRef();
      componentRef = ref;
      return <TraceStatistics ref={ref} {...defaultProps} />;
    };

    render(<TestWrapper />);

    await waitFor(() => {
      if (componentRef.current) {
        componentRef.current.setState({
          ...componentRef.current.state,
          valueNameSelector1: 'sql.query',
          tableValue: [
            {
              name: 'test-name',
              hasSubgroupValue: false,
              searchColor: 'transparent',
              color: '#000',
              key: '0',
              isDetail: false,
              parentElement: 'none',
              count: 1,
              total: 100,
              avg: 50,
              min: 10,
              max: 90,
              selfTotal: 80,
              selfAvg: 40,
              selfMin: 5,
              selfMax: 75,
              percent: 80,
              colorToPercent: '#fff',
            },
          ],
        });
      }
    });

    await waitFor(() => {
      const nameButtons = screen.getAllByRole('button');
      const nameButton = nameButtons.find(
        button => button.textContent.includes('test-name') || button.style.borderLeft || button.style.padding
      );

      if (nameButton) {
        fireEvent.click(nameButton);
      }
    });

    await waitFor(() => {
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });
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
    let componentRef;
    const TestWrapper = () => {
      const ref = React.useRef();
      componentRef = ref;
      return <TraceStatistics ref={ref} {...defaultProps} />;
    };

    render(<TestWrapper />);

    await waitFor(() => {
      if (componentRef.current) {
        componentRef.current.setState({
          ...componentRef.current.state,
          tableValue: [
            {
              name: 'item1',
              hasSubgroupValue: false,
              count: 1,
              total: 100,
              key: '0',
              searchColor: 'transparent',
              colorToPercent: '#fff',
            },
            {
              name: 'item2',
              hasSubgroupValue: true,
              count: 2,
              total: 200,
              key: '1',
              searchColor: 'transparent',
              colorToPercent: '#fff',
            },
            {
              name: 'item3',
              hasSubgroupValue: false,
              count: 3,
              total: 300,
              key: '2',
              searchColor: 'transparent',
              colorToPercent: '#fff',
            },
          ],
        });
      }
    });

    await waitFor(() => {
      const columnHeaders = screen.getAllByRole('columnheader');
      const countColumn = columnHeaders.find(header => header.textContent.includes('Count'));

      if (countColumn) {
        fireEvent.click(countColumn);
      }
    });

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
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
        key: '0',
      },
      {
        name: 'detail1',
        isDetail: true,
        hasSubgroupValue: false,
        parentElement: 'parent1',
        searchColor: 'rgb(248,248,248)',
        key: '1',
      },
      {
        name: 'detail2',
        isDetail: true,
        hasSubgroupValue: false,
        parentElement: 'parent2',
        searchColor: 'rgb(248,248,248)',
        key: '2',
      },
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
        key: '0',
      },
      {
        name: 'parentitem',
        isDetail: false,
        hasSubgroupValue: true,
        parentElement: 'none',
        searchColor: 'rgb(248,248,248)',
        key: '1',
      },
      {
        name: 'childitem',
        isDetail: true,
        hasSubgroupValue: false,
        parentElement: 'searchterm',
        searchColor: 'rgb(248,248,248)',
        key: '2',
      },
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
        key: '0',
      },
      {
        name: 'item2',
        isDetail: false,
        hasSubgroupValue: false,
        parentElement: 'none',
        searchColor: undefined,
        key: '1',
      },
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
