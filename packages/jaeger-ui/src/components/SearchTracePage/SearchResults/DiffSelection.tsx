// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Button } from 'antd';
import { Link } from 'react-router-dom';

import ResultItemTitle from './ResultItemTitle';
import { getUrl } from '../../TraceDiff/url';
import { getTracePageLink } from '../../TracePage/url';

import { TraceSummary } from '../../../types/trace-summary';

import './DiffSelection.css';

type Props = {
  toggleComparison: (traceID: string, isInDiffCohort: boolean) => void;
  traces: TraceSummary[];
};

const CTA_MESSAGE = <h2 className="ub-m0">Compare traces by selecting result items</h2>;

export default function DiffSelection({ toggleComparison, traces }: Props) {
  const cohort = traces.map(t => t.traceID);
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
          {traces.map(summary => (
            <ResultItemTitle
              key={summary.traceID}
              duration={summary.duration}
              error={undefined}
              isInDiffCohort
              linkTo={getTracePageLink(summary.traceID)}
              state={undefined}
              targetBlank
              toggleComparison={toggleComparison}
              traceID={summary.traceID}
              traceName={summary.traceName}
            />
          ))}
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
