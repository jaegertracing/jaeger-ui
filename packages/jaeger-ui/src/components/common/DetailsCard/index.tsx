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
import MdKeyboardArrowDown from 'react-icons/lib/md/keyboard-arrow-down';

import { TColumnDefs, TDetails, TRow } from './types';
import DetailTable from './DetailTable';
import DetailList from './DetailList';

import './index.css';

type TProps = {
  className?: string;
  collapsible?: boolean;
  columnDefs?: TColumnDefs;
  description?: string;
  details: TDetails;
  header: string;
};

type TState = {
  collapsed: boolean;
};

function isList(arr: string[] | TRow[]): arr is string[] {
  return typeof arr[0] === 'string';
}

export default class DetailsCard extends React.PureComponent<TProps> {
  state: TState;

  constructor(props: TProps) {
    super(props);

    this.state = { collapsed: Boolean(props.collapsible) };
  }

  renderDetails() {
    const { columnDefs, details } = this.props;

    if (Array.isArray(details)) {
      if (details.length === 0) return null;

      if (isList(details)) return <DetailList details={details} />;
      return <DetailTable columnDefs={columnDefs} details={details} />;
    }

    return <span>{details}</span>;
  }

  toggleCollapse = () => {
    this.setState((prevState: TState) => ({
      collapsed: !prevState.collapsed,
    }));
  };

  render() {
    const { collapsed } = this.state;
    const { className, collapsible, description, header } = this.props;

    return (
      <div className={cx('DetailsCard', className)}>
        <div className="DetailsCard--ButtonHeaderWrapper">
          {collapsible && (
            <button
              onClick={this.toggleCollapse}
              type="button"
              className={cx('DetailsCard--Collapser', { 'is-collapsed': collapsed })}
            >
              <MdKeyboardArrowDown />
            </button>
          )}
          <div className="DetailsCard--HeaderWrapper">
            <span className="DetailsCard--Header">{header}</span>
            {description && <p className="DetailsCard--Description">{description}</p>}
          </div>
        </div>
        <div className={cx('DetailsCard--DetailsWrapper', { 'is-collapsed': collapsed })}>
          {this.renderDetails()}
        </div>
      </div>
    );
  }
}
