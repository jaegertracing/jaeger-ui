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
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import {
  focalPayloadElem,
  longSimplePath,
  shortPath,
  simplePath,
  wrap,
} from '../../../../model/ddg/sample-paths.test.resources';
import transformDdgData from '../../../../model/ddg/transformDdgData';
import * as codec from '../../../../model/ddg/visibility-codec';
import { EDirection } from '../../../../model/ddg/types';
import HopsSelector from '.';

describe('HopsSelector', () => {
  const { distanceToPathElems } = transformDdgData(wrap([longSimplePath, simplePath]), focalPayloadElem);
  const { distanceToPathElems: shortPathElems } = transformDdgData(wrap([shortPath]), focalPayloadElem);
  const mockHandleClick = jest.fn();

  beforeEach(() => {
    mockHandleClick.mockClear();
  });

  it('renders nothing when distanceToPathElems is not provided', () => {
    const { container } = render(<HopsSelector handleClick={mockHandleClick} />);
    expect(container.firstChild).toBeEmptyDOMElement();
  });

  describe('with distanceToPathElems', () => {
    it('renders selectors with default visibility (<= 2 hops)', async () => {
      const user = userEvent.setup();
      render(<HopsSelector distanceToPathElems={distanceToPathElems} handleClick={mockHandleClick} />);

      // Check Upstream Trigger Button Display (Furthest Visible / Total)
      const upstreamTrigger = screen.getByText('Upstream hops').closest('span');
      expect(within(upstreamTrigger).getByTestId('hop-up-2')).toHaveTextContent('2');
      expect(within(upstreamTrigger).getByTestId('hop-up-6')).toHaveTextContent('6');

      // Check Downstream Trigger Button Display (Furthest Visible / Total)
      const downstreamTrigger = screen.getByText('Downstream hops').closest('span');
      expect(within(downstreamTrigger).getByTestId('hop-down-2')).toHaveTextContent('2');
      expect(within(downstreamTrigger).getByTestId('hop-down-6')).toHaveTextContent('6');

      // Open upstream popover
      await user.click(upstreamTrigger);
      const upstreamPopover = await screen.findByRole('tooltip');

      // Check buttons appear inside upstream popover (using -popover suffix)
      expect(within(upstreamPopover).getByTestId('hop-up-0-popover')).toBeInTheDocument();
      expect(within(upstreamPopover).getByTestId('hop-up-1-popover')).toBeInTheDocument();
      const hopUp2InPopover = within(upstreamPopover).getByTestId('hop-up-2-popover');
      expect(hopUp2InPopover).toBeInTheDocument();
      expect(within(upstreamPopover).getByTestId('hop-up-6-popover')).toBeInTheDocument(); // Last hop

      // Check default fullness (<= 2 is full)
      expect(within(upstreamPopover).getByTestId('hop-up-0-popover')).toHaveClass('is-Full');
      expect(within(upstreamPopover).getByTestId('hop-up-1-popover')).toHaveClass('is-Full');
      expect(hopUp2InPopover).toHaveClass('is-Full');
      expect(within(upstreamPopover).getByTestId('hop-up-6-popover')).toHaveClass('is-Empty'); // Last hop button

      // Click a hop inside popover
      await user.click(hopUp2InPopover);
      expect(mockHandleClick).toHaveBeenCalledTimes(1);
      expect(mockHandleClick).toHaveBeenCalledWith(-2, EDirection.Upstream);

      // Close upstream popover and ensure dismissal
      await user.click(upstreamTrigger);
      await user.click(document.body);

      // Open downstream popover
      await user.click(downstreamTrigger);
      const downstreamTitle = await screen.findByText('Visible downstream hops');
      const downstreamPopover = downstreamTitle.closest('.ant-popover-inner');
      expect(downstreamPopover).toBeInTheDocument();

      // Check buttons appear inside downstream popover (using -popover suffix)
      expect(within(downstreamPopover).getByTestId('hop-down-0-popover')).toBeInTheDocument();
      expect(within(downstreamPopover).getByTestId('hop-down-1-popover')).toBeInTheDocument();
      const hopDown2InPopover = within(downstreamPopover).getByTestId('hop-down-2-popover');
      expect(hopDown2InPopover).toBeInTheDocument();
      expect(within(downstreamPopover).getByTestId('hop-down-3-popover')).toBeInTheDocument();
      expect(within(downstreamPopover).getByTestId('hop-down-6-popover')).toBeInTheDocument(); // Last hop

      // Check default fullness (<= 2 is full)
      expect(within(downstreamPopover).getByTestId('hop-down-0-popover')).toHaveClass('is-Full');
      expect(within(downstreamPopover).getByTestId('hop-down-1-popover')).toHaveClass('is-Full');
      expect(hopDown2InPopover).toHaveClass('is-Full');
      expect(within(downstreamPopover).getByTestId('hop-down-3-popover')).toHaveClass('is-Empty');
      expect(within(downstreamPopover).getByTestId('hop-down-6-popover')).toHaveClass('is-Empty'); // Last hop button

      // Click a hop inside popover
      await user.click(within(downstreamPopover).getByTestId('hop-down-3-popover'));
      expect(mockHandleClick).toHaveBeenCalledTimes(2);
      expect(mockHandleClick).toHaveBeenCalledWith(3, EDirection.Downstream);
    });

    it('handles DDGs smaller than two hops', async () => {
      const user = userEvent.setup();
      render(<HopsSelector distanceToPathElems={shortPathElems} handleClick={mockHandleClick} />);

      // Check Upstream Trigger (Furthest/Total = 1/1)
      const upstreamTrigger = screen.getByText('Upstream hops').closest('span');
      expect(within(upstreamTrigger).getAllByTestId('hop-up-1')[0]).toHaveTextContent('1');
      expect(within(upstreamTrigger).getAllByTestId('hop-up-1')[1]).toHaveTextContent('1');

      // Open upstream popover and check fullness (using -popover suffix)
      await user.click(upstreamTrigger);
      const upstreamPopover = await screen.findByRole('tooltip');
      expect(within(upstreamPopover).getByTestId('hop-up-0-popover')).toHaveClass('is-Full');
      expect(within(upstreamPopover).getByTestId('hop-up-1-popover')).toHaveClass('is-Full');

      // Check Downstream renders "No downstream hops"
      expect(screen.getByText(/No downstream hops/i)).toBeInTheDocument();
    });

    it('renders hops with correct fullness based on visEncoding', async () => {
      const visEncoding = codec.encode([0, 1, 2, 4, 5, 6, 7]); // Visibility indices to encode
      const user = userEvent.setup();
      render(
        <HopsSelector
          distanceToPathElems={distanceToPathElems}
          visEncoding={visEncoding}
          handleClick={mockHandleClick}
        />
      );

      // Check Upstream Trigger Display (tests use observed values for this encoding)
      const upstreamTrigger = screen.getByText('Upstream hops').closest('span');
      expect(
        screen.getByTestId('hop-up-1', { selector: '.HopsSelector--Selector--furthest' })
      ).toHaveTextContent('1');
      expect(
        screen.getByTestId('hop-up-6', { selector: '.HopsSelector--Selector--delimiter' })
      ).toHaveTextContent('6');

      // Check Downstream Trigger Display (tests use observed values for this encoding)
      const downstreamTrigger = screen.getByText('Downstream hops').closest('span');
      expect(
        screen.getByTestId('hop-down-2', { selector: '.HopsSelector--Selector--furthest' })
      ).toHaveTextContent('2');
      expect(
        screen.getByTestId('hop-down-6', { selector: '.HopsSelector--Selector--delimiter' })
      ).toHaveTextContent('6');

      // Test clicking specific hops after reopening popovers

      // Click hop -3 (upstream) (using -popover suffix)
      await user.click(upstreamTrigger);
      const reopenedUpstreamTitle = await screen.findByText('Visible upstream hops');
      const reopenedUpstreamPopover = reopenedUpstreamTitle.closest('.ant-popover-inner');
      expect(reopenedUpstreamPopover).toBeInTheDocument();
      const outerUpstreamPopover = reopenedUpstreamPopover.closest('.ant-popover');
      await waitFor(() => expect(outerUpstreamPopover).not.toHaveStyle('pointer-events: none'));
      const hopUp3Button = within(reopenedUpstreamPopover).getByTestId('hop-up-3-popover');
      await user.click(hopUp3Button);
      expect(mockHandleClick).toHaveBeenCalledTimes(1);
      expect(mockHandleClick).toHaveBeenCalledWith(-3, EDirection.Upstream);

      // Click hop +4 (downstream) (using -popover suffix)
      await user.click(downstreamTrigger);
      const reopenedDownstreamTitle = await screen.findByText('Visible downstream hops');
      const reopenedDownstreamPopover = reopenedDownstreamTitle.closest('.ant-popover-inner');
      expect(reopenedDownstreamPopover).toBeInTheDocument();
      const outerDownstreamPopover = reopenedDownstreamPopover.closest('.ant-popover');
      await waitFor(() => expect(outerDownstreamPopover).not.toHaveStyle('pointer-events: none'));
      const hopDown4Button = within(reopenedDownstreamPopover).getByTestId('hop-down-4-popover');
      await user.click(hopDown4Button);
      expect(mockHandleClick).toHaveBeenCalledTimes(2);
      expect(mockHandleClick).toHaveBeenCalledWith(4, EDirection.Downstream);
    });

    it('handles clicks on increment/decrement buttons', async () => {
      const user = userEvent.setup();
      render(<HopsSelector distanceToPathElems={distanceToPathElems} handleClick={mockHandleClick} />);

      // Open upstream popover
      const upstreamTrigger = screen.getByText('Upstream hops').closest('span');
      await user.click(upstreamTrigger);

      // Click decrement (initial furthest: -2 -> -1)
      const upstreamDecrementBtn = await screen.findByTestId('decrement-up');
      await user.click(upstreamDecrementBtn);
      expect(mockHandleClick).toHaveBeenCalledTimes(1);
      expect(mockHandleClick).toHaveBeenCalledWith(-1, EDirection.Upstream);

      // Click increment (initial furthest: -2 -> -3)
      const upstreamIncrementBtn = await screen.findByTestId('increment-up');
      await user.click(upstreamIncrementBtn);
      expect(mockHandleClick).toHaveBeenCalledTimes(2);
      expect(mockHandleClick).toHaveBeenCalledWith(-3, EDirection.Upstream);

      // Close upstream popover
      await user.click(upstreamTrigger);

      // Open downstream popover
      const downstreamTrigger = screen.getByText('Downstream hops').closest('span');
      await user.click(downstreamTrigger);

      // Click decrement (initial furthest: +2 -> +1)
      const downstreamDecrementBtn = await screen.findByTestId('decrement-down');
      await user.click(downstreamDecrementBtn);
      expect(mockHandleClick).toHaveBeenCalledTimes(3);
      expect(mockHandleClick).toHaveBeenCalledWith(1, EDirection.Downstream);

      // Click increment (initial furthest: +2 -> +3)
      const downstreamIncrementBtn = await screen.findByTestId('increment-down');
      await user.click(downstreamIncrementBtn);
      expect(mockHandleClick).toHaveBeenCalledTimes(4);
      expect(mockHandleClick).toHaveBeenCalledWith(3, EDirection.Downstream);
    });
  });
});
