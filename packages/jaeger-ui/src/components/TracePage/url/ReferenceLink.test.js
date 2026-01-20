// Copyright (c) 2019 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import ReferenceLink from './ReferenceLink';

describe(ReferenceLink, () => {
  const focusMock = jest.fn();

  const sameTraceRef = {
    refType: 'CHILD_OF',
    traceID: 'trace1',
    spanID: 'span1',
    span: {
      // not null or undefined is an indicator of an internal reference
    },
  };

  const externalRef = {
    refType: 'CHILD_OF',
    traceID: 'trace2',
    spanID: 'span2',
  };

  describe('rendering', () => {
    it('render for this trace', () => {
      render(<ReferenceLink reference={sameTraceRef} focusSpan={focusMock} />);
      expect(screen.getAllByRole('button').length).toBe(1);
    });

    it('render for external trace', () => {
      render(<ReferenceLink reference={externalRef} focusSpan={focusMock} />);
      expect(screen.getByRole('link')).toHaveAttribute('href', '/trace/trace2?uiFind=span2');
    });
  });

  describe('focus span', () => {
    it('call focusSpan', () => {
      focusMock.mockReset();
      render(<ReferenceLink reference={sameTraceRef} focusSpan={focusMock} />);

      fireEvent.click(screen.getByRole('button'));
      expect(focusMock).toHaveBeenLastCalledWith('span1');
    });
  });
});
