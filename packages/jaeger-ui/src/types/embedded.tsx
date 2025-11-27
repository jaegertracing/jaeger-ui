// Copyright (c) 2018 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

type EmbeddedStateV0 = {
  version: 'v0';
  searchHideGraph: boolean;
  timeline: {
    collapseTitle: boolean;
    hideMinimap: boolean;
    hideSummary: boolean;
  };
};

export type EmbeddedState = EmbeddedStateV0;
