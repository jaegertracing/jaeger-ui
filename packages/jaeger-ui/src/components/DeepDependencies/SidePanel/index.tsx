// Copyright (c) 2020 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React, { useMemo, useEffect, useCallback } from 'react';
import { Modal, Table } from 'antd';
import { IoExitOutline, IoInformationCircleOutline } from 'react-icons/io5';

import { TDdgVertex } from '../../../model/ddg/types';
import { TPathAgnosticDecorationSchema } from '../../../model/path-agnostic-decorations/types';
import { getConfigValue } from '../../../utils/config/get-config';
import DetailsPanel from './DetailsPanel';
import * as track from './index.track';

import './index.css';

type TProps = {
  clearSelected: () => void;
  selectDecoration: (decoration?: string) => void;
  selectedDecoration?: string;
  selectedVertex?: TDdgVertex;
};

const SidePanel: React.FC<TProps> = props => {
  const { clearSelected, selectDecoration, selectedDecoration, selectedVertex } = props;

  const decorations: TPathAgnosticDecorationSchema[] | undefined = useMemo(
    () => getConfigValue('pathAgnosticDecorations'),
    []
  );

  useEffect(() => {
    track.trackDecorationSelected(selectedDecoration);
  }, [selectedDecoration]);

  useEffect(() => {
    track.trackDecorationViewDetails(selectedVertex);
  }, [selectedVertex]);

  const handleClearSelected = useCallback(() => {
    track.trackDecorationViewDetails();
    clearSelected();
  }, [clearSelected]);

  const handleSelectDecoration = useCallback(
    (decoration?: string) => {
      selectDecoration(decoration);
    },
    [selectDecoration]
  );

  const handleOpenInfoModal = useCallback(() => {
    Modal.info({
      content: (
        <Table
          columns={[
            {
              dataIndex: 'acronym',
              key: 'acronym',
              title: 'Acronym',
            },
            {
              dataIndex: 'name',
              key: 'name',
              title: 'Name',
            },
          ]}
          dataSource={decorations}
          rowKey={(schema: TPathAgnosticDecorationSchema) => schema.id}
        />
      ),
      maskClosable: true,
      title: 'Decoration Options',
      width: '60vw',
    });
  }, [decorations]);

  if (!decorations) {
    return null;
  }

  const selectedSchema = decorations.find(
    ({ id }: TPathAgnosticDecorationSchema) => id === selectedDecoration
  );

  return (
    <div className="Ddg--SidePanel">
      <div className="Ddg--SidePanel--Btns">
        <button
          className={`Ddg--SidePanel--closeBtn ${selectedVertex && selectedSchema ? '' : 'is-hidden'}`}
          type="button"
          onClick={handleClearSelected}
        >
          <IoExitOutline />
        </button>
        <div className="Ddg--SidePanel--DecorationBtns">
          {decorations.map(({ acronym, id }: TPathAgnosticDecorationSchema) => (
            <button
              key={id}
              className={`Ddg--SidePanel--decorationBtn ${id === selectedDecoration ? 'is-selected' : ''}`}
              type="button"
              onClick={() => handleSelectDecoration(id)}
            >
              {acronym}
            </button>
          ))}
          <button
            key="clearBtn"
            className="Ddg--SidePanel--decorationBtn"
            type="button"
            onClick={() => handleSelectDecoration()}
          >
            Clear
          </button>
        </div>
        <button className="Ddg--SidePanel--infoBtn" onClick={handleOpenInfoModal} type="button">
          <IoInformationCircleOutline />
        </button>
      </div>
      <div className={`Ddg--SidePanel--Details ${selectedVertex && selectedSchema ? 'is-expanded' : ''}`}>
        {selectedVertex && selectedSchema && (
          <DetailsPanel
            decorationSchema={selectedSchema}
            operation={selectedVertex.operation}
            service={selectedVertex.service}
          />
        )}
      </div>
    </div>
  );
};

export default React.memo(SidePanel);
