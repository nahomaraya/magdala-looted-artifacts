import { useEffect, useMemo, useState } from 'react';
import type { ArtifactCard } from '@/lib/types';

export function useArtifactNav(filteredArtifacts: ArtifactCard[], initialSelectedWpId: string | null = null) {
  const [selectedWpId, setSelectedWpId] = useState<string | null>(initialSelectedWpId ?? filteredArtifacts[0]?.wpId ?? null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);

  useEffect(() => {
    if (filteredArtifacts.length === 0) {
      setSelectedWpId(null);
      return;
    }
    if (!filteredArtifacts.some((a) => a.wpId === selectedWpId)) {
      setSelectedWpId(filteredArtifacts[0]?.wpId ?? null);
    }
  }, [filteredArtifacts, selectedWpId]);

  const selectedIndex = useMemo(
    () => filteredArtifacts.findIndex((a) => a.wpId === selectedWpId),
    [filteredArtifacts, selectedWpId],
  );

  const handleNextArtifact = () => {
    if (filteredArtifacts.length === 0) return;
    const next = selectedIndex < 0 ? 0 : (selectedIndex + 1) % filteredArtifacts.length;
    setSelectedWpId(filteredArtifacts[next]?.wpId ?? null);
    setMobileDetailsOpen(true);
    setMobileMenuOpen(false);
  };

  const handlePreviousArtifact = () => {
    if (filteredArtifacts.length === 0) return;
    const prev =
      selectedIndex < 0 ? 0 : (selectedIndex - 1 + filteredArtifacts.length) % filteredArtifacts.length;
    setSelectedWpId(filteredArtifacts[prev]?.wpId ?? null);
    setMobileDetailsOpen(true);
    setMobileMenuOpen(false);
  };

  return {
    selectedWpId,
    setSelectedWpId,
    selectedIndex,
    mobileMenuOpen,
    setMobileMenuOpen,
    mobileDetailsOpen,
    setMobileDetailsOpen,
    handleNextArtifact,
    handlePreviousArtifact,
  };
}
