// Copyright (c) 2020 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React, { useCallback, useEffect, useState } from 'react';
import { Tooltip } from 'antd';
import _get from 'lodash/get';
import { useSelector } from 'react-redux';

import BreakableText from '../../common/BreakableText';
import DetailsCard from '../../common/DetailsCard';
import LoadingIndicator from '../../common/LoadingIndicator';
import NewWindowIcon from '../../common/NewWindowIcon';
import VerticalResizer from '../../common/VerticalResizer';
import JaegerAPI from '../../../api/jaeger';
import extractDecorationFromState, { TDecorationFromState } from '../../../model/path-agnostic-decorations';
import stringSupplant from '../../../utils/stringSupplant';

import { TPathAgnosticDecorationSchema } from '../../../model/path-agnostic-decorations/types';
import { ReduxState } from '../../../types';
import { TColumnDefs, TDetails } from '../../common/DetailsCard/types';

import './DetailsPanel.css';

type TOwnProps = {
  decorationSchema: TPathAgnosticDecorationSchema;
  service: string;
  operation?: string | string[] | null;
};

type TProps = TOwnProps & TDecorationFromState;

export const UnconnectedDetailsPanel = React.memo(function UnconnectedDetailsPanel(props: TProps) {
  const { decorationProgressbar, decorationSchema, decorationValue, operation: _op, service } = props;

  const [columnDefs, setColumnDefs] = useState<TColumnDefs | undefined>(undefined);
  const [details, setDetails] = useState<TDetails | undefined>(undefined);
  const [detailsErred, setDetailsErred] = useState<boolean>(false);
  const [detailsLoading, setDetailsLoading] = useState<boolean>(false);
  const [width, setWidth] = useState<number>(0.3);

  const operation = _op && !Array.isArray(_op) ? _op : undefined;

  useEffect(() => {
    const { detailUrl, detailPath, detailColumnDefPath, opDetailUrl, opDetailPath, opDetailColumnDefPath } =
      decorationSchema;

    setDetails(undefined);
    setDetailsErred(false);
    setDetailsLoading(false);

    let fetchUrl: string | undefined;
    let getDetailPath: string | undefined;
    let getDefPath: string | undefined;

    if (opDetailUrl && opDetailPath && operation) {
      fetchUrl = stringSupplant(opDetailUrl, { service, operation });
      getDetailPath = stringSupplant(opDetailPath, { service, operation });
      getDefPath = opDetailColumnDefPath && stringSupplant(opDetailColumnDefPath, { service, operation });
    } else if (detailUrl && detailPath) {
      fetchUrl = stringSupplant(detailUrl, { service });
      getDetailPath = stringSupplant(detailPath, { service });
      getDefPath = detailColumnDefPath && stringSupplant(detailColumnDefPath, { service });
    }

    if (!fetchUrl || !getDetailPath) return;

    setDetailsLoading(true);

    JaegerAPI.fetchDecoration(fetchUrl)
      .then((res: unknown) => {
        let erred = false;
        let fetchedDetails = _get(res, getDetailPath as string);
        if (fetchedDetails === undefined) {
          fetchedDetails = `\`${getDetailPath}\` not found in response`;
          erred = true;
        }
        const fetchedColumnDefs: TColumnDefs = getDefPath ? _get(res, getDefPath, []) : [];

        setColumnDefs(fetchedColumnDefs);
        setDetails(fetchedDetails);
        setDetailsErred(erred);
        setDetailsLoading(false);
      })
      .catch((err: Error) => {
        setDetails(`Unable to fetch decoration: ${err.message || err}`);
        setDetailsErred(true);
        setDetailsLoading(false);
      });
  }, [operation, service, decorationSchema]);

  const onResize = useCallback((newWidth: number) => {
    setWidth(newWidth);
  }, []);

  const { detailLink } = decorationSchema;

  return (
    <div className="Ddg--DetailsPanel" style={{ width: `${width * 100}vw` }}>
      <div className="Ddg--DetailsPanel--SvcOpHeader">
        <BreakableText text={service} />
        {operation && <BreakableText text={`::${operation}`} />}
      </div>
      <div className="Ddg--DetailsPanel--DecorationHeader">
        <span>{stringSupplant(decorationSchema.name, { service, operation })}</span>
        {detailLink && (
          <Tooltip arrow={{ pointAtCenter: true }} title="More Info">
            <a
              className="Ddg--DetailsPanel--DetailLink"
              href={stringSupplant(detailLink, { service, operation })}
              target="_blank"
              rel="noreferrer noopener"
            >
              <NewWindowIcon />
            </a>
          </Tooltip>
        )}
      </div>
      {decorationProgressbar ? (
        <div className="Ddg--DetailsPanel--PercentCircleWrapper">{decorationProgressbar}</div>
      ) : (
        <span className="Ddg--DetailsPanel--errorMsg">{decorationValue}</span>
      )}
      {detailsLoading && (
        <div className="Ddg--DetailsPanel--LoadingWrapper">
          <LoadingIndicator className="Ddg--DetailsPanel--LoadingIndicator" />
        </div>
      )}
      {details && (
        <DetailsCard
          className={`Ddg--DetailsPanel--DetailsCard ${detailsErred ? 'is-error' : ''}`}
          columnDefs={columnDefs}
          details={details}
          header="Details"
        />
      )}
      <VerticalResizer max={0.8} min={0.1} onChange={onResize} position={width} rightSide />
    </div>
  );
});

const DetailsPanel: React.FC<TOwnProps> = props => {
  const decorationState = useSelector((state: ReduxState) => extractDecorationFromState(state, props));

  return <UnconnectedDetailsPanel {...props} {...decorationState} />;
};

export default React.memo(DetailsPanel);
