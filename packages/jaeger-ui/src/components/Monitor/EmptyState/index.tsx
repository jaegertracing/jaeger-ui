// Copyright (c) 2021 The Jaeger Authors.
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
import { List, Row, Col, Button } from 'antd';
import IoIosCheckmark from 'react-icons/lib/io/ios-checkmark-outline';
import IoIosCloseCircle from 'react-icons/lib/io/ios-circle-outline';

import './index.css';

type TProps = {
  configureStatus: boolean;
  sendDataStatus: boolean;
};

export default class MonitorATMEmptyState extends React.PureComponent<TProps> {
  private configureStatus = {
    text: 'Configured',
    status: false,
  };

  private sendDataStatus = {
    text: 'Sent data',
    status: false,
  };

  constructor(props: TProps) {
    super(props);

    this.configureStatus.status = props.configureStatus;
    this.sendDataStatus.status = props.sendDataStatus;
  }

  render() {
    return (
      <Row justify="center">
        <Col span={12} offset={6} className="center-empty-state">
          <List
            itemLayout="vertical"
            dataSource={[this.configureStatus, this.sendDataStatus]}
            split={false}
            size="small"
            rowKey="-"
            header={<h2 className="ub-m0">Get started with Services Monitor</h2>}
            footer={
              <Button
                style={{ backgroundColor: '#199', color: '#fff' }}
                href="https://www.jaegertracing.io/docs/latest/frontend-ui/"
                target="_blank"
              >
                Go to documentation
              </Button>
            }
            renderItem={(item: { text: string; status: boolean }) => (
              <div>
                &bull; {item.text} {item.status ? <IoIosCheckmark /> : <IoIosCloseCircle />}
              </div>
            )}
          />
        </Col>
      </Row>
    );
  }
}
