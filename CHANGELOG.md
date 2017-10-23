# Changes merged into master


## [#103](https://github.com/jaegertracing/jaeger-ui/pull/103) Add a changelog, dates to 2017-08-23

Non-functional change.

Adds a `CHANGELOG.md` document that details merged PRs.

Starts from late August, 2017.


## [#102](https://github.com/jaegertracing/jaeger-ui/pull/102) Resolve #96 - problem with Jest and watchman (2017-10-23)

Fix #96. Non-functional change.

Was able to reproduce #96 locally with:

```
yarn test -- --no-watchman
```

Issue stems from something specific to `jest` pre `jest@20.1.0-alpha.3`, [apparently](https://github.com/facebook/jest/issues/1767#issuecomment-313434888).

[A way to resolve the issue is](https://github.com/facebook/jest/issues/3436#issuecomment-302543205):

```
brew install watchman
```

Or, upgrading jest resolved the issue (when running with `--no-watchman`).

Only precarious thing about upgrading `jest` is it is now pinned in the repo instead of implied by `react-scripts` (the latest version of which uses `jest@20.0.4`). So, the install should be reverted when `react-scripts` comes around to having the newer version of `jest`.


## [#99](https://github.com/jaegertracing/jaeger-ui/pull/99) Apache license headers and a license check (2017-10-22)

Resolves #95

Headers are updated with the following script ([source](https://stackoverflow.com/questions/14107309/how-can-i-use-sed-to-replace-copyright-license-headers-in-my-source-files)):

```
#!/bin/sh

find src -name "*.js" -print0 | xargs -0 \
gsed -i -e '/Permission is hereby granted, free of charge, to any person obtaining a copy/,/THE SOFTWARE.$/c\
// Licensed under the Apache License, Version 2.0 (the "License");\
// you may not use this file except in compliance with the License.\
// You may obtain a copy of the License at\
//\
// http://www.apache.org/licenses/LICENSE-2.0\
//\
// Unless required by applicable law or agreed to in writing, software\
// distributed under the License is distributed on an "AS IS" BASIS,\
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\
// See the License for the specific language governing permissions and\
// limitations under the License.'
```


## [#97](https://github.com/jaegertracing/jaeger-ui/pull/97) Change to Apache license v.2 and add DCO / CONTRIBUTING.md (2017-10-22)

Per #95


## [#93](https://github.com/jaegertracing/jaeger-ui/pull/93) Keyboard shortcuts and minimap UX (2017-10-20)

![93-00-viewrange-ux-kbd](https://user-images.githubusercontent.com/2304337/31641055-2c00529e-b2b0-11e7-9ff2-34716ecfcc70.gif)

**Issues addressed:**

- [In-trace search should allow navigation between results](https://github.com/uber/jaeger-ui/issues/91) (partially addresses)
- Fix #89 - [trace view - Drag and release on timeline header row zooms into respective range](https://github.com/uber/jaeger-ui/issues/89)
- Fix #23 - [trace view - Navigate and zoom via minimap](https://github.com/uber/jaeger-ui/issues/23)
- Fix #22 - [trace view - Pan and zoom via keyboard shortcuts](https://github.com/uber/jaeger-ui/issues/22)

**Changes:**

- Revamped mouse UX on trace minimap
- Adjusted rendering of the trace minimap to make spans more visible in large traces
- Added visuals and mouse UX for zooming to trace timeline header row
- Added keyboard shortcuts:
  - Scroll up, down (`w`, `s`)
  - Scroll to next, previous visible span (`f`, `b`)
  - Pan left, right (`a` or `left`, `d` or `right`)
  - Large pan left, right (`shift+left`, `shift+right`)
  - Zoom in, out (`up`, `down`)
  - Large zoom in, out (`shift+up`, `shift+down`)



## [#84](https://github.com/jaegertracing/jaeger-ui/pull/84) Improve search dropdowns (2017-09-28)

- Fix #79 - Sort services and operations operations (case insensitive)
- Fix #31 - Filter options based on contains instead of starts with
- Fix #30 - Filter options based on case insensitive match



## [#78](https://github.com/jaegertracing/jaeger-ui/pull/78) Custom menu via /api/config with project links as defaults (2017-09-26)

Fix #44.

- Configurable top-level links
- Attempts to download `/api/config`, errors cause fall-back to default
- Supports one level of nesting
- Supports a `label` and `url` for each link
- Groups support a `label` and `items` where `items` is an array of links
- **All links open to external tabs**
- **Does not currently support a "selected" state for links**

Default menu config:

- About Jaeger
    - [GitHub](https://github.com/uber/jaeger)
    - [Docs](http://jaeger.readthedocs.io/en/latest/)
    - [Twitter](https://twitter.com/JaegerTracing)
    - [Discussion Group](https://groups.google.com/forum/#!forum/jaeger-tracing)
    - [Gitter.im](https://gitter.im/jaegertracing/Lobby)
    - [Blog](https://medium.com/jaegertracing/)
- ~Create a ticket~

**Screenshot updated**
![screen shot 2017-09-21 at 2 37 09 pm](https://user-images.githubusercontent.com/2304337/30712608-94d114e6-9eda-11e7-952a-b44a09a7e967.png)



## [#81](https://github.com/jaegertracing/jaeger-ui/pull/81) Fix Google Analytics tracking (2017-09-26)

Fix #80.

Created an HOC that checks the state of the router and tracks a page-view whenever the URL or query string changes. This is necessary because react-router v4 [did away with the onUpdate](https://github.com/ReactTraining/react-router/blob/master/packages/react-router/docs/guides/migrating.md#on-properties) lifecycle event.



## [#83](https://github.com/jaegertracing/jaeger-ui/pull/83) Fix traceIDs query params clobbering form search (2017-09-26)

Fix #82.

Changed functionality is: traceIDs are ignored when the search form is triggering the search.



## [#77](https://github.com/jaegertracing/jaeger-ui/pull/77) Fix trace mini-map blurry when < 60 spans (2017-09-21)

Fix #76.

Before: <img width="931" alt="screen shot 2017-09-20 at 8 25 08 pm" src="https://user-images.githubusercontent.com/2304337/30673937-a400f3aa-9e44-11e7-8d16-a6bb7e025b53.png">

After: <img width="929" alt="screen shot 2017-09-20 at 8 44 45 pm" src="https://user-images.githubusercontent.com/2304337/30673929-96652bc6-9e44-11e7-836e-86e32fce0d89.png">



## [#74](https://github.com/jaegertracing/jaeger-ui/pull/74) Make left column adjustable in trace detail (2017-09-20)

Fix #63 .

Column width of span name is now adjustable, within the bounds of [15%, 85%]. It's not clear in the gif, below, but the reduced opacity highlight color is present when dragging the column in either direction.

![64-01-resize-left-column](https://user-images.githubusercontent.com/2304337/30423428-9b2808e2-98f7-11e7-9fb0-559d6dbc4268.gif)



## [#72](https://github.com/jaegertracing/jaeger-ui/pull/72) Use canvas instead of SVG for trace mini-map (2017-09-17)

Fix #61.

- Render span graph via canvas instead of SVG
- Zoom range changed to [0, 1], e.g. time and trace agnostic (allowed removal of some utils)
- "Timeline" -> 0ms
- Use props instead of context to provide span graph with viewing range
- Move all span graph related classes into same folder
- Misc CSS cleanup



## [#71](https://github.com/jaegertracing/jaeger-ui/pull/71) [trave view] Mouseover expands truncated text to full length in left column (2017-09-14)

Fix #65.

See attached screenshot (text is blurry due to scaling down retina dpi).

Mouseover in the span name column expands the service/operation text if it is truncated.

Also, fixed regression in header for left column ("Span Name" -> "Service & Operation").

![span-name-hover-marked](https://user-images.githubusercontent.com/2304337/30237887-ac93a510-9509-11e7-9842-ecf96e928da0.png)




## [#68](https://github.com/jaegertracing/jaeger-ui/pull/68) Virtualized scrolling for trace detail view (2017-09-08)

### Description

Started with [react-virtualized](https://github.com/bvaughn/react-virtualized), but issues around flashes of un-rendered regions while scrolling and dynamically sized / periodically changing content lead to revival of old project that essentially does the same thing: `src/components/TracePage/TraceTimelineViewer/ListView/*`.

`ListView` is more optimized to our needs (and less versatile). These optimizations include:

- Taking the approach of rendering less often and larger amounts of items per render
- Optimizing for scrolling in both directions instead of only the current scroll direction
- Having a concept of minimum and regular ["overscan"](https://github.com/bvaughn/react-virtualized/blob/master/docs/overscanUsage.md), which means if the currently rendered list of items meets a minimum buffer, don't render more, but if it doesn't, then render enough meet the minimum buffer and some extra, as well

### Performance

#### Flashes of un-rendered content

- Smaller traces (~500 spans or less)
  - Not really an issue in prod or PR 68
- Larger traces (~5k spans)
  - PR 68 is on par with prod, possible slightly better
  - Still fairly easy to see flashes of un-rendered content
  - Issue was quite aggravated with react-virtualized (hence, a custom solution is implemented)
- Massive traces (~15k spans or more)
  - Flashes of un-rendered content is a significant problem for the release currently in prod
  - PR 68 performance doesn't vary much between 5k and 15k+ traces


#### Performance on a 5,000 span trace

_Sample size of 1._

- /trace/8d224b61611c807f
- Duration: 5.83s
- Services: 11
- Depth: 11
- Spans: 5,013
- Performance recording enabled (degrades performance)

**Initial loading (in milliseconds)**

Task | Prod - PR 53 (ms) | PR 68 (ms) | Ratio | Reduction
-- | -- | -- | -- | --
**Total** | **6,964** | **1,899** | **0.27** | **73%**
Loading | 45 | 32 ||
**Scripting** | **3,051** | **1,198** | **0.39** | **61%**
**Rendering** | **3,126** | **430** | **0.14** | **86%**
Painting | 116 | 34 ||
Other | 626 | 205 ||

Note: Ticket #61 (Use canvas instead of SVG for trace mini-map) will likely further improve initial loading.

**Expanding details**

- Prod : 3753 ms
- PR 68: 418 ms (0.11)

**Text search ("gopro")**

- Prod : 5496 ms
- PR 68: 227 ms (0.04)

#### Performance on a 42,000 span trace

_Sample size of 1._

- /trace/c440ed36
- Duration: 3,393.93s
- Services: 25
- Depth: 11
- Total Spans: 42,499
- Performance recording enabled (degrades performance)

**Initial loading (in milliseconds)**

Task | Prod - PR 53 (ms) | PR 68 (ms) | Ratio | Reduction
-- | -- | -- | -- | --
**Total** | **86,792** | **7,105** | **0.08** | **92%**
**Scripting** | **28,273** | **5,596** | **0.20** | **80%**
**Rendering** | **57,197** | **1,424** | **0.03** | **97%**
Painting | 1,321 | 85 | 0.06 | 96%


**Expanding details**

- Prod : 39,500 ms
- PR 68: 465 ms (0.01)

**Text search**

- Prod : 43,728 ms
- PR 68: 757 ms (0.02)



## [#64](https://github.com/jaegertracing/jaeger-ui/pull/64) Reorganize span detail components (2017-08-25)

- Split sub-components of `SpanDetail` out into separate files.
- Move styles into CSS (addresses [this PR comment](https://github.com/uber/jaeger-ui/pull/53#discussion_r134318660))
- Misc style and DOM tweaks  (see attached screenshot)
  - Expanded table styling
  - Tag summary styling
  - Background on hover of expandable / collapsable elements
  - Debug info

![span-detail-pr-marked](https://user-images.githubusercontent.com/2304337/29575771-870667b2-8733-11e7-8af5-1d804cf273a2.png)



## [#67](https://github.com/jaegertracing/jaeger-ui/pull/67) Change to use node >= 6 via .nvmrc (2017-08-24)

Upgrade to latest ([#53](https://github.com/jaegertracing/jaeger-ui/pull/53)) requires node >= 6.



## [#53](https://github.com/jaegertracing/jaeger-ui/pull/53) Refactor trace detail (2017-08-23)

#### SpanGraph

- Fix #49 - Span position in graph doesn't not match its position in the detail
- Ticks in span graph made to match trace detail (in number and formatting)
- Span graph refactored to trim down files and DOM elements
- Styling adjustments

#### TracePageHeader

- `trace` prop removed
- Added props for various title values instead of deriving them from `trace`

#### Trace Detail

- Several components split out into separate files
- `transformTrace` to use already created span tree to determine span depth
- Fix #59 - "Span Name" to "Service & Operation"

#### Span Bar / Detail

- Fix uber/jaeger#326: extraneous scrollbars in trace views
- Fix #55: Some tags were not being rendered due to clashing keys (observed in a log message)
- Tall content scrolls via entire table instead of single table cell
- Horizontal scrolling for wide content (e.g. long log values) (Fix #58)
- Full width of the header is clickable for tags, process, and logs headers (instead of header text, only)
- Service and endpoint are shown on mouseover anywhere in span bar row
- Label on span bars no longer off-screen
- Clip or hide span bars when zoomed in (instead of flush left)
- Add shadow to left / right boundary when span bar view is clipped
- Darkened span name column to differentiate from span bar section
- Span detail left column color coded by service
- Clicking span detail left column collapses detail
- Clicking anywhere left of parent span name toggles children visibility
- Prevent collision of logs in log entries table

#### SearchTracePage
- Scatterplot dots are sized based on number of spans
- Scatterplot dots mouseover shows trace name

#### Misc
- Several TraceTimelineViewer / utils removed
- `TreeNode` `.walk()` method can now be used to calculate the depth, avoiding use of less efficient `.getPath()`
- Removed several `console.error` warnings caused by React key issues
- `yarn upgrade --latest`
- Removed `react-sticky`
- Fix #42 - Support URL prefix via homepage in package.json
- Maintenance of tests
- Cleanup unused vars, imports
- Refine utils
- Many styles moved to CSS



## Before 2017-08-23

[Older changes are not logged here.](https://www.youtube.com/watch?v=NoAzpa1x7jU&feature=youtu.be&t=107)
