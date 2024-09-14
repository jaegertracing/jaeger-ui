# Releases

<details>
<summary>next release template</summary>

## v1.xx.0 (202x-xx-xx)

Run `make changelog` to generate content.

</details>

## v1.61.0 (2024-09-14)

Dependencies updates only.

## v1.60.0 (2024-08-05)

#### 🐞 Bug fixes, Minor Improvements

* Allow uploading json-per-line otlp data ([@BenzeneAlcohol](https://github.com/BenzeneAlcohol) in [#2380](https://github.com/jaegertracing/jaeger-ui/pull/2380))

## v1.59.0 (2024-07-09)

#### 🐞 Bug fixes, Minor Improvements

* Add escaped example to tag search help popup ([@yurishkuro](https://github.com/yurishkuro) in [#2354](https://github.com/jaegertracing/jaeger-ui/pull/2354))

## v1.58.0 (2024-06-11)

#### 🐞 Bug fixes, Minor Improvements

* Document how to debug unit tests in vscode ([@RISHIKESHk07](https://github.com/RISHIKESHk07) in [#2297](https://github.com/jaegertracing/jaeger-ui/pull/2297))

#### 👷 CI Improvements

* Github actions added to block prs from fork/main branch ([@varshith257](https://github.com/varshith257) in [#2296](https://github.com/jaegertracing/jaeger-ui/pull/2296))

## v1.57.0 (2024-05-01)

Note: the version has been bumped to be inline with the backend.

More details: https://github.com/jaegertracing/jaeger/issues/5323

### 🐞 Bug fixes, Minor Improvements

* Improve trace page title with data and unique emoji (fixes #2256) ([@nox](https://github.com/nox) in [#2275](https://github.com/jaegertracing/jaeger-ui/pull/2275))
* Require node version 20+ ([@Baalekshan](https://github.com/Baalekshan) in [#2274](https://github.com/jaegertracing/jaeger-ui/pull/2274))

## v1.40.0 (2024-04-02)

### 🐞 Bug fixes, Minor Improvements

* Fix html code for apostrophe ([@yurishkuro](https://github.com/yurishkuro) in [#2224](https://github.com/jaegertracing/jaeger-ui/pull/2224))
* Make scatterplot y-axis margin wider to fit longer durations ([@tico88612](https://github.com/tico88612) in [#2211](https://github.com/jaegertracing/jaeger-ui/pull/2211))
* Fix upload file into search page unnecessary post ([@tico88612](https://github.com/tico88612) in [#2200](https://github.com/jaegertracing/jaeger-ui/pull/2200))

### 👷 CI Improvements

* Feat: add `depcheck 1.4.7` in `package.json` ([@tico88612](https://github.com/tico88612) in [#2202](https://github.com/jaegertracing/jaeger-ui/pull/2202))

## v1.39.0 (2024-03-04)

### ✨ New Features:

* Support uploading traces in opentelemetry format (otlp json) ([@NavinShrinivas](https://github.com/NavinShrinivas) in [#2145](https://github.com/jaegertracing/jaeger-ui/pull/2145))

### 🐞 Bug fixes, Minor Improvements:

* Gracefully handle spans without logs field ([@MaXal](https://github.com/MaXal) in [#2191](https://github.com/jaegertracing/jaeger-ui/pull/2191))
* Prevent keyvaluetable copy column from wrapping ([@bobrik](https://github.com/bobrik) in [#2181](https://github.com/jaegertracing/jaeger-ui/pull/2181))
* Use json for table values only for objects ([@bobrik](https://github.com/bobrik) in [#2168](https://github.com/jaegertracing/jaeger-ui/pull/2168))

## v1.38.0 (2024-02-06)

### ✨ New Features:

* [feature]: add zoom in/out controls to plexus graphs ([@Wise-Wizard](https://github.com/Wise-Wizard) in [#2072](https://github.com/jaegertracing/jaeger-ui/pull/2072))

### 🐞 Bug fixes, Minor Improvements:

* Use import from /dist/ instead of symlink ([@zacanger](https://github.com/zacanger) in [#2135](https://github.com/jaegertracing/jaeger-ui/pull/2135))

## v1.37.0 (2024-01-08)

### ✨ New Features:

* Replace implementation of DAG view with Plexus's Digraph ([@prathamesh-mutkure](https://github.com/prathamesh-mutkure) in [#1981](https://github.com/jaegertracing/jaeger-ui/pull/1981))
* Support sticky configuration for deep dependency graph ([@Wise-Wizard](https://github.com/Wise-Wizard) in [#2063](https://github.com/jaegertracing/jaeger-ui/pull/2063))

### 🐞 Bug fixes, Minor Improvements:

* Add exact phrase search syntax help ([@kshmidt-digma](https://github.com/kshmidt-digma) in [#2028](https://github.com/jaegertracing/jaeger-ui/pull/2028))
* Fix broken hot reload of plexus package ([@Wise-Wizard](https://github.com/Wise-Wizard) in [#2089](https://github.com/jaegertracing/jaeger-ui/pull/2089))
* Feat: remove `is-promise` library ([@EshaanAgg](https://github.com/EshaanAgg) in [#2080](https://github.com/jaegertracing/jaeger-ui/pull/2080))
* Feat: remove `reactga` and migrate to `ga4` for tracking ([@EshaanAgg](https://github.com/EshaanAgg) in [#2071](https://github.com/jaegertracing/jaeger-ui/pull/2071))
* Chore: import only lodash submodules ([@anshgoyalevil](https://github.com/anshgoyalevil) in [#2041](https://github.com/jaegertracing/jaeger-ui/pull/2041))
* Replace reselect with memoize ([@cooleditphoto](https://github.com/cooleditphoto) in [#2042](https://github.com/jaegertracing/jaeger-ui/pull/2042))

### 👷 CI Improvements:

* Setup ossf scorecard workflow ([@mmorel-35](https://github.com/mmorel-35) in [#2096](https://github.com/jaegertracing/jaeger-ui/pull/2096))
* Ci: simplify check-label workflow ([@EshaanAgg](https://github.com/EshaanAgg) in [#2068](https://github.com/jaegertracing/jaeger-ui/pull/2068))
* Fix: fix some linting warnings ([@EshaanAgg](https://github.com/EshaanAgg) in [#2064](https://github.com/jaegertracing/jaeger-ui/pull/2064))

## v1.36.0 (2023-12-05)

### ✨ New Features:

* [SPM] Add span kind selector ([@albertteoh](https://github.com/albertteoh) in [#2012](https://github.com/jaegertracing/jaeger-ui/pull/2012))
* Make ArchiveTrace button auto-configurable ([@thecoons](https://github.com/thecoons) in [#1944](https://github.com/jaegertracing/jaeger-ui/pull/1944))

### 🐞 Bug fixes, Minor Improvements:

* Speed up trace statistics view calculation ([@maxgaponov](https://github.com/maxgaponov) in [#1941](https://github.com/jaegertracing/jaeger-ui/pull/1941))
* Exit `mergeChildrenCriticalPath` early for an empty critical path ([@maxgaponov](https://github.com/maxgaponov) in [#1974](https://github.com/jaegertracing/jaeger-ui/pull/1974))
* Add link to faq explaining why service map is empty ([@yurishkuro](https://github.com/yurishkuro) in [#1963](https://github.com/jaegertracing/jaeger-ui/pull/1963))

### 👷 CI Improvements:

* Change vite config from cjs to esm ([@ShivamMadlani](https://github.com/ShivamMadlani) in [#1992](https://github.com/jaegertracing/jaeger-ui/pull/1992))
* Restore scripts/get-tracking-version.js deleted by accident ([@yurishkuro](https://github.com/yurishkuro) in [#1998](https://github.com/jaegertracing/jaeger-ui/pull/1998))


## v1.35.0 (2023-11-02)

### ✨ New Features:

* Add tooltip when hovering critical path ([@GLVSKiriti](https://github.com/GLVSKiriti) in [#1871](https://github.com/jaegertracing/jaeger-ui/pull/1871))
* Added tooltip when hovered on header column of tracestatistics view ([@GLVSKiriti](https://github.com/GLVSKiriti) in [#1902](https://github.com/jaegertracing/jaeger-ui/pull/1902))

### 🐞 Bug fixes, Minor Improvements:

* Upgrade ant-design to v5.x ([@anshgoyalevil](https://github.com/anshgoyalevil) in [#1907](https://github.com/jaegertracing/jaeger-ui/pull/1907))
* [refactor]: enhancement to selftime calculation logic in tracestatistics view ([@GLVSKiriti](https://github.com/GLVSKiriti) in [#1901](https://github.com/jaegertracing/jaeger-ui/pull/1901))
* Fix: disregard malformed references pointing to the same span ([@zimv](https://github.com/zimv) in [#823](https://github.com/jaegertracing/jaeger-ui/pull/823))
* Fix: add style for ioarrowforward ([@NineKama](https://github.com/NineKama) in [#1869](https://github.com/jaegertracing/jaeger-ui/pull/1869))
* Replace deprecated ant-design props from referencebutton and keyvaluestable ([@anshgoyalevil](https://github.com/anshgoyalevil) in [#1864](https://github.com/jaegertracing/jaeger-ui/pull/1864))
* Remove deprecated usages from antd dropdown, tooltip, and tab components ([@anshgoyalevil](https://github.com/anshgoyalevil) in [#1859](https://github.com/jaegertracing/jaeger-ui/pull/1859))
* Replace deprecated visible prop of ant-design v3 with open prop of ant-design v4 ([@anshgoyalevil](https://github.com/anshgoyalevil) in [#1855](https://github.com/jaegertracing/jaeger-ui/pull/1855))
* Replace deprecated usage of ant-design tabs component from searchtracepage ([@anshgoyalevil](https://github.com/anshgoyalevil) in [#1857](https://github.com/jaegertracing/jaeger-ui/pull/1857))

### 👷 CI Improvements:

* Ci: add the label-check workflow to verify changelog labels on each pr ([@anshgoyalevil](https://github.com/anshgoyalevil) in [#1897](https://github.com/jaegertracing/jaeger-ui/pull/1897))

## v1.34.0 (2023-10-04)

### Enhancements

- Handle Critical Path computation when child span starts before and ends after parent span. ([@GLVSKiriti](https://github.com/GLVSKiriti) in [#1780](https://github.com/jaegertracing/jaeger-ui/pull/1780))

### Fixes

- Restore ability to search in select fields ([@prathamesh-mutkure](https://github.com/prathamesh-mutkure) in [#1805](https://github.com/jaegertracing/jaeger-ui/pull/1805))
- Replace match.params with useparams hook ([@anshgoyalevil](https://github.com/anshgoyalevil) in [#1837](https://github.com/jaegertracing/jaeger-ui/pull/1837))
- Add custom withrouteprops hoc for react-router-dom v6 migration ([@anshgoyalevil](https://github.com/anshgoyalevil) in [#1836](https://github.com/jaegertracing/jaeger-ui/pull/1836))
- Remove unused icon ([@priyanshu-kun](https://github.com/priyanshu-kun) in [#1829](https://github.com/jaegertracing/jaeger-ui/pull/1829))
- Improve tooltip for elasticsearch tag queries ([@pavolloffay](https://github.com/pavolloffay) in [#1809](https://github.com/jaegertracing/jaeger-ui/pull/1809))
- Replace react-router-redux with redux-first-history ([@anshgoyalevil](https://github.com/anshgoyalevil) in [#1826](https://github.com/jaegertracing/jaeger-ui/pull/1826))
- Fix all controversial icons. ([@priyanshu-kun](https://github.com/priyanshu-kun) in [#1824](https://github.com/jaegertracing/jaeger-ui/pull/1824))
- Speed up tests locally by upto 45% ([@anshgoyalevil](https://github.com/anshgoyalevil) in [#1818](https://github.com/jaegertracing/jaeger-ui/pull/1818))
- Priyanshu kun/clean any ([@priyanshu-kun](https://github.com/priyanshu-kun) in [#1814](https://github.com/jaegertracing/jaeger-ui/pull/1814))
- Moment.js replaced with dayjs ([@prathamesh-mutkure](https://github.com/prathamesh-mutkure) in [#1738](https://github.com/jaegertracing/jaeger-ui/pull/1738))
- Replaced all uncontroversial icons from various icon sets to io5 ([@priyanshu-kun](https://github.com/priyanshu-kun) in [#1771](https://github.com/jaegertracing/jaeger-ui/pull/1771))
- Speed up ci unit-test workflow by 28% ([@anshgoyalevil](https://github.com/anshgoyalevil) in [#1804](https://github.com/jaegertracing/jaeger-ui/pull/1804))
- Fix linting warnings for no-unused-vars, no-var-requires ([@priyanshu-kun](https://github.com/priyanshu-kun) in [#1800](https://github.com/jaegertracing/jaeger-ui/pull/1800))
- Improve tooltip for tag search ([@yurishkuro](https://github.com/yurishkuro) in [#1799](https://github.com/jaegertracing/jaeger-ui/pull/1799))
- Fix copyicon to receive reactnode instead of string ([@anshgoyalevil](https://github.com/anshgoyalevil) in [#1791](https://github.com/jaegertracing/jaeger-ui/pull/1791))
- Refactor critical path code to prevent it from ever throwing exceptions ([@GLVSKiriti](https://github.com/GLVSKiriti) in [#1785](https://github.com/jaegertracing/jaeger-ui/pull/1785))
- Print suggestion on fixing prettier-lint errors ([@yurishkuro](https://github.com/yurishkuro) in [#1783](https://github.com/jaegertracing/jaeger-ui/pull/1783))
- Upgrade to node 18 ([@yurishkuro](https://github.com/yurishkuro) in [#1776](https://github.com/jaegertracing/jaeger-ui/pull/1776))
- Extend try/catch for critical path ([@yurishkuro](https://github.com/yurishkuro) in [#1778](https://github.com/jaegertracing/jaeger-ui/pull/1778))
- Convert utils/treenode.js and selectors/trace.js to typescript ([@yurishkuro](https://github.com/yurishkuro) in [#1777](https://github.com/jaegertracing/jaeger-ui/pull/1777))

## v1.33.0 (2023-08-06)

### Enhancements

- [feature] Visualize Critical Path of a trace ([@GLVSKiriti](https://github.com/GLVSKiriti) in [#1582](https://github.com/jaegertracing/jaeger-ui/pull/1582))
- Add JSON Folding Support in Logs ([@prathamesh-mutkure](https://github.com/prathamesh-mutkure) in [#1724](https://github.com/jaegertracing/jaeger-ui/pull/1724))
- Recognize uninstrumented services via both producer and client span kinds ([@Wck-iipi](https://github.com/Wck-iipi) in [#1681](https://github.com/jaegertracing/jaeger-ui/pull/1681))

### Fixes

- fix: Make popup on the Search input field less intrusive enhancement ([@anikdhabal](https://github.com/anikdhabal) in [#1685](https://github.com/jaegertracing/jaeger-ui/pull/1685))
- Resolves #1697 - Bug fix of popover not closing ([@jriyyya](https://github.com/jriyyya) in [#1705](https://github.com/jaegertracing/jaeger-ui/pull/1705))

## v1.32.0 (2023-08-14)

### Enhancements

- Add text label to copy buttons on tags ([@Yushmanth-reddy](https://github.com/Yushmanth-reddy) in [#1547](https://github.com/jaegertracing/jaeger-ui/pull/1547))

### Fixes

- Migrate ScoreCard.test.js from Enzyme to React Shallow Renderer ([@anshgoyalevil](https://github.com/anshgoyalevil) in [#1653](https://github.com/jaegertracing/jaeger-ui/pull/1653))
- Fix the tooltip position of copy value and JSON Buttton ([@anikdhabal](https://github.com/anikdhabal) in [#1650](https://github.com/jaegertracing/jaeger-ui/pull/1650))
- Fix lint issues when bumping eslint-plugin-import ([@Kavinjsir](https://github.com/Kavinjsir) in [#1652](https://github.com/jaegertracing/jaeger-ui/pull/1652))
- [deps] Remove @types/moment, @types/history and @types/classnames ([@anshgoyalevil](https://github.com/anshgoyalevil) in [#1637](https://github.com/jaegertracing/jaeger-ui/pull/1637))
- Remove dependency on isomorphic-fetch ([@Yushmanth-reddy](https://github.com/Yushmanth-reddy) in [#1616](https://github.com/jaegertracing/jaeger-ui/pull/1616))
- Fix flaky test causing spurious drops in code coverage ([@GLVSKiriti](https://github.com/GLVSKiriti) in [#1632](https://github.com/jaegertracing/jaeger-ui/pull/1632))
- [deps] Remove @types/memoize-one dep ([@anshgoyalevil](https://github.com/anshgoyalevil) in [#1625](https://github.com/jaegertracing/jaeger-ui/pull/1625))

## v1.31.0 (2023-07-05)

### Enhancements

- Add boolean property to config to prevent popups to a new page ([@Binrix](https://github.com/Binrix) in [#1521](https://github.com/jaegertracing/jaeger-ui/pull/1521))
- Trace statistics table is now using antd Table component to fix visual design consistency ([@GLVSKiriti](https://github.com/GLVSKiriti) in [#1500](https://github.com/jaegertracing/jaeger-ui/pull/1500))
- Add second copy icon for value only to make it easier to get tool tips ([@yurishkuro](https://github.com/yurishkuro) in [#1505](https://github.com/jaegertracing/jaeger-ui/pull/1505))
- Escape keys/values when rendering JSON objects to fix some parsing and additional tests ([@yurishkuro](https://github.com/yurishkuro) in [#1498](https://github.com/jaegertracing/jaeger-ui/pull/1498))

### Fixes

- Bump lerna from 7.1.0 to 7.1.1 ([@dependabot](https://github.com/dependabot) in [#1529](https://github.com/jaegertracing/jaeger-ui/pull/1529))
- Bump webpack from 5.87.0 to 5.88.1 ([@dependabot](https://github.com/dependabot) in [#1528](https://github.com/jaegertracing/jaeger-ui/pull/1528))
- Bump terser from 5.18.0 to 5.18.2 ([@dependabot](https://github.com/dependabot) in [#1527](https://github.com/jaegertracing/jaeger-ui/pull/1527))
- Bump typescript from 5.1.3 to 5.1.6 ([@dependabot](https://github.com/dependabot) in [#1530](https://github.com/jaegertracing/jaeger-ui/pull/1530))
- Bump @typescript-eslint/parser from 5.59.11 to 5.60.1 ([@dependabot](https://github.com/dependabot) in [#1525](https://github.com/jaegertracing/jaeger-ui/pull/1525))
- Bump lerna from 7.0.2 to 7.1.0 ([@dependabot](https://github.com/dependabot) in [#1523](https://github.com/jaegertracing/jaeger-ui/pull/1523))
- Bump @typescript-eslint/eslint-plugin from 5.59.11 to 5.60.1 ([@dependabot](https://github.com/dependabot) in [#1522](https://github.com/jaegertracing/jaeger-ui/pull/1522))
- Bump eslint from 8.42.0 to 8.43.0 ([@dependabot](https://github.com/dependabot) in [#1508](https://github.com/jaegertracing/jaeger-ui/pull/1508))
- Bump lerna from 7.0.1 to 7.0.2 ([@dependabot](https://github.com/dependabot) in [#1504](https://github.com/jaegertracing/jaeger-ui/pull/1504))
- Bump webpack from 5.86.0 to 5.87.0 ([@dependabot](https://github.com/dependabot) in [#1501](https://github.com/jaegertracing/jaeger-ui/pull/1501))
- Bump lerna from 6.6.2 to 7.0.1 ([@dependabot](https://github.com/dependabot) in [#1492](https://github.com/jaegertracing/jaeger-ui/pull/1492))
- Bump @typescript-eslint/eslint-plugin from 5.59.9 to 5.59.11 ([@dependabot](https://github.com/dependabot) in [#1495](https://github.com/jaegertracing/jaeger-ui/pull/1495))
- Bump @types/react-dom from 18.2.4 to 18.2.5 ([@dependabot](https://github.com/dependabot) in [#1496](https://github.com/jaegertracing/jaeger-ui/pull/1496))
- Bump terser from 5.17.7 to 5.18.0 ([@dependabot](https://github.com/dependabot) in [#1497](https://github.com/jaegertracing/jaeger-ui/pull/1497))
- Escape keys/values when rendering JSON objects ([@yurishkuro](https://github.com/yurishkuro) in [#1498](https://github.com/jaegertracing/jaeger-ui/pull/1498))
- Bump webpack-dev-server from 4.15.0 to 4.15.1 ([@dependabot](https://github.com/dependabot) in [#1488](https://github.com/jaegertracing/jaeger-ui/pull/1488))
- Bump rollup-plugin-visualizer from 5.9.0 to 5.9.2 ([@dependabot](https://github.com/dependabot) in [#1486](https://github.com/jaegertracing/jaeger-ui/pull/1486))
- Bump html-webpack-plugin from 5.5.1 to 5.5.3 ([@dependabot](https://github.com/dependabot) in [#1487](https://github.com/jaegertracing/jaeger-ui/pull/1487))
- Bump @babel/preset-typescript from 7.21.5 to 7.22.5 ([@dependabot](https://github.com/dependabot) in [#1481](https://github.com/jaegertracing/jaeger-ui/pull/1481))
- Bump @babel/preset-env from 7.22.4 to 7.22.5 ([@dependabot](https://github.com/dependabot) in [#1482](https://github.com/jaegertracing/jaeger-ui/pull/1482))
- Bump @babel/eslint-parser from 7.21.8 to 7.22.5 ([@dependabot](https://github.com/dependabot) in [#1483](https://github.com/jaegertracing/jaeger-ui/pull/1483))
- Bump @babel/core from 7.22.1 to 7.22.5 ([@dependabot](https://github.com/dependabot) in [#1484](https://github.com/jaegertracing/jaeger-ui/pull/1484))

## v1.30.0 (2023-06-05)

### Enhancements

- Allow disabling file upload via site config ([@yurishkuro](https://github.com/yurishkuro) in [#1464](https://github.com/jaegertracing/jaeger-ui/pull/1464))

- Support in-page-search in trace view on key=value pairs ([@bobrik](https://github.com/bobrik) in [#1391](https://github.com/jaegertracing/jaeger-ui/pull/1391))

### Fixes

- Bump webpack from 5.80.0 to 5.85.0 ([@dependabot](https://github.com/dependabot) in [#1457](https://github.com/jaegertracing/jaeger-ui/pull/1457))

## v1.29.1 (2023-05-03)

### Fixes

- Fix format of a downloaded json file ([@Katarzyna-B](https://github.com/Katarzyna-B) in [#1306](https://github.com/jaegertracing/jaeger-ui/pull/1306))

## v1.29.0 (2023-04-10)

### Enhancements

- Batch Download of traces ([@Katarzyna-B](https://github.com/Katarzyna-B) in [#1274](https://github.com/jaegertracing/jaeger-ui/pull/1274))
- Render HTTP header tags as comma-separated strings ([@wjrogers](https://github.com/wjrogers) in [#1295](https://github.com/jaegertracing/jaeger-ui/pull/1295))
- Rename tab from JSON File to Upload ([@yurishkuro](https://github.com/yurishkuro) in [#1308](https://github.com/jaegertracing/jaeger-ui/pull/1308))

### Fixes

- Bump webpack from 5.76.3 to 5.77.0 ([@dependabot](https://github.com/dependabot) in [#1320](https://github.com/jaegertracing/jaeger-ui/pull/1320))
- Bump minimist from 1.2.0 to 1.2.8 ([@dependabot](https://github.com/dependabot) in [#1317](https://github.com/jaegertracing/jaeger-ui/pull/1317))
- Bump eslint from 8.36.0 to 8.37.0 ([@dependabot](https://github.com/dependabot) in [#1316](https://github.com/jaegertracing/jaeger-ui/pull/1316))
- Bump lerna from 6.5.1 to 6.6.1 ([@dependabot](https://github.com/dependabot) in [#1303](https://github.com/jaegertracing/jaeger-ui/pull/1303))
- Update redux-form to 8.3.10 ([@mszabo-wikia](https://github.com/mszabo-wikia) in [#1314](https://github.com/jaegertracing/jaeger-ui/pull/1314))
- Bump @svgr/babel-preset from 6.5.1 to 7.0.0 ([@dependabot](https://github.com/dependabot) in [#1301](https://github.com/jaegertracing/jaeger-ui/pull/1301))
- Bump vite from 4.2.0 to 4.2.1 ([@dependabot](https://github.com/dependabot) in [#1287](https://github.com/jaegertracing/jaeger-ui/pull/1287))
- Bump @svgr/babel-plugin-transform-svg-component from 6.5.1 to 7.0.0 ([@dependabot](https://github.com/dependabot) in [#1299](https://github.com/jaegertracing/jaeger-ui/pull/1299))
- Bump terser from 5.16.6 to 5.16.8 ([@dependabot](https://github.com/dependabot) in [#1302](https://github.com/jaegertracing/jaeger-ui/pull/1302))
- Bump webpack from 5.76.1 to 5.76.3 ([@dependabot](https://github.com/dependabot) in [#1297](https://github.com/jaegertracing/jaeger-ui/pull/1297))
- Bump prettier from 2.8.4 to 2.8.7 ([@dependabot](https://github.com/dependabot) in [#1300](https://github.com/jaegertracing/jaeger-ui/pull/1300))
- Bump webpack-dev-server from 4.11.1 to 4.13.0 ([@dependabot](https://github.com/dependabot) in [#1283](https://github.com/jaegertracing/jaeger-ui/pull/1283))
- Bump vite from 4.1.4 to 4.2.0 ([@dependabot](https://github.com/dependabot) in [#1281](https://github.com/jaegertracing/jaeger-ui/pull/1281))
- Bump typescript from 4.9.5 to 5.0.2 ([@dependabot](https://github.com/dependabot) in [#1282](https://github.com/jaegertracing/jaeger-ui/pull/1282))

## v1.28.1 (2023-03-15)

### Fixes

- Workaround antd v3 error in the production build ([@mszabo-wikia](https://github.com/mszabo-wikia) in [#1276](https://github.com/jaegertracing/jaeger-ui/pull/1276))

## v1.28.0 (2023-03-15)

### Enhancements

- Add totalMemory in config for trace graph ([@ChenX1993](https://github.com/ChenX1993) in [#1262](https://github.com/jaegertracing/jaeger-ui/pull/1262))
- Make traceID, startTime, endTime, duration and traceName available or Link Patterns ([@MUI-Pop](https://github.com/MUI-Pop) in [#1178](https://github.com/jaegertracing/jaeger-ui/pull/1178))

### Fixes

- Update TypeScript and ESLint to latest versions ([@mszabo-wikia](https://github.com/mszabo-wikia) in [#1256](https://github.com/jaegertracing/jaeger-ui/pull/1256))
- Update ESLint and related plugins ([@mszabo-wikia](https://github.com/mszabo-wikia) in [#1250](https://github.com/jaegertracing/jaeger-ui/pull/1250))
- Expand docs about testing ([@mszabo-wikia](https://github.com/mszabo-wikia) in [#1251](https://github.com/jaegertracing/jaeger-ui/pull/1251))
- Bump antd to 3.26.20 ([@mszabo-wikia](https://github.com/mszabo-wikia) in [#1247](https://github.com/jaegertracing/jaeger-ui/pull/1247))
- Bump TypeScript to 3.8.3 ([@mszabo-wikia](https://github.com/mszabo-wikia) in [#1244](https://github.com/jaegertracing/jaeger-ui/pull/1244))
- Migrate build tooling to Vite ([@mszabo-wikia](https://github.com/mszabo-wikia) in [#1226](https://github.com/jaegertracing/jaeger-ui/pull/1226))
- Avoid use of require() in default-config.tsx ([@mszabo-wikia](https://github.com/mszabo-wikia) in [#1225](https://github.com/jaegertracing/jaeger-ui/pull/1225))
- Abstract access to injected globals ([@mszabo-wikia](https://github.com/mszabo-wikia) in [#1224](https://github.com/jaegertracing/jaeger-ui/pull/1224))
- Remove use of react-dimensions package in ScatterPlot component ([@mszabo-wikia](https://github.com/mszabo-wikia) in [#1223](https://github.com/jaegertracing/jaeger-ui/pull/1223))
- Convert SearchResults and index components to TS ([@mszabo-wikia](https://github.com/mszabo-wikia) in [#1222](https://github.com/jaegertracing/jaeger-ui/pull/1222))
- Make Plexus output ESM ([@mszabo-wikia](https://github.com/mszabo-wikia) in [#1219](https://github.com/jaegertracing/jaeger-ui/pull/1219))
- Use .jsx file extension for JS components ([@mszabo-wikia](https://github.com/mszabo-wikia) in [#1218](https://github.com/jaegertracing/jaeger-ui/pull/1218))
- Bump Plexus React typings to React 18 ([@mszabo-wikia](https://github.com/mszabo-wikia) in [#1210](https://github.com/jaegertracing/jaeger-ui/pull/1210))
- Bump node-pre-gyp dependency ([@rubenvp8510](https://github.com/rubenvp8510) in [#1191](https://github.com/jaegertracing/jaeger-ui/pull/1191))
- Prevent wrapping of the timeline tick label text ([@SOF3](https://github.com/SOF3) in [#1117](https://github.com/jaegertracing/jaeger-ui/pull/1117))
- Upgrade to React 18 ([@Sergio-Mira](https://github.com/Sergio-Mira) in [#1173](https://github.com/jaegertracing/jaeger-ui/pull/1173))
- Move alt view dropdown to a button ([@Sergio-Mira](https://github.com/Sergio-Mira) in [#1174](https://github.com/jaegertracing/jaeger-ui/pull/1174))
- Fix warning about Autoprefixer prefix-less CSS ([@Sergio-Mira](https://github.com/Sergio-Mira) in [#1175](https://github.com/jaegertracing/jaeger-ui/pull/1175))

## v1.27.3 (2022-12-07)

### Fixes

- Bump @babel/core from 7.20.2 to 7.20.5 ([@dependabot](https://github.com/dependabot) in [#1087](https://github.com/jaegertracing/jaeger-ui/pull/1087))
- Bump lerna from 6.0.3 to 6.1.0 ([@dependabot](https://github.com/dependabot) in [#1093](https://github.com/jaegertracing/jaeger-ui/pull/1093))
- Revert upgrade to viz.js, v2.1.2 -> v1.8.1 ([@yurishkuro](https://github.com/yurishkuro) in [#1082](https://github.com/jaegertracing/jaeger-ui/pull/1082))
- Upgrade to antd/v3.9.0 to avoid loading fonts from alicdn ([@yurishkuro](https://github.com/yurishkuro) in [#1053](https://github.com/jaegertracing/jaeger-ui/pull/1053))
- Upgrade more dependencies ([@yurishkuro](https://github.com/yurishkuro) in [#1057](https://github.com/jaegertracing/jaeger-ui/pull/1057))
- Bump safe dependencies ([@yurishkuro](https://github.com/yurishkuro) in [#1045](https://github.com/jaegertracing/jaeger-ui/pull/1045))
- Upgrade many dependencies part 2 ([@mmorel-35](https://github.com/mmorel-35) in [#1013](https://github.com/jaegertracing/jaeger-ui/pull/1013))

## v1.27.2 (2022-11-01)

### Fixes

- babel : migrate to the top level setPublicClassFields assumption ([@mmorel-35](https://github.com/mmorel-35) in [#1008](https://github.com/jaegertracing/jaeger-ui/pull/1008))

- Add documentation to config ([@yurishkuro](https://github.com/yurishkuro) in [#1007](https://github.com/jaegertracing/jaeger-ui/pull/1007))

- Upgrade many dependencies ([@mmorel-35](https://github.com/mmorel-35) in [#1001](https://github.com/jaegertracing/jaeger-ui/pull/1001))

- Update node version and use github-action for codecov ([@mmorel-35](https://github.com/mmorel-35) in [#997](https://github.com/jaegertracing/jaeger-ui/pull/997))

## v1.27.1 (2022-10-04)

### Fixes

- Bump dependencies: set-value@^2.0.1 and y18n@v4.0.3

## v1.27.0 (2022-09-15)

### Enhancements

- Flamegraph visualisation works with sub-second units ([@pavelpashkovsky](https://github.com/pavelpashkovsky) in [#986](https://github.com/jaegertracing/jaeger-ui/pull/986))
- Add trace visualization as a FlameGraph ([@pavelpashkovsky](https://github.com/pavelpashkovsky) in [#976](https://github.com/jaegertracing/jaeger-ui/pull/976))

## v1.26.0 (2022-08-03)

### Enhancements

- Add more selectable time ranges to the SPM UI ([@jgbernalp](https://github.com/jgbernalp) in [#971](https://github.com/jaegertracing/jaeger-ui/pull/971))

## v1.25.0 (2022-07-03)

### Enhancements

- Store preferred span name column width in localStorage ([@bobrik](https://github.com/bobrik) in [#965](https://github.com/jaegertracing/jaeger-ui/pull/965))

## v1.24.0 (2022-06-01)

### Enhancements

- Support new user analytics events in the Monitor Tab ([@VladislavBryukhanov](https://github.com/VladislavBryukhanov) in [#943](https://github.com/jaegertracing/jaeger-ui/pull/943))
- Use red on scatterplot for traces if any spans have an error=true tag ([@esnible](https://github.com/esnible) in [#951](https://github.com/jaegertracing/jaeger-ui/pull/951))

## v1.23.0 (2022-05-10)

### Enhancements

- Add error icon to errored services in trace list view ([@Jaskerv](https://github.com/Jaskerv) in [#927](https://github.com/jaegertracing/jaeger-ui/pull/927))

### Fixes

- Monitor tab - Fix monitor tab crashing ([@nofar9792](https://github.com/nofar9792) in [#946](https://github.com/jaegertracing/jaeger-ui/pull/946))
- Monitor Tab - fix latencies graph ([@nofar9792](https://github.com/nofar9792) in [#934](https://github.com/jaegertracing/jaeger-ui/pull/934))
- Fix service operations fetch by URL query params ([@FloydJohn](https://github.com/FloydJohn) in [#932](https://github.com/jaegertracing/jaeger-ui/pull/932))
- Monitor tab - fix link to docs ([@FloydJohn](https://github.com/FloydJohn) in [#929](https://github.com/jaegertracing/jaeger-ui/pull/929))

## v1.22.0 (2022-04-11)

### Enhancements

- Monitor Tab - New look for empty state + make empty state configurable ([@nofar9792](https://github.com/nofar9792) in [#916](https://github.com/jaegertracing/jaeger-ui/pull/916))

### Fixes

- Monitor Tab - Fixed y axis on error rates ([@nofar9792](https://github.com/nofar9792) in [#913](https://github.com/jaegertracing/jaeger-ui/pull/913))
- Monitor Tab - Truncate request rate and P95 latency numbers to two decimal places ([@nofar9792](https://github.com/nofar9792) in [#911](https://github.com/jaegertracing/jaeger-ui/pull/911))
- Monitor Tab - Error rate graph in operation table is always a straight line ([@nofar9792](https://github.com/nofar9792) in [#909](https://github.com/jaegertracing/jaeger-ui/pull/909))

## v1.21.0 (2022-03-06)

### Fixes

- Include serviceName in tracked events from Search Form ([@vvvprabhakar](https://github.com/vvvprabhakar) in [#842](https://github.com/jaegertracing/jaeger-ui/pull/842))
- Monitor Tab: Cannot see the whole numbers in the legend ([@nofar9792](https://github.com/nofar9792) in [#873](https://github.com/jaegertracing/jaeger-ui/pull/873))
- Monitor Tab: Cannot choose another timeframe ([@nofar9792](https://github.com/nofar9792) in [#898](https://github.com/jaegertracing/jaeger-ui/pull/898))
- Monitor Tab: Error rate value should be 0-100 value and not 0-1 ([@nofar9792](https://github.com/nofar9792) in [#895](https://github.com/jaegertracing/jaeger-ui/pull/895))
- Monitor Tab: Show 95 Latency in a more readable time-unit ([@nofar9792](https://github.com/nofar9792) in [#893](https://github.com/jaegertracing/jaeger-ui/pull/893))
- Monitor Tab: The x-axis timeframe should be according to the selected timeframe ([@nofar9792](https://github.com/nofar9792) in [#886](https://github.com/jaegertracing/jaeger-ui/pull/886))
- Monitor Tab: Improve request rate readability ([@nofar9792](https://github.com/nofar9792) in [#890](https://github.com/jaegertracing/jaeger-ui/pull/890))
- Monitor Tab: Crosshair color is too light ([@nofar9792](https://github.com/nofar9792) in [#888](https://github.com/jaegertracing/jaeger-ui/pull/888))
- Monitor Tab: Reduce ratePer window ([@albertteoh](https://github.com/albertteoh) in [#885](https://github.com/jaegertracing/jaeger-ui/pull/885))

## v1.20.1 (2022-02-04)

### Fixes

- Widen date input to avoid clipping, fixes #864 ([@bobrik](https://github.com/bobrik) in [#867](https://github.com/jaegertracing/jaeger-ui/pull/867))

## v1.20.0 (Jan 11, 2022)

### Fixes

- Respect BASE_URL in Trace Tabular View ([@caizixian](https://github.com/caizixian) in [#861](https://github.com/jaegertracing/jaeger-ui/pull/861))

## v1.19.0 (Dec 1, 2021)

### Enhancements

- "Monitor" tab for service health metrics ([@th3M1ke](https://github.com/th3M1ke) in [#815](https://github.com/jaegertracing/jaeger-ui/pull/815)). See [#2954](https://github.com/jaegertracing/jaeger/issues/2954) for more details.

### Fixes

- Endless loop in TraceStatistics View ([@vvvprabhakar](https://github.com/vvvprabhakar) in [#843](https://github.com/jaegertracing/jaeger-ui/pull/843))
- Fix searching spans in a trace page ([@w0wka91](https://github.com/w0wka91) in [#837](https://github.com/jaegertracing/jaeger-ui/pull/837))

## v1.18.0 (Nov 6, 2021)

### Fixes

- Fix deep dependency graph not showing in uiEmbed=v0 mode ([@leroy-chen](https://github.com/leroy-chen) in [#768](https://github.com/jaegertracing/jaeger-ui/pull/768))

## v1.17.0 (Oct 6, 2021)

### Enhancements

- Enable regexes and functions in link patterns ([@yoave23](https://github.com/yoave23) in [#817](https://github.com/jaegertracing/jaeger-ui/pull/817))

## v1.16.0 (Sep 6, 2021)

### Enhancements

- Add Table View for a trace ([@vvvprabhakar](https://github.com/vvvprabhakar) in [#781](https://github.com/jaegertracing/jaeger-ui/pull/781))

### Fixes

- Fix trace detail page's back button disappeared ((@shwin0901)[https://github.com/shwin0901] in [#805](https://github.com/jaegertracing/jaeger-ui/pull/805))
- Various dependency upgrades by `dependabot`

## v1.15.0 (Aug 4, 2021)

### Fixes

- Make favicon background transparent ([@MaxTaggart](https://github.com/MaxTaggart) in [#786](https://github.com/jaegertracing/jaeger-ui/pull/786))
- Fix deep dependency header overlap in page header ([@stardotcode](https://github.com/stardotcode) in [#731](https://github.com/jaegertracing/jaeger-ui/pull/731) [#782](https://github.com/jaegertracing/jaeger-ui/pull/782))

## v1.14.0 (June 4, 2021)

### Enhancements

- Make search panel more compact, button more visible ([@meenal06](https://github.com/meenal06) in [#724](https://github.com/jaegertracing/jaeger-ui/pull/724))

### Fixes

- Add null check for span.logs in search/filter-spans ([@achesin](https://github.com/achesin) in [#734](https://github.com/jaegertracing/jaeger-ui/pull/734))
- Several updates to dependencies.

## v1.13.0 (February 20, 2021)

### Enhancements

- **General:** Generic web analytics tracking implementation ([@th3M1ke](https://github.com/th3M1ke) in [#681](https://github.com/jaegertracing/jaeger-ui/pull/681))

- **General:** Rearrange nav controls ([@yoave23](https://github.com/yoave23) in [#676](https://github.com/jaegertracing/jaeger-ui/pull/676))

- **General:** Change UI configuration to a Javascript file ([@th3M1ke](https://github.com/th3M1ke) in [#677](https://github.com/jaegertracing/jaeger-ui/pull/677))

- **Trace detail:** Display references unless it's a single CHILD_OF ([@yurishkuro](https://github.com/yurishkuro) in [#672](https://github.com/jaegertracing/jaeger-ui/pull/672))

## v1.12.0 (November 14, 2020)

### Enhancements

- Identify uninstrumented services ([#659](https://github.com/jaegertracing/jaeger-ui/pull/659), [@rubenvp8510](https://github.com/rubenvp8510))
- Added jaeger ui version to about menu ([#606](https://github.com/jaegertracing/jaeger-ui/pull/606), [@alanisaac](https://github.com/alanisaac))
- Explain "self time" in graph view ([#655](https://github.com/jaegertracing/jaeger-ui/pull/655), [@yurishkuro](https://github.com/yurishkuro))
- Improve duration formatting ([#647](https://github.com/jaegertracing/jaeger-ui/pull/647), [@jamesfer](https://github.com/jamesfer))

### Fixes

- Pass a function that doesn't return anything to FileUpload component ([#658](https://github.com/jaegertracing/jaeger-ui/pull/658), [@rubenvp8510](https://github.com/rubenvp8510))
- Prevent DAG crashes because of empty service name string ([#656](https://github.com/jaegertracing/jaeger-ui/pull/656), [@rubenvp8510](https://github.com/rubenvp8510))
- Upgrade build to Node 10 ([#649](https://github.com/jaegertracing/jaeger-ui/pull/649), [@yurishkuro](https://github.com/yurishkuro))

## v1.11.0 (September 28, 2020)

### Enhancements

- **Trace stats:** Improve styling of trace statistics selectors ([@rubenvp8510](https://github.com/rubenvp8510)) in [#639](https://github.com/jaegertracing/jaeger-ui/pull/639)

### Fixes

- **General:** Add coverage around existing TraceName component ([@tklever](https://github.com/tklever) in [#626](https://github.com/jaegertracing/jaeger-ui/pull/626))

- **Trace detail:** Fixes TraceTimelineViewer span details render regression ([@rubenvp8510](https://github.com/rubenvp8510)) in [#629](https://github.com/jaegertracing/jaeger-ui/pull/629)

## v1.10.0 (August 25, 2020)

### Enhancements

- **Trace stats:** Added view for showing detailed trace statistics ([@fylip97](https://github.com/fylip97) in [#506](https://github.com/jaegertracing/jaeger-ui/pull/506))

### Fixes

- **General:** Additional Test Coverage around TimelineViewingLayer ([@tklever](https://github.com/tklever) in [#617](https://github.com/jaegertracing/jaeger-ui/pull/617))

- **General:** Archive notifier tests ([@tklever](https://github.com/tklever) in [#619](https://github.com/jaegertracing/jaeger-ui/pull/619))

- **General:** Refactor SpanGraph.UNSAFE_componentWillReceiveProps ([@tklever](https://github.com/tklever) in [#613](https://github.com/jaegertracing/jaeger-ui/pull/613))

- **General:** Remove UNSAFE_componentWillMount lifecycle methods ([@tklever](https://github.com/tklever) in [#611](https://github.com/jaegertracing/jaeger-ui/pull/611))

- **General:** Migrate ArchiveNotifier from UNSAFE_componentWillReceiveProps ([@tklever](https://github.com/tklever) in [#614](https://github.com/jaegertracing/jaeger-ui/pull/614))

- **General:** refactor UNSAFE_componentWillReceiveProps to use componentDidUpdate ([@tklever](https://github.com/tklever) in [#612](https://github.com/jaegertracing/jaeger-ui/pull/612))

- **General:** clear console errors (proptype violations) from CLI output ([@tklever](https://github.com/tklever) in [#615](https://github.com/jaegertracing/jaeger-ui/pull/615))

- **General:** add unit coverage for component TraceIDSearchInput ([@tklever](https://github.com/tklever) in [#616](https://github.com/jaegertracing/jaeger-ui/pull/616))

- **General:** update legacy react lifecycle methods to indicate unsafe status ([@tklever](https://github.com/tklever) in [#610](https://github.com/jaegertracing/jaeger-ui/pull/610))

- **General:** Render seconds in dark color, millis in light ([@yurishkuro](https://github.com/yurishkuro) in [#605](https://github.com/jaegertracing/jaeger-ui/pull/605))

- **Trace detail:** Tweak css definition for span tree offset color ([@everett980](https://github.com/everett980) in [#604](https://github.com/jaegertracing/jaeger-ui/pull/604))

- **Trace detail:** span bar row size fix ([@vankop](https://github.com/vankop) in [#599](https://github.com/jaegertracing/jaeger-ui/pull/599))

- **General:** Fixed missing 'types/node' dependency ([@objectiser](https://github.com/objectiser) in [#603](https://github.com/jaegertracing/jaeger-ui/pull/603))

- **General:** Update lodash from 4.17.15 to 4.17.19 ([@objectiser](https://github.com/objectiser) in [#598](https://github.com/jaegertracing/jaeger-ui/pull/598))

- **Trace quality:** Allow customizing trace quality menu title ([@yurishkuro](https://github.com/yurishkuro) in [#592](https://github.com/jaegertracing/jaeger-ui/pull/592))

- **Trace detail:** Avoid the horizontal scrollbar (KeyValueTable) ([@smanolloff](https://github.com/smanolloff) in [#586](https://github.com/jaegertracing/jaeger-ui/pull/586))

- **Trace detail:** Don't rely on json-markup for non-json strings ([@smanolloff](https://github.com/smanolloff) in [#587](https://github.com/jaegertracing/jaeger-ui/pull/587))

- **Trace detail:** Avoid resize on mouse hover (KeyValueTable) ([@smanolloff](https://github.com/smanolloff) in [#584](https://github.com/jaegertracing/jaeger-ui/pull/584))

- **Trace quality:** Change QualityMetrics lookback param to hours ([@everett980](https://github.com/everett980) in [#581](https://github.com/jaegertracing/jaeger-ui/pull/581))

- **Trace quality:** Make detailscard table columns filterable ([@everett980](https://github.com/everett980) in [#580](https://github.com/jaegertracing/jaeger-ui/pull/580))

- **Trace quality:** Test quality metrics and DetailsCard ([@everett980](https://github.com/everett980) in [#577](https://github.com/jaegertracing/jaeger-ui/pull/577))

## v1.9.0 (May 14, 2020)

### Enhancements

- **Deep Dependency Graph:** Trace quality view & Ddg Decorations ([#564](https://github.com/jaegertracing/jaeger-ui/pull/564), [@everett980](https://github.com/everett980))

### Fixes

- **Trace detail:** Improve get trace name performance ([#574](https://github.com/jaegertracing/jaeger-ui/pull/574), [@everett980](https://github.com/everett980))
- **Deep Dependency Graph:** Support client versions table in details card ([#568](https://github.com/jaegertracing/jaeger-ui/pull/568), [@everett980](https://github.com/everett980))
- **General:** Clean up getTraceName memoization ([#573](https://github.com/jaegertracing/jaeger-ui/pull/573), [@everett980](https://github.com/everett980))
- **Trace detail:** Memoize getTraceName to improve render time by 3x ([#572](https://github.com/jaegertracing/jaeger-ui/pull/572), [@everett980](https://github.com/everett980))
- **General:** Fix uiFind matches for spans with leading 0s ([#567](https://github.com/jaegertracing/jaeger-ui/pull/567), [@everett980](https://github.com/everett980))
- **Trace detail:** Fix leading 0s breaking row interactions ([#566](https://github.com/jaegertracing/jaeger-ui/pull/566), [@everett980](https://github.com/everett980))
- **Deep Dependency Graph:** Remove kind.server filter and validate the case of service calling itself ([#557](https://github.com/jaegertracing/jaeger-ui/pull/557), [@rubenvp8510](https://github.com/rubenvp8510))
- **General:** Bump https-proxy-agent from 2.2.1 to 2.2.4 ([#561](https://github.com/jaegertracing/jaeger-ui/pull/561), [@dependabot[bot]](https://github.com/apps/dependabot))
- **General:** Bump lodash to 4.17.15 ([#559](https://github.com/jaegertracing/jaeger-ui/pull/559), [@rubenvp8510](https://github.com/rubenvp8510))
- **Deep Dependency Graph:** Dedupled search results DDG paths ([#558](https://github.com/jaegertracing/jaeger-ui/pull/558), [@rubenvp8510](https://github.com/rubenvp8510))
- **General:** Bump acorn from 5.7.3 to 5.7.4 ([#545](https://github.com/jaegertracing/jaeger-ui/pull/545), [@dependabot[bot]](https://github.com/apps/dependabot))
- **General:** Usage of a helper for trace name when preparing trace data ([#544](https://github.com/jaegertracing/jaeger-ui/pull/544), [@swapster](https://github.com/swapster))
- **Deep Dependency Graph:** Add path agnostic decorations action & reducer ([#549](https://github.com/jaegertracing/jaeger-ui/pull/549), [@everett980](https://github.com/everett980))
- **Trace comparison:** Refactor model/trace-dag to prep for latency diffs ([#521](https://github.com/jaegertracing/jaeger-ui/pull/521), [@tiffon](https://github.com/tiffon))

## v1.8.0 (March 12, 2020)

### Enhancements

- **Search:** Search results link spans ([#536](https://github.com/jaegertracing/jaeger-ui/pull/536), [@everett980](https://github.com/everett980))

### Fixes

- **General:** Correct trace name resolution ([#541](https://github.com/jaegertracing/jaeger-ui/pull/541), [@swapster](https://github.com/swapster))
- **General:** bump url-parse version to 1.4.7 ([#542](https://github.com/jaegertracing/jaeger-ui/pull/542), [@rubenvp8510](https://github.com/rubenvp8510))
- **Search** Fix span links for leading 0s trace ID ([#539](https://github.com/jaegertracing/jaeger-ui/pull/539), [@everett980](https://github.com/everett980))
- **General:** Reorder, rename, and fix "About Jaeger" links ([#540](https://github.com/jaegertracing/jaeger-ui/pull/540), [@yurishkuro](https://github.com/yurishkuro))
- **Search:** Fix search.maxLimit configuration ([#533](https://github.com/jaegertracing/jaeger-ui/pull/533), [@rubenvp8510](https://github.com/rubenvp8510))
- **Trace detail:** Fix trace scoped links not supporting numeric fields ([#538](https://github.com/jaegertracing/jaeger-ui/pull/538), [@william-tran](https://github.com/william-tran))

## v1.7.0 (February 21, 2020)

### Enhancements

- **Search:** Configure search.maxLimit ([@GabrielDyck](https://github.com/GabrielDyck) in [#511](https://github.com/jaegertracing/jaeger-ui/pull/511))

- **Google Analytics:** Add ga dimension for config cookie ([@everett980](https://github.com/everett980) in [#515](https://github.com/jaegertracing/jaeger-ui/pull/515))

- **Deep Dependency Graph:** Fix search results DDG path ordering ([@everett980](https://github.com/everett980) in [#504](https://github.com/jaegertracing/jaeger-ui/pull/504))

- **Google Analytics:** Track trace alt views ([@everett980](https://github.com/everett980) in [#512](https://github.com/jaegertracing/jaeger-ui/pull/512))

- **Deep Dependency Graph:** Add adblocker and 0/single node disclaimers ([@everett980](https://github.com/everett980) in [#502](https://github.com/jaegertracing/jaeger-ui/pull/502))

- **Deep Dependency Graph:** Add ddg menu item, fetch server ops, expand GA cov ([@everett980](https://github.com/everett980) in [#501](https://github.com/jaegertracing/jaeger-ui/pull/501))

### Fixes

- **Plexus:** Fix #523 - Arrows are huge on Chrome Canary (Time sensitive) ([@tiffon](https://github.com/tiffon) in [#524](https://github.com/jaegertracing/jaeger-ui/pull/524))

## v1.6.0 (December 16, 2019)

### Enhancements

- **Trace detail:** Jaeger UI visualizing span with multiple parents ([@rubenvp8510](https://github.com/rubenvp8510) in [#477](https://github.com/jaegertracing/jaeger-ui/pull/477))

- **Trace detail:** Support trace-scoped external links similar to tag links ( [@rubenvp8510](https://github.com/rubenvp8510) in [#480](https://github.com/jaegertracing/jaeger-ui/pull/480))

- **Trace detail:** Sort span tags in alphabetical order ([@nabam](https://github.com/nabam) in [#489](https://github.com/jaegertracing/jaeger-ui/pull/489))

- **Deep Dependency Graph:** Ddg optional operation ([@everett980](https://github.com/everett980), [#488](https://github.com/jaegertracing/jaeger-ui/pull/488))

- **Deep Dependency Graph:** Ddg node vis interactions ([@everett980](https://github.com/everett980) in [#483](https://github.com/jaegertracing/jaeger-ui/pull/483))

### Fixes

- **General:** Fixes Jaeger UI broken when accessing via IPv6 address ([@MaheshGPai](https://github.com/MaheshGPai) in [#494](https://github.com/jaegertracing/jaeger-ui/pull/494))

## v1.5.0 (November 4, 2019)

### Enhancements

- **Deep Dependency Graph:** Implement Service-Oriented Deep Dependency Graph (DDG) ([@tiffon](https://github.com/tiffon) and [@everett980](https://github.com/everett980) in [#481](https://github.com/jaegertracing/jaeger-ui/issues/481))

- **Deep Dependency Graph:** Derive DDG from search results ([@rubenvp8510](https://github.com/rubenvp8510) in [#445](https://github.com/jaegertracing/jaeger-ui/pull/445))

- **Configuration:** Allow ui-config.json to specify script tags which are added to UI body ([@everett980](https://github.com/everett980) in [#455](https://github.com/jaegertracing/jaeger-ui/pull/455))

- **Plexus:** Sequester zoom concerns to ZoomManager ([@tiffon](https://github.com/tiffon) in [#409](https://github.com/jaegertracing/jaeger-ui/pull/409))

- **Plexus:** Support multiple layers of nodes and edges ([@tiffon](https://github.com/tiffon) in [#482](https://github.com/jaegertracing/jaeger-ui/issues/482))

- **Google Analytics:** Track filter interactions on trace detail page ([@everett980](https://github.com/everett980) in [#470](https://github.com/jaegertracing/jaeger-ui/pull/470))

### Fixes

- **Google Analytics:** Fix tracking of clear filter & view keyboard shortcut modal ([@everett980](https://github.com/everett980) in [#470](https://github.com/jaegertracing/jaeger-ui/pull/470))

- **Codebase:** Fix codecov reporting ([@tiffon](https://github.com/tiffon) in [#418](https://github.com/jaegertracing/jaeger-ui/pull/418), [#417](https://github.com/jaegertracing/jaeger-ui/pull/417), and[#415](https://github.com/jaegertracing/jaeger-ui/pull/415))

## v1.4.0 (August 31, 2019)

### Enhancements

- **Dependency graph:** Use directed edges ([@Etienne-Carriere](https://github.com/Etienne-Carriere) in [#373](https://github.com/jaegertracing/jaeger-ui/pull/373))

- **Trace detail:** Show seconds in trace start time on the trace page ([@tiffon](https://github.com/tiffon) in [#430](https://github.com/jaegertracing/jaeger-ui/pull/430), with thanks to [@leogomes](https://github.com/leogomes) for [#403](https://github.com/jaegertracing/jaeger-ui/pull/403))

### Fixes

- **Trace detail:** Fix handling of numeric strings in span tag values ([@yntelectual](https://github.com/yntelectual) in [#436](https://github.com/jaegertracing/jaeger-ui/pull/436))

- **Google Analytics:** Fix GA filter category ([@everett980](https://github.com/everett980) in [#404](https://github.com/jaegertracing/jaeger-ui/pull/404))

### Documentation

- **Plexus:** Add a real README for plexus ([@tiffon](https://github.com/tiffon) in [#425](https://github.com/jaegertracing/jaeger-ui/pull/425))

### Chores & Maintenance

- **Codebase:** Add an ESLint rule requiring the names of interfaces to be prefixed with "I" ([@tiffon](https://github.com/tiffon) in [#411](https://github.com/jaegertracing/jaeger-ui/pull/411))

- **General:** Fix typo on README file ([@leogomes](https://github.com/leogomes) in [#402](https://github.com/jaegertracing/jaeger-ui/pull/402))

## v1.3.0 (June 21, 2019)

### Enhancements

- **Search:** Make maximum lookback configurable ([@everett980](https://github.com/everett980) in [#384](https://github.com/jaegertracing/jaeger-ui/pull/384))

- **Trace detail:** Deduplicate tags for spans ([@rubenvp8510](https://github.com/rubenvp8510) in [#375](https://github.com/jaegertracing/jaeger-ui/pull/375))

- **Trace detail:** Wrap span tag values ([@epkugelmass](https://github.com/epkugelmass) in [#388](https://github.com/jaegertracing/jaeger-ui/pull/388))

### Fixes

- **Search:** Validate when tags and/or references fields are arrays. ([@rubenvp8510](https://github.com/rubenvp8510) in [#382](https://github.com/jaegertracing/jaeger-ui/pull/382))

- **Search:** Validate when there is no query but a JSON file is loaded ([@rubenvp8510](https://github.com/rubenvp8510) in [#383](https://github.com/jaegertracing/jaeger-ui/pull/383))

## v1.2.0 (May 14, 2019)

### Enhancements

- **Trace detail:** Limit the thickness of spans in the minimap ([@rubenvp8510](https://github.com/rubenvp8510) in [#372](https://github.com/jaegertracing/jaeger-ui/pull/372))

- **UI find:** Scroll to first match on load or on press of new locate icon ([@everett980](https://github.com/everett980) in [#367](https://github.com/jaegertracing/jaeger-ui/pull/367))

- **UI find:** Move filter state to query param and highlight filter matches on graphs ([@everett980](https://github.com/everett980) in [#310](https://github.com/jaegertracing/jaeger-ui/pull/310))

- **Search:** Improve display of long operation names in Operations list ([@kinghuang](https://github.com/kinghuang) in [#351](https://github.com/jaegertracing/jaeger-ui/pull/351))

### Fixes

- **Search:** Fix "containig" typo ([@yurishkuro](https://github.com/yurishkuro) in [#363](https://github.com/jaegertracing/jaeger-ui/pull/363))

- **Trace detail:** Fixes dragging on the minimap in trace timeline ([Fix #354](https://github.com/jaegertracing/jaeger-ui/issues/354)) ([@rubenvp8510](https://github.com/rubenvp8510) in [#357](https://github.com/jaegertracing/jaeger-ui/pull/357))

- **Trace detail:** Remove extra vertical scrollbar in trace timeline view ([Fix #241](https://github.com/jaegertracing/jaeger-ui/issues/241)) in ([@tiffon](https://github.com/tiffon) in [#350](https://github.com/jaegertracing/jaeger-ui/pull/350))

- **Trace detail:** Process FOLLOWS_FROM spans for indent guides in TraceView ([Fix #333](https://github.com/jaegertracing/jaeger-ui/issues/333)) ([@rubenvp8510](https://github.com/rubenvp8510) in [#335](https://github.com/jaegertracing/jaeger-ui/pull/335))

- **Dev docs:** Replace the wrong link for signing commits ([@sosiska](https://github.com/sosiska) in [#346](https://github.com/jaegertracing/jaeger-ui/pull/346))

### Chores & Maintenance

- **TypeScript:** Convert from Flow to Typescript for Jaeger-UI ([@everett980](https://github.com/everett980) in [#359](https://github.com/jaegertracing/jaeger-ui/pull/359))

- **TypeScript:** Export plexus type declarations, remove Neutrino ([@tiffon](https://github.com/tiffon) in [#348](https://github.com/jaegertracing/jaeger-ui/pull/348))

- **TypeScript:** Shift plexus to TypeScript (from flowtypes) (Contributes to [#306](https://github.com/jaegertracing/jaeger-ui/issues/306)) ([@tiffon](https://github.com/tiffon) in [#331](https://github.com/jaegertracing/jaeger-ui/pull/331))

- **Jaeger UI codebase:** Use memoize-one instead of bespoke solutions ([@rubenvp8510](https://github.com/rubenvp8510) in [#353](https://github.com/jaegertracing/jaeger-ui/pull/353))

- **Jaeger UI codebase:** Update lodash to 4.17.11 ([@tiffon](https://github.com/tiffon) in [#343](https://github.com/jaegertracing/jaeger-ui/pull/343))

## v1.1.0 (March 3, 2019)

### Enhancements

- **Trace detail:** Log Markers on spans ([Fix #119](https://github.com/jaegertracing/jaeger-ui/issues/119)) ([@sfriberg](https://github.com/sfriberg) in [#309](https://github.com/jaegertracing/jaeger-ui/pull/309))

- **Search:** Load trace(s) from a JSON file ([Fix #214](https://github.com/jaegertracing/jaeger-ui/issues/214)) ([@yuribit](https://github.com/yuribit) in [#327](https://github.com/jaegertracing/jaeger-ui/pull/327))

### Fixes

- **Trace detail:** Hide child status icon on SpanTreeOffset used in SpanDetailRow component ([Fix #328](https://github.com/jaegertracing/jaeger-ui/issues/328)) ([@rubenvp8510](https://github.com/rubenvp8510) in [#334](https://github.com/jaegertracing/jaeger-ui/pull/334))

- **Data munging:** Optimize tree walk to avoid excessive function call depth ([Fix #320](https://github.com/jaegertracing/jaeger-ui/issues/320)) ([@rubenvp8510](https://github.com/rubenvp8510) in [#326](https://github.com/jaegertracing/jaeger-ui/pull/326))

### Chores & Maintenance

- **Code quality:** Fix a typo in transform-trace-data.js ([@bhavin192](https://github.com/bhavin192) in [#332](https://github.com/jaegertracing/jaeger-ui/pull/332))

## v1.0.1 (February 15, 2019)

### Fixes

- **Trace detail:** Fix [#323](https://github.com/jaegertracing/jaeger-ui/issues/323) - Browser back button of trace page not working if plot is clicked ([@tacigar](https://github.com/tacigar) in [#324](https://github.com/jaegertracing/jaeger-ui/pull/324))

- **Search:** Fix [#325](https://github.com/jaegertracing/jaeger-ui/issues/325) - JS errors on search form dropdowns ([@tiffon](https://github.com/tiffon) in [#329](https://github.com/jaegertracing/jaeger-ui/pull/329))

## v1.0.0 (January 18, 2019)

### Enhancements

- **Embedded mode:** Revisions to search and trace detail embed mode ([@tiffon](https://github.com/tiffon) in [#286](https://github.com/jaegertracing/jaeger-ui/pull/286))

  - This release establishes our commitment to the `uiEmbed=v0` API
  - A big thanks to [@aljesusg](https://github.com/aljesusg) for getting this off the ground in [#263](https://github.com/jaegertracing/jaeger-ui/pull/263)! :tada:

- **Trace detail:** Add a tree view (aka Trace Graph) to the TracePage ([@copa2](https://github.com/copa2) in [#276](https://github.com/jaegertracing/jaeger-ui/pull/276))

  - Stability: Experimental – See [#293](https://github.com/jaegertracing/jaeger-ui/issues/293) for discussion.
  - Big thanks to [@copa2](https://github.com/copa2) for the contribution! :tada:
  - **We would love to hear feedback!**

- **Trace detail:** Add a copy icon to entries in KeyValuesTable ([#204](https://github.com/jaegertracing/jaeger-ui/issues/204)) ([@everett980](https://github.com/everett980) in [#292](https://github.com/jaegertracing/jaeger-ui/pull/292))

- **Trace detail:** Add a Button to Reset Viewing Layer Zoom ([#215](https://github.com/jaegertracing/jaeger-ui/issues/215)) ([@everett980](https://github.com/everett980) in [#290](https://github.com/jaegertracing/jaeger-ui/pull/290))

- **Trace detail:** Add indent guides to trace timeline view ([#172](https://github.com/jaegertracing/jaeger-ui/issues/172)) ([@everett980](https://github.com/everett980) in [#297](https://github.com/jaegertracing/jaeger-ui/pull/297))

- **Search:** Add popover and prevent submit if duration params are invalid ([#244](https://github.com/jaegertracing/jaeger-ui/issues/244)) ([@everett980](https://github.com/everett980) in [#291](https://github.com/jaegertracing/jaeger-ui/pull/291))

- **Trace comparison:** Add link to timeline view from comparison view and selection ([@everett980](https://github.com/everett980) in [#313](https://github.com/jaegertracing/jaeger-ui/pull/313))

- **Trace DAGs:** Add the ability to copy node data in the Trace Graph and Trace Comparison views ([@everett980](https://github.com/everett980) in [#312](https://github.com/jaegertracing/jaeger-ui/pull/312))

- **Menu configuration:** Ability to open additional menu links in same tab (Resolves [#275](https://github.com/jaegertracing/jaeger-ui/issues/275)) ([@zablvit](https://github.com/zablvit) in [#278](https://github.com/jaegertracing/jaeger-ui/pull/278))

### Fixes

- **Trace detail:** Fix [#269](https://github.com/jaegertracing/jaeger-ui/issues/269) - Fix column resizer overlays trace header ([@tiffon](https://github.com/tiffon) in [#280](https://github.com/jaegertracing/jaeger-ui/pull/280))

### Chores & Maintenance

- **Dev docs:** Update a few links to the new website ([@ledor473](https://github.com/ledor473) in [#287](https://github.com/jaegertracing/jaeger-ui/pull/287))

- **Jaeger UI codebase:** Update create-react-app to 2.1.2 ([@tiffon](https://github.com/tiffon) in [#302](https://github.com/jaegertracing/jaeger-ui/pull/302))

## Changes released in Jaeger 1.8.2 and earlier

These changes are listed in chronological order by the date they were merged into mainz.

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

- Partially addresses [#160](https://github.com/jaegertracing/jaeger-ui/issues/160) - Heuristics for collapsing spans

### [#191](https://github.com/jaegertracing/jaeger-ui/pull/191) Add GA event tracking for actions in trace view

- Partially addresses [#157](https://github.com/jaegertracing/jaeger-ui/issues/157) - Enhanced Google Analytics integration

### [#198](https://github.com/jaegertracing/jaeger-ui/pull/198) Use `<base>` and config webpack at runtime to allow path prefix

- Fix [#42](https://github.com/jaegertracing/jaeger-ui/issues/42) - No support for Jaeger behind a reverse proxy

### [#195](https://github.com/jaegertracing/jaeger-ui/pull/195) Handle Error stored in redux trace.traces

- Fix [#166](https://github.com/jaegertracing/jaeger-ui/issues/166) - JS error on search page after viewing 404 trace

### [#192](https://github.com/jaegertracing/jaeger-ui/pull/192) Change fallback trace name to be more informative

- Fix [#190](https://github.com/jaegertracing/jaeger-ui/issues/190) - Change `cannot-find-trace-name` to `trace-without-root-span`

### [#189](https://github.com/jaegertracing/jaeger-ui/pull/189) Track JS errors in GA

- Fix [#39](https://github.com/jaegertracing/jaeger-ui/issues/39) - Log js client side errors in our server side logs

### [#179](https://github.com/jaegertracing/jaeger-ui/pull/179) Resolve perf issues on the search page

- Fix [#178](https://github.com/jaegertracing/jaeger-ui/issues/178) - Performance regression - Search page

### [#169](https://github.com/jaegertracing/jaeger-ui/pull/169) Use Ant Design instead of Semantic UI

- Fix [#164](https://github.com/jaegertracing/jaeger-ui/issues/164) - Use Ant Design instead of Semantic UI
- Fix [#165](https://github.com/jaegertracing/jaeger-ui/issues/165) - Search results are shown without a date
- Fix [#69](https://github.com/jaegertracing/jaeger-ui/issues/69) - Missing endpoints in jaeger ui dropdown

### [#168](https://github.com/jaegertracing/jaeger-ui/pull/168) Fix 2 digit lookback (12h, 24h) parsing

- Fix [#167](https://github.com/jaegertracing/jaeger-ui/issues/167) - 12 and 24 hour search lookbacks not converted to start timestamp correctly

### [#162](https://github.com/jaegertracing/jaeger-ui/pull/162) Only JSON.parse JSON strings in tags/logs values

- Fix [#146](https://github.com/jaegertracing/jaeger-ui/issues/146) - Tags with string type displayed as integers in UI, bigint js problem

### [#161](https://github.com/jaegertracing/jaeger-ui/pull/161) Add timezone tooltip to custom lookback form-field

- Fix [#154](https://github.com/jaegertracing/jaeger-ui/issues/154) - Explain time zone of the lookback parameter

### [#153](https://github.com/jaegertracing/jaeger-ui/pull/153) Add View Option for raw/unadjusted trace

- Fix [#152](https://github.com/jaegertracing/jaeger-ui/issues/152) - Add View Option for raw/unadjusted trace

### [#147](https://github.com/jaegertracing/jaeger-ui/pull/147) Use logfmt for search tag input format

- Fix [#145](https://github.com/jaegertracing/jaeger-ui/issues/145) - Support logfmt for tags text input in the search form
- Fix [#11](https://github.com/jaegertracing/jaeger-ui/issues/11) - Document allowed operators on tag search

### [#143](https://github.com/jaegertracing/jaeger-ui/pull/143) Add a config value for the DAG cutoff

- Fix [#130](https://github.com/jaegertracing/jaeger-ui/issues/130) - Why maximum dependency length is set to 100 in DAG?

### [#141](https://github.com/jaegertracing/jaeger-ui/pull/141) `package.json#proxy` should proxy all `/api` requests

- Fix [#139](https://github.com/jaegertracing/jaeger-ui/issues/139) - Anyone konw how to open 16686 port?

### [#140](https://github.com/jaegertracing/jaeger-ui/pull/140) Encode service names in API calls

- Fix [#138](https://github.com/jaegertracing/jaeger-ui/issues/138) - Cannot find operations if there is '/' char in serviceName

### [#136](https://github.com/jaegertracing/jaeger-ui/pull/136) Fix endless trace HTTP requests

- Fix [#128](https://github.com/jaegertracing/jaeger-ui/issues/128) - When trace id is invalid, Jaeger UI send this request forever

### [#134](https://github.com/jaegertracing/jaeger-ui/pull/134) Fix trace name resolution

- Fix [#117](https://github.com/jaegertracing/jaeger-ui/issues/117) - traceName relies on traceID to equal spanID
- Fix [#129](https://github.com/jaegertracing/jaeger-ui/issues/129) - ¯*( ツ )*/¯ is not very clear

### [#133](https://github.com/jaegertracing/jaeger-ui/pull/133) Better HTTP error messages

### [#122](https://github.com/jaegertracing/jaeger-ui/pull/122) Make dependencies tab configurable

### [#120](https://github.com/jaegertracing/jaeger-ui/pull/120) Add keyboard shortcut help modal

### [#118](https://github.com/jaegertracing/jaeger-ui/pull/118) Handle `FOLLOWS_FROM` reference type

- Fix [#115](https://github.com/jaegertracing/jaeger-ui/issues/115) - Rendering traces with spans containing a 'FOLLOWS_FROM' reference seems broken

### [#110](https://github.com/jaegertracing/jaeger-ui/pull/110) Fix browser back button not working correctly

- Fix [#94](https://github.com/jaegertracing/jaeger-ui/issues/94) - Browser back button not working correctly

### [#107](https://github.com/jaegertracing/jaeger-ui/pull/107) Embed UI config

The query service can embed custom UI configuration into `index.html`, speeding up the initial page load and allowing custom Google Analytics tracking IDs without requiring the UI bundle to be regenerated. This also lays the ground work for other UI configuration scenarios, in the future.

### [#97](https://github.com/jaegertracing/jaeger-ui/pull/97) Change to Apache license v.2 and add DCO / CONTRIBUTING.md

### [#93](https://github.com/jaegertracing/jaeger-ui/pull/93) Keyboard shortcuts and minimap UX

- Fix [#89](https://github.com/uber/jaeger-ui/issues/89) - [trace view] Drag and release on timeline header row zooms into respective range
- Fix [#23](https://github.com/uber/jaeger-ui/issues/23) - [trace view] Navigate and zoom via minimap
- Fix [#22](https://github.com/uber/jaeger-ui/issues/22) - [trace view] Pan and zoom via keyboard shortcuts

### [#84](https://github.com/jaegertracing/jaeger-ui/pull/84) Improve search dropdowns

- Fix [#79](https://github.com/uber/jaeger-ui/issues/79) - Sort services and operations operations (case insensitive)
- Fix [#31](https://github.com/uber/jaeger-ui/issues/31) - Filter options based on contains instead of starts with
- Fix [#30](https://github.com/uber/jaeger-ui/issues/30) - Filter options based on case insensitive match

### [#78](https://github.com/jaegertracing/jaeger-ui/pull/78) Custom menu via /api/config with project links as defaults

- Fix [#44](https://github.com/uber/jaeger-ui/issues/44) - Add configurable, persistent links to the header
- **Support for this is WIP in query service**

### [#81](https://github.com/jaegertracing/jaeger-ui/pull/81) Fix Google Analytics tracking

### [#77](https://github.com/jaegertracing/jaeger-ui/pull/77) Fix trace mini-map blurry when < 60 spans

### [#74](https://github.com/jaegertracing/jaeger-ui/pull/74) Make left column adjustable in trace detail

### [#71](https://github.com/jaegertracing/jaeger-ui/pull/71) [trave view] Mouseover expands truncated text to full length in left column

### [#68](https://github.com/jaegertracing/jaeger-ui/pull/68) Virtualized scrolling for trace detail view

- Performance improved for initial loading, expanding span details, text search and scrolling

### [#53](https://github.com/jaegertracing/jaeger-ui/pull/53) Refactor trace detail

- Partial fix for [#42](https://github.com/uber/jaeger-ui/issues/42) - Support URL prefix via homepage in package.json
- Scatterplot dots are sized based on number of spans
- Scatterplot dots mouseover shows trace name
- Clicking span detail left column collapses detail
- Clicking anywhere left of parent span name toggles children visibility
- Clip or hide span bars when zoomed in (instead of flush left)
- Label on span bars no longer off-screen
- Full width of the header is clickable for tags, process, and logs headers (instead of header text, only)
- Horizontal scrolling for wide content (e.g. long log values) (Fix [#58](https://github.com/uber/jaeger-ui/issues/58))
- Tall content scrolls via entire table instead of single table cell
- Fix [#55](https://github.com/uber/jaeger-ui/issues/55) - Some tags were not being rendered due to clashing keys (observed in a log message)
- Fix [jaegertracing/jaeger#326](https://github.com/jaegertracing/jaeger/issues/326) - extraneous scrollbars in trace views
- Ticks in span graph made to match trace detail (in number and formatting)
- Fix [#49](https://github.com/uber/jaeger-ui/issues/42) - Span position in graph doesn't not match its position in the detail

### [Changes from before 2017-08-23 are not logged here](https://www.youtube.com/watch?v=NoAzpa1x7jU&feature=youtu.be&t=107)
