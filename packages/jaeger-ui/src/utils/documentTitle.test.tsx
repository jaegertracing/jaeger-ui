// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import DocumentTitle from './documentTitle';

describe('DocumentTitle', () => {
  it('sets document.title and restores previous on unmount', () => {
    const prev = document.title;
    const { unmount } = render(<DocumentTitle title="My Test Title" />);

    expect(document.title).toBe('My Test Title');

    unmount();
    expect(document.title).toBe(prev);
  });

  it('updates document.title when prop changes', () => {
    const prev = document.title;
    const { rerender, unmount } = render(<DocumentTitle title="First" />);
    expect(document.title).toBe('First');

    rerender(<DocumentTitle title="Second" />);
    expect(document.title).toBe('Second');

    unmount();
    expect(document.title).toBe(prev);
  });
});
