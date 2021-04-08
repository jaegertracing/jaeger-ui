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

import * as React from 'react';
import { Upload, Button, Row, Col } from 'antd';
import './FileLoader.css';

type FileLoaderProps = {
  loadJsonTraces: (fileList: FileList) => void;
};

export default function FileLoader(props: FileLoaderProps) {
  return (
    <Upload accept=".jpg" customRequest={props.loadJsonTraces} multiple>
      <Row>
        <Col span={12} offset={6}>
          <Button className="FileLoader--upload">Click to Upload</Button>
        </Col>
      </Row>
      <p className="FileLoader--helper-text">JSON files containing one or more traces are supported.</p>
    </Upload>
  );
}
