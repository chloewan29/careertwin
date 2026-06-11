(function initCareerTwinJobSurfaceAdapterRegistry() {
  // Owns registration and lookup for browser-side job surface adapters.
  const adaptersBySource = {};

  function isValidAdapter(adapter) {
    if (!adapter || typeof adapter !== "object") return false;
    if (!adapter.source || typeof adapter.source !== "string") return false;
    if (typeof adapter.matchesUrl !== "function") return false;
    if (typeof adapter.isPageSupported !== "function") return false;
    if (typeof adapter.isReady !== "function") return false;
    if (typeof adapter.extractJob !== "function") return false;
    if (typeof adapter.getStableJobKey !== "function") return false;
    return true;
  }

  function register(adapter) {
    if (!isValidAdapter(adapter)) return;
    adaptersBySource[adapter.source] = adapter;
  }

  function getBySource(source) {
    return adaptersBySource[source] || null;
  }

  function getAll() {
    return Object.values(adaptersBySource);
  }

  function findByUrl(urlLike) {
    const adapters = getAll();
    for (const adapter of adapters) {
      try {
        if (adapter.matchesUrl(urlLike)) return adapter;
      } catch {
        // Ignore adapter errors and continue.
      }
    }
    return null;
  }

  globalThis.CareerTwinJobSurfaceAdapterRegistry = {
    register,
    getBySource,
    getAll,
    findByUrl,
  };
})();
