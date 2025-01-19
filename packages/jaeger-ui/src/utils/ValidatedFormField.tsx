// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

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
