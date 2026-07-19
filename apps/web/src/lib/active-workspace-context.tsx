'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

// Shared between the top bar's workspace switcher and the sidebar's board
// list (UX §3) — session-only, no persistence needed for this story.
interface ActiveWorkspaceState {
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (id: string) => void;
}

const ActiveWorkspaceContext = createContext<ActiveWorkspaceState | undefined>(undefined);

export function ActiveWorkspaceProvider({ children }: { children: ReactNode }) {
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);

  return (
    <ActiveWorkspaceContext.Provider value={{ activeWorkspaceId, setActiveWorkspaceId }}>
      {children}
    </ActiveWorkspaceContext.Provider>
  );
}

export function useActiveWorkspace() {
  const ctx = useContext(ActiveWorkspaceContext);
  if (!ctx) throw new Error('useActiveWorkspace must be used within ActiveWorkspaceProvider');
  return ctx;
}
