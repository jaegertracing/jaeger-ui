// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Button } from 'antd';

import { trackConversions, EAltViewActions } from './index.track';
import { getUrl, getUrlState } from '../../DeepDependencies/url';
import { getConfigValue } from '../../../utils/config/get-config';

type Props = {
  onDdgViewClicked: () => void;
  traceResultsView: boolean;
};

function viewAllDep({ ctrlKey, metaKey }: React.MouseEvent<HTMLButtonElement>) {
  trackConversions(EAltViewActions.Ddg);
  const { density, operation, service, showOp } = getUrlState(window.location.search);
  window.open(getUrl({ density, operation, service, showOp }), ctrlKey || metaKey ? '_blank' : '_self');
}

export default function AltViewOptions(props: Props) {
  const { onDdgViewClicked, traceResultsView } = props;
  const toggleBtn = (
    <Button className="ub-ml2" htmlType="button" onClick={onDdgViewClicked}>
      {traceResultsView ? 'Deep Dependency Graph' : 'Trace Results'}
    </Button>
  );
  if (traceResultsView || !getConfigValue('deepDependencies.menuEnabled')) return toggleBtn;
  return (
    <>
      {toggleBtn}
      <Button className="ub-ml2" htmlType="button" onClick={viewAllDep}>
        View All Dependencies
      </Button>
    </>
  );
}
