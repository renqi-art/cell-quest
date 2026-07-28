(() => {
  'use strict';

  try {
    localStorage.removeItem('cellQuest_ds_key');
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
})();
