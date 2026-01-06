// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Checkbox } from 'antd';
import { LocationDescriptor } from 'history';
import { Link } from 'react-router-dom';

import TraceName from '../../common/TraceName';
import { fetchedState } from '../../../constants';
import { formatDuration } from '../../../utils/date';
import { Microseconds } from '../../../types/units';

import { FetchedState, TNil } from '../../../types';
import { ApiError } from '../../../types/api-error';

import './ResultItemTitle.css';
import { getTargetEmptyOrBlank } from '../../../utils/config/get-target';
import TraceId from '../../common/TraceId';

type Props = {
  duration?: number;
  durationPercent?: number;
  error?: ApiError;
  isInDiffCohort: boolean;
  linkTo: LocationDescriptor | TNil;
  state?: FetchedState | TNil;
  targetBlank?: boolean;
  toggleComparison: (traceID: string, isInDiffCohort: boolean) => void;
  traceID: string;
  traceName?: string;
  disableComparision?: boolean;
};

const DEFAULT_DURATION_PERCENT = 0;

const stopCheckboxPropagation = (evt: React.MouseEvent) => evt.stopPropagation();

export default function ResultItemTitle({
  duration,
  durationPercent = DEFAULT_DURATION_PERCENT,
  error,
  isInDiffCohort,
  linkTo,
  state,
  targetBlank = false,
  toggleComparison,
  traceID,
  traceName,
  disableComparision = false,
}: Props) {
  const onToggleComparison = React.useCallback(() => {
    toggleComparison(traceID, isInDiffCohort);
  }, [toggleComparison, traceID, isInDiffCohort]);

  // Use a div when the ResultItemTitle doesn't link to anything
  const wrapperClassName = 'ResultItemTitle--item ub-flex-auto';

  const isErred = state === fetchedState.ERROR;
  // Separate propagation management and toggle manegement due to ant-design#16400
  const checkboxProps = {
    className: 'ResultItemTitle--item ub-flex-none',
    checked: !isErred && isInDiffCohort,
    disabled: isErred,
    onChange: onToggleComparison,
    onClick: stopCheckboxPropagation,
  };

  const content = (
    <>
      <span className="ResultItemTitle--durationBar" style={{ width: `${durationPercent}%` }} />
      {duration != null && (
        <span className="ub-right ub-relative">{formatDuration(duration as Microseconds)}</span>
      )}
      <h3 className="ResultItemTitle--title">
        <TraceName error={error} state={state} traceName={traceName} />
        <TraceId traceId={traceID} className="ResultItemTitle--idExcerpt" />
      </h3>
    </>
  );

  return (
    <div className="ResultItemTitle">
      {!disableComparision && <Checkbox {...checkboxProps} />}
      {linkTo ? (
        <Link
          to={linkTo}
          className={wrapperClassName}
          target={targetBlank ? getTargetEmptyOrBlank() : undefined}
          rel={targetBlank ? 'noopener noreferrer' : undefined}
        >
          {content}
        </Link>
      ) : (
        <div className={wrapperClassName}>{content}</div>
      )}
    </div>
  );
}
