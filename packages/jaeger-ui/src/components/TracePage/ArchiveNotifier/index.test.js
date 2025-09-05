// Copyright (c) 2020 The Jaeger Authors.
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
import { render, cleanup } from '@testing-library/react';
import { notification } from 'antd';
import { IoTimeOutline } from 'react-icons/io5';
import ArchiveNotifier from './index';
import LoadingIndicator from '../../common/LoadingIndicator';
import { Details, Message } from '../../common/ErrorMessage';

jest.mock('antd', () => {
  const originalModule = jest.requireActual('antd');

  return {
    __esModule: true, // Use it when dealing with esModules
    ...originalModule,
    notification: {
      destroy: jest.fn(),
      info: jest.fn(),
      success: jest.fn(),
      warning: jest.fn(),
    },
  };
});

describe('<ArchiveNotifier>', () => {
  let defaultProps;

  beforeEach(() => {
    defaultProps = {
      archivedState: { isArchived: true },
      acknowledge: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    cleanup();
  });

  it('notification success() is called with default props', () => {
    render(<ArchiveNotifier {...defaultProps} />);
    expect(notification.success).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'ENotifiedState.Outcome',
        description: null,
        duration: null,
        icon: <IoTimeOutline className="ArchiveNotifier--doneIcon" />,
        message: 'This trace has been archived.',
        onClose: defaultProps.acknowledge,
      })
    );
  });

  it('notification close() is called onUnmount', () => {
    const { unmount } = render(<ArchiveNotifier {...defaultProps} />);
    unmount();
    expect(notification.destroy).toHaveBeenCalledWith('ENotifiedState.Outcome');
  });

  it('notification close() is not called onUnmount of null state', () => {
    const props = { ...defaultProps, archivedState: null };
    const { unmount } = render(<ArchiveNotifier {...props} />);
    unmount();
    expect(notification.destroy).not.toHaveBeenCalled();
  });

  it('notification close() is not called onUnmount of isAcknowledged state', () => {
    const props = { ...defaultProps, archivedState: { isAcknowledged: true } };
    const { unmount } = render(<ArchiveNotifier {...props} />);
    unmount();
    expect(notification.destroy).not.toHaveBeenCalled();
  });

  it('will throw on missing both isArchived and error from archivedState prop', () => {
    const props = { ...defaultProps, archivedState: {} };
    expect(() => render(<ArchiveNotifier {...props} />)).toThrow('Unexpected condition');
  });

  it('does not notify if archivedState is null', () => {
    const props = { ...defaultProps, archivedState: null };
    render(<ArchiveNotifier {...props} />);
    expect(notification.success).not.toHaveBeenCalled();
    expect(notification.info).not.toHaveBeenCalled();
    expect(notification.warning).not.toHaveBeenCalled();
  });

  it('sets internal notifiedState to null on archivedState.isAcknowledged', () => {
    const props = { ...defaultProps, archivedState: { isAcknowledged: true } };
    render(<ArchiveNotifier {...props} />);
    expect(notification.success).not.toHaveBeenCalled();
    expect(notification.info).not.toHaveBeenCalled();
    expect(notification.warning).not.toHaveBeenCalled();
  });

  it('calls notification.info when isLoading is true', () => {
    const props = { ...defaultProps, archivedState: { isLoading: true } };
    render(<ArchiveNotifier {...props} />);
    expect(notification.info).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'ENotifiedState.Progress',
        description: null,
        duration: 0,
        icon: <LoadingIndicator />,
        message: 'Archiving trace...',
      })
    );
  });

  it('calls notification.warning when error is present', () => {
    const error = 'This is an error string';
    const props = { ...defaultProps, archivedState: { error } };
    render(<ArchiveNotifier {...props} />);
    expect(notification.warning).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'ENotifiedState.Outcome',
        className: 'ArchiveNotifier--errorNotification',
        description: <Details error={error} wrap />,
        duration: null,
        icon: <IoTimeOutline className="ArchiveNotifier--errorIcon" />,
        message: <Message error={error} wrap />,
        onClose: props.acknowledge,
      })
    );
  });

  it('updates notification state and destroys previous notification', () => {
    const { rerender } = render(<ArchiveNotifier {...defaultProps} />);
    const newProps = { ...defaultProps, archivedState: { isLoading: true } };
    rerender(<ArchiveNotifier {...newProps} />);
    expect(notification.destroy).toHaveBeenCalledWith('ENotifiedState.Outcome');
  });

  it('destroys previous notification when new props archivedState is null', () => {
    const { rerender } = render(<ArchiveNotifier {...defaultProps} />);
    rerender(<ArchiveNotifier {...defaultProps} archivedState={null} />);
    expect(notification.destroy).toHaveBeenCalledWith('ENotifiedState.Outcome');
  });
});
