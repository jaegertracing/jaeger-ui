// Copyright (c) 2017 Uber Technologies, Inc.
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
import { Popover } from 'antd';

import CohortTable from './CohortTable';
import TraceHeader from './TraceHeader';
import TraceIdInput from './TraceIdInput';

import { FetchedTrace, TNil } from '../../../types';

import './TraceDiffHeader.css';

type Props = {
  a: FetchedTrace | TNil;
  b: FetchedTrace | TNil;
  cohort: FetchedTrace[];
  diffSetA: (traceId: string) => void;
  diffSetB: (traceId: string) => void;
};

const TraceDiffHeader: React.FC<Props> = ({ a, b, cohort, diffSetA, diffSetB }) => {
  const [tableVisible, setTableVisible] = React.useState<('a' | 'b') | null>(null);

  const toggleTable = (which: 'a' | 'b', visible: boolean) => {
    setTableVisible(visible ? which : null);
  };

  const diffSetTrace = (which: 'a' | 'b', id: string) => {
    if (which === 'a') {
      diffSetA(id);
    } else {
      diffSetB(id);
    }
    setTableVisible(null);
  };

  const toggleTableA = (visible: boolean) => toggleTable('a', visible);
  const toggleTableB = (visible: boolean) => toggleTable('b', visible);
  const boundDiffSetA = (id: string) => diffSetTrace('a', id);
  const boundDiffSetB = (id: string) => diffSetTrace('b', id);

  const {
    data: aData = undefined,
    id: aId = undefined,
    state: aState = undefined,
    error: aError = undefined,
  } = a || {};
  const {
    data: bData = undefined,
    id: bId = undefined,
    state: bState = undefined,
    error: bError = undefined,
  } = b || {};

  const selection: Record<string, { label: 'A' | 'B' }> = {};
  if (aId) selection[aId] = { label: 'A' };
  if (bId) selection[bId] = { label: 'B' };

  const cohortTableA = (
    <CohortTable cohort={cohort} current={aId} selectTrace={boundDiffSetA} selection={selection} />
  );
  const cohortTableB = (
    <CohortTable cohort={cohort} current={bId} selectTrace={boundDiffSetB} selection={selection} />
  );

  return (
    <header className="TraceDiffHeader">
      <div className="TraceDiffHeader--labelItem">
        <h1 className="TraceDiffHeader--label">A</h1>
      </div>
      <Popover
        classNames={{ root: 'TraceDiffHeader--popover' }}
        trigger="click"
        placement="bottomLeft"
        title={<TraceIdInput selectTrace={boundDiffSetA} />}
        content={cohortTableA}
        open={tableVisible === 'a'}
        onOpenChange={toggleTableA}
      >
        <div className="TraceDiffHeader--traceSection">
          <TraceHeader
            duration={aData?.duration}
            error={aError}
            startTime={aData?.startTime}
            state={aState}
            totalSpans={aData?.spans?.length}
            traceID={aId}
            traceName={aData?.traceName}
            validationError={a?.validationError}
          />
        </div>
      </Popover>
      <div className="TraceDiffHeader--divider">
        <div className="TraceDiffHeader--vsContainer" data-testid="vs-separator">
          <span className="TraceDiffHeader--vsLabel">VS</span>
        </div>
      </div>
      <div className="TraceDiffHeader--labelItem">
        <h1 className="TraceDiffHeader--label">B</h1>
      </div>
      <Popover
        classNames={{ root: 'TraceDiffHeader--popover' }}
        trigger="click"
        placement="bottomLeft"
        title={<TraceIdInput selectTrace={boundDiffSetB} />}
        content={cohortTableB}
        open={tableVisible === 'b'}
        onOpenChange={toggleTableB}
      >
        <div className="TraceDiffHeader--traceSection">
          <TraceHeader
            duration={bData?.duration}
            error={bError}
            startTime={bData?.startTime}
            state={bState}
            totalSpans={bData?.spans?.length}
            traceID={bId}
            traceName={bData?.traceName}
            validationError={b?.validationError}
          />
        </div>
      </Popover>
    </header>
  );
};

export default React.memo(TraceDiffHeader);
