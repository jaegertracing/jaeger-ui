// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Button, Dropdown, Tooltip } from 'antd';
import { IoDownloadOutline } from 'react-icons/io5';
import copy from 'copy-to-clipboard';

import { IOtelSpan } from '../../../../types/otel';
import { spanToOtlpJson, spanToFlatJson } from '../../../../utils/span-to-otlp';

type ExportStatus = 'idle' | 'copied' | 'failed';

const TOOLTIP: Record<ExportStatus, string> = {
  idle: 'Export span data',
  copied: 'Copied!',
  failed: 'Copy failed — try again',
};

type Props = {
  span: IOtelSpan;
};

export default function ExportSpanButton({ span }: Props) {
  const [status, setStatus] = React.useState<ExportStatus>('idle');
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      clearTimeout(timerRef.current ?? undefined);
    };
  }, []);

  function scheduleReset() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setStatus('idle'), 2000);
  }

  async function handleExport(payload: Record<string, unknown>) {
    const ok = await copy(JSON.stringify(payload, null, 2));
    setStatus(ok ? 'copied' : 'failed');
    scheduleReset();
  }

  const menuItems = [
    {
      key: 'otlp',
      label: 'Copy as OTLP JSON',
      onClick: () => handleExport(spanToOtlpJson(span)),
    },
    {
      key: 'flat',
      label: 'Copy as flat JSON',
      onClick: () => handleExport(spanToFlatJson(span)),
    },
  ];

  return (
    <Tooltip title={TOOLTIP[status]}>
      <Dropdown menu={{ items: menuItems }} trigger={['click']}>
        <Button
          size="small"
          icon={<IoDownloadOutline />}
          aria-label={TOOLTIP[status]}
          data-testid="export-span-button"
        >
          Export
        </Button>
      </Dropdown>
    </Tooltip>
  );
}
