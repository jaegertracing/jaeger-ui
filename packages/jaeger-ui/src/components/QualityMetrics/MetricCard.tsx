// Copyright (c) 2020 Uber Technologies, Inc.
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
import { Tooltip } from 'antd';

import CircularProgressbar from '../common/CircularProgressbar';
import NewWindowIcon from '../common/NewWindowIcon';
import DetailsCard from '../common/DetailsCard';
import CountCard from './CountCard';

import { TQualityMetrics } from './types';

import './MetricCard.css';

export type TProps = {
  metric: TQualityMetrics['metrics'][0];
};

const dividToFixedFloorPercentage = (pass: number, fail: number) => {
  const str = `${(pass / (pass + fail)) * 100}.0`;
  return `${str.substring(0, str.indexOf('.') + 2)}%`;
};

export default class MetricCard extends React.PureComponent<TProps> {
  render() {
    const {
      metric: {
        name,
        description,
        metricDocumentationLink,
        passCount,
        passExamples,
        failureCount,
        failureExamples,
        exemptionCount,
        exemptionExamples,
        details,
      },
    } = this.props;
    return (
      <div className="MetricCard">
        <div className="MetricCard--CircularProgressbarWrapper">
          <CircularProgressbar
            backgroundHue={passCount === 0 ? 0 : undefined}
            decorationHue={passCount === 0 ? 0 : 120}
            maxValue={passCount + failureCount}
            text={dividToFixedFloorPercentage(passCount, failureCount)}
            value={passCount}
          />
        </div>
        <div className="MetricCard--Body">
          <span className="MetricCard--TitleHeader">
            {name}{' '}
            <Tooltip arrowPointAtCenter title="Metric Documentation">
              <a href={metricDocumentationLink} target="_blank" rel="noreferrer noopener">
                <NewWindowIcon />
              </a>
            </Tooltip>
          </span>
          <p className="MetricCard--Description">{description}</p>
          <div className="MetricCard--CountsWrapper">
            <CountCard count={passCount} examples={passExamples} title="Passing" />
            <CountCard count={failureCount} examples={failureExamples} title="Failing" />
            <CountCard count={exemptionCount} examples={exemptionExamples} title="Exemptions" />
          </div>
          {details &&
            details.map(
              detail =>
                Boolean(detail.rows && detail.rows.length) && (
                  <DetailsCard
                    key={`${detail.description}${JSON.stringify(detail.columns)}`}
                    className="MetricCard--Details"
                    collapsible
                    columnDefs={detail.columns}
                    description={detail.description}
                    details={detail.rows}
                    header={detail.header || 'Details'}
                  />
                )
            )}
        </div>
      </div>
    );
  }
}
