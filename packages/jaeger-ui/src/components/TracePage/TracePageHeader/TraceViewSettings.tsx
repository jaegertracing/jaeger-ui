// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Button, Popover } from 'antd';
import { IoSettingsOutline, IoCheckmark } from 'react-icons/io5';

import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';
import SummaryFieldsSelect from './SummaryFieldsSelect';
import { AvailableField } from '../TraceTimelineViewer/summaryFieldsUtils';

import './TraceViewSettings.css';

type Props = {
  availableFields: AvailableField[];
  className?: string;
  detailPanelMode: 'inline' | 'sidepanel';
  enableSidePanel: boolean;
  onDetailPanelModeToggle: () => void;
  onSelectedSummaryFieldsChange: (fields: string[]) => void;
  onTimelineToggle: () => void;
  selectedSummaryFields: string[];
  timelineBarsVisible: boolean;
};

export default function TraceViewSettings(props: Props) {
  const {
    availableFields,
    className,
    detailPanelMode,
    enableSidePanel,
    onDetailPanelModeToggle,
    onSelectedSummaryFieldsChange,
    onTimelineToggle,
    selectedSummaryFields,
    timelineBarsVisible,
  } = props;

  const [kbdModalVisible, setKbdModalVisible] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  const closeSettings = React.useCallback(() => setSettingsOpen(false), []);

  const handleTimelineToggle = React.useCallback(() => {
    onTimelineToggle();
    closeSettings();
  }, [closeSettings, onTimelineToggle]);

  const handleDetailPanelModeToggle = React.useCallback(() => {
    onDetailPanelModeToggle();
    closeSettings();
  }, [closeSettings, onDetailPanelModeToggle]);

  const handleKeyboardShortcuts = React.useCallback(() => {
    closeSettings();
    setKbdModalVisible(true);
  }, [closeSettings]);

  const panelContent = (
    <div className="TraceViewSettings--panel" data-testid="trace-view-settings-panel" role="menu">
      <button
        className="TraceViewSettings--menuItem"
        type="button"
        role="menuitemcheckbox"
        aria-checked={timelineBarsVisible}
        onClick={handleTimelineToggle}
      >
        {timelineBarsVisible ? (
          <IoCheckmark className="TraceViewSettings--check" aria-hidden />
        ) : (
          <span className="TraceViewSettings--checkPlaceholder" aria-hidden />
        )}
        Show Timeline
      </button>
      {enableSidePanel && (
        <button
          className="TraceViewSettings--menuItem"
          type="button"
          role="menuitemcheckbox"
          aria-checked={detailPanelMode === 'sidepanel'}
          onClick={handleDetailPanelModeToggle}
        >
          {detailPanelMode === 'sidepanel' ? (
            <IoCheckmark className="TraceViewSettings--check" aria-hidden />
          ) : (
            <span className="TraceViewSettings--checkPlaceholder" aria-hidden />
          )}
          Show Span in Sidebar
        </button>
      )}
      {availableFields.length > 0 && (
        <>
          <div className="TraceViewSettings--divider" />
          <div className="TraceViewSettings--section">
            <div className="TraceViewSettings--sectionLabel">Summary fields</div>
            <SummaryFieldsSelect
              availableFields={availableFields}
              onSelectedFieldsChange={onSelectedSummaryFieldsChange}
              selectedFields={selectedSummaryFields}
            />
          </div>
        </>
      )}
      <div className="TraceViewSettings--divider" />
      <button
        className="TraceViewSettings--menuItem"
        type="button"
        role="menuitem"
        onClick={handleKeyboardShortcuts}
      >
        <span className="TraceViewSettings--checkPlaceholder" aria-hidden />
        Keyboard Shortcuts
      </button>
    </div>
  );

  return (
    <>
      <Popover
        content={panelContent}
        onOpenChange={setSettingsOpen}
        open={settingsOpen}
        placement="bottomRight"
        trigger="click"
      >
        <Button
          className={`TraceViewSettings ${className || ''}`}
          data-testid="trace-view-settings"
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
