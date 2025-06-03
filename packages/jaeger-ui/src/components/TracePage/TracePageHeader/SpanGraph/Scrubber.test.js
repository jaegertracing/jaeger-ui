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

import Scrubber from './Scrubber';

// Scrubber is an SVG component, so it needs to be rendered within an <svg>
// container to satisfy the renderer and allow querying via DOM APIs.
const renderInSvg = ui => {
  const { container, ...rest } = render(<svg>{ui}</svg>);
  // Return the container's first child (the rendered component within svg)
  // along with other render utils
  return { container: container.firstChild.firstChild, ...rest };
};

describe('<Scrubber />', () => {
  const defaultProps = {
    isDragging: false,
    position: 0,
    onMouseDown: jest.fn(),
    onMouseEnter: jest.fn(),
    onMouseLeave: jest.fn(),
  };

  it('renders correctly', () => {
    const { container } = renderInSvg(<Scrubber {...defaultProps} />);

    // Check for the presence of the main line
    expect(container.querySelector('.Scrubber--line')).toBeInTheDocument();

    // Check for the presence of the handles group
    expect(screen.getByTestId('scrubber-handles')).toBeInTheDocument();

    // Check for the presence of the handle rectangles within the group
    expect(container.querySelector('.Scrubber--handle')).toBeInTheDocument();
    expect(container.querySelector('.Scrubber--handleExpansion')).toBeInTheDocument();
  });

  it('positions elements based on the position prop', () => {
    const position = 0.5; // 50%
    const xPercent = `${position * 100}%`; // '50%'
    const { container } = renderInSvg(<Scrubber {...defaultProps} position={position} />);

    const line = container.querySelector('.Scrubber--line');
    const handle = container.querySelector('.Scrubber--handle');
    const handleExpansion = container.querySelector('.Scrubber--handleExpansion');

    expect(line).toHaveAttribute('x1', xPercent);
    expect(line).toHaveAttribute('x2', xPercent);
    expect(handle).toHaveAttribute('x', xPercent);
    expect(handleExpansion).toHaveAttribute('x', xPercent);
  });

  it('calls onMouseDown when handles are clicked', () => {
    const onMouseDownMock = jest.fn();
    renderInSvg(<Scrubber {...defaultProps} onMouseDown={onMouseDownMock} />);

    const handles = screen.getByTestId('scrubber-handles');
    fireEvent.mouseDown(handles);

    expect(onMouseDownMock).toHaveBeenCalledTimes(1);
  });

  it('applies isDragging class when isDragging is true', () => {
    const { container } = renderInSvg(<Scrubber {...defaultProps} isDragging />);
    // The top-level <g> element should have the isDragging class
    expect(container).toHaveClass('Scrubber isDragging');
  });

  it('does not apply isDragging class when isDragging is false', () => {
    const { container } = renderInSvg(<Scrubber {...defaultProps} isDragging={false} />);
    expect(container).toHaveClass('Scrubber');
    expect(container).not.toHaveClass('isDragging');
  });
});
