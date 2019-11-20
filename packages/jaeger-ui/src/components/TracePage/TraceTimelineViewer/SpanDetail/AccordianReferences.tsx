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
import cx from 'classnames';
import IoIosArrowDown from 'react-icons/lib/io/ios-arrow-down';
import IoIosArrowRight from 'react-icons/lib/io/ios-arrow-right';
import { FetchedTrace, ReduxState, TNil } from '../../../../types';

import './AccordianReferences.css';
import { SpanReference, Trace } from '../../../../types/trace';
import updateUiFind from '../../../../utils/update-ui-find';
import { connect, Dispatch } from 'react-redux';
import { bindActionCreators } from 'redux';
import { actions as timelineActions } from '../duck';
import { extractUiFindFromState } from '../../../common/UiFindInput';
import { RouteComponentProps, withRouter } from 'react-router-dom';

type TOwnProps = {
  className?: string | TNil;
  data: SpanReference[];
  headerClassName?: string | TNil;
  highContrast?: boolean;
  interactive?: boolean;
  isOpen: boolean;
  label: React.ReactNode;
  onToggle?: null | (() => void);
  traceID: string;
};

type TDispatchProps = {
  focusUiFindMatches: (trace: Trace, uiFind: string | TNil, preserveHiddenStatus?: boolean) => void;
};

type TReduxProps = {
  uiFind: string | TNil;
  trace: FetchedTrace | TNil;
};

type AccordianReferencesProps = TOwnProps & TDispatchProps & TReduxProps & RouteComponentProps;

type ReferenceItemProps = {
  data: SpanReference[];
  focusSpan: (spanID: string) => void;
};

function References(props: ReferenceItemProps) {
  const { data, focusSpan } = props;
  return (
    <div className="ReferencesList u-simple-scrollbars">
      <ul className="ReferencesList--List">
        {data.map(reference => {
          return (
            <li className="ReferencesList--Item" key={`${reference.spanID}`}>
              <a role="button" onClick={() => focusSpan(reference.spanID)}>
                {reference.spanID}{' '}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export class UnconnectedAccordianReferences extends React.PureComponent<AccordianReferencesProps> {
  static defaultProps = {
    className: null,
    highContrast: false,
    interactive: true,
    onToggle: null,
  };

  focusSpan = (uiFind: string) => {
    const { trace, focusUiFindMatches, location, history } = this.props;
    if (trace && trace.data) {
      updateUiFind({
        location,
        history,
        uiFind,
      });
      focusUiFindMatches(trace.data, uiFind, true);
    }
  };

  render() {
    const {
      className,
      data,
      headerClassName,
      highContrast,
      interactive,
      isOpen,
      label,
      onToggle,
    } = this.props;
    const isEmpty = !Array.isArray(data) || !data.length;
    const iconCls = cx('u-align-icon', { 'AccordianKReferences--emptyIcon': isEmpty });
    let arrow: React.ReactNode | null = null;
    let headerProps: Object | null = null;
    if (interactive) {
      arrow = isOpen ? <IoIosArrowDown className={iconCls} /> : <IoIosArrowRight className={iconCls} />;
      headerProps = {
        'aria-checked': isOpen,
        onClick: isEmpty ? null : onToggle,
        role: 'switch',
      };
    }
    return (
      <div className={className || ''}>
        <div
          className={cx('AccordianReferences--header', headerClassName, {
            'is-empty': isEmpty,
            'is-high-contrast': highContrast,
            'is-open': isOpen,
          })}
          {...headerProps}
        >
          {arrow}
          <strong>{label}</strong> ({data.length})
        </div>
        {isOpen && <References data={data} focusSpan={this.focusSpan} />}
      </div>
    );
  }
}

// export for tests
export function mapDispatchToProps(dispatch: Dispatch<ReduxState>): TDispatchProps {
  const { focusUiFindMatches } = bindActionCreators(timelineActions, dispatch);
  return { focusUiFindMatches };
}

// export for tests
export function mapStateToProps(state: ReduxState, ownProps: TOwnProps): TReduxProps {
  const { traces } = state.trace;
  const trace = ownProps.traceID ? traces[ownProps.traceID] : null;
  return {
    trace,
    ...extractUiFindFromState(state),
  };
}

export default withRouter(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(UnconnectedAccordianReferences)
);
