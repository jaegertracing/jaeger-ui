// @flow

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

import { Popover } from 'antd';
import cx from 'classnames';
import * as React from 'react';

import './redux-form-field-adapter.css';

export default function reduxFormFieldAdapter(
  AntInputComponent: Class<React.Component<*, *>>,
  onChangeAdapter: () => void
) {
  return function _reduxFormFieldAdapter(props: any) {
    // inputRest includes necessary props such as onBlur and value
    const { input: { onChange, ...inputRest }, children, ...rest } = props;
    const isInvalid = rest.meta.touched && !!rest.meta.error;
    return (
      <Popover placement={'bottomLeft'} visible={isInvalid} {...rest.meta.error}>
        <AntInputComponent
          className={cx({ 'is-invalid': isInvalid })}
          onChange={onChangeAdapter ? (...args) => onChange(onChangeAdapter(...args)) : onChange}
          {...inputRest}
          {...rest}
        >
          {children}
        </AntInputComponent>
      </Popover>
    );
  };
}
