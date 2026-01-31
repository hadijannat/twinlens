/**
 * PrivacySection Component
 * Displays privacy transparency information in the Options page
 */

import { Lock, Wifi, ShieldOff } from 'lucide-react';

interface PrivacyCategory {
  id: string;
  title: string;
  badge: string;
  badgeColor: 'green' | 'yellow' | 'blue';
  description: string;
  items: string[];
}

const PRIVACY_CATEGORIES: PrivacyCategory[] = [
  {
    id: 'local-only',
    title: 'Local-Only (Always Private)',
    badge: 'Local',
    badgeColor: 'green',
    description: 'These features work entirely on your device. No data leaves your browser.',
    items: [
      'AASX/JSON file parsing and validation',
      'Document preview and PDF generation',
      'QR code and barcode scanning',
      'Compare cart and diff analysis',
      'Compliance rule checking',
    ],
  },
  {
    id: 'opt-in-network',
    title: 'Opt-In Network Features',
    badge: 'Network',
    badgeColor: 'yellow',
    description: 'These features require network access and your explicit opt-in.',
    items: [
      'AI Chat — sends asset metadata and your questions to your configured provider',
      'Registry Browser — connects to AAS registries you configure',
      'ID Resolution — probes GS1 and well-known paths for asset links',
      'Page Scanner — fetches URLs found on web pages',
    ],
  },
  {
    id: 'never-sent',
    title: 'Never Sent',
    badge: 'Protected',
    badgeColor: 'blue',
    description: 'This data is never transmitted, even with network features enabled.',
    items: [
      'API keys (stored locally, sent only to your configured endpoint)',
      'Full file contents (only metadata is used for AI context)',
      'Embedded documents and attachments',
      'Your browsing history or other tab data',
    ],
  },
];

function getBadgeClass(color: PrivacyCategory['badgeColor']): string {
  switch (color) {
    case 'green':
      return 'privacy-badge-green';
    case 'yellow':
      return 'privacy-badge-yellow';
    case 'blue':
      return 'privacy-badge-blue';
  }
}

function getCategoryIcon(id: string) {
  switch (id) {
    case 'local-only':
      return <Lock size={16} />;
    case 'opt-in-network':
      return <Wifi size={16} />;
    case 'never-sent':
      return <ShieldOff size={16} />;
    default:
      return <Lock size={16} />;
  }
}

export function PrivacySection() {
  return (
    <div className="privacy-section">
      <p className="privacy-intro">
        TwinLens is privacy-first. Here&apos;s exactly what happens with your data.
      </p>
      <div className="privacy-categories">
        {PRIVACY_CATEGORIES.map((category) => (
          <div key={category.id} className="privacy-category">
            <div className="privacy-category-header">
              <span className="privacy-category-icon">{getCategoryIcon(category.id)}</span>
              <span className="privacy-category-title">{category.title}</span>
              <span className={`privacy-badge ${getBadgeClass(category.badgeColor)}`}>
                {category.badge}
              </span>
            </div>
            <p className="privacy-category-desc">{category.description}</p>
            <ul className="privacy-category-items">
              {category.items.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
