// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Button, Dropdown, Modal, Table } from 'antd';
import { IoSettingsOutline, IoCheckmark } from 'react-icons/io5';

import keyboardMappings from '../keyboard-mappings';
import track from './KeyboardShortcutsHelp.track';

import './TraceViewSettings.css';

type Props = {
  className?: string;
  detailPanelMode: 'inline' | 'sidepanel';
  enableSidePanel: boolean;
  onDetailPanelModeToggle: () => void;
  onTimelineBarsToggle: () => void;
  timelineBarsVisible: boolean;
};

const { Column } = Table;

const SYMBOL_CONV: Record<string, string> = {
  up: '↑',
  right: '→',
  down: '↓',
  left: '←',
  shift: '⇧',
};

const ODD_ROW_CLASS = 'KeyboardShortcutsHelp--oddRow';

type DataRecord = {
  key: string;
  kbds: React.JSX.Element;
  description: string;
};

function convertKeys(keyConfig: string | string[]): string[][] {
  const config = Array.isArray(keyConfig) ? keyConfig : [keyConfig];
  return config.map(str => str.split('+').map(part => SYMBOL_CONV[part] || part.toUpperCase()));
}

const padLeft = (text: string) => <span className="ub-pl4">{text}</span>;
const padRight = (text: string) => <span className="ub-pr4">{text}</span>;
const getRowClass = (_: DataRecord, index: number) => (index % 2 > 0 ? ODD_ROW_CLASS : '');

let kbdTable: React.ReactNode | null = null;

function getHelpModal() {
  if (kbdTable) {
    return kbdTable;
  }
  const data: DataRecord[] = [];
  Object.keys(keyboardMappings).forEach(handle => {
    const { binding, label } = keyboardMappings[handle];
    const keyConfigs = convertKeys(binding);
    data.push(
      ...keyConfigs.map(config => ({
        key: String(config),
        kbds: <kbd>{config.join(' ')}</kbd>,
        description: label,
      }))
    );
  });

  kbdTable = (
    <Table
      className="KeyboardShortcutsHelp--table u-simple-scrollbars"
      dataSource={data}
      size="middle"
      pagination={false}
      showHeader={false}
      rowClassName={getRowClass}
    >
      <Column title="Description" dataIndex="description" key="description" render={padLeft} />
      <Column title="Key(s)" dataIndex="kbds" key="kbds" align="right" render={padRight} />
    </Table>
  );
  return kbdTable;
}

const CHECK_STYLE = { marginRight: 8, fontSize: 14 };
const CHECK_PLACEHOLDER = <span style={{ display: 'inline-block', width: 22 }} />;

export default function TraceViewSettings(props: Props) {
  const {
    className,
    detailPanelMode,
    enableSidePanel,
    onDetailPanelModeToggle,
    onTimelineBarsToggle,
    timelineBarsVisible,
  } = props;

  const [kbdModalVisible, setKbdModalVisible] = React.useState(false);

  const items: any[] = [
    {
      key: 'timeline-bars',
      label: (
        <a onClick={onTimelineBarsToggle} role="switch" aria-checked={timelineBarsVisible}>
          {timelineBarsVisible ? <IoCheckmark style={CHECK_STYLE} /> : CHECK_PLACEHOLDER}
          Show Timeline
        </a>
      ),
    },
  ];

  if (enableSidePanel) {
    const isSidePanel = detailPanelMode === 'sidepanel';
    items.push({
      key: 'detail-panel-mode',
      label: (
        <a onClick={onDetailPanelModeToggle} role="switch" aria-checked={isSidePanel}>
          {isSidePanel ? <IoCheckmark style={CHECK_STYLE} /> : CHECK_PLACEHOLDER}
          Show Details in Panel
        </a>
      ),
    });
  }

  items.push(
    { type: 'divider' as const },
    {
      key: 'keyboard-shortcuts',
      label: (
        <a
          onClick={() => {
            track();
            setKbdModalVisible(true);
          }}
        >
          {CHECK_PLACEHOLDER}
          Keyboard Shortcuts
        </a>
      ),
    }
  );

  return (
    <>
      <Dropdown menu={{ items }} trigger={['click']}>
        <Button className={`TraceViewSettings ${className || ''}`} htmlType="button">
          <IoSettingsOutline className="TraceViewSettings--icon" />
        </Button>
      </Dropdown>
      <Modal
        title="Keyboard Shortcuts"
        open={kbdModalVisible}
        onOk={() => setKbdModalVisible(false)}
        onCancel={() => setKbdModalVisible(false)}
        cancelButtonProps={{ style: { display: 'none' } }}
        styles={{ body: { padding: 0 } }}
      >
        {getHelpModal()}
      </Modal>
    </>
  );
}
