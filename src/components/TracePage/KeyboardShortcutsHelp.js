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
import { Button, Modal } from 'semantic-ui-react';

import { kbdMappings } from './keyboard-shortcuts';

import './KeyboardShortcutsHelp.css';

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

export default function KeyboardShortcutsHelp() {
  const rows = [];
  Object.keys(kbdMappings).forEach(title => {
    const keyConfigs = convertKeys(kbdMappings[title]);
    const configs = keyConfigs.map(config =>
      <tr key={String(config)}>
        <td>
          {config.map(s =>
            <kbd key={s}>
              {s}
            </kbd>
          )}
        </td>
        <td>
          {descriptions[title]}
        </td>
      </tr>
    );
    rows.push(...configs);
  });
  return (
    <Modal
      trigger={
        <Button basic compact size="tiny">
          <h3>⌘</h3>
        </Button>
      }
    >
      <Modal.Header>Keyboard Shortcuts</Modal.Header>
      <Modal.Content>
        <Modal.Description>
          <table className="KeyboardShortcutsHelp ui celled table">
            <thead>
              <tr>
                <th>Key(s)</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {rows}
            </tbody>
          </table>
        </Modal.Description>
      </Modal.Content>
    </Modal>
  );
}
