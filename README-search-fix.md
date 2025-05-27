# Fix for Search on Attributes with Special Characters

This PR fixes issue #633 where searching on attributes with special characters like `#`, `?`, `+`, and `&` was broken.

## Problem

When searching for tags with special characters, the search would fail in different ways:
- Hash (`#`) characters would cause the search to not find any results
- Ampersand (`&`) characters would cause an Internal error 500
- Plus (`+`) and question mark (`?`) characters would cause issues when used at both the beginning and end of values

## Solution

The solution implements two key fixes:

1. Added an `encodeTagValue` function in `SearchForm.jsx` that properly encodes problematic characters:
   ```javascript
   export function encodeTagValue(value) {
     if (!value) return value;
     
     // Encode special characters that cause issues in search
     return value
       .replace(/#/g, '%23')
       .replace(/\?/g, '%3F')
       .replace(/\+/g, '%2B')
       .replace(/&/g, '%26');
   }
   ```

2. Modified the `submitForm` function to process tags and encode special characters before submitting the search:
   ```javascript
   // Process tags to encode special characters
   let processedTags = tags;
   if (tags) {
     const data = logfmtParser.parse(tags);
     Object.keys(data).forEach(key => {
       const value = data[key];
       if (typeof value === 'string') {
         data[key] = encodeTagValue(value);
       }
     });
     processedTags = logfmtStringify(data);
   }
   ```

3. Updated the `getJSON` function in `jaeger.js` to ensure proper encoding of query parameters:
   ```javascript
   queryStr = `?${typeof query === 'string' ? query : queryString.stringify(query, { encode: true })}`;
   ```

4. Added a note in the UI help text to inform users that special characters are automatically encoded when searching.

## Testing

The fix has been tested with the following tag patterns:
- `hash=#value#` - Now works correctly
- `ampersand=&value&` - Now works correctly
- `plus=+value+` - Now works correctly
- `question=?value?` - Now works correctly

All searches now return the expected results without errors.