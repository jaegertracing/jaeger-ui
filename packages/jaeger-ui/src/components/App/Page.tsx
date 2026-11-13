// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Layout } from 'antd';
import cx from 'classnames';
import { useLocation } from 'react-router-dom';

import TopNav from './TopNav';
import { useJaegerAssistantOptional } from './JaegerAssistantContext';
import { useJaegerAssistantConfigured } from '../../hooks/useJaegerAssistant';
import { useEmbeddedState } from '../../stores/embedded-store';
import { trackPageView } from '../../utils/tracking';
import DocumentTitle from '../../utils/documentTitle';

import './Page.css';

type TProps = {
  children: React.ReactNode;
};

const { Header, Content } = Layout;

// The dock pulls in the assistant-ui and ag-ui libraries, so it loads as a separate
// chunk and only for deployments where the backend advertises the assistant. A chunk
// that fails to load, for example from a stale index.html after a deploy, must not
// take the page down with it, so the failure degrades to a page without the dock.
// The importer is a parameter so that tests can exercise the failure path.
// The returned object is mutable: loadFailed is set to true when the import rejects,
// allowing the caller to surface a notice and offer a retry (by recreating the lazy
// component with a fresh call to makeLazyDock).
export function loadJaegerAssistantDock(importer = () => import('./JaegerAssistantPanel')): {
  promise: Promise<{ default: React.ComponentType }>;
  loadFailed: boolean;
} {
  const loader: { promise: Promise<{ default: React.ComponentType }>; loadFailed: boolean } = {
    loadFailed: false,
    promise: Promise.resolve({ default: () => null }),
  };
  loader.promise = importer().then(
    m => ({ default: m.JaegerAssistantDock }),
    (err: unknown) => {
      console.error('[jaeger-assistant] failed to load the assistant panel', err);
      loader.loadFailed = true;
      return { default: () => null };
    }
  );
  return loader;
}

// makeLazyDock creates a fresh React.lazy wrapping a new import attempt.
// Callers can recreate this to retry after a chunk-load failure, since React.lazy
// memoizes the first promise for the lifetime of the component instance.
function makeLazyDock() {
  const loader = loadJaegerAssistantDock();
  const LazyDock = React.lazy(() => loader.promise);
  return { LazyDock, loader };
}

// export for tests
export const PageImpl: React.FC<TProps> = props => {
  const embedded = useEmbeddedState();
  const { children } = props;
  const { pathname, search } = useLocation();
  const assistant = useJaegerAssistantOptional();
  const assistantConfigured = useJaegerAssistantConfigured();
  const assistantPanelOpen = Boolean(assistant?.panelOpen);
  const assistantEnvOn = !embedded && assistantConfigured;
  const assistantDockOpen = assistantEnvOn && assistantPanelOpen;

  // dockInstance holds the current lazy component and its loader state.
  // Replacing it (via retryDock) forces React to remount the Suspense boundary
  // with a fresh import attempt, allowing recovery from transient network errors.
  const [dockInstance, setDockInstance] = React.useState(makeLazyDock);
  const [dockLoadFailed, setDockLoadFailed] = React.useState(false);

  const retryDock = React.useCallback(() => {
    setDockLoadFailed(false);
    setDockInstance(makeLazyDock());
  }, []);

  // After the lazy promise settles, check whether the load failed so we can
  // show the notice. We wait for the promise so the state update happens after
  // the Suspense boundary has resolved and the component has mounted.
  React.useEffect(() => {
    dockInstance.loader.promise.then(() => {
      if (dockInstance.loader.loadFailed) {
        setDockLoadFailed(true);
      }
    });
  }, [dockInstance]);

  React.useEffect(() => {
    trackPageView(pathname, search);
  }, [pathname, search]);

  const contentCls = cx({
    'Page--content': true,
    'Page--content--no-embedded': !embedded,
  });

  const { LazyDock } = dockInstance;

  return (
    <div>
      <DocumentTitle title="Jaeger UI" />
      <Layout>
        {!embedded && (
          <Header className="Page--topNav">
            <TopNav />
          </Header>
        )}
        <Content className={contentCls}>
          {assistantEnvOn ? (
            <div className={cx('Page--assistantShell', assistantDockOpen && 'Page--assistantShell--open')}>
              <div className="Page--assistantMain">{children}</div>
              <React.Suspense fallback={null}>
                <LazyDock />
              </React.Suspense>
              {dockLoadFailed && (
                <div className="Page--assistantLoadError" data-testid="assistant-load-error">
                  {'The assistant failed to load. '}
                  <button className="Page--assistantLoadError--retry" type="button" onClick={retryDock}>
                    Try again
                  </button>
                </div>
              )}
            </div>
          ) : (
            children
          )}
        </Content>
      </Layout>
    </div>
  );
};
