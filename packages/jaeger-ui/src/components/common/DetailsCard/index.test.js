// Copyright (c) 2020 Uber Technologies, Inc.
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
import DetailsCard from '.';

describe('DetailsCard', () => {
  const header = 'Details Card Header';

  it('renders string details', () => {
    render(<DetailsCard details="test details" header={header} />);
    expect(screen.getByText('test details')).toBeInTheDocument();
    expect(screen.getByText(header)).toBeInTheDocument();
  });

  it('handles empty details array', () => {
    const { container } = render(<DetailsCard details={[]} header={header} />);
    expect(container.querySelector('.DetailsCard--DetailsWrapper')?.textContent).toBe('');
  });

  it('renders list details', () => {
    const details = ['foo', 'bar', 'baz'];
    render(<DetailsCard details={details} header={header} />);
    details.forEach(item => {
      expect(screen.getByText(item)).toBeInTheDocument();
    });
  });

  it('renders table details', () => {
    const details = [{ value: 'foo' }];
    render(<DetailsCard details={details} header={header} />);
    expect(screen.getByText('foo')).toBeInTheDocument();
  });

  it('renders table details with column defs', () => {
    const columnDefs = ['col'];
    const details = [{ [columnDefs[0]]: 'foo' }];
    render(<DetailsCard columnDefs={columnDefs} details={details} header={header} />);
    expect(screen.getByText('foo')).toBeInTheDocument();
  });

  it('renders with description', () => {
    const description = 'test description';
    render(<DetailsCard description={description} header={header} details="..." />);
    expect(screen.getByText(description)).toBeInTheDocument();
  });

  it('renders with className', () => {
    const className = 'test-className';
    const { container } = render(<DetailsCard className={className} header={header} details="..." />);
    expect(container.firstChild).toHaveClass(className);
  });

  it('renders as collapsible and toggles collapsed state', () => {
    const { container } = render(<DetailsCard header={header} details="info" collapsible />);
    const collapsedWrapper = container.querySelector('.DetailsCard--DetailsWrapper');
    expect(collapsedWrapper).toHaveClass('is-collapsed');

    const toggleBtn = container.querySelector('button');
    expect(toggleBtn).toBeInTheDocument();

    fireEvent.click(toggleBtn);
    expect(collapsedWrapper).not.toHaveClass('is-collapsed');

    fireEvent.click(toggleBtn);
    expect(collapsedWrapper).toHaveClass('is-collapsed');
  });
});
