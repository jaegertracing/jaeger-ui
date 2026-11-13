// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Button, Divider, Popover, Switch } from 'antd';
import { IoSettingsOutline } from 'react-icons/io5';

import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';

import './TraceViewSettings.css';

type Props = {
  className?: string;
  detailPanelMode: 'inline' | 'sidepanel';
  enableSidePanel: boolean;
  onDetailPanelModeToggle: () => void;
  onTimelineToggle: () => void;
  timelineBarsVisible: boolean;
};

export default function TraceViewSettings(props: Props) {
  const {
    className,
    detailPanelMode,
    enableSidePanel,
    onDetailPanelModeToggle,
    onTimelineToggle,
    timelineBarsVisible,
  } = props;

  const [open, setOpen] = React.useState(false);
  const [kbdModalVisible, setKbdModalVisible] = React.useState(false);

  const isSidePanel = detailPanelMode === 'sidepanel';

  const content = (
    <div className="TraceViewSettings--popover">
      <div className="TraceViewSettings--row">
        <label htmlFor="trace-view-settings-timeline-switch" className="TraceViewSettings--label">
          Show Timeline
        </label>
        <Switch
          id="trace-view-settings-timeline-switch"
          size="small"
          checked={timelineBarsVisible}
          onChange={onTimelineToggle}
        />
      </div>

      {enableSidePanel && (
        <div className="TraceViewSettings--row">
          <label htmlFor="trace-view-settings-sidebar-switch" className="TraceViewSettings--label">
            Show Span in Sidebar
          </label>
          <Switch
            id="trace-view-settings-sidebar-switch"
            size="small"
            checked={isSidePanel}
            onChange={onDetailPanelModeToggle}
          />
        </div>
      )}

      <Divider className="TraceViewSettings--divider" />

      <div className="TraceViewSettings--row">
        <Button
          type="link"
          className="TraceViewSettings--shortcutsButton"
          onClick={() => {
            setOpen(false);
            setKbdModalVisible(true);
          }}
        >
          Keyboard Shortcuts
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Popover
        content={content}
        title="Trace View Settings"
        trigger="click"
        open={open}
        onOpenChange={setOpen}
        placement="bottomRight"
        arrow={{ pointAtCenter: true }}
      >
        <Button
          className={`TraceViewSettings ${className || ''}`}
          htmlType="button"
          aria-label="Trace view settings"
          title="Trace view settings"
        >
          <IoSettingsOutline className="TraceViewSettings--icon" />
        </Button>
      </Popover>
      <KeyboardShortcutsHelp open={kbdModalVisible} onClose={() => setKbdModalVisible(false)} />
    </>
  );
}
