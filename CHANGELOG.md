# Releases

## Next (Unreleased)

### Enhancements

* **Trace detail:** Log Markers on Spans ([Fix #119](https://github.com/jaegertracing/jaeger-ui/issues/119)) ([@sfriberg](https://github.com/sfriberg) in [#309](https://github.com/jaegertracing/jaeger-ui/pull/309))

## v1.0.1 (February 15, 2019)

### Fixes

* **Trace detail:** Fix [#323](https://github.com/jaegertracing/jaeger-ui/issues/323) - Browser back button of trace page not working if plot is clicked ([@tacigar](https://github.com/tacigar) in [#324](https://github.com/jaegertracing/jaeger-ui/pull/324))

* **Search:** Fix [#325](https://github.com/jaegertracing/jaeger-ui/issues/325) - JS errors on search form dropdowns ([@tiffon](https://github.com/tiffon) in [#329](https://github.com/jaegertracing/jaeger-ui/pull/329))

## v1.0.0 (January 18, 2019)

### Enhancements

* **Embedded mode:** Revisions to search and trace detail embed mode ([@tiffon](https://github.com/tiffon) in [#286](https://github.com/jaegertracing/jaeger-ui/pull/286))

  * This release establishes our commitment to the `uiEmbed=v0` API
  * A big thanks to [@aljesusg](https://github.com/aljesusg) for getting this off the ground in [#263](https://github.com/jaegertracing/jaeger-ui/pull/263)! :tada:

* **Trace detail:** Add a tree view (aka Trace Graph) to the TracePage ([@copa2](https://github.com/copa2) in [#276](https://github.com/jaegertracing/jaeger-ui/pull/276))

  * Stability: Experimental – See [#293](https://github.com/jaegertracing/jaeger-ui/issues/293) for discussion.
  * Big thanks to [@copa2](https://github.com/copa2) for the contribution! :tada:
  * **We would love to hear feedback!**

* **Trace detail:** Add a copy icon to entries in KeyValuesTable ([#204](https://github.com/jaegertracing/jaeger-ui/issues/204)) ([@everett980](https://github.com/everett980) in [#292](https://github.com/jaegertracing/jaeger-ui/pull/292))

* **Trace detail:** Add a Button to Reset Viewing Layer Zoom ([#215](https://github.com/jaegertracing/jaeger-ui/issues/215)) ([@everett980](https://github.com/everett980) in [#290](https://github.com/jaegertracing/jaeger-ui/pull/290))

* **Trace detail:** Add indent guides to trace timeline view ([#172](https://github.com/jaegertracing/jaeger-ui/issues/172)) ([@everett980](https://github.com/everett980) in [#297](https://github.com/jaegertracing/jaeger-ui/pull/297))

* **Search:** Add popover and prevent submit if duration params are invalid ([#244](https://github.com/jaegertracing/jaeger-ui/issues/244)) ([@everett980](https://github.com/everett980) in [#291](https://github.com/jaegertracing/jaeger-ui/pull/291))

* **Trace comparison:** Add link to timeline view from comparison view and selection ([@everett980](https://github.com/everett980) in [#313](https://github.com/jaegertracing/jaeger-ui/pull/313))

* **Trace DAGs:** Add the ability to copy node data in the Trace Graph and Trace Comparison views ([@everett980](https://github.com/everett980) in [#312](https://github.com/jaegertracing/jaeger-ui/pull/312))

* **Menu configuration:** Ability to open additional menu links in same tab (Resolves [#275](https://github.com/jaegertracing/jaeger-ui/issues/275)) ([@zablvit](https://github.com/zablvit) in [#278](https://github.com/jaegertracing/jaeger-ui/pull/278))

### Fixes

* **Trace detail:** Fix [#269](https://github.com/jaegertracing/jaeger-ui/issues/269) - Fix column resizer overlays trace header ([@tiffon](https://github.com/tiffon) in [#280](https://github.com/jaegertracing/jaeger-ui/pull/280))

### Chores & Maintenance

* **Dev docs:** Update a few links to the new website ([@ledor473](https://github.com/ledor473) in [#287](https://github.com/jaegertracing/jaeger-ui/pull/287))

* **Jaeger UI codebase:** Update create-react-app to 2.1.2 ([@tiffon](https://github.com/tiffon) in [#302](https://github.com/jaegertracing/jaeger-ui/pull/302))

## Changes released in Jaeger 1.8.2 and earlier

These changes are listed in chronological order by the date they were merged into master.

### [#263](https://github.com/jaegertracing/jaeger-ui/pull/263) Embedded components (SearchTraces and Tracepage ) ([@aljesusg](https://github.com/aljesusg))

### [#274](https://github.com/jaegertracing/jaeger-ui/pull/274) Fix rendering X axis in TraceResultsScatterPlot - pass milliseconds to moment.js ([@istrel](https://github.com/istrel))

### [#266](https://github.com/jaegertracing/jaeger-ui/pull/266) Use correct duration format for scatter plot ([@tiffon](https://github.com/tiffon))

### [#264](https://github.com/jaegertracing/jaeger-ui/pull/264) Fix collapse all issues ([@tiffon](https://github.com/tiffon))

### [#265](https://github.com/jaegertracing/jaeger-ui/pull/265) Fix Readme Error for setup local jaeger service ([@clyang82](https://github.com/clyang82))

### [#238](https://github.com/jaegertracing/jaeger-ui/pull/238) Span Search - Highlight search results ([@davit-y](https://github.com/davit-y))

### [#237](https://github.com/jaegertracing/jaeger-ui/pull/237) Span Search - Improve search logic ([@davit-y](https://github.com/davit-y))

### [#257](https://github.com/jaegertracing/jaeger-ui/pull/257) Use a sanely sized canvas for the span mini-map ([@tiffon](https://github.com/tiffon))

### [#234](https://github.com/jaegertracing/jaeger-ui/pull/234) Span Search - Add result count, navigation and clear buttons ([@davit-y](https://github.com/davit-y))

### [#228](https://github.com/jaegertracing/jaeger-ui/pull/228) Trace diffs ([@tiffon](https://github.com/tiffon))

### [#223](https://github.com/jaegertracing/jaeger-ui/pull/223) Add links to make values in tags or log properties clickable ([@divdavem](https://github.com/divdavem))

### [#230](https://github.com/jaegertracing/jaeger-ui/pull/230) Fix CollapseOne action ([@yuribit](https://github.com/yuribit))

### [#224](https://github.com/jaegertracing/jaeger-ui/pull/224) Directed graph React component ([@tiffon](https://github.com/tiffon))

### [#221](https://github.com/jaegertracing/jaeger-ui/pull/221) Timeline Expand and Collapse Features

* Partially addresses [#160](https://github.com/jaegertracing/jaeger-ui/issues/160) - Heuristics for collapsing spans

### [#191](https://github.com/jaegertracing/jaeger-ui/pull/191) Add GA event tracking for actions in trace view

* Partially addresses [#157](https://github.com/jaegertracing/jaeger-ui/issues/157) - Enhanced Google Analytics integration

### [#198](https://github.com/jaegertracing/jaeger-ui/pull/198) Use `<base>` and config webpack at runtime to allow path prefix

* Fix [#42](https://github.com/jaegertracing/jaeger-ui/issues/42) - No support for Jaeger behind a reverse proxy

### [#195](https://github.com/jaegertracing/jaeger-ui/pull/195) Handle Error stored in redux trace.traces

* Fix [#166](https://github.com/jaegertracing/jaeger-ui/issues/166) - JS error on search page after viewing 404 trace

### [#192](https://github.com/jaegertracing/jaeger-ui/pull/192) Change fallback trace name to be more informative

* Fix [#190](https://github.com/jaegertracing/jaeger-ui/issues/190) - Change `cannot-find-trace-name` to `trace-without-root-span`

### [#189](https://github.com/jaegertracing/jaeger-ui/pull/189) Track JS errors in GA

* Fix [#39](https://github.com/jaegertracing/jaeger-ui/issues/39) - Log js client side errors in our server side logs

### [#179](https://github.com/jaegertracing/jaeger-ui/pull/179) Resolve perf issues on the search page

* Fix [#178](https://github.com/jaegertracing/jaeger-ui/issues/178) - Performance regression - Search page

### [#169](https://github.com/jaegertracing/jaeger-ui/pull/169) Use Ant Design instead of Semantic UI

* Fix [#164](https://github.com/jaegertracing/jaeger-ui/issues/164) - Use Ant Design instead of Semantic UI
* Fix [#165](https://github.com/jaegertracing/jaeger-ui/issues/165) - Search results are shown without a date
* Fix [#69](https://github.com/jaegertracing/jaeger-ui/issues/69) - Missing endpoints in jaeger ui dropdown

### [#168](https://github.com/jaegertracing/jaeger-ui/pull/168) Fix 2 digit lookback (12h, 24h) parsing

* Fix [#167](https://github.com/jaegertracing/jaeger-ui/issues/167) - 12 and 24 hour search lookbacks not converted to start timestamp correctly

### [#162](https://github.com/jaegertracing/jaeger-ui/pull/162) Only JSON.parse JSON strings in tags/logs values

* Fix [#146](https://github.com/jaegertracing/jaeger-ui/issues/146) - Tags with string type displayed as integers in UI, bigint js problem

### [#161](https://github.com/jaegertracing/jaeger-ui/pull/161) Add timezone tooltip to custom lookback form-field

* Fix [#154](https://github.com/jaegertracing/jaeger-ui/issues/154) - Explain time zone of the lookback parameter

### [#153](https://github.com/jaegertracing/jaeger-ui/pull/153) Add View Option for raw/unadjusted trace

* Fix [#152](https://github.com/jaegertracing/jaeger-ui/issues/152) - Add View Option for raw/unadjusted trace

### [#147](https://github.com/jaegertracing/jaeger-ui/pull/147) Use logfmt for search tag input format

* Fix [#145](https://github.com/jaegertracing/jaeger-ui/issues/145) - Support logfmt for tags text input in the search form
* Fix [#11](https://github.com/jaegertracing/jaeger-ui/issues/11) - Document allowed operators on tag search

### [#143](https://github.com/jaegertracing/jaeger-ui/pull/143) Add a config value for the DAG cutoff

* Fix [#130](https://github.com/jaegertracing/jaeger-ui/issues/130) - Why maximum dependency length is set to 100 in DAG?

### [#141](https://github.com/jaegertracing/jaeger-ui/pull/141) `package.json#proxy` should proxy all `/api` requests

* Fix [#139](https://github.com/jaegertracing/jaeger-ui/issues/139) - Anyone konw how to open 16686 port?

### [#140](https://github.com/jaegertracing/jaeger-ui/pull/140) Encode service names in API calls

* Fix [#138](https://github.com/jaegertracing/jaeger-ui/issues/138) - Cannot find operations if there is '/' char in serviceName

### [#136](https://github.com/jaegertracing/jaeger-ui/pull/136) Fix endless trace HTTP requests

* Fix [#128](https://github.com/jaegertracing/jaeger-ui/issues/128) - When trace id is invalid, Jaeger UI send this request forever

### [#134](https://github.com/jaegertracing/jaeger-ui/pull/134) Fix trace name resolution

* Fix [#117](https://github.com/jaegertracing/jaeger-ui/issues/117) - traceName relies on traceID to equal spanID
* Fix [#129](https://github.com/jaegertracing/jaeger-ui/issues/129) - ¯*( ツ )*/¯ is not very clear

### [#133](https://github.com/jaegertracing/jaeger-ui/pull/133) Better HTTP error messages

### [#122](https://github.com/jaegertracing/jaeger-ui/pull/122) Make dependencies tab configurable

### [#120](https://github.com/jaegertracing/jaeger-ui/pull/120) Add keyboard shortcut help modal

### [#118](https://github.com/jaegertracing/jaeger-ui/pull/118) Handle `FOLLOWS_FROM` reference type

* Fix [#115](https://github.com/jaegertracing/jaeger-ui/issues/115) - Rendering traces with spans containing a 'FOLLOWS_FROM' reference seems broken

### [#110](https://github.com/jaegertracing/jaeger-ui/pull/110) Fix browser back button not working correctly

* Fix [#94](https://github.com/jaegertracing/jaeger-ui/issues/94) - Browser back button not working correctly

### [#107](https://github.com/jaegertracing/jaeger-ui/pull/107) Embed UI config

The query service can embed custom UI configuration into `index.html`, speeding up the initial page load and allowing custom Google Analytics tracking IDs without requiring the UI bundle to be regenerated. This also lays the ground work for other UI configuration scenarios, in the future.

### [#97](https://github.com/jaegertracing/jaeger-ui/pull/97) Change to Apache license v.2 and add DCO / CONTRIBUTING.md

### [#93](https://github.com/jaegertracing/jaeger-ui/pull/93) Keyboard shortcuts and minimap UX

* Fix [#89](https://github.com/uber/jaeger-ui/issues/89) - [trace view] Drag and release on timeline header row zooms into respective range
* Fix [#23](https://github.com/uber/jaeger-ui/issues/23) - [trace view] Navigate and zoom via minimap
* Fix [#22](https://github.com/uber/jaeger-ui/issues/22) - [trace view] Pan and zoom via keyboard shortcuts

### [#84](https://github.com/jaegertracing/jaeger-ui/pull/84) Improve search dropdowns

* Fix [#79](https://github.com/uber/jaeger-ui/issues/79) - Sort services and operations operations (case insensitive)
* Fix [#31](https://github.com/uber/jaeger-ui/issues/31) - Filter options based on contains instead of starts with
* Fix [#30](https://github.com/uber/jaeger-ui/issues/30) - Filter options based on case insensitive match

### [#78](https://github.com/jaegertracing/jaeger-ui/pull/78) Custom menu via /api/config with project links as defaults

* Fix [#44](https://github.com/uber/jaeger-ui/issues/44) - Add configurable, persistent links to the header
* **Support for this is WIP in query service**

### [#81](https://github.com/jaegertracing/jaeger-ui/pull/81) Fix Google Analytics tracking

### [#77](https://github.com/jaegertracing/jaeger-ui/pull/77) Fix trace mini-map blurry when < 60 spans

### [#74](https://github.com/jaegertracing/jaeger-ui/pull/74) Make left column adjustable in trace detail

### [#71](https://github.com/jaegertracing/jaeger-ui/pull/71) [trave view] Mouseover expands truncated text to full length in left column

### [#68](https://github.com/jaegertracing/jaeger-ui/pull/68) Virtualized scrolling for trace detail view

* Performance improved for initial loading, expanding span details, text search and scrolling

### [#53](https://github.com/jaegertracing/jaeger-ui/pull/53) Refactor trace detail

* Partial fix for [#42](https://github.com/uber/jaeger-ui/issues/42) - Support URL prefix via homepage in package.json
* Scatterplot dots are sized based on number of spans
* Scatterplot dots mouseover shows trace name
* Clicking span detail left column collapses detail
* Clicking anywhere left of parent span name toggles children visibility
* Clip or hide span bars when zoomed in (instead of flush left)
* Label on span bars no longer off-screen
* Full width of the header is clickable for tags, process, and logs headers (instead of header text, only)
* Horizontal scrolling for wide content (e.g. long log values) (Fix [#58](https://github.com/uber/jaeger-ui/issues/58))
* Tall content scrolls via entire table instead of single table cell
* Fix [#55](https://github.com/uber/jaeger-ui/issues/55) - Some tags were not being rendered due to clashing keys (observed in a log message)
* Fix [jaegertracing/jaeger#326](https://github.com/jaegertracing/jaeger/issues/326) - extraneous scrollbars in trace views
* Ticks in span graph made to match trace detail (in number and formatting)
* Fix [#49](https://github.com/uber/jaeger-ui/issues/42) - Span position in graph doesn't not match its position in the detail

### [Changes from before 2017-08-23 are not logged here](https://www.youtube.com/watch?v=NoAzpa1x7jU&feature=youtu.be&t=107)
