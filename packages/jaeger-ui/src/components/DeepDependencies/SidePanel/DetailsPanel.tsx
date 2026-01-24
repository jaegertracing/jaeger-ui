// Copyright (c) 2020 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Tooltip } from 'antd';
import _get from 'lodash/get';
import { connect } from 'react-redux';

import BreakableText from '../../common/BreakableText';
import DetailsCard from '../../common/DetailsCard';
import LoadingIndicator from '../../common/LoadingIndicator';
import NewWindowIcon from '../../common/NewWindowIcon';
import VerticalResizer from '../../common/VerticalResizer';
import JaegerAPI from '../../../api/jaeger';
import extractDecorationFromState, { TDecorationFromState } from '../../../model/path-agnostic-decorations';
import stringSupplant from '../../../utils/stringSupplant';

import { TPathAgnosticDecorationSchema } from '../../../model/path-agnostic-decorations/types';
import { TColumnDefs, TDetails } from '../../common/DetailsCard/types';

import './DetailsPanel.css';

type TProps = TDecorationFromState & {
  decorationSchema: TPathAgnosticDecorationSchema;
  service: string;
  operation?: string | string[] | null;
};

type TState = {
  columnDefs?: TColumnDefs;
  details?: TDetails;
  detailsErred?: boolean;
  detailsLoading?: boolean;
  width?: number;
};

export function UnconnectedDetailsPanel(props: TProps) {
  const [state, setState] = React.useState<TState>({});
  const isFirstRender = React.useRef(true);

  const fetchDetails = React.useCallback(() => {
    const {
      decorationSchema: {
        detailUrl,
        detailPath,
        detailColumnDefPath,
        opDetailUrl,
        opDetailPath,
        opDetailColumnDefPath,
      },
      operation: _op,
      service,
    } = props;

    const operation = _op && !Array.isArray(_op) ? _op : undefined;

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

    setState(prev => ({ ...prev, detailsLoading: true }));

    JaegerAPI.fetchDecoration(fetchUrl)
      .then((res: unknown) => {
        let detailsErred = false;
        let details = _get(res, getDetailPath as string);

        if (details === undefined) {
          details = `\`${getDetailPath}\` not found in response`;
          detailsErred = true;
        }

        const columnDefs: TColumnDefs = getDefPath ? _get(res, getDefPath, []) : [];

        setState(prev => ({
          ...prev,
          columnDefs,
          details,
          detailsErred,
          detailsLoading: false,
        }));
      })
      .catch((err: Error) => {
        setState(prev => ({
          ...prev,
          details: `Unable to fetch decoration: ${err.message || err}`,
          detailsErred: true,
          detailsLoading: false,
        }));
      });
  }, [props.decorationSchema, props.operation, props.service]);

  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      fetchDetails();
      return;
    }

    setState(prev => ({
      ...prev,
      details: undefined,
      detailsErred: false,
      detailsLoading: false,
    }));

    fetchDetails();
  }, [props.operation, props.service, props.decorationSchema, fetchDetails]);

  const onResize = (width: number) => {
    setState(prev => ({ ...prev, width }));
  };

  const { decorationProgressbar, decorationSchema, decorationValue, operation: _op, service } = props;
  const { detailLink } = decorationSchema;
  const { width = 0.3 } = state;

  const operation = _op && !Array.isArray(_op) ? _op : undefined;

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

      {state.detailsLoading && (
        <div className="Ddg--DetailsPanel--LoadingWrapper">
          <LoadingIndicator className="Ddg--DetailsPanel--LoadingIndicator" />
        </div>
      )}

      {state.details && (
        <DetailsCard
          className={`Ddg--DetailsPanel--DetailsCard ${state.detailsErred ? 'is-error' : ''}`}
          columnDefs={state.columnDefs}
          details={state.details}
          header="Details"
        />
      )}

      <VerticalResizer max={0.8} min={0.1} onChange={onResize} position={width} rightSide />
    </div>
  );
}

export default connect(extractDecorationFromState)(UnconnectedDetailsPanel);
