// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

import ChevronDown from './ChevronDown';

describe('ChevronDown', () => {
  it('renders with provided className and style', () => {
    const className = 'testClassName';
    const style = {
      border: 'black solid 1px',
    };
    const { container } = render(<ChevronDown className={className} style={style} />);

    expect(container.firstChild).toHaveClass(className);
    expect(container.firstChild).toHaveStyle(style);
  });

  it('does not add `undefined` as a className when not given a className', () => {
    const { container } = render(<ChevronDown />);
    expect(container.firstChild).not.toHaveClass('undefined');
  });
});
