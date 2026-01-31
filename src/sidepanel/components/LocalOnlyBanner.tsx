/**
 * LocalOnlyBanner Component
 * Visual indicator when local-only mode is active
 */

import { WifiOff } from 'lucide-react';

export function LocalOnlyBanner() {
  return (
    <div className="local-only-banner" role="status" aria-live="polite">
      <WifiOff size={14} aria-hidden="true" />
      <span>Local-Only Mode — Network features disabled</span>
    </div>
  );
}
