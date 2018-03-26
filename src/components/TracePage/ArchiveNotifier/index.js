// @flow

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
import { Icon, notification } from 'antd';

import ErrorMessage from '../../common/ErrorMessage';
import type { TraceArchive } from '../../../types/archive';

import './index.css';

const NOTIFIED_PROGRESS = 'NOTIFIED_PROGRESS';
const NOTIFIED_OUTCOME = 'NOTIFIED_OUTCOME';

type NotifiedState = 'NOTIFIED_PROGRESS' | 'NOTIFIED_OUTCOME' | null;

type Props = {
  // eslint-disable-next-line react/no-unused-prop-types
  archivedState: ?TraceArchive,
  // eslint-disable-next-line react/no-unused-prop-types
  acknowledge: () => void,
};

type State = {
  notifiedState: NotifiedState,
};

function getNextNotifiedState(props: Props) {
  const { archivedState } = props;
  if (!archivedState) {
    return null;
  }
  if (archivedState.isLoading) {
    return NOTIFIED_PROGRESS;
  }
  return archivedState.isAcknowledged ? null : NOTIFIED_OUTCOME;
}

function updateNotification(oldState: NotifiedState, nextState: NotifiedState, props: Props) {
  if (oldState === nextState) {
    return;
  }
  if (oldState) {
    notification.close(oldState);
  }
  if (nextState === NOTIFIED_PROGRESS) {
    notification.info({
      key: NOTIFIED_PROGRESS,
      message: 'Archiving trace...',
      icon: <Icon type="loading" />,
      duration: 0,
    });
    return;
  }
  const { acknowledge, archivedState } = props;
  if (nextState === NOTIFIED_OUTCOME) {
    if (archivedState && archivedState.error) {
      const error = typeof archivedState.error === 'string' ? archivedState.error : archivedState.error;
      notification.warn({
        key: NOTIFIED_OUTCOME,
        className: 'ArchiveNotifier--errorNotification',
        message: <ErrorMessage.Message error={error} wrap />,
        description: <ErrorMessage.Details error={error} wrap />,
        duration: null,
        icon: <Icon type="clock-circle-o" className="ArchiveNotifier--errorIcon" />,
        onClose: acknowledge,
      });
    } else if (archivedState && archivedState.isArchived) {
      notification.success({
        key: NOTIFIED_OUTCOME,
        message: 'This trace has been archived.',
        icon: <Icon type="clock-circle-o" className="ArchiveNotifier--doneIcon" />,
        duration: null,
        onClose: acknowledge,
      });
    } else {
      throw new Error('Unexpected condition');
    }
  }
}

function processProps(notifiedState: NotifiedState, props: Props) {
  const nxNotifiedState = getNextNotifiedState(props);
  updateNotification(notifiedState, nxNotifiedState, props);
  return nxNotifiedState;
}

export default class ArchiveNotifier extends React.PureComponent<Props, State> {
  props: Props;

  constructor(props: Props) {
    super(props);
    const notifiedState = processProps(null, props);
    this.state = { notifiedState };
  }

  componentWillReceiveProps(nextProps: Props) {
    const notifiedState = processProps(this.state.notifiedState, nextProps);
    if (this.state.notifiedState !== notifiedState) {
      this.setState({ notifiedState });
    }
  }

  componentWillUnmount() {
    const { notifiedState } = this.state;
    if (notifiedState) {
      notification.close(notifiedState);
    }
  }

  render() {
    return null;
  }
}
