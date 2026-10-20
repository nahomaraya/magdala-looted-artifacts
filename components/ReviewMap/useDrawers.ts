'use client';

import { useCallback, useState } from 'react';

/**
 * Mobile drawer state. Deliberately separate from the review session: a
 * desktop reader has no drawers, and the session has no opinion about them.
 */
export function useDrawers() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const toggleMenu = useCallback(() => setMenuOpen((s) => !s), []);
  const openDetails = useCallback(() => {
    setDetailsOpen(true);
    setMenuOpen(false);
  }, []);
  const closeAll = useCallback(() => {
    setDetailsOpen(false);
    setMenuOpen(false);
  }, []);

  return { menuOpen, detailsOpen, toggleMenu, openDetails, closeAll, setMenuOpen };
}
