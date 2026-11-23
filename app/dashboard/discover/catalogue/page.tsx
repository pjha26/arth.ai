import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { CataloguePanel } from './CataloguePanel';

export default async function CataloguePage() {
  await requireStaff();
  return (
    <main className="arth-main grid gap-6">
      <header>
        <Link href="/dashboard/discover" className="underline underline-offset-4">Back to Lead Discovery</Link>
        <h1 className="arth-page-title mt-3">Company catalogue</h1>
        <p className="arth-page-sub">Search business records your team has imported.</p>
      </header>
      {process.env.ENABLE_CSV_CATALOGUE === 'true' ? <CataloguePanel /> : <p>The company catalogue is currently disabled.</p>}
    </main>
  );
}
