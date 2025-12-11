// Cache module: stores API responses in memory to avoid duplicate fetches
// Level 400 Requirement: "During one user's visit to your website, you should never fetch any URL more than once."

const APICache = (function () {
  // Private storage for cached data
  const cache = new Map();

  // Statistics for debugging
  const stats = {
    hits: 0,
    misses: 0,
  };

  /**
   * Fetch with caching - if URL was already fetched, return cached data.
   * Otherwise fetch and store the result.
   * @param {string} url - The URL to fetch.
   * @returns {Promise} - Resolves to the JSON data.
   */
  function cachedFetch(url) {
    // Check if we already have this data
    if (cache.has(url)) {
      stats.hits++;
      console.log(
        `[Cache HIT] ${url} (${stats.hits} hits, ${stats.misses} misses)`,
      );
      // Return cached data wrapped in a Promise for consistent API
      return Promise.resolve(cache.get(url));
    }

    // Cache miss - need to fetch
    stats.misses++;
    console.log(
      `[Cache MISS] ${url} - Fetching... (${stats.hits} hits, ${stats.misses} misses)`,
    );

    return fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`API error ${response.status} for ${url}`);
        }
        return response.json();
      })
      .then((data) => {
        // Store in cache
        cache.set(url, data);
        console.log(`[Cache STORED] ${url}`);
        return data;
      });
  }

  /**
   * Clear all cached data (useful for testing or manual refresh)
   */
  function clearCache() {
    const size = cache.size;
    cache.clear();
    stats.hits = 0;
    stats.misses = 0;
    console.log(`[Cache CLEARED] Removed ${size} entries`);
  }

  /**
   * Get cache statistics
   */
  function getStats() {
    return {
      ...stats,
      size: cache.size,
      urls: Array.from(cache.keys()),
    };
  }

  /**
   * Check if a URL is cached
   */
  function has(url) {
    return cache.has(url);
  }

  // Public API
  return {
    fetch: cachedFetch,
    clear: clearCache,
    getStats: getStats,
    has: has,
  };
})();

// Expose cache to window for debugging in console
window.APICache = APICache;
