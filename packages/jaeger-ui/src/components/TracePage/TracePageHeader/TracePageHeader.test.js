// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import TracePageHeaderWithRef, {
  TracePageHeaderFn as TracePageHeader,
  HEADER_ITEMS,
} from './TracePageHeader';
import traceGenerator from '../../../demo/trace-generators';
import { getTraceName } from '../../../model/trace-viewer';
import transformTraceData from '../../../model/transform-trace-data';
import { ETraceViewType } from '../types';

jest.mock('./AltViewOptions', () => {
  return function MockAltViewOptions(props) {
    return <div data-testid="alt-view-options" {...props} />;
  };
});

jest.mock('./KeyboardShortcutsHelp', () => {
  return function MockKeyboardShortcutsHelp(props) {
    return <div data-testid="keyboard-shortcuts-help" {...props} />;
  };
});

jest.mock('./SpanGraph', () => {
  return function MockSpanGraph(props) {
    return <div data-testid="span-graph" {...props} />;
  };
});

jest.mock('./TracePageSearchBar', () => {
  return function MockTracePageSearchBar(props) {
    return <div data-testid="trace-page-search-bar" {...props} />;
  };
});

jest.mock('../../common/LabeledList', () => {
  return function MockLabeledList(props) {
    return (
      <div data-testid="labeled-list" className={props.className}>
        {props.items &&
          props.items.map((item, index) => (
            <div key={item.key || index} className="horizontal item" data-testid={`header-item-${item.key}`}>
              <span>{item.label}</span>
              <span>{item.value}</span>
            </div>
          ))}
      </div>
    );
  };
});

jest.mock('../../common/TraceName', () => {
  return function MockTraceName({ traceName }) {
    return (
      <span data-testid="trace-name" data-trace-name={traceName}>
        {traceName}
      </span>
    );
  };
});

jest.mock('../../common/ExternalLinks', () => {
  return function MockExternalLinks({ links }) {
    return <div data-testid="external-links" data-links-count={links.length} />;
  };
});

jest.mock('../../common/NewWindowIcon', () => {
  return function MockNewWindowIcon({ isLarge }) {
    return <span data-testid="new-window-icon" data-large={isLarge} />;
  };
});

jest.mock('../../../model/link-patterns', () => ({
  getTraceLinks: jest.fn(() => []),
}));

const renderWithRouter = component => {
  return render(<MemoryRouter>{component}</MemoryRouter>);
};

