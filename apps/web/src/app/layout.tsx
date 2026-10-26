import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Immo Manager',
    template: '%s · Immo Manager',
  },
  description:
    'Gestion de patrimoine immobilier pour propriétaires particuliers, SCI, sociétés et indivisions.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
