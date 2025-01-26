// Copyright (c) 2020 Uber Technologies, Inc.
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

function DetailsCard({ className, collapsible, description, header, columnDefs, details }: TProps) {
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
