// Copyright (c) 2023 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Button } from 'antd';

import './DownloadResults.css';

type Props = {
  /** 0–1 fraction; undefined means not downloading */
  progress?: number;
  onDownloadResultsClicked: () => void;
};

export default function DownloadResults({ progress, onDownloadResultsClicked }: Props) {
  const downloading = progress !== undefined;
  return (
    <Button
      className="ub-ml2 DownloadResults--btn"
      htmlType="button"
      disabled={downloading}
      onClick={onDownloadResultsClicked}
    >
      {downloading ? 'Retrieving traces…' : 'Download Results'}
      {downloading && (
        <span className="DownloadResults--bar" style={{ width: `${Math.round(progress! * 100)}%` }} />
      )}
    </Button>
  );
}
