// Copyright (c) 2019 Uber Technologies, Inc.
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
