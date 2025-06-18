// Copyright (c) 2017 Uber Technologies, Inc.
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
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import SpanBarRow from './SpanBarRow';

jest.mock('./SpanTreeOffset', () => ({
  __esModule: true,
  default: jest.fn(({ span, childrenVisible, onClick }) => (
    <div data-testid="span-tree-offset" onClick={onClick}>
      SpanTreeOffset: {span.spanID} - {childrenVisible ? 'expanded' : 'collapsed'}
    </div>
  )),
}));

jest.mock('./ReferencesButton', () => ({
  __esModule: true,
  default: jest.fn(({ tooltipText, references, children }) => (
    <button
      data-testid="references-button"
      data-tooltip={tooltipText}
      data-references={JSON.stringify(references)}
    >
      {children}
    </button>
  )),
}));

jest.mock('./SpanBar', () => ({
  __esModule: true,
  default: jest.fn(() => <div data-testid="span-bar">SpanBar</div>),
}));

describe('<SpanBarRow>', () => {
  const spanID = 'some-id';
  const defaultProps = {
    className: 'a-class-name',
    color: 'color-a',
    criticalPath: [],
    columnDivision: 0.5,
    isChildrenExpanded: true,
    isDetailExpanded: false,
    isMatchingFilter: false,
    onDetailToggled: jest.fn(),
    onChildrenToggled: jest.fn(),
    numTicks: 5,
    rpc: {
      viewStart: 0.25,
      viewEnd: 0.75,
      color: 'color-b',
      operationName: 'rpc-op-name',
      serviceName: 'rpc-service-name',
    },
    showErrorIcon: false,
    getViewedBounds: jest.fn().mockReturnValue({ start: 0.5, end: 0.6 }),
    span: {
      duration: 'test-duration',
      hasChildren: true,
      operationName: 'op-name',
      process: {
        serviceName: 'service-name',
      },
      spanID,
      logs: [],
      startTime: 100,
    },
    traceStartTime: 0,
    traceDuration: 1000,
    focusSpan: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    defaultProps.onDetailToggled.mockReset();
    defaultProps.onChildrenToggled.mockReset();
  });

  it('renders without exploding', () => {
    render(<SpanBarRow {...defaultProps} />);

    expect(screen.getByTestId('span-tree-offset')).toBeInTheDocument();
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('escalates detail toggling', () => {
    const { onDetailToggled } = defaultProps;
    render(<SpanBarRow {...defaultProps} />);

    const spanView = screen.getByTestId('span-bar').closest('div.span-view');
    fireEvent.click(spanView);

    expect(onDetailToggled).toHaveBeenCalledWith(spanID);
  });

  it('escalates children toggling', () => {
    const { onChildrenToggled } = defaultProps;
    render(<SpanBarRow {...defaultProps} />);

    const spanTreeOffset = screen.getByTestId('span-tree-offset');
    fireEvent.click(spanTreeOffset);

    expect(onChildrenToggled).toHaveBeenCalledWith(spanID);
  });

  it('render references button', () => {
    const span = {
      ...defaultProps.span,
      references: [
        {
          refType: 'CHILD_OF',
          traceID: 'trace1',
          spanID: 'span0',
          span: {
            spanID: 'span0',
          },
        },
        {
          refType: 'CHILD_OF',
          traceID: 'otherTrace',
          spanID: 'span1',
          span: {
            spanID: 'span1',
          },
        },
      ],
    };

    render(<SpanBarRow {...defaultProps} span={span} />);

    const referencesButton = screen.getByTestId('references-button');
    expect(referencesButton).toBeInTheDocument();
    expect(referencesButton).toHaveAttribute('data-tooltip', 'Contains multiple references');
  });

  it('render referenced to by single span', () => {
    const span = {
      ...defaultProps.span,
      subsidiarilyReferencedBy: [
        {
          refType: 'CHILD_OF',
          traceID: 'trace1',
          spanID: 'span0',
          span: {
            spanID: 'span0',
          },
        },
      ],
    };

    render(<SpanBarRow {...defaultProps} span={span} />);

    const referencesButton = screen.getByTestId('references-button');
    expect(referencesButton).toBeInTheDocument();
    expect(referencesButton).toHaveAttribute('data-tooltip', 'This span is referenced by another span');
  });

  it('render referenced to by multiple span', () => {
    const span = {
      ...defaultProps.span,
      subsidiarilyReferencedBy: [
        {
          refType: 'CHILD_OF',
          traceID: 'trace1',
          spanID: 'span0',
          span: {
            spanID: 'span0',
          },
        },
        {
          refType: 'CHILD_OF',
          traceID: 'trace1',
          spanID: 'span1',
          span: {
            spanID: 'span1',
          },
        },
      ],
    };

    render(<SpanBarRow {...defaultProps} span={span} />);

    const referencesButton = screen.getByTestId('references-button');
    expect(referencesButton).toBeInTheDocument();
    expect(referencesButton).toHaveAttribute(
      'data-tooltip',
      'This span is referenced by multiple other spans'
    );
  });
});
