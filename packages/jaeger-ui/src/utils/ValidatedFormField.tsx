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

import React, { useState } from 'react';
import { Input, Popover } from 'antd';
import cx from 'classnames';

import './ValidatedFormField.css';

export default function ValidatedFormField(props: any) {
  const [blur, setOnBlur] = useState(false);
  const { onChange: handleChange, validate, ...rest } = props;

  const validationResult = validate(rest.value);
  const isInvalid = blur && Boolean(validationResult);

  return (
    <Popover placement="bottomLeft" open={isInvalid} {...validationResult}>
      <Input
        className={cx({
          'value-is-invalid': isInvalid,
        })}
        onChange={handleChange}
        onBlur={() => {
          setOnBlur(true);
        }}
        onFocus={() => {
          setOnBlur(false);
        }}
        type="text"
        {...rest}
      />
    </Popover>
  );
}
