// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { screen, render, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import ErrorMessage, { Details, MAX_DETAIL_LENGTH } from './ErrorMessage';
import { ApiError } from '../../types/api-error';

describe('<ErrorMessage>', () => {
  const errorMessage = 'some error message';

  it('renders empty when not passed an error', () => {
    render(<ErrorMessage error={null} />);
    expect(screen.queryByTestId('ErrorMessage')).toBeNull();
  });

  it('renders a message when passed a string', () => {
    render(<ErrorMessage error={errorMessage} />);
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('<Details /> renders empty on string error', () => {
    render(<Details error={errorMessage} />);
    expect(screen.queryByTestId('ErrorMessage--details')).toBeNull();
    expect(screen.queryByTestId('ErrorMessage--details--wrapper')).toBeNull();
  });

  it('<Details /> renders wrapper on wrap', () => {
    const error: ApiError = {
      message: 'some-message',
      httpStatus: 500,
      httpStatusText: 'value-httpStatusText',
      httpUrl: 'value-httpUrl',
      httpQuery: 'value-httpQuery',
      httpBody: 'value-httpBody',
    };
    render(<Details error={error} wrap />);

    // The wrapper element should be present
    expect(screen.getByTestId('ErrorMessage--details--wrapper')).toBeInTheDocument();

    // All the error attributes should be present
    Object.keys(error).forEach(key => {
      if (key !== 'message') {
        expect(screen.getByText((error as any)[key])).toBeInTheDocument();
      }
    });
  });

  it('<Details /> renders custom wrapper class', () => {
    const error: ApiError = {
      message: 'some-message',
      httpStatus: 500,
      httpStatusText: 'value-httpStatusText',
      httpUrl: 'value-httpUrl',
      httpQuery: 'value-httpQuery',
      httpBody: 'value-httpBody',
    };
    render(<Details error={error} wrap wrapperClassName='TEST-WRAPPER-CLASS' />);

    // The wrapper element should be present
    expect(screen.getByTestId('ErrorMessage--details--wrapper')).toBeInTheDocument();
    expect(screen.getByTestId('ErrorMessage--details--wrapper')).toHaveClass('TEST-WRAPPER-CLASS');

    // All the error attributes should be present
    Object.keys(error).forEach(key => {
      if (key !== 'message') {
        expect(screen.getByText((error as any)[key])).toBeInTheDocument();
      }
    });
  });

  it('renders the error message', () => {
    const error = new Error('another-error');
    render(<ErrorMessage error={error} />);

    expect(screen.getByText(error.message)).toBeInTheDocument();
  });

  it('renders HTTP related data from the error when expanded', () => {
    const error: ApiError = {
      message: 'some-http-ish-message',
      httpStatus: 500,
      httpStatusText: 'value-httpStatusText',
      httpUrl: 'value-httpUrl',
      httpQuery: 'value-httpQuery',
      httpBody: 'value-httpBody',
    };

    render(<ErrorMessage error={error} />);

    // Toggle technical details
    fireEvent.click(screen.getByText('Technical details'));

    Object.keys(error).forEach(key => {
      expect(screen.getByText((error as any)[key])).toBeInTheDocument();
    });
  });

  it('renders truncated body excerpt on large body when expanded', () => {
    const error: ApiError = {
      message: 'some-http-ish-message',
      httpStatus: 500,
      httpStatusText: 'value-httpStatusText',
      httpUrl: 'value-httpUrl',
      httpQuery: 'value-httpQuery',
      httpBody:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ac maximus elit. Curabitur non urna in odio dictum porttitor. Fusce sed mi mauris. Sed vehicula mi nec nulla ultricies, a faucibus nisi feugiat. Aliquam varius diam in porttitor maximus. Quisque in varius neque, vel consequat enim. Donec faucibus lorem tortor, a aliquam augue vulputate eu. Pellentesque tincidunt, nisl vitae tristique fringilla, elit augue eleifend leo, eget laoreet turpis justo et dui. Suspendisse nec lacinia tortor, non fermentum arcu. Morbi at nunc nisi. Vestibulum condimentum sollicitudin nibh ut cursus. Nullam neque erat, eleifend eget libero eget, porta maximus diam. Integer ut est congue, placerat ipsum nec, varius ligula. Integer maximus gravida velit quis commodo. Phasellus posuere a nulla id sodales. Aliquam ultrices purus et iaculis imperdiet. Morbi in felis maximus, dictum sapien in, malesuada augue. Duis sit amet tortor ac ante pellentesque iaculis eget vestibulum ex. Nunc malesuada egestas mauris, ut tempus eros hendrerit dui.',
    };

    render(<ErrorMessage error={error} />);

    // Toggle technical details
    fireEvent.click(screen.getByText('Technical details'));

    // All the keys expect httpBody should be present as is
    Object.keys(error).forEach(key => {
      if (key !== 'httpBody') expect(screen.getByText((error as any)[key])).toBeInTheDocument();
    });

    // The body should be truncated
    expect(screen.getByText(`${error.httpBody.slice(0, MAX_DETAIL_LENGTH - 3).trim()}...`)).toBeInTheDocument();
  });

  it('renders on missing httpStatus from the error when expanded', () => {
    const error: ApiError = {
      message: 'some-http-ish-message',
      httpStatusText: 'value-httpStatusText',
      httpUrl: 'value-httpUrl',
      httpQuery: 'value-httpQuery',
      httpBody: 'value-httpBody',
    };

    render(<ErrorMessage error={error} />);

    // Toggle technical details
    fireEvent.click(screen.getByText('Technical details'));

    Object.keys(error).forEach(key => {
      expect(screen.getByText((error as any)[key])).toBeInTheDocument();
    });
  });

  it('renders with a title when provided', () => {
    render(<ErrorMessage error={errorMessage} title='Error Title' />);
    expect(screen.getByText('Error Title')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('renders a retry button and calls onRetry when clicked', () => {
    const onRetry = vi.fn();
    render(<ErrorMessage error={errorMessage} onRetry={onRetry} />);

    const retryBtn = screen.getByRole('button', { name: /retry/i });
    expect(retryBtn).toBeInTheDocument();

    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
