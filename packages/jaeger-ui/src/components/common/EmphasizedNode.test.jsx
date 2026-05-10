// Copyright (c) 2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import EmphasizedNode from './EmphasizedNode';
import '@testing-library/jest-dom';

describe('<EmphasizedNode>', () => {
  const defaultProps = {
    height: 100,
    width: 500,
  };

  it('renders with default props', () => {
    const { container } = render(<EmphasizedNode {...defaultProps} />);

    const recElements = container.querySelectorAll('rect');

    expect(recElements.length).toBe(4);
    recElements.forEach(element => {
      expect(element).toHaveAttribute('height', defaultProps.height.toString());
      expect(element).toHaveAttribute('width', defaultProps.width.toString());
    });
  });
});
