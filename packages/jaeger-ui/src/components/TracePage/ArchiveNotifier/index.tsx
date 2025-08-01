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

import React, { useEffect, useRef } from 'react';
import { notification } from 'antd';
import { IoTimeOutline } from 'react-icons/io5';

import LoadingIndicator from '../../common/LoadingIndicator';
import { Details, Message } from '../../common/ErrorMessage';
import { TNil } from '../../../types';
import { TraceArchive } from '../../../types/archive';

import './index.css';

enum ENotifiedState {
  Progress = 'ENotifiedState.Progress',
  Outcome = 'ENotifiedState.Outcome',
}

type Props = {
  archivedState: TraceArchive | TNil;
  acknowledge: () => void;
};

function getNextNotifiedState(props: Props): ENotifiedState | null {
  const { archivedState } = props;
  if (!archivedState) {
    return null;
  }
  if ('isLoading' in archivedState && archivedState.isLoading) {
    return ENotifiedState.Progress;
  }
  return 'isAcknowledged' in archivedState && archivedState.isAcknowledged ? null : ENotifiedState.Outcome;
}

function updateNotification(oldState: ENotifiedState | null, nextState: ENotifiedState | null, props: Props) {
  if (oldState === nextState) {
    return;
  }
  if (oldState) {
    notification.destroy(oldState);
  }
  if (nextState === ENotifiedState.Progress) {
    notification.info({
      key: ENotifiedState.Progress,
      description: null,
      duration: 0,
      icon: <LoadingIndicator />,
      message: 'Archiving trace...',
    });
    return;
  }
  const { acknowledge, archivedState } = props;
  if (nextState === ENotifiedState.Outcome) {
    if (archivedState && 'error' in archivedState) {
      const { error } = archivedState;
      notification.warning({
        key: ENotifiedState.Outcome,
        className: 'ArchiveNotifier--errorNotification',
        message: <Message error={error} wrap />,
        description: <Details error={error} wrap />,
        duration: null,
        icon: <IoTimeOutline className="ArchiveNotifier--errorIcon" />,
        onClose: acknowledge,
      });
    } else if (archivedState && 'isArchived' in archivedState && archivedState.isArchived) {
      notification.success({
        key: ENotifiedState.Outcome,
        description: null,
        duration: null,
        icon: <IoTimeOutline className="ArchiveNotifier--doneIcon" />,
        message: 'This trace has been archived.',
        onClose: acknowledge,
      });
    } else {
      throw new Error('Unexpected condition');
    }
  }
}

const ArchiveNotifier: React.FC<Props> = props => {
  const notifiedStateRef = useRef<ENotifiedState | null>(null);

  useEffect(() => {
    const nextNotifiedState = getNextNotifiedState(props);
    updateNotification(notifiedStateRef.current, nextNotifiedState, props);
    notifiedStateRef.current = nextNotifiedState;
  }, [props.archivedState]);

  useEffect(() => {
    return () => {
      if (notifiedStateRef.current) {
        notification.destroy(notifiedStateRef.current);
      }
    };
  }, []);

  return null;
};

export default React.memo(ArchiveNotifier);
