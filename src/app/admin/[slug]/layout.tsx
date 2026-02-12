import { notFound } from 'next/navigation';
import { db, eq } from '@/db';
import { projects } from '@/db/schema';
import { ProjectProvider } from './ProjectContext';
import { AdminSidebar } from '../AdminSidebar';

export default async function ProjectLayout({
  params,
  children,
}: {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}) {
  const { slug } = await params;

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1);

  if (!project) {
    notFound();
  }

  return (
    <div className="flex h-screen" style={{ background: 'var(--admin-bg-page)' }}>
      <ProjectProvider project={project}>
        <AdminSidebar />

        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-[1400px]">
            {children}
          </div>
        </main>
      </ProjectProvider>
    </div>
  );
}
