'use client';

import { createContext, useContext } from 'react';
import type { Project } from '@/db/schema/projects';

interface ProjectContextValue {
  project: Project;
  basePath: string; // e.g. "/admin/my-project"
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({
  project,
  children,
}: {
  project: Project;
  children: React.ReactNode;
}) {
  const basePath = `/admin/${project.slug}`;

  return (
    <ProjectContext.Provider value={{ project, basePath }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error('useProject() must be used within a ProjectProvider');
  }
  return ctx;
}
