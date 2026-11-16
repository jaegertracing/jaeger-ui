// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Button, Popover, Switch } from 'antd';
import { IoSettingsOutline } from 'react-icons/io5';

import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';
import { useLayoutPrefsStore } from '../TraceTimelineViewer/store';

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

  const heatmapEnabled = useLayoutPrefsStore(s => s.heatmapEnabled);
  const toggleHeatmap = useLayoutPrefsStore(s => s.toggleHeatmap);

  const [kbdModalVisible, setKbdModalVisible] = React.useState(false);

  const content = (
    <div className="TraceViewSettings--panel">
      <div className="TraceViewSettings--row">
        <span className="TraceViewSettings--rowLabel">Show Timeline</span>
        <Switch
          aria-label="Show Timeline"
          checked={timelineBarsVisible}
          onChange={() => onTimelineToggle()}
          size="small"
        />
      </div>
      <div className="TraceViewSettings--row">
        <span className="TraceViewSettings--rowLabel">Span Latency Heatmap</span>
        <Switch
          aria-label="Span Latency Heatmap"
          checked={heatmapEnabled}
          onChange={() => toggleHeatmap()}
          size="small"
        />
      </div>
      {enableSidePanel && (
        <div className="TraceViewSettings--row">
          <span className="TraceViewSettings--rowLabel">Show Span in Sidebar</span>
          <Switch
            aria-label="Show Span in Sidebar"
            checked={detailPanelMode === 'sidepanel'}
            onChange={() => onDetailPanelModeToggle()}
            size="small"
          />
        </div>
      )}
      <div className="TraceViewSettings--divider" />
      <button type="button" className="TraceViewSettings--linkRow" onClick={() => setKbdModalVisible(true)}>
        Keyboard Shortcuts
      </button>
    </div>
  );

  return (
    <>
      <Popover content={content} title="Trace view settings" trigger="click" placement="bottomRight">
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
