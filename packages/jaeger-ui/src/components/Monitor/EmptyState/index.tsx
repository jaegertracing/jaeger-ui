// Copyright (c) 2021 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Row, Col, Button, Alert } from 'antd';
import './index.css';
import { MonitorEmptyStateConfig } from '../../../types/config';
import { getConfigValue } from '../../../utils/config/get-config';
import monitorImg from './media/monitor.png';

const MonitorATMEmptyState: React.FC = () => {
  const config: MonitorEmptyStateConfig = getConfigValue('monitor.emptyState');

  if (!config) {
    return null;
  }

  return (
    <Col>
      <Row justify="center">
        <Col span={8}>
          <img
            className="monitor-preview-image-empty-state"
            alt="jaeger-monitor-tab-preview"
            src={monitorImg}
          />
        </Col>
      </Row>
      <Row justify="center">
        <Col span={6} className="center-empty-state">
          {config?.mainTitle && <h2 className="main-title-empty-state">{config.mainTitle}</h2>}
          {config?.subTitle && <h3 className="sub-title-empty-state">{config.subTitle}</h3>}
          {config?.description && <h4 className="description-empty-state">{config.description}</h4>}
          {config?.button?.text && (
            <Button className="button-empty-state" onClick={() => config.button?.onClick?.()}>
              {config.button.text}
            </Button>
          )}
          {config?.alert && (
            <Row justify="center">
              <Col span={20}>
                <Alert message={config.alert.message} type={config.alert.type} showIcon />
              </Col>
            </Row>
          )}
        </Col>
      </Row>
    </Col>
  );
};

export default MonitorATMEmptyState;
