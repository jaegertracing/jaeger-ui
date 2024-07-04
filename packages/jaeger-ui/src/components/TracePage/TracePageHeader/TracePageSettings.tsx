// Copyright (c) 2024 The Jaeger Authors.
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

import * as React from 'react';
import { Button, Dropdown, Form, Modal, Space, Tag } from 'antd';
import { IoAdd, IoCheckmark, IoChevronDown, IoClose, IoSettings } from 'react-icons/io5';

import keyboardMappings from '../keyboard-mappings';
import track from './KeyboardShortcutsHelp.track';

import './KeyboardShortcutsHelp.css';

type Props = {
  availableTagKeys: string[];
  selectedMarkerColorKey: string[];
  onMarkerColorKeyChange: (tagKey: string[]) => void;
  className: string;
};

type State = {
  visible: boolean;
};

type DataRecord = {
  key: string;
  kbds: React.JSX.Element;
  description: string;
};

function renderTagKey(tag: string) {
  if (tag === '') {
    return <span className="TracePageSettings-emptyMarkerColorKey">(Empty string)</span>;
  }

  return <span>{tag}</span>;
}

function getMarkerColorKeyFormItem(props: Props) {
  const items = [];
  const callbacks: { [key: string]: boolean } = {}; // whether the key should be added or removed

  for (const key of props.selectedMarkerColorKey) {
    callbacks[key] = false;
    items.push({
      key: key,
      label: (
        <span>
          {renderTagKey(key)}
          <IoCheckmark />
        </span>
      ),
    });
  }

  for (const key of props.availableTagKeys) {
    if (callbacks.hasOwnProperty(key)) {
      continue;
    }

    callbacks[key] = true;
    items.push({
      key: key,
      label: renderTagKey(key),
    });
  }

  const toggle = key => {
    console.log(callbacks);
    console.log(key, callbacks[key]);
    let newList: string[];
    if (callbacks[key]) {
      newList = props.selectedMarkerColorKey.concat([key]);
      newList.sort();
    } else {
      newList = props.selectedMarkerColorKey.filter(item => item != key);
    }
    console.log(newList);
    props.onMarkerColorKeyChange(newList);
  };

  return (
    <Form.Item label="Color log ticks by log field:">
      <>
        {props.selectedMarkerColorKey.map(key => (
          <Tag
            closeIcon={<IoClose />}
            onClose={e => {
              e.preventDefault();
              toggle(key);
            }}
          >
            {renderTagKey(key)}
          </Tag>
        ))}
      </>
      <Dropdown menu={{ items, onClick: ({ key }) => toggle(key) }}>
        <Tag>
          <IoAdd />
        </Tag>
      </Dropdown>
    </Form.Item>
  );
}

export default class TracePageSettings extends React.PureComponent<Props, State> {
  state = {
    visible: false,
  };

  onCtaClicked = () => {
    track();
    this.setState({ visible: true });
  };

  onCloserClicked = () => this.setState({ visible: false });

  render() {
    const { className } = this.props;
    return (
      <React.Fragment>
        <Button className={className} htmlType="button" onClick={this.onCtaClicked}>
          <span className="TracePageSettings--cta">
            <IoSettings />
          </span>
        </Button>
        <Modal
          title="Page settings"
          open={this.state.visible}
          onOk={this.onCloserClicked}
          onCancel={this.onCloserClicked}
          cancelButtonProps={{ style: { display: 'none' } }}
          bodyStyle={{ padding: 0 }}
        >
          <Form>{getMarkerColorKeyFormItem(this.props)}</Form>
        </Modal>
      </React.Fragment>
    );
  }
}
