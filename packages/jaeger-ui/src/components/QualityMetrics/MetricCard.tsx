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

import CircularProgressbar from '../common/CircularProgressbar';
import NewWindowIcon from '../common/NewWindowIcon';
import DetailsCard from '../DeepDependencies/SidePanel/DetailsCard';
import CountCard from './CountCard';

import { TQualityMetrics } from './types';

export type TProps = {
  // link: string;
  metric: TQualityMetrics["metrics"][0];
}

export default class MetricCard extends React.PureComponent<TProps> {
  render() {
    const {
      // link,
      metric: {
        name,
        category,
        description,
        metricDocumentationLink,
        // metricWeight,
        passCount,
        passExamples,
        failureCount,
        failureExamples,
        exemptionCount,
        exemptionExamples,
        details,
      }
    } = this.props;
    return (
      <div className="MetricCard">
        <div className="MetricCard--CircularProgressbarWrapper">
          <CircularProgressbar
            decorationHue={120}
            maxValue={passCount + failureCount}
            text={`${(passCount / (passCount + failureCount) * 100).toFixed(1)}%`}
            value={passCount}
          />
        </div>
        <div className="MetricCard--Body">
          <div className="MetricCard--TitleHeader">
            {name} <a href={metricDocumentationLink} target="_blank" ref="noreferrer noopener"><NewWindowIcon /></a>
          </div>
          <p>{description}</p>
          <div className="MetricCard--CountsWrapper">
            <CountCard count={passCount} examples={passExamples} title="Passing"/>
            <CountCard count={failureCount} examples={failureExamples} title="Failing"/>
            <CountCard count={exemptionCount} examples={exemptionExamples} title="Exemptions"/>
          </div>
          {details && details.map(detail=> Boolean(detail.rows && detail.rows.length) && (
            <DetailsCard
              columnDefs={detail.columns}
              details={detail.rows}
              header={detail.header || "Details"}
            />
          ))}
        </div>
      </div>
    );
  }
}
