// Copyright (c) 2018 Uber Technologies, Inc.
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
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { mapDispatchToProps, mapStateToProps, UnconnectedSpanTreeOffset } from './SpanTreeOffset';
import spanAncestorIdsSpy from '../../../utils/span-ancestor-ids';

jest.mock('../../../utils/span-ancestor-ids');

describe('SpanTreeOffset', () => {
  const ownSpanID = 'ownSpanID';
  const parentSpanID = 'parentSpanID';
  const rootSpanID = 'rootSpanID';
  const specialRootID = 'root';
  let props;

  beforeEach(() => {
    spanAncestorIdsSpy.mockImplementation(() => [parentSpanID, rootSpanID]);
    props = {
      addHoverIndentGuideId: jest.fn(),
      hoverIndentGuideIds: new Set(),
      removeHoverIndentGuideId: jest.fn(),
      span: {
        hasChildren: false,
        spanID: ownSpanID,
      },
    };
  });

  describe('.SpanTreeOffset--indentGuide', () => {
    it('renders only one .SpanTreeOffset--indentGuide for entire trace if span has no ancestors', () => {
      spanAncestorIdsSpy.mockReturnValue([]);
      render(<UnconnectedSpanTreeOffset {...props} />);

      const indentGuides = screen.getAllByTestId(/indent-guide/);
      expect(indentGuides).toHaveLength(1);
      expect(indentGuides[0]).toHaveAttribute('data-ancestor-id', specialRootID);
    });

    it('renders one .SpanTreeOffset--indentGuide per ancestor span, plus one for entire trace', () => {
      render(<UnconnectedSpanTreeOffset {...props} />);

      const indentGuides = screen.getAllByTestId(/indent-guide/);
      expect(indentGuides).toHaveLength(3);
      expect(indentGuides[0]).toHaveAttribute('data-ancestor-id', specialRootID);
      expect(indentGuides[1]).toHaveAttribute('data-ancestor-id', rootSpanID);
      expect(indentGuides[2]).toHaveAttribute('data-ancestor-id', parentSpanID);
    });

    it('adds .is-active to correct indentGuide', () => {
      const propsWithHover = {
        ...props,
        hoverIndentGuideIds: new Set([parentSpanID]),
      };
      render(<UnconnectedSpanTreeOffset {...propsWithHover} />);

      const activeIndentGuide = screen.getByTestId(`indent-guide-${parentSpanID}`);
      expect(activeIndentGuide).toHaveClass('is-active');
    });

    it('calls props.addHoverIndentGuideId on mouse enter', () => {
      render(<UnconnectedSpanTreeOffset {...props} />);

      const indentGuide = screen.getByTestId(`indent-guide-${parentSpanID}`);
      fireEvent.mouseEnter(indentGuide);

      expect(props.addHoverIndentGuideId).toHaveBeenCalledTimes(1);
      expect(props.addHoverIndentGuideId).toHaveBeenCalledWith(parentSpanID);
    });

    it('does not call props.addHoverIndentGuideId on mouse enter if mouse came from a indentGuide with the same ancestorId', () => {
      render(<UnconnectedSpanTreeOffset {...props} />);

      const relatedTarget = document.createElement('span');
      relatedTarget.dataset.ancestorId = parentSpanID;

      const indentGuide = screen.getByTestId(`indent-guide-${parentSpanID}`);

      const mouseEnterEvent = new MouseEvent('mouseenter', {
        bubbles: true,
        relatedTarget,
      });

      fireEvent(indentGuide, mouseEnterEvent);

      expect(props.addHoverIndentGuideId).not.toHaveBeenCalled();
    });

    it('calls props.removeHoverIndentGuideId on mouse leave', () => {
      render(<UnconnectedSpanTreeOffset {...props} />);

      const indentGuide = screen.getByTestId(`indent-guide-${parentSpanID}`);
      fireEvent.mouseLeave(indentGuide);

      expect(props.removeHoverIndentGuideId).toHaveBeenCalledTimes(1);
      expect(props.removeHoverIndentGuideId).toHaveBeenCalledWith(parentSpanID);
    });

    it('does not call props.removeHoverIndentGuideId on mouse leave if mouse leaves to a indentGuide with the same ancestorId', () => {
      render(<UnconnectedSpanTreeOffset {...props} />);

      const relatedTarget = document.createElement('span');
      relatedTarget.dataset.ancestorId = parentSpanID;

      const indentGuide = screen.getByTestId(`indent-guide-${parentSpanID}`);

      const mouseLeaveEvent = new MouseEvent('mouseleave', {
        bubbles: true,
        relatedTarget,
      });

      fireEvent(indentGuide, mouseLeaveEvent);

      expect(props.removeHoverIndentGuideId).not.toHaveBeenCalled();
    });
  });

  describe('icon', () => {
    beforeEach(() => {
      props.span = { ...props.span, hasChildren: true };
    });

    it('does not render icon if props.span.hasChildren is false', () => {
      props.span = { ...props.span, hasChildren: false };
      render(<UnconnectedSpanTreeOffset {...props} />);

      expect(screen.queryByTestId('icon-wrapper')).not.toBeInTheDocument();
    });

    it('does not render icon if props.span.hasChildren is true and showChildrenIcon is false', () => {
      props.showChildrenIcon = false;
      render(<UnconnectedSpanTreeOffset {...props} />);

      expect(screen.queryByTestId('icon-wrapper')).not.toBeInTheDocument();
    });

    it('renders IoChevronRight if props.span.hasChildren is true and props.childrenVisible is false', () => {
      render(<UnconnectedSpanTreeOffset {...props} />);

      const iconWrapper = screen.getByTestId('icon-wrapper');
      expect(iconWrapper).toBeInTheDocument();
      expect(iconWrapper.querySelector('svg')).toBeInTheDocument();
    });

    it('renders IoIosArrowDown if props.span.hasChildren is true and props.childrenVisible is true', () => {
      props.childrenVisible = true;
      render(<UnconnectedSpanTreeOffset {...props} />);

      const iconWrapper = screen.getByTestId('icon-wrapper');
      expect(iconWrapper).toBeInTheDocument();
      expect(iconWrapper.querySelector('svg')).toBeInTheDocument();
    });

    it('calls props.addHoverIndentGuideId on mouse enter', () => {
      render(<UnconnectedSpanTreeOffset {...props} />);

      const iconWrapper = screen.getByTestId('icon-wrapper');
      fireEvent.mouseEnter(iconWrapper);

      expect(props.addHoverIndentGuideId).toHaveBeenCalledTimes(1);
      expect(props.addHoverIndentGuideId).toHaveBeenCalledWith(ownSpanID);
    });

    it('calls props.removeHoverIndentGuideId on mouse leave', () => {
      render(<UnconnectedSpanTreeOffset {...props} />);

      const iconWrapper = screen.getByTestId('icon-wrapper');
      fireEvent.mouseLeave(iconWrapper);

      expect(props.removeHoverIndentGuideId).toHaveBeenCalledTimes(1);
      expect(props.removeHoverIndentGuideId).toHaveBeenCalledWith(ownSpanID);
    });
  });

  describe('mapDispatchToProps()', () => {
    it('creates the actions correctly', () => {
      expect(mapDispatchToProps(() => {})).toEqual({
        addHoverIndentGuideId: expect.any(Function),
        removeHoverIndentGuideId: expect.any(Function),
      });
    });
  });

  describe('mapStateToProps()', () => {
    it('maps state to props correctly', () => {
      const hoverIndentGuideIds = new Set([parentSpanID]);
      const state = {
        traceTimeline: {
          hoverIndentGuideIds,
        },
      };
      const mappedProps = mapStateToProps(state);
      expect(mappedProps).toEqual({
        hoverIndentGuideIds,
      });
      expect(mappedProps.hoverIndentGuideIds).toBe(hoverIndentGuideIds);
    });
  });
});
