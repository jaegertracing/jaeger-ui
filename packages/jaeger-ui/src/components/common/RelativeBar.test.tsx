// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { render } from '@testing-library/react';
import RelativeBar from './RelativeBar';

function getFillWidth(container: HTMLElement): string {
  const fill = container.querySelector('.RelativeBar--fill') as HTMLElement;
  return fill.style.width;
}

describe('RelativeBar', () => {
  it('renders 100% fill when value equals maxValue', () => {
    const { container } = render(<RelativeBar value={100} maxValue={100} />);
    expect(getFillWidth(container)).toBe('100%');
  });

  it('renders proportional fill', () => {
    const { container } = render(<RelativeBar value={50} maxValue={100} />);
    expect(getFillWidth(container)).toBe('50%');
  });

  it('clamps fill to minimum 2% when value is 0', () => {
    const { container } = render(<RelativeBar value={0} maxValue={100} />);
    expect(getFillWidth(container)).toBe('2%');
  });

  it('clamps fill to 100% when value exceeds maxValue', () => {
    const { container } = render(<RelativeBar value={200} maxValue={100} />);
    expect(getFillWidth(container)).toBe('100%');
  });

  it('handles maxValue of 0 without error', () => {
    const { container } = render(<RelativeBar value={50} maxValue={0} />);
    expect(getFillWidth(container)).toBe('100%');
  });

  it('handles non-finite maxValue by falling back to maxValue=1', () => {
    const { container } = render(<RelativeBar value={50} maxValue={Infinity} />);
    expect(getFillWidth(container)).toBe('100%');
  });

  it('handles negative value', () => {
    const { container } = render(<RelativeBar value={-10} maxValue={100} />);
    expect(getFillWidth(container)).toBe('2%');
  });
});
