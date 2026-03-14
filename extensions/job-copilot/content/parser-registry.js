(function initCareerTwinParserRegistry() {
  // Owns registration and lookup for all platform-specific job page parsers.
  const registry = {};

  function register(platform, parser) {
    if (!platform || typeof parser !== "function") return;
    registry[platform] = parser;
  }

  function get(platform) {
    return registry[platform] || null;
  }

  function getAll() {
    return { ...registry };
  }

  globalThis.CareerTwinParserRegistry = {
    register,
    get,
    getAll,
  };

  // Backwards-compatible global used by existing extraction logic.
  globalThis.CareerTwinPlatformParsers = registry;
})();
