// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import FileLoader from './FileLoader';

jest.mock('antd', () => {
  const antd = jest.requireActual('antd');
  const { Upload } = antd;
  const MockedDragger = ({ beforeUpload, children, ...props }) => {
    global.mockBeforeUpload = beforeUpload;
    return (
      <div data-testid="upload-dragger" {...props}>
        {children}
      </div>
    );
  };

  return {
    ...antd,
    Upload: {
      ...Upload,
      Dragger: MockedDragger,
    },
  };
});

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
