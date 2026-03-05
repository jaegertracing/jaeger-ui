// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Button, Dropdown, Modal } from 'antd';
import type { MenuProps } from 'antd';
import { IoSettingsOutline, IoCheckmark } from 'react-icons/io5';

import { getHelpModal } from './KeyboardShortcutsHelp';
import track from './KeyboardShortcutsHelp.track';

import './KeyboardShortcutsHelp.css';
import './TraceViewSettings.css';

type Props = {
  className?: string;
  detailPanelMode: 'inline' | 'sidepanel';
  enableSidePanel: boolean;
  onDetailPanelModeToggle: () => void;
  onTimelineToggle: () => void;
  timelineVisible: boolean;
};

const CHECK_STYLE = { marginRight: 8, fontSize: 14 };
const CHECK_PLACEHOLDER = <span style={{ display: 'inline-block', width: 22 }} />;

export default function TraceViewSettings(props: Props) {
  const {
    className,
    detailPanelMode,
    enableSidePanel,
    onDetailPanelModeToggle,
    onTimelineToggle,
    timelineVisible,
  } = props;

  const [kbdModalVisible, setKbdModalVisible] = React.useState(false);

  const items: MenuProps['items'] = [
    {
      key: 'timeline',
      icon: timelineVisible ? <IoCheckmark style={CHECK_STYLE} /> : CHECK_PLACEHOLDER,
      label: 'Show Timeline',
      onClick: onTimelineToggle,
    },
  ];

  if (enableSidePanel) {
    const isSidePanel = detailPanelMode === 'sidepanel';
    items.push({
      key: 'detail-panel-mode',
      icon: isSidePanel ? <IoCheckmark style={CHECK_STYLE} /> : CHECK_PLACEHOLDER,
      label: 'Show Span in Sidebar',
      onClick: onDetailPanelModeToggle,
    });
  }

  items.push(
    { type: 'divider' },
    {
      key: 'keyboard-shortcuts',
      icon: CHECK_PLACEHOLDER,
      label: 'Keyboard Shortcuts',
      onClick: () => {
        track();
        setKbdModalVisible(true);
      },
    }
  );

  return (
    <>
      <Dropdown menu={{ items }} trigger={['click']}>
        <Button
          className={`TraceViewSettings ${className || ''}`}
          htmlType="button"
          aria-label="Trace view settings"
          title="Trace view settings"
        >
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
