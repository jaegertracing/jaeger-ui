// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Button } from 'antd';
import { Link } from 'react-router-dom';

import ResultItemTitle from './ResultItemTitle';
import { getUrl } from '../../TraceDiff/url';
import { getUrl as getTracePageUrl } from '../../TracePage/url';
import { fetchedState } from '../../../constants';

import { FetchedTrace } from '../../../types';

import './DiffSelection.css';

type Props = {
  toggleComparison: (traceID: string, isInDiffCohort: boolean) => void;
  traces: FetchedTrace[];
};

// Exported for tests
export const CTA_MESSAGE = <h2 className="ub-m0">Compare traces by selecting result items</h2>;

export default function DiffSelection({ toggleComparison, traces }: Props) {
  const cohort = traces.filter(ft => ft.state !== fetchedState.ERROR).map(ft => ft.id);

  const compareHref = cohort.length > 1 ? getUrl({ cohort }) : null;

  const compareBtn = (
    <Button className="ub-right" disabled={cohort.length < 2} htmlType="button" type="primary">
      Compare Traces
    </Button>
  );

  return (
    <div className={`DiffSelection ${traces.length ? 'is-non-empty' : ''} ub-mb3`}>
      {traces.length > 0 && (
        <div className="DiffSelection--selectedItems">
          {traces.map(fetchedTrace => {
            const { data, error, id, state } = fetchedTrace;
            return (
              <ResultItemTitle
                key={id}
                duration={data && data.duration}
                error={error}
                isInDiffCohort
                linkTo={getTracePageUrl(id)}
                state={state}
                targetBlank
                toggleComparison={toggleComparison}
                traceID={id}
                traceName={data && data.traceName}
              />
            );
          })}
        </div>
      )}
      <div className="DiffSelection--message">
        {traces.length > 0 ? (
          <React.Fragment>
            {compareHref ? <Link to={compareHref}>{compareBtn}</Link> : compareBtn}
            <h2 className="ub-m0">{cohort.length} Selected for comparison</h2>
          </React.Fragment>
        ) : (
          CTA_MESSAGE
        )}
      </div>
    </div>
  );
}
