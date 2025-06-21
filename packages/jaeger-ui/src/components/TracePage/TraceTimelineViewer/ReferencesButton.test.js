// Copyright (c) 2019 The Jaeger Authors.
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
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import ReferencesButton from './ReferencesButton';
import transformTraceData from '../../../model/transform-trace-data';
import traceGenerator from '../../../demo/trace-generators';

jest.mock('../url/ReferenceLink', () => {
  const MockReferenceLink = ({ children, className, reference }) => (
    <a
      className={className}
      data-testid="reference-link"
      data-spanid={reference.spanID}
      data-traceid={reference.traceID}
    >
      {children}
    </a>
  );
  MockReferenceLink.displayName = 'ReferenceLink';
  return MockReferenceLink;
});

jest.mock('../../common/NewWindowIcon', () => () => <span data-testid="new-window-icon">↗</span>);

describe('<ReferencesButton>', () => {
  const trace = transformTraceData(traceGenerator.trace({ numberOfSpans: 10 }));
  const oneReference = trace.spans[1].references;

  const moreReferences = oneReference.slice();
  const externalSpanID = 'extSpan';

  moreReferences.push(
    {
      refType: 'CHILD_OF',
      traceID: trace.traceID,
      spanID: trace.spans[2].spanID,
      span: trace.spans[2],
    },
    {
      refType: 'CHILD_OF',
      traceID: 'otherTrace',
      spanID: externalSpanID,
    }
  );

  const baseProps = {
    focusSpan: jest.fn(),
    tooltipText: 'Test tooltip text',
    children: <span data-testid="button-children">References</span>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a single reference directly as a ReferenceLink', () => {
    render(<ReferencesButton {...baseProps} references={oneReference} />);

    const referenceLink = screen.getByTestId('reference-link');
    expect(referenceLink).toBeInTheDocument();
    expect(referenceLink).toHaveClass('ReferencesButton-MultiParent');
    expect(referenceLink).toHaveAttribute('data-spanid', oneReference[0].spanID);

    const trigger = screen.getByTestId('button-children');
    expect(trigger).toBeInTheDocument();
    expect(trigger.textContent).toBe('References');

    expect(trigger.closest('a')).not.toBeNull();
  });

  it('renders multiple references as dropdown menu items', async () => {
    render(<ReferencesButton {...baseProps} references={moreReferences} />);

    const trigger = screen.getByTestId('button-children').closest('a');
    expect(trigger).toHaveClass('ReferencesButton-MultiParent');
    expect(trigger).toBeInTheDocument();

    fireEvent.click(trigger);

    const items = await screen.findAllByTestId('reference-link');
    expect(items).toHaveLength(3);

    items.forEach((item, idx) => {
      expect(item).toHaveAttribute('data-spanid', moreReferences[idx].spanID);
    });

    const externalItem = items.find(item => item.getAttribute('data-spanid') === externalSpanID);
    expect(within(externalItem).getByTestId('new-window-icon')).toBeInTheDocument();
  });
});
