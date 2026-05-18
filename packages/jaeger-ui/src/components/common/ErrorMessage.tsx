// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Button } from 'antd';
import { IoReloadOutline, IoAlertCircleOutline, IoChevronDownOutline, IoChevronUpOutline } from 'react-icons/io5';

import { ApiError } from '../../types/api-error';

import './ErrorMessage.css';

type ErrorMessageProps = {
  className?: string;
  detailClassName?: string;
  messageClassName?: string;
  error?: ApiError | null;
  title?: string;
  onRetry?: () => void;
};

type SubPartProps = {
  className?: string;
  error: ApiError;
  wrap?: boolean;
  wrapperClassName?: string;
};

type ErrorAttrProps = {
  name: string;
  value: string | number;
};

export const MAX_DETAIL_LENGTH = 1024;

function ErrorAttr({ name, value }: ErrorAttrProps) {
  return (
    <tr className='ErrorMessage--detailItem'>
      <td className='ErrorMessage--attr'>{name}</td>
      <td className='ErrorMessage--value'>{value}</td>
    </tr>
  );
}

export function Message({ className, error, wrap = false, wrapperClassName }: SubPartProps) {
  const cssClass = `ErrorMessage--msg ${className || ''}`;

  const msg =
    typeof error === 'string' ? (
      <h3 className={cssClass}>{error}</h3>
    ) : (
      <h3 className={cssClass}>{error.message}</h3>
    );

  if (wrap) {
    return <div className={`ErrorMessage--msg ${wrapperClassName || ''}`}>{msg}</div>;
  }

  return msg;
}

export function Details({ className, error, wrap = false, wrapperClassName }: SubPartProps) {
  if (typeof error === 'string') {
    return null;
  }

  const { httpStatus, httpStatusText, httpUrl, httpQuery, httpBody } = error;
  const bodyExcerpt =
    httpBody && httpBody.length > MAX_DETAIL_LENGTH
      ? `${httpBody.slice(0, MAX_DETAIL_LENGTH - 3).trim()}...`
      : httpBody;

  const details = (
    <div
      className={`ErrorMessage--details ${className || ''} u-simple-scrollbars`}
      data-testid='ErrorMessage--details'
    >
      <table className='ErrorMessage--detailsTable'>
        <tbody>
          {httpStatus && <ErrorAttr name='Status' value={httpStatus} />}
          {httpStatusText && <ErrorAttr name='Status text' value={httpStatusText} />}
          {httpUrl && <ErrorAttr name='URL' value={httpUrl} />}
          {httpQuery && <ErrorAttr name='Query' value={httpQuery} />}
          {bodyExcerpt && <ErrorAttr name='Response body' value={bodyExcerpt} />}
        </tbody>
      </table>
    </div>
  );

  if (wrap) {
    return (
      <div className={wrapperClassName || ''} data-testid='ErrorMessage--details--wrapper'>
        {details}
      </div>
    );
  }

  return details;
}

export default function ErrorMessage({
  className,
  detailClassName,
  error,
  messageClassName,
  title,
  onRetry,
}: ErrorMessageProps) {
  const [showDetails, setShowDetails] = React.useState(false);

  if (error == null) {
    return null;
  }

  const hasDetails = typeof error !== 'string' && (
    error.httpStatus || error.httpStatusText || error.httpUrl || error.httpQuery || error.httpBody
  );

  return (
    <div className={`ErrorMessage ErrorMessage--card ${className || ''}`} data-testid='ErrorMessage'>
      <div className='ErrorMessage--header'>
        <IoAlertCircleOutline className='ErrorMessage--icon' />
        <div className='ErrorMessage--headerContent'>
          {title && <h2 className='ErrorMessage--title'>{title}</h2>}
          <Message error={error} className={messageClassName} />
        </div>
      </div>

      {hasDetails && (
        <div className='ErrorMessage--detailsWrapper'>
          <button
            type='button'
            className='ErrorMessage--detailsToggle'
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? <IoChevronUpOutline /> : <IoChevronDownOutline />}
            <span>Technical details</span>
          </button>
          {showDetails && <Details error={error} className={detailClassName} />}
        </div>
      )}

      {onRetry && (
        <div className='ErrorMessage--actions'>
          <Button
            type='primary'
            icon={<IoReloadOutline />}
            onClick={onRetry}
            className='ErrorMessage--retryBtn'
          >
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}
