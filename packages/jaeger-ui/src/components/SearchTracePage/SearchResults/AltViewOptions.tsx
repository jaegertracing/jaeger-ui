// Copyright (c) 2019 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
