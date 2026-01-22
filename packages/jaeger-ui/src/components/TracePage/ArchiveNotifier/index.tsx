// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

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

function getNextNotifiedState(archivedState: TraceArchive | TNil): ENotifiedState | null {
  if (!archivedState) {
    return null;
  }
  if ('isLoading' in archivedState && archivedState.isLoading) {
    return ENotifiedState.Progress;
  }
  return 'isAcknowledged' in archivedState && archivedState.isAcknowledged ? null : ENotifiedState.Outcome;
}

function updateNotification(
  oldState: ENotifiedState | null,
  nextState: ENotifiedState | null,
  acknowledge: () => void,
  archivedState: TraceArchive | TNil
) {
  if (oldState === nextState) {
    return;
  }
  if (oldState) {
    notification.destroy(oldState);
  }
  if (nextState === ENotifiedState.Progress) {
    notification.info({
      key: ENotifiedState.Progress,
      duration: 0,
      icon: <LoadingIndicator />,
      title: 'Archiving trace...',
    });
    return;
  }
  if (nextState === ENotifiedState.Outcome) {
    if (archivedState && 'error' in archivedState) {
      const { error } = archivedState;
      notification.warning({
        key: ENotifiedState.Outcome,
        className: 'ArchiveNotifier--errorNotification',
        title: <Message error={error} wrap />,
        description: <Details error={error} wrap />,
        duration: false,
        icon: <IoTimeOutline className="ArchiveNotifier--errorIcon" />,
        onClose: acknowledge,
      });
    } else if (archivedState && 'isArchived' in archivedState && archivedState.isArchived) {
      notification.success({
        key: ENotifiedState.Outcome,
        duration: false,
        icon: <IoTimeOutline className="ArchiveNotifier--doneIcon" />,
        title: 'This trace has been archived.',
        onClose: acknowledge,
      });
    } else {
      throw new Error('Unexpected condition');
    }
  }
}

const ArchiveNotifier: React.FC<Props> = props => {
  const notifiedStateRef = useRef<ENotifiedState | null>(null);
  const { acknowledge, archivedState } = props;

  useEffect(() => {
    const nextNotifiedState = getNextNotifiedState(archivedState);
    updateNotification(notifiedStateRef.current, nextNotifiedState, acknowledge, archivedState);
    notifiedStateRef.current = nextNotifiedState;
  }, [acknowledge, archivedState]);

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
