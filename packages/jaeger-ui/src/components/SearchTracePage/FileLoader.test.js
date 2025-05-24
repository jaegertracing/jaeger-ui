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
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import FileLoader from './FileLoader';

describe('<FileLoader / data-testid="fileloader">', () => {
  let rendered;
  beforeEach(() => {
    rendered = render(<FileLoader loadJsonTraces={mockLoadJsonTraces} / data-testid="fileloader">));
  });

  it('matches the snapshot', () => {
    expect(container).toMatchSnapshot();
  });

  it('calls loadJsonTraces with the uploaded file', () => {
    const file = new File(['sample content'], 'sample.json', { type: 'application/json' });
    const fileList = [file];

    wrapper.find('Dragger').prop('beforeUpload')(file, fileList);

    expect(mockLoadJsonTraces).toHaveBeenCalledWith({ file });
  });
});
