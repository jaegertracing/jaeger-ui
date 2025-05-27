# Re-root Trace Feature

This feature allows users to visualize only part of a trace starting from a given span ID.

## How to Use

There are two ways to use this feature:

1. **From the UI**: Click the "Re-root" button on any span in the trace view to focus on that span and its descendants.

2. **Via URL**: Navigate directly to a specific span by using the URL format: `/trace/:traceId/:spanId`

When viewing a re-rooted trace, a "Reset Root" button appears in the header to return to the full trace view.

## Implementation Details

The implementation consists of:

1. **URL Structure**: Updated to support an optional spanId parameter
2. **Trace Subtree Creation**: A utility function that extracts a subtree from a trace
3. **UI Components**: 
   - Re-root buttons on spans
   - Reset Root button in the header
   - Adjusted trace visualization

## Benefits

- Easier navigation of large traces
- Focus on specific parts of complex traces
- Deep linking to specific spans
- Better visualization of subtrees within a trace