// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { Input, Popover } from 'antd';
import type { InputProps } from 'antd';
import cx from 'classnames';

import './ValidatedFormField.css';

type ValidationResult = {
  content: React.ReactNode;
  title: React.ReactNode;
};

type ValidatedFormFieldProps = Omit<InputProps, 'onChange'> & {
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  validate: (value: string | undefined) => ValidationResult | null | undefined;
};

export default function ValidatedFormField(props: ValidatedFormFieldProps) {
  const [blur, setOnBlur] = useState(false);
  const { onChange: handleChange, validate, ...rest } = props;

  const validationResult = validate(rest.value as string | undefined);
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
