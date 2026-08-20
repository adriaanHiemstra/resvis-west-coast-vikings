import { useMemo, useState } from "react";
import { FolderPlus, Search } from "lucide-react";
import type { Project } from "@shared/api/types";
import { Button, Modal } from "@shared/components";
import { ProjectCard } from "./ProjectCard";

interface ProjectLibraryProps {
  projects: Project[];
  onCreate: () => void;
  onOpen: (id: string) => void;
  onRename: (project: Project) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ProjectLibrary({ projects, onCreate, onOpen, onRename, onDuplicate, onDelete }: ProjectLibraryProps) {
  const [search, setSearch] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter(
      (p) => p.name.toLowerCase().includes(query) || p.studentName.toLowerCase().includes(query),
    );
  }, [projects, search]);

  return (
    <section aria-labelledby="projects-heading">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.17em] text-[#517063]">Your local workspace</p>
          <h1 id="projects-heading" className="mt-1 text-3xl font-bold tracking-tight text-ink">
            Project library
          </h1>
          <p className="mt-2 max-w-2xl leading-relaxed text-muted">
            Each project represents one student, case, or practice proof. Your projects stay in this browser.
          </p>
        </div>
        <Button variant="primary" icon={<FolderPlus size={17} />} onClick={onCreate}>
          New Project
        </Button>
      </div>

      <div className="border border-line bg-warm p-4 shadow-panel sm:p-5">
        <label className="mb-2 block text-sm font-bold text-ink" htmlFor="project-search">
          Find a project
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={17} aria-hidden="true" />
          <input
            id="project-search"
            type="search"
            autoComplete="off"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-[#b7c7bb] bg-[#fbfaf5] py-3 pl-10 pr-4 text-sm outline-none focus:border-forest"
            placeholder="Search by project or student name"
          />
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="mt-6 border border-line bg-warm p-10 text-center shadow-panel">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-[#aebcb1] bg-[#edf0e8] text-forest">
            <FolderPlus size={25} />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-ink">Your project library is ready</h2>
          <p className="mx-auto mt-2 max-w-md leading-relaxed text-muted">
            Create a project to begin a new logic case. You can return here whenever you need to open, rename,
            duplicate, or remove it.
          </p>
          <Button variant="primary" icon={<FolderPlus size={17} />} onClick={onCreate} className="mx-auto mt-6">
            New Project
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-6 border border-dashed border-[#aebcb1] bg-warm p-8 text-center text-sm text-muted">
          No projects match that search.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2" aria-live="polite">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onOpen={() => onOpen(project.id)}
              onRename={() => onRename(project)}
              onDuplicate={() => onDuplicate(project.id)}
              onDelete={() => setPendingDeleteId(project.id)}
            />
          ))}
        </div>
      )}

      <Modal open={pendingDeleteId !== null} onClose={() => setPendingDeleteId(null)} kicker="Remove project" title="Delete this project?" tone="danger">
        <p className="leading-relaxed text-[#6f453e]">
          This removes the project, its annotations, and its saved trace from this browser. This action cannot be
          undone.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => setPendingDeleteId(null)}>
            Keep Project
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (pendingDeleteId) onDelete(pendingDeleteId);
              setPendingDeleteId(null);
            }}
          >
            Delete Project
          </Button>
        </div>
      </Modal>
    </section>
  );
}
