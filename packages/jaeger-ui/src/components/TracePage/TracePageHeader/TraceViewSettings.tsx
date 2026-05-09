// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Button, Popover, Switch, Tooltip } from 'antd';
import { IoSettingsOutline, IoLink, IoSparkles, IoCheckmarkCircle } from 'react-icons/io5';

import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';
import type { ResolvedLayoutSettings, ResolvedSetting, SettingSource } from '../useLayoutSettings';

import './TraceViewSettings.css';

type Props = {
  className?: string;
  detailPanelMode: 'inline' | 'sidepanel';
  enableSidePanel: boolean;
  onDetailPanelModeToggle: () => void;
  onTimelineToggle: () => void;
  timelineBarsVisible: boolean;
  settingSources?: ResolvedLayoutSettings;
  saveSettingAsDefault?: (key: 'timelineBarsVisible' | 'detailPanelMode') => void;
};

const SOURCE_LABELS: Record<SettingSource, string> = {
  url: 'Set by shared link',
  heuristic: 'Optimized for this trace',
  localstorage: '',
};

const SOURCE_ICONS: Record<SettingSource, React.ReactNode> = {
  url: <IoLink className="TraceViewSettings--sourceIcon TraceViewSettings--sourceIcon--url" />,
  heuristic: (
    <IoSparkles className="TraceViewSettings--sourceIcon TraceViewSettings--sourceIcon--heuristic" />
  ),
  localstorage: null,
};

type SettingRowProps<T> = {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  resolved?: ResolvedSetting<T>;
  onSaveAsDefault?: () => void;
};

function SettingRow<T>({
  id,
  label,
  description,
  checked,
  onChange,
  resolved,
  onSaveAsDefault,
}: SettingRowProps<T>) {
  const source = resolved?.source ?? 'localstorage';
  const isOverridden = resolved?.isOverridden ?? false;

  return (
    <div className="TraceViewSettings--row" role="group" aria-labelledby={`${id}-label`}>
      <div className="TraceViewSettings--rowMain">
        <div className="TraceViewSettings--rowLabels">
          <span id={`${id}-label`} className="TraceViewSettings--rowLabel">
            {label}
          </span>
          <span className="TraceViewSettings--rowDescription">{description}</span>
        </div>
        <Switch
          id={id}
          checked={checked}
          onChange={onChange}
          size="small"
          aria-label={label}
          className="TraceViewSettings--switch"
        />
      </div>

      {isOverridden && (
        <div className="TraceViewSettings--overrideRow">
          {source !== 'localstorage' && (
            <span className={`TraceViewSettings--sourceBadge TraceViewSettings--sourceBadge--${source}`}>
              {SOURCE_ICONS[source]}
              {SOURCE_LABELS[source]}
            </span>
          )}
          {onSaveAsDefault && (
            <Tooltip title="Save this as your personal default for future traces">
              <button
                type="button"
                className="TraceViewSettings--saveLink"
                onClick={onSaveAsDefault}
                aria-label={`Set as my default for ${label}`}
              >
                <IoCheckmarkCircle className="TraceViewSettings--saveLinkIcon" />
                Set as my default
              </button>
            </Tooltip>
          )}
        </div>
      )}
    </div>
  );
}

export default function TraceViewSettings(props: Props) {
  const {
    className,
    detailPanelMode,
    enableSidePanel,
    onDetailPanelModeToggle,
    onTimelineToggle,
    timelineBarsVisible,
    settingSources,
    saveSettingAsDefault,
  } = props;

  const [kbdModalVisible, setKbdModalVisible] = React.useState(false);
  const [popoverOpen, setPopoverOpen] = React.useState(false);

  const panelContent = (
    <div className="TraceViewSettings--panel" aria-label="Trace view settings panel">
      <div className="TraceViewSettings--panelHeader">
        <span className="TraceViewSettings--panelTitle">View Settings</span>
      </div>

      <div className="TraceViewSettings--settingsList">
        <SettingRow
          id="setting-timeline"
          label="Timeline View"
          description="Show the timeline bars in the trace view"
          checked={timelineBarsVisible}
          onChange={onTimelineToggle}
          resolved={settingSources?.timelineBarsVisible}
          onSaveAsDefault={
            saveSettingAsDefault ? () => saveSettingAsDefault('timelineBarsVisible') : undefined
          }
        />

        {enableSidePanel && (
          <SettingRow
            id="setting-sidebar"
            label="Span Details Sidebar"
            description="Show span details in a side panel instead of inline"
            checked={detailPanelMode === 'sidepanel'}
            onChange={onDetailPanelModeToggle}
            resolved={settingSources?.detailPanelMode}
            onSaveAsDefault={saveSettingAsDefault ? () => saveSettingAsDefault('detailPanelMode') : undefined}
          />
        )}
      </div>

      <div className="TraceViewSettings--panelDivider" />

      <button
        type="button"
        className="TraceViewSettings--kbdShortcutsBtn"
        onClick={() => {
          setKbdModalVisible(true);
          setPopoverOpen(false);
        }}
      >
        Keyboard Shortcuts
      </button>
    </div>
  );

  return (
    <>
      <Popover
        content={panelContent}
        trigger="click"
        open={popoverOpen}
        onOpenChange={setPopoverOpen}
        placement="bottomRight"
        overlayClassName="TraceViewSettings--popoverOverlay"
        arrow={false}
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
