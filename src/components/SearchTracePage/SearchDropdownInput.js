// Copyright (c) 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Dropdown } from 'semantic-ui-react';

/**
 * We have to wrap the semantic ui component becuase it doesn't perform well
 * when there are 200+ suggestions.
 *
 * We make sure only the props.maxResults are shown at one time to enhance usability.
 * TODO: Identify if we should use this component.
 */
export default class SearchDropdownInput extends Component {
  constructor(props) {
    super(props);
    this.state = {
      items: props.items,
      currentItems: props.items.slice(0, props.maxResults),
    };
  }
  componentWillReceiveProps(nextProps) {
    if (this.props.items.map(i => i.text).join(',') !== nextProps.items.map(i => i.text).join(',')) {
      this.setState({
        items: nextProps.items,
        currentItems: nextProps.items.slice(0, nextProps.maxResults),
      });
    }
  }
  onSearch(items, v) {
    const { maxResults } = this.props;
    return this.state.items.filter(i => i.text.startsWith(v)).slice(0, maxResults);
  }
  render() {
    const { input: { value, onChange } } = this.props;
    const { currentItems } = this.state;
    return (
      <Dropdown
        value={value}
        text={value}
        search={(items, v) => this.onSearch(items, v)}
        onChange={(e, { value: newValue }) => onChange(newValue)}
        options={currentItems}
        selection
        scrolling
        compact={false}
      />
    );
  }
}

SearchDropdownInput.defaultProps = {
  maxResults: 250,
};
SearchDropdownInput.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      text: PropTypes.string,
      value: PropTypes.string,
    })
  ),
  input: PropTypes.shape({
    value: PropTypes.string,
    onChange: PropTypes.func,
  }),
  maxResults: PropTypes.number,
};
