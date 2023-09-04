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

import { shallow } from 'enzyme';
import React from 'react';
import { FaChevronRight } from 'react-icons/fa';
import { IoIosArrowDown } from 'react-icons/io';

import { mapDispatchToProps, mapStateToProps, UnconnectedSpanTreeOffset } from './SpanTreeOffset';
import spanAncestorIdsSpy from '../../../utils/span-ancestor-ids';

jest.mock('../../../utils/span-ancestor-ids');

describe('SpanTreeOffset', () => {
  const ownSpanID = 'ownSpanID';
  const parentSpanID = 'parentSpanID';
  const rootSpanID = 'rootSpanID';
  const specialRootID = 'root';
  let props;
  let wrapper;

  beforeEach(() => {
    // Mock implementation instead of Mock return value so that each call returns a new array (like normal)
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
    wrapper = shallow(<UnconnectedSpanTreeOffset {...props} />);
  });

  describe('.SpanTreeOffset--indentGuide', () => {
    it('renders only one .SpanTreeOffset--indentGuide for entire trace if span has no ancestors', () => {
      spanAncestorIdsSpy.mockReturnValue([]);
      wrapper = shallow(<UnconnectedSpanTreeOffset {...props} />);
      const indentGuides = wrapper.find('.SpanTreeOffset--indentGuide');
      expect(indentGuides.length).toBe(1);
      expect(indentGuides.prop('data-ancestor-id')).toBe(specialRootID);
    });

    it('renders one .SpanTreeOffset--indentGuide per ancestor span, plus one for entire trace', () => {
      const indentGuides = wrapper.find('.SpanTreeOffset--indentGuide');
      expect(indentGuides.length).toBe(3);
      expect(indentGuides.at(0).prop('data-ancestor-id')).toBe(specialRootID);
      expect(indentGuides.at(1).prop('data-ancestor-id')).toBe(rootSpanID);
      expect(indentGuides.at(2).prop('data-ancestor-id')).toBe(parentSpanID);
    });

    it('adds .is-active to correct indentGuide', () => {
      props.hoverIndentGuideIds = new Set([parentSpanID]);
      wrapper = shallow(<UnconnectedSpanTreeOffset {...props} />);
      const activeIndentGuide = wrapper.find('.is-active');
      expect(activeIndentGuide.length).toBe(1);
      expect(activeIndentGuide.prop('data-ancestor-id')).toBe(parentSpanID);
    });

    it('calls props.addHoverIndentGuideId on mouse enter', () => {
      wrapper.find({ 'data-ancestor-id': parentSpanID }).simulate('mouseenter', {});
      expect(props.addHoverIndentGuideId).toHaveBeenCalledTimes(1);
      expect(props.addHoverIndentGuideId).toHaveBeenCalledWith(parentSpanID);
    });

    it('does not call props.addHoverIndentGuideId on mouse enter if mouse came from a indentGuide with the same ancestorId', () => {
      const relatedTarget = document.createElement('span');
      relatedTarget.dataset.ancestorId = parentSpanID;
      wrapper.find({ 'data-ancestor-id': parentSpanID }).simulate('mouseenter', {
        relatedTarget,
      });
      expect(props.addHoverIndentGuideId).not.toHaveBeenCalled();
    });

    it('calls props.removeHoverIndentGuideId on mouse leave', () => {
      wrapper.find({ 'data-ancestor-id': parentSpanID }).simulate('mouseleave', {});
      expect(props.removeHoverIndentGuideId).toHaveBeenCalledTimes(1);
      expect(props.removeHoverIndentGuideId).toHaveBeenCalledWith(parentSpanID);
    });

    it('does not call props.removeHoverIndentGuideId on mouse leave if mouse leaves to a indentGuide with the same ancestorId', () => {
      const relatedTarget = document.createElement('span');
      relatedTarget.dataset.ancestorId = parentSpanID;
      wrapper.find({ 'data-ancestor-id': parentSpanID }).simulate('mouseleave', {
        relatedTarget,
      });
      expect(props.removeHoverIndentGuideId).not.toHaveBeenCalled();
    });
  });

  describe('icon', () => {
    beforeEach(() => {
      wrapper.setProps({ span: { ...props.span, hasChildren: true } });
    });

    it('does not render icon if props.span.hasChildren is false', () => {
      wrapper.setProps({ span: { ...props.span, hasChildren: false } });
      expect(wrapper.find(FaChevronRight).length).toBe(0);
      expect(wrapper.find(IoIosArrowDown).length).toBe(0);
    });

    it('does not render icon if props.span.hasChildren is true and showChildrenIcon is false', () => {
      wrapper.setProps({ showChildrenIcon: false });
      expect(wrapper.find(FaChevronRight).length).toBe(0);
      expect(wrapper.find(IoIosArrowDown).length).toBe(0);
    });

    it('renders IoChevronRight if props.span.hasChildren is true and props.childrenVisible is false', () => {
      expect(wrapper.find(FaChevronRight).length).toBe(1);
      expect(wrapper.find(IoIosArrowDown).length).toBe(0);
    });

    it('renders IoIosArrowDown if props.span.hasChildren is true and props.childrenVisible is true', () => {
      wrapper.setProps({ childrenVisible: true });
      expect(wrapper.find(FaChevronRight).length).toBe(0);
      expect(wrapper.find(IoIosArrowDown).length).toBe(1);
    });

    it('calls props.addHoverIndentGuideId on mouse enter', () => {
      wrapper.find('.SpanTreeOffset--iconWrapper').simulate('mouseenter', {});
      expect(props.addHoverIndentGuideId).toHaveBeenCalledTimes(1);
      expect(props.addHoverIndentGuideId).toHaveBeenCalledWith(ownSpanID);
    });

    it('calls props.removeHoverIndentGuideId on mouse leave', () => {
      wrapper.find('.SpanTreeOffset--iconWrapper').simulate('mouseleave', {});
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
