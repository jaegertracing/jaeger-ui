// Copyright (c) 2025 The Jaeger Authors.
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
