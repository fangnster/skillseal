import type { Metadata } from 'next';
import './style.css';
export const metadata: Metadata = {
  title: 'SkillSeal — Own your workflow',
  description: 'Encrypted Agent Skills with transparent creator payouts.',
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
