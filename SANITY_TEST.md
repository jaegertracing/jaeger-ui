# Jaeger UI Manual Sanity Test Runbook

This document provides a set of manual sanity checks to be performed before releasing a new version of Jaeger UI. These tests help ensure that core functionality works as expected, especially when applying dependency updates.

## Prerequisites

- Jaeger all-in-one instance running (e.g., on http://localhost:16686/)
- Some sample traces generated (can be done using the Jaeger all-in-one instance which auto-generates traces)

## Core Features

### Scenario 1: Accessing the UI

**Given** Jaeger all-in-one is running
**When** the user navigates to the Jaeger UI homepage (e.g., http://localhost:16686/)
**Then** the UI should load without errors
**And** the Jaeger logo should be visible in the header
**And** the search form should be displayed

### Scenario 2: Service Selection

**Given** the user is on the Jaeger UI homepage
**When** the user clicks on the Service dropdown
**Then** at least "jaeger-query" service should appear in the dropdown list

### Scenario 3: Finding Traces

**Given** the user is on the Jaeger UI homepage
**When** the user selects a service from the Service dropdown
**And** sets a Lookback of "1 hour"
**And** clicks the "Find Traces" button
**Then** at least one trace should appear in the trace results summary
**And** each trace result should display its duration, service name, and trace ID

### Scenario 4: Viewing Trace Details

**Given** Scenario 3 has been completed
**When** the user clicks on a trace from the results
**Then** the trace detail view should open
**And** the trace timeline should be displayed
**And** the trace spans should be visible
**And** the trace header should show the trace ID and duration

### Scenario 5: Span Detail Inspection

**Given** Scenario 4 has been completed
**When** the user clicks on a span in the trace timeline
**Then** the span detail panel should open
**And** span tags should be displayed
**And** span logs (if any) should be accessible
**And** span process information should be visible

### Scenario 6: Trace Timeline Navigation

**Given** Scenario 4 has been completed
**When** the user uses the mouse wheel to zoom in/out on the timeline
**Then** the timeline should zoom in/out accordingly
**When** the user drags the timeline left/right
**Then** the timeline should pan accordingly

### Scenario 7: Trace Graph View

**Given** Scenario 4 has been completed
**When** the user clicks on the "Graph" tab
**Then** the trace should be displayed as a directed graph
**And** the nodes should represent services
**And** the edges should represent calls between services

### Scenario 8: Trace Statistics View

**Given** Scenario 4 has been completed
**When** the user clicks on the "Statistics" tab
**Then** the trace statistics should be displayed
**And** the statistics should include operation breakdown
**And** the statistics should include duration information

### Scenario 9: Trace JSON View

**Given** Scenario 4 has been completed
**When** the user clicks on the "JSON" tab
**Then** the raw JSON representation of the trace should be displayed

### Scenario 10: Trace Comparison

**Given** the user has found at least two traces
**When** the user selects two traces by clicking the checkboxes
**And** clicks the "Compare Traces" button
**Then** the trace comparison view should open
**And** both traces should be displayed side by side or in a comparison view

### Scenario 11: Dependencies Graph

**Given** the user is on the Jaeger UI homepage
**When** the user clicks on the "Dependencies" link in the navigation
**Then** the dependencies graph should be displayed
**And** the graph should show connections between services

### Scenario 12: Deep Dependencies View

**Given** the user is on the Jaeger UI homepage
**When** the user clicks on the "Deep Dependencies" link in the navigation
**Then** the deep dependencies view should load
**And** the user should be able to select services and operations

### Scenario 13: Search with Tags

**Given** the user is on the Jaeger UI homepage
**When** the user adds a tag filter (e.g., error=true)
**And** clicks the "Find Traces" button
**Then** the results should only include traces matching the tag filter

### Scenario 14: Keyboard Shortcuts

**Given** the user is viewing a trace
**When** the user presses the "?" key
**Then** the keyboard shortcuts help dialog should appear
**When** the user presses the "f" key
**Then** the span search functionality should be activated

### Scenario 15: Trace Archiving

**Given** the user is viewing a trace
**When** the user clicks the "Archive Trace" button (if available)
**Then** a confirmation should appear
**When** the user confirms the archive action
**Then** the trace should be archived successfully

### Scenario 16: Responsive Layout

**Given** the user is on the Jaeger UI homepage
**When** the user resizes the browser window to a mobile size
**Then** the UI should adapt to the smaller screen size
**And** all major functionality should remain accessible

## Additional Features

### Scenario 17: Quality Metrics (if configured)

**Given** the user is on the Jaeger UI homepage
**When** the user clicks on the "Quality Metrics" link in the navigation
**Then** the quality metrics view should load
**And** metrics data should be displayed if configured

### Scenario 18: Monitor View (if configured)

**Given** the user is on the Jaeger UI homepage
**When** the user clicks on the "Monitor" link in the navigation
**Then** the monitor view should load
**And** monitoring data should be displayed if configured

### Scenario 19: Trace Flamegraph View

**Given** Scenario 4 has been completed
**When** the user clicks on the "Flamegraph" tab (if available)
**Then** the trace should be displayed as a flamegraph
**And** the flamegraph should accurately represent the trace hierarchy

### Scenario 20: Trace Search with File Upload

**Given** the user is on the Jaeger UI homepage
**When** the user clicks on the file upload option
**And** uploads a valid JSON trace file
**Then** the trace from the file should be displayed

## Notes for Maintainers

- These tests should be performed on the latest build before releasing a new version
- Any failures should be documented and addressed before proceeding with the release
- Consider updating this document when new features are added to the UI
- When making UI changes, ensure that the corresponding test scenarios are updated

This document serves as both a testing guide and a feature documentation for Jaeger UI. It can be expanded as needed to cover more specific scenarios or edge cases.