describe('<TracePageHeader>', () => {
  const trace = transformTraceData(traceGenerator.trace({}));
  const mockRef = React.createRef();

  const defaultProps = {
    trace,
    canCollapse: false,
    clearSearch: jest.fn(),
    focusUiFindMatches: jest.fn(),
    hideMap: false,
    hideSummary: false,
    linkToStandalone: '/standalone',
    nextResult: jest.fn(),
    onArchiveClicked: jest.fn(),
    onSlimViewClicked: jest.fn(),
    onTraceViewChange: jest.fn(),
    prevResult: jest.fn(),
    resultCount: 0,
    showArchiveButton: false,
    showShortcutsHelp: false,
    showStandaloneLink: false,
    disableJsonView: false,
    showViewOptions: false,
    slimView: false,
    textFilter: '',
    toSearch: null,
    viewType: ETraceViewType.TraceTimelineViewer,
    updateNextViewRangeTime: jest.fn(),
    updateViewRangeTime: jest.fn(),
    viewRange: { time: { current: [0, 1] } },
    forwardedRef: mockRef,
    updateTextFilter: jest.fn(),
  };

  let wrapper;

  beforeEach(() => {
    jest.clearAllMocks();
    wrapper = renderWithRouter(<TracePageHeader {...defaultProps} />);
  });

  it('renders a <header />', () => {
    const headers = document.querySelectorAll('header');
    expect(headers).toHaveLength(1);
  });

  it('renders collapsible title and triggers onSlimViewClicked on click', () => {
    const onSlimViewClicked = jest.fn();

    renderWithRouter(<TracePageHeader {...defaultProps} canCollapse onSlimViewClicked={onSlimViewClicked} />);

    const clickableTitle = screen.getByRole('switch');
    expect(clickableTitle).toBeInTheDocument();

    clickableTitle.click();
    expect(onSlimViewClicked).toHaveBeenCalledTimes(1);
  });

  it('renders an empty <div> if a trace is not present', () => {
    const { container } = renderWithRouter(<TracePageHeader {...defaultProps} trace={null} />);
    expect(container.children).toHaveLength(0);
  });

  it('renders the trace title', () => {
    const traceNameElement = screen.getByTestId('trace-name');
    expect(traceNameElement).toHaveAttribute('data-trace-name', getTraceName(trace.spans));
  });

  it('renders the header items', () => {
    HEADER_ITEMS.forEach((item, i) => {
      const headerItem = screen.getByTestId(`header-item-${item.key}`);
      expect(headerItem).toHaveClass('horizontal');
      expect(headerItem).toHaveClass('item');
      expect(headerItem).toHaveTextContent(item.label);

      const renderedValue = item.renderer(defaultProps.trace);
      if (typeof renderedValue === 'string' || typeof renderedValue === 'number') {
        expect(headerItem).toHaveTextContent(renderedValue.toString());
      }
    });
  });

  it('renders a <SpanGraph>', () => {
    const spanGraphs = screen.getAllByTestId('span-graph');
    expect(spanGraphs).toHaveLength(1);
  });

  describe('observes the visibility toggles for various UX elements', () => {
    it('hides the minimap when hideMap === true', () => {
      expect(screen.getByTestId('span-graph')).toBeInTheDocument();

      wrapper.rerender(
        <MemoryRouter>
          <TracePageHeader {...defaultProps} hideMap />
        </MemoryRouter>
      );
      expect(screen.queryByTestId('span-graph')).not.toBeInTheDocument();
    });

    it('hides the summary when hideSummary === true', () => {
      expect(screen.getByTestId('labeled-list')).toBeInTheDocument();

      wrapper.rerender(
        <MemoryRouter>
          <TracePageHeader {...defaultProps} hideSummary />
        </MemoryRouter>
      );
      expect(screen.queryByTestId('labeled-list')).not.toBeInTheDocument();
    });

    it('toggles the archive button', () => {
      const onArchiveClicked = jest.fn();
      wrapper.rerender(
        <MemoryRouter>
          <TracePageHeader {...defaultProps} onArchiveClicked={onArchiveClicked} showArchiveButton />
        </MemoryRouter>
      );

      const archiveButtons = screen.getAllByText('Archive Trace');
      expect(archiveButtons).toHaveLength(1);

      wrapper.rerender(
        <MemoryRouter>
          <TracePageHeader {...defaultProps} onArchiveClicked={onArchiveClicked} showArchiveButton={false} />
        </MemoryRouter>
      );
      expect(screen.queryByText('Archive Trace')).not.toBeInTheDocument();
    });

    it('toggles <KeyboardShortcutsHelp />', () => {
      wrapper.rerender(
        <MemoryRouter>
          <TracePageHeader {...defaultProps} showShortcutsHelp />
        </MemoryRouter>
      );
      expect(screen.getByTestId('keyboard-shortcuts-help')).toBeInTheDocument();

      wrapper.rerender(
        <MemoryRouter>
          <TracePageHeader {...defaultProps} showShortcutsHelp={false} />
        </MemoryRouter>
      );
      expect(screen.queryByTestId('keyboard-shortcuts-help')).not.toBeInTheDocument();
    });

    it('toggles <AltViewOptions />', () => {
      wrapper.rerender(
        <MemoryRouter>
          <TracePageHeader {...defaultProps} showViewOptions />
        </MemoryRouter>
      );
      expect(screen.getByTestId('alt-view-options')).toBeInTheDocument();

      wrapper.rerender(
        <MemoryRouter>
          <TracePageHeader {...defaultProps} showViewOptions={false} />
        </MemoryRouter>
      );
      expect(screen.queryByTestId('alt-view-options')).not.toBeInTheDocument();
    });

    it('renders the link to search', () => {
      expect(screen.queryAllByRole('link')).toHaveLength(0);

      const toSearch = 'some-link';
      wrapper.rerender(
        <MemoryRouter>
          <TracePageHeader {...defaultProps} toSearch={toSearch} />
        </MemoryRouter>
      );
      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(1);
      expect(links[0]).toHaveAttribute('href', `/${toSearch}`);
    });

    it('toggles the standalone link', () => {
      const linkToStandalone = 'some-link';
      wrapper.rerender(
        <MemoryRouter>
          <TracePageHeader {...defaultProps} linkToStandalone={linkToStandalone} showStandaloneLink />
        </MemoryRouter>
      );

      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(1);
      expect(links[0]).toHaveAttribute('href', `/${linkToStandalone}`);

      wrapper.rerender(
        <MemoryRouter>
          <TracePageHeader {...defaultProps} linkToStandalone={linkToStandalone} showStandaloneLink={false} />
        </MemoryRouter>
      );
      expect(screen.queryAllByRole('link')).toHaveLength(0);
    });
  });
  describe('<TracePageHeaderWithRef>', () => {
    it('renders default export (forwardRef wrapper) correctly', () => {
      const props = {
        trace,
        canCollapse: false,
        clearSearch: jest.fn(),
        focusUiFindMatches: jest.fn(),
        hideMap: false,
        hideSummary: false,
        linkToStandalone: '/standalone',
        nextResult: jest.fn(),
        onArchiveClicked: jest.fn(),
        onSlimViewClicked: jest.fn(),
        onTraceViewChange: jest.fn(),
        prevResult: jest.fn(),
        resultCount: 0,
        showArchiveButton: false,
        showShortcutsHelp: false,
        showStandaloneLink: false,
        disableJsonView: false,
        showViewOptions: false,
        slimView: false,
        textFilter: '',
        toSearch: null,
        viewType: ETraceViewType.TraceTimelineViewer,
        updateNextViewRangeTime: jest.fn(),
        updateViewRangeTime: jest.fn(),
        viewRange: { time: { current: [0, 1] } },
        ref: mockRef,
      };

      renderWithRouter(<TracePageHeaderWithRef {...props} />);
      expect(
        screen
          .getAllByTestId('trace-name')
          .some(el => el.getAttribute('data-trace-name') === props.trace.traceName)
      ).toBe(true);
    });
  });
});
