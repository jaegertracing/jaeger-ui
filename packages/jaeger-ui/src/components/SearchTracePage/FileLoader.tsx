// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Upload } from 'antd';
import { IoDocumentAttachOutline } from 'react-icons/io5';

import './FileLoader.css';

const Dragger = Upload.Dragger;

type FileLoaderProps = {
  loadJsonTraces: (fileList: { file: File }) => void;
};

export default function FileLoader(props: FileLoaderProps) {
  return (
    <Dragger
      accept=".json,.jsonl"
      beforeUpload={(file, fileList) => {
        fileList.forEach(fileFromList => props.loadJsonTraces({ file: fileFromList }));
        return false;
      }}
      multiple
    >
      <IoDocumentAttachOutline className="Dragger--icon" />
      <p className="ant-upload-text">Click or drag files to this area.</p>
      <p className="ant-upload-hint">JSON files containing one or more traces are supported.</p>
    </Dragger>
  );
}
