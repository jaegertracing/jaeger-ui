# Search Page Pagination Implementation

## Overview

This document describes the implementation of **Issue #73: Pagination of search page** - a solution for adding pagination controls and total count display to the Jaeger UI search results.

## Problem Statement

The original search page only supported a simple "limit" parameter that restricted the number of results shown. Users requested:

1. **Pagination controls** to browse through all search results
2. **Total count display** based on search parameters
3. **Page size selection** for better user control

## Solution

The implementation introduces a comprehensive pagination system that:

1. **Replaces the limit field** with a page size selector
2. **Adds pagination controls** with page navigation
3. **Displays total count** in the search results header
4. **Preserves pagination state** in URLs
5. **Maintains backward compatibility** with existing limit parameter

## Key Components

### 1. Type Definitions (`types/search.tsx`)

```typescript
export type SearchQuery = {
  // ... existing fields
  page?: number;
  pageSize?: number;
};

export type SearchResponse = {
  data: any[];
  total?: number;
  errors?: any[];
};

export type PaginationInfo = {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};
```

### 2. Pagination Constants (`constants/search-form.tsx`)

```typescript
export const DEFAULT_PAGE_SIZE = 20;
export const DEFAULT_PAGE = 1;
export const PAGE_SIZE_OPTIONS = ['10', '20', '50', '100'];
export const MAX_PAGE_SIZE = 100;
```

### 3. Search Form Updates (`SearchForm.jsx`)

**Key Changes:**
- Replaced "Limit Results" input with "Page Size" select dropdown
- Added page size options: 10, 20, 50, 100
- Updated form submission to include pagination parameters
- Maintained backward compatibility with resultsLimit

**Form Field:**
```jsx
<FormItem label="Page Size">
  <Select
    name="pageSize"
    value={this.state.formData.pageSize || this.state.formData.resultsLimit}
    onChange={value => this.handleChange({ pageSize: value, resultsLimit: value })}
  >
    <Option value={10}>10</Option>
    <Option value={20}>20</Option>
    <Option value={50}>50</Option>
    <Option value={100}>100</Option>
  </Select>
</FormItem>
```

### 4. Pagination Component (`SearchPagination.tsx`)

```typescript
const SearchPagination: React.FC<SearchPaginationProps> = ({
  currentPage,
  pageSize,
  totalCount,
  totalPages,
  onPageChange,
  loading = false,
}) => {
  return (
    <Pagination
      current={currentPage}
      pageSize={pageSize}
      total={totalCount}
      showSizeChanger
      showQuickJumper
      showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} traces`}
      pageSizeOptions={['10', '20', '50', '100']}
      onChange={handlePageChange}
      onShowSizeChange={handlePageSizeChange}
      disabled={loading}
    />
  );
};
```

### 5. Search Results Updates (`SearchResults/index.tsx`)

**Enhanced Header:**
```jsx
<h2 className="ub-m0 u-flex-1">
  {pagination ? (
    <>
      {pagination.totalCount} Trace{pagination.totalCount !== 1 && 's'} 
      {pagination.totalCount > traces.length && (
        <span className="u-tx-muted"> (showing {traces.length})</span>
      )}
    </>
  ) : (
    <>
      {traces.length} Trace{traces.length > 1 && 's'}
    </>
  )}
</h2>
```

**Pagination Controls:**
```jsx
{traceResultsView && pagination && onPageChange && (
  <SearchPagination
    currentPage={pagination.currentPage}
    pageSize={pagination.pageSize}
    totalCount={pagination.totalCount}
    totalPages={pagination.totalPages}
    onPageChange={onPageChange}
    loading={loading}
  />
)}
```

### 6. Redux State Management (`reducers/trace.js`)

**Enhanced State:**
```javascript
const initialState = {
  traces: {},
  search: {
    query: null,
    results: [],
    pagination: {
      currentPage: 1,
      pageSize: 20,
      totalCount: 0,
      totalPages: 0,
    },
  },
};
```

**Pagination Handling:**
```javascript
function searchDone(state, { meta, payload }) {
  // Extract pagination information from payload
  const totalCount = payload.total || payloadData.length;
  const currentPage = meta.query.page || 1;
  const pageSize = meta.query.pageSize || meta.query.limit || 20;
  const totalPages = Math.ceil(totalCount / pageSize);
  
  const pagination = {
    currentPage,
    pageSize,
    totalCount,
    totalPages,
  };
  
  const search = { ...state.search, results, state: fetchedState.DONE, pagination };
  return { ...state, search, traces, rawTraces: payloadData };
}
```

### 7. Main Page Integration (`SearchTracePage/index.jsx`)

**Page Change Handler:**
```javascript
handlePageChange = (page, pageSize) => {
  const { queryOfResults, searchTraces } = this.props;
  if (queryOfResults) {
    const newQuery = {
      ...queryOfResults,
      page,
      pageSize,
      limit: pageSize, // Keep limit for backward compatibility
    };
    searchTraces(newQuery);
  }
};
```

## Benefits

1. **Enhanced User Experience**: Users can now browse through all search results using pagination controls
2. **Total Count Display**: Shows the total number of traces matching search criteria
3. **Configurable Page Size**: Users can choose how many results to display per page (10, 20, 50, 100)
4. **URL State Preservation**: Pagination state is preserved in URLs for sharing and bookmarking
5. **Backward Compatibility**: Existing URLs with limit parameter continue to work
6. **Performance**: Only loads the requested page of results instead of all results

## Usage

1. **Search for traces** using the existing search form
2. **Select page size** from the dropdown (10, 20, 50, 100 traces per page)
3. **Navigate pages** using the pagination controls at the bottom
4. **View total count** in the search results header
5. **Share URLs** with pagination state preserved

## Testing

The implementation includes:
- Updated unit tests for SearchForm component
- Comprehensive test script (`test-pagination.js`)
- Backward compatibility verification
- Type safety validation

Run tests with:
```bash
npm test -- --testPathPattern=SearchForm.test.js
node test-pagination.js
```

## Backward Compatibility

- Existing URLs with `limit` parameter continue to work
- `limit` parameter is automatically mapped to `pageSize`
- API calls include both `limit` and `pageSize` parameters
- Default behavior remains unchanged for users not using pagination

## Future Enhancements

1. **Server-side Pagination**: Update backend API to support true pagination with total count
2. **Advanced Filtering**: Combine pagination with advanced search filters
3. **Bulk Operations**: Add bulk operations for paginated results
4. **Export Functionality**: Export all results across pages
5. **Performance Optimization**: Implement virtual scrolling for large result sets

This implementation successfully addresses Issue #73 by providing a complete pagination solution that enhances the user experience while maintaining backward compatibility with existing functionality.
