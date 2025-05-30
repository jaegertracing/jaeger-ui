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
import '@testing-library/jest-dom';

import FileLoader from './FileLoader';

jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  Upload: {
    ...jest.requireActual('antd').Upload,
    Dragger: jest.fn(({ beforeUpload, children, ...props }) => {
      global.mockBeforeUpload = beforeUpload;
      return (
        <div data-testid="upload-dragger" {...props}>
          {children}
        </div>
      );
    }),
  },
}));

describe('<FileLoader />', () => {
  const mockLoadJsonTraces = jest.fn();

  beforeEach(() => {
    mockLoadJsonTraces.mockClear();
    global.mockBeforeUpload = null;
  });

  it('renders the file upload area', () => {
    render(<FileLoader loadJsonTraces={mockLoadJsonTraces} />);
    expect(screen.getByText('Click or drag files to this area.')).toBeInTheDocument();
    expect(screen.getByText('JSON files containing one or more traces are supported.')).toBeInTheDocument();
  });

  it('calls loadJsonTraces with the uploaded file', () => {
    render(<FileLoader loadJsonTraces={mockLoadJsonTraces} />);
    const file = new File(['sample content'], 'sample.json', { type: 'application/json' });
    const fileList = [file];

    fileList.forEach(fileFromList => mockLoadJsonTraces({ file: fileFromList }));

    expect(mockLoadJsonTraces).toHaveBeenCalledWith({ file });
  });

  it('beforeUpload callback calls loadJsonTraces for each file and returns false', () => {
    render(<FileLoader loadJsonTraces={mockLoadJsonTraces} />);
    const beforeUpload = global.mockBeforeUpload;
    expect(beforeUpload).toBeDefined();

    const file1 = new File(['{"trace": "data1"}'], 'trace1.json', { type: 'application/json' });
    const file2 = new File(['{"trace": "data2"}'], 'trace2.json', { type: 'application/json' });
    const fileList = [file1, file2];

    const result = beforeUpload(file1, fileList);

    expect(mockLoadJsonTraces).toHaveBeenCalledTimes(2);
    expect(mockLoadJsonTraces).toHaveBeenCalledWith({ file: file1 });
    expect(mockLoadJsonTraces).toHaveBeenCalledWith({ file: file2 });
    expect(result).toBe(false);
  });
});
