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

import React from 'react';
import { Dropdown, Menu, Tooltip } from 'antd';
import { bindActionCreators } from 'redux';
import { connect, Dispatch } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { History as RouterHistory, Location } from 'history';

import NewWindowIcon from '../../common/NewWindowIcon';
import updateUiFind from '../../../utils/update-ui-find';

import { getUrl } from '../url';
import { FetchedTrace, ReduxState, TNil } from '../../../types';
import { actions as timelineActions } from './duck';
import { extractUiFindFromState } from '../../common/UiFindInput';
import { SpanReference, Trace } from '../../../types/trace';

import './ReferencesButton.css';

type TDispatchProps = {
  focusUiFindMatches: (trace: Trace, uiFind: string | TNil, preserveHiddenStatus?: boolean) => void;
};

type TReduxProps = {
  uiFind: string | TNil;
  trace: FetchedTrace | TNil;
};

type TOwnProps = {
  references: SpanReference[];
  traceID: string;
  history: RouterHistory;
  location: Location;
  match: any;
  children?: React.ReactNode;
  tooltipText: string;
};

type TReferencesButtonProps = TDispatchProps & TReduxProps & TOwnProps;

const linkToExternalSpan = (traceID: string, spanID: string) => `${getUrl(traceID)}/uiFind?=${spanID}`;

// export for tests
export class UnconnectedReferencesButton extends React.PureComponent<TReferencesButtonProps> {
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

  spanLink = (reference: SpanReference, traceID: string, children?: React.ReactNode, className?: string) => {
    if (traceID === reference.traceID) {
      return (
        <a role="button" onClick={() => this.focusSpan(reference.spanID)} className={className}>
          {children}
        </a>
      );
    }
    return (
      <a
        href={linkToExternalSpan(reference.traceID, reference.spanID)}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {children}
      </a>
    );
  };

  referencesList = (references: SpanReference[]) => (
    <Menu>
      {references.map(ref => {
        const { span, traceID, spanID } = ref;
        const child = (
          <React.Fragment>
            {span
              ? `${span.process.serviceName}:${span.operationName} - ${ref.spanID}`
              : `(another trace) - ${ref.spanID}`}
            {traceID !== this.props.traceID && (
              <div className="external-trace-ref">
                <NewWindowIcon />
              </div>
            )}
          </React.Fragment>
        );
        return <Menu.Item key={`${spanID}`}>{this.spanLink(ref, this.props.traceID, child)}</Menu.Item>;
      })}
    </Menu>
  );

  render() {
    const { references, children, tooltipText } = this.props;
    if (references.length > 1) {
      return (
        <Tooltip
          arrowPointAtCenter
          mouseLeaveDelay={0.5}
          placement="bottom"
          title={tooltipText}
          overlayClassName="ref-tooltip"
        >
          <Dropdown overlay={this.referencesList(references)} placement="bottomRight" trigger={['click']}>
            <a className="multi-parent-button">{children}</a>
          </Dropdown>
        </Tooltip>
      );
    }
    const ref = references[0];
    return (
      <Tooltip
        arrowPointAtCenter
        mouseLeaveDelay={0.5}
        placement="bottom"
        title={tooltipText}
        overlayClassName="ref-tooltip"
      >
        {this.spanLink(ref, this.props.traceID, children, 'multi-parent-button')}
      </Tooltip>
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
  )(UnconnectedReferencesButton)
);
