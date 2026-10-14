# Migration Guide: Using config.js

This guide shows how to migrate from hardcoded API keys to the centralized `config.js` file.

## Before (Hardcoded)

```javascript
// In listing-search.html or any page
const ALGOLIA_APP_ID = '14I0SKPECJ';
const ALGOLIA_SEARCH_KEY = '3cbf4626a13232dedec995e2b05ba86a';
const ALGOLIA_INDEX_NAME = 'listings';

const algoliaClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);
const algoliaIndex = algoliaClient.initIndex(ALGOLIA_INDEX_NAME);
```

## After (Using config.js)

### Step 1: Include config.js in your HTML

Add this script tag **before** your page-specific scripts:

```html
<!-- In the <head> or before closing </body> -->
<script src="config.js"></script>
<script src="app.js"></script>
<!-- Your page-specific scripts -->
```

**Note**: For nested pages, adjust the path:
- Root pages: `./config.js`
- Pages in `pages/`: `../../config.js`
- Pages in `pages/Community/`: `../../config.js`

### Step 2: Update your code

```javascript
// Replace hardcoded values with config
const ALGOLIA_APP_ID = window.config.algolia.appId;
const ALGOLIA_SEARCH_KEY = window.config.algolia.searchKey;
const ALGOLIA_INDEX_NAME = window.config.algolia.indexName;

// Or use directly
const algoliaClient = algoliasearch(
    window.config.algolia.appId,
    window.config.algolia.searchKey
);
const algoliaIndex = algoliaClient.initIndex(window.config.algolia.indexName);
```

### Step 3: Add safety check

```javascript
// Check if config is loaded
if (!window.config || !window.config.algolia) {
    console.error("Config not loaded. Make sure config.js is included.");
    // Handle error appropriately
    return;
}

const algoliaClient = algoliasearch(
    window.config.algolia.appId,
    window.config.algolia.searchKey
);
```

## Example: Complete Migration

### Before (listing-search.html)

```html
<script>
    const ALGOLIA_APP_ID = '14I0SKPECJ';
    const ALGOLIA_SEARCH_KEY = '3cbf4626a13232dedec995e2b05ba86a';
    const ALGOLIA_INDEX_NAME = 'listings';
    
    let algoliaIndex;
    if (ALGOLIA_APP_ID !== 'YOUR_APP_ID_HERE' && ALGOLIA_SEARCH_KEY !== 'YOUR_SEARCH_ONLY_KEY_HERE') {
        const algoliaClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);
        algoliaIndex = algoliaClient.initIndex(ALGOLIA_INDEX_NAME);
    }
</script>
```

### After (listing-search.html)

```html
<!-- Add config.js before your scripts -->
<script src="config.js"></script>
<script src="app.js"></script>

<script>
    // Use centralized config
    let algoliaIndex;
    
    if (window.config && window.config.algolia) {
        const { appId, searchKey, indexName } = window.config.algolia;
        const algoliaClient = algoliasearch(appId, searchKey);
        algoliaIndex = algoliaClient.initIndex(indexName);
    } else {
        console.error("Algolia config not found. Check config.js");
    }
</script>
```

## Files to Update

The following files currently have hardcoded Algolia keys and should be migrated:

### Root Level
- [x] `listing-search.html` - Example updated in this guide
- [ ] `index.html` - If it has search functionality

### Pages Directory
- [ ] `pages/Personals/*.html` (5 files)
- [ ] `pages/Community/*.html` (6 files)
- [ ] `pages/Jobs/*.html` (7 files)
- [ ] `pages/Services/*.html` (7 files)
- [ ] `pages/For Sale/*.html` (7 files)
- [ ] `pages/housing/*.html` (6 files)

**Total**: ~38 files to update

## Migration Checklist

For each file:

- [ ] Add `<script src="config.js"></script>` (adjust path as needed)
- [ ] Remove hardcoded `ALGOLIA_APP_ID`, `ALGOLIA_SEARCH_KEY`, `ALGOLIA_INDEX_NAME`
- [ ] Replace with `window.config.algolia.*`
- [ ] Add safety check for `window.config`
- [ ] Test that search still works
- [ ] Test language switching still works

## Benefits

✅ **Single source of truth**: Update keys in one place  
✅ **Easier maintenance**: No need to update 38+ files  
✅ **Consistency**: All pages use the same config  
✅ **Future-proof**: Easy to switch to environment variables later  

## Next Steps

After migrating all files:

1. Remove all hardcoded API keys
2. Update `config.js` documentation
3. Consider moving to environment variables for production
4. Add validation to ensure config is loaded before use

## Questions?

- See `IMPROVEMENTS.md` for more improvement suggestions
- See `.github/copilot-instructions.md` for development guidelines

