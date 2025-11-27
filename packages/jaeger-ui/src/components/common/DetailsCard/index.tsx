// Copyright (c) 2020 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import cx from 'classnames';
import { IoChevronDown } from 'react-icons/io5';

import { TColumnDefs, TDetails, TRow } from './types';
import DetailList from './DetailList';
import DetailTable from './DetailTable';

import './index.css';

type TProps = {
  className?: string;
  collapsible?: boolean;
  columnDefs?: TColumnDefs;
  description?: string;
  details: TDetails;
  header: string;
};

function isList(arr: string[] | TRow[]): arr is string[] {
  return typeof arr[0] === 'string';
}

function DetailsCard({ className, collapsible = false, description, header, columnDefs, details }: TProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(Boolean(collapsible));

  const renderDetails = () => {
    if (Array.isArray(details)) {
      if (details.length === 0) return null;
      if (isList(details)) return <DetailList details={details} />;
      return <DetailTable columnDefs={columnDefs} details={details} />;
    }
    return <span>{details}</span>;
  };

  const toggleCollapsed = React.useCallback(() => setIsCollapsed(!isCollapsed), [isCollapsed]);

  return (
    <div className={cx('DetailsCard', className)}>
      <div className="DetailsCard--ButtonHeaderWrapper">
        {collapsible && (
          <button
            onClick={toggleCollapsed}
            type="button"
            className={cx('DetailsCard--Collapser', { 'is-collapsed': isCollapsed })}
          >
            <IoChevronDown />
          </button>
        )}
        <div className="DetailsCard--HeaderWrapper">
          <span className="DetailsCard--Header">{header}</span>
          {description && <p className="DetailsCard--Description">{description}</p>}
        </div>
      </div>
      <div className={cx('DetailsCard--DetailsWrapper', { 'is-collapsed': isCollapsed })}>
        {renderDetails()}
      </div>
    </div>
  );
}

export default DetailsCard;
