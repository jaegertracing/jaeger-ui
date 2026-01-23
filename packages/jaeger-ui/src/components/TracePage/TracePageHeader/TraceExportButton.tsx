// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Button, Dropdown, Space, Tooltip, MenuProps } from 'antd';
import { IoDownload } from 'react-icons/io5';
import { IOtelTrace } from '../../../types/otel';
import { exportAndDownloadTrace, ExportFormat } from '../../../utils/trace-export';

import './TraceExportButton.css';

type TraceExportButtonProps = {
  trace: IOtelTrace;
  disabled?: boolean;
};

export function TraceExportButton({ trace, disabled = false }: TraceExportButtonProps) {
  const handleExport = (format: ExportFormat) => {
    try {
      exportAndDownloadTrace(trace, format);
    } catch (error) {
      console.error(`Failed to export trace as ${format}:`, error);
    }
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'json',
      label: 'JSON',
      onClick: () => handleExport('json'),
      title: 'Export trace data in JSON format',
    },
    {
      key: 'csv',
      label: 'CSV',
      onClick: () => handleExport('csv'),
      title: 'Export spans as CSV spreadsheet',
    },
    {
      key: 'har',
      label: 'HAR (HTTP Archive)',
      onClick: () => handleExport('har'),
      title: 'Export trace as HTTP Archive format',
    },
  ];

  return (
    <Dropdown menu={{ items: menuItems }} placement="bottomRight" trigger={['click']} disabled={disabled}>
      <Tooltip title="Export trace" placement="top">
        <Button
          className="TraceExportButton"
          icon={<IoDownload />}
          disabled={disabled}
          aria-label="Export trace"
        >
          Export
        </Button>
      </Tooltip>
    </Dropdown>
  );
}

export default TraceExportButton;
