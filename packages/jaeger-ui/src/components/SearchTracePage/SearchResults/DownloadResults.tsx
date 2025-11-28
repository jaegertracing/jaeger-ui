// Copyright (c) 2023 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Button } from 'antd';

type Props = {
  onDownloadResultsClicked: () => void;
};

export default function DownloadResults(props: Props) {
  const { onDownloadResultsClicked } = props;
  return (
    <Button className="ub-ml2" htmlType="button" onClick={onDownloadResultsClicked}>
      Download Results
    </Button>
  );
}
