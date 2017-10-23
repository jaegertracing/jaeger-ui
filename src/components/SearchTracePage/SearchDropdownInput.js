// Copyright (c) 2017 Uber Technologies, Inc.
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

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Dropdown } from 'semantic-ui-react';

import regexpEscape from '../../utils/regexp-escape';

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
      currentItems: props.items.slice(0, props.maxResults),
    };
  }
  componentWillReceiveProps(nextProps) {
    if (this.props.items.map(i => i.text).join(',') !== nextProps.items.map(i => i.text).join(',')) {
      this.setState({
        currentItems: nextProps.items.slice(0, nextProps.maxResults),
      });
    }
  }
  onSearch = (_, searchText) => {
    const { items, maxResults } = this.props;
    const regexStr = regexpEscape(searchText);
    const regex = new RegExp(regexStr, 'i');
    return items.filter(v => regex.test(v.text)).slice(0, maxResults);
  };
  render() {
    const { input: { value, onChange } } = this.props;
    const { currentItems } = this.state;
    return (
      <Dropdown
        value={value}
        text={value}
        search={this.onSearch}
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
