// Copyright (c) 2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Button } from 'antd';
import './PopupSql.css';

type Props = {
  closePopup: (popupContent: string) => void;
  popupContent: string;
};

/**
 * Render the popup that is needed for sql.
 */
export default function PopupSql(props: Props) {
  const value = `"${props.popupContent}"`;
  return (
    <div
      className="PopupSQL"
      // A click on the backdrop or header keeps focus here, so Escape still reaches this handler.
      tabIndex={-1}
      onKeyDown={event => {
        if (event.key === 'Escape') {
          // TracePage binds Escape on document.body to clear the search, so stop it here.
          event.stopPropagation();
          props.closePopup('');
        }
      }}
    >
      <div className="PopupSQL--inner">
        <h3 className="PopupSQL--header">{'Tag: "SQL" '} </h3>
        <textarea readOnly className="PopupSQL--sqlContent" value={value} />
        <Button autoFocus className="PopupSQL--closeButton" onClick={() => props.closePopup('')}>
          close{' '}
        </Button>
      </div>
    </div>
  );
}
