// @flow

// Copyright (c) 2017 Uber Technologies, Inc.
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
import { Button, Modal, Table } from 'antd';

import { kbdMappings } from './keyboard-shortcuts';
import track from './KeyboardShortcutsHelp.track';

import './KeyboardShortcutsHelp.css';

type KeyboardShortcutsHelpProps = {
  className: ?string,
};

const { Column } = Table;

const symbolConv = {
  up: '↑',
  right: '→',
  down: '↓',
  left: '←',
  shift: '⇧',
};

const descriptions = {
  scrollPageDown: 'Scroll down',
  scrollPageUp: 'Scroll up',
  scrollToNextVisibleSpan: 'Scroll to the next visible span',
  scrollToPrevVisibleSpan: 'Scroll to the previous visible span',
  panLeft: 'Pan left',
  panLeftFast: 'Pan left — Large',
  panRight: 'Pan right',
  panRightFast: 'Pan right — Large',
  zoomIn: 'Zoom in',
  zoomInFast: 'Zoom in — Large',
  zoomOut: 'Zoom out',
  zoomOutFast: 'Zoom out — Large',
};

function convertKeys(keyConfig: string | string[]): string[][] {
  const config = Array.isArray(keyConfig) ? keyConfig : [keyConfig];
  return config.map(str => str.split('+').map(part => symbolConv[part] || part.toUpperCase()));
}

function helpModal() {
  track();
  const data = [];
  Object.keys(kbdMappings).forEach(title => {
    const keyConfigs = convertKeys(kbdMappings[title]);
    data.push(
      ...keyConfigs.map(config => ({
        key: String(config),
        kbds: <kbd>{config.join(' ')}</kbd>,
        description: descriptions[title],
      }))
    );
  });

  const content = (
    <Table
      className="KeyboardShortcutsHelp--table"
      dataSource={data}
      bordered
      size="middle"
      pagination={false}
    >
      <Column title="Key(s)" dataIndex="kbds" key="kbds" />
      <Column title="Description" dataIndex="description" key="description" />
    </Table>
  );

  Modal.info({
    content,
    maskClosable: true,
    title: 'Keyboard Shortcuts',
    width: '50%',
  });
}

export default function KeyboardShortcutsHelp(props: KeyboardShortcutsHelpProps) {
  const { className } = props;
  return (
    <Button className={className} onClick={helpModal}>
      <span className="KeyboardShortcutsHelp--cta">⌘</span>
    </Button>
  );
}
