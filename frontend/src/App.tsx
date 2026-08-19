import { useState } from "react";
import { FolderOpen, Network, PenLine, Plus, StickyNote } from "lucide-react";
import type { Project, ProjectDraft } from "@shared/api/types";
import { Logo, LogoMark, Button, Toast } from "@shared/components";
import { useProjects, useToast } from "@shared/hooks";
import { ProjectCreate, ProjectLibrary } from "@features/project";

type ViewName = "home" | "projects";

export default function App() {
  const [view, setView] = useState<ViewName>("home");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const { toastMessage, showToast } = useToast();
  const { projects, selectedProject, createProject, renameProject, duplicateProject, deleteProject, openProject } =
    useProjects();

  function openCreateModal() {
    setEditingProject(null);
    setModalOpen(true);
  }

  function openRenameModal(project: Project) {
    setEditingProject(project);
    setModalOpen(true);
  }

  function handleModalSubmit(draft: ProjectDraft) {
    if (editingProject) {
      renameProject(editingProject.id, draft);
      showToast("Project updated.");
    } else {
      const project = createProject(draft);
      openProject(project.id);
      showToast("Project created.");
    }
    setModalOpen(false);
    setEditingProject(null);
  }

  function handleOpenProject(id: string) {
    openProject(id);
    showToast("Not yet implemented.");
  }

  function handleDeleteProject(id: string) {
    deleteProject(id);
    showToast("Project deleted.");
  }

  return (
    <div className="app-grid-bg min-h-screen w-full">
      <header className="w-full border-b border-line bg-warm/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <button type="button" onClick={() => setView("home")} aria-label="Return to ResViz home">
            <Logo />
          </button>
          <div className="flex items-center gap-2">
            {selectedProject && (
              <span className="hidden max-w-[12rem] truncate border border-[#b7c7bb] bg-[#edf0e8] px-3 py-2 text-xs font-bold text-[#365448] sm:block">
                {selectedProject.name}
              </span>
            )}
            <Button variant="ghost" onClick={() => setView("projects")}>
              Projects
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-5 py-7 sm:px-8 sm:py-10">
        {view === "home" && (
          <section
            aria-labelledby="home-heading"
            className="relative animate-viewIn overflow-hidden border border-line bg-warm px-6 py-12 shadow-panel sm:px-12"
          >
            <div
              aria-hidden="true"
              className="absolute right-[6%] top-[7%] z-0 h-72 w-72 rounded-full bg-lime opacity-40 blur-[1px]"
            />
            <div className="relative z-10 max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 border border-[#a7bcae] bg-[#edf0e8] px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#365448]">
                Learn by deriving
              </div>
              <h1 id="home-heading" className="max-w-xl text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                Make each resolution step easier to see.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-[#51635a]">
                Build a small logic case, test a goal against your knowledge base, and follow every derived clause in
                a calm, student-friendly trace.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button variant="primary" icon={<Plus size={18} />} onClick={openCreateModal}>
                  Create Project
                </Button>
                <Button variant="secondary" icon={<FolderOpen size={18} />} onClick={() => setView("projects")}>
                  Select Project
                </Button>
              </div>
            </div>
            <div className="relative z-10 mt-12 grid max-w-3xl gap-3 sm:grid-cols-3">
              <div className="border border-line bg-warm/85 p-4">
                <PenLine className="text-teal" size={20} />
                <p className="mt-3 text-sm font-semibold text-[#31463b]">Keep clauses in simple, readable plaintext.</p>
              </div>
              <div className="border border-line bg-warm/85 p-4">
                <Network className="text-teal" size={20} />
                <p className="mt-3 text-sm font-semibold text-[#31463b]">
                  Review the proof one resolution step at a time.
                </p>
              </div>
              <div className="border border-line bg-warm/85 p-4">
                <StickyNote className="text-teal" size={20} />
                <p className="mt-3 text-sm font-semibold text-[#31463b]">Attach useful notes to individual clauses.</p>
              </div>
            </div>
          </section>
        )}

        {view === "projects" && (
          <div className="animate-viewIn">
            <ProjectLibrary
              projects={projects}
              onCreate={openCreateModal}
              onOpen={handleOpenProject}
              onRename={openRenameModal}
              onDuplicate={(id) => {
                duplicateProject(id);
                showToast("Project duplicated.");
              }}
              onDelete={handleDeleteProject}
            />
          </div>
        )}
      </main>

      <footer className="mt-8 w-full border-t border-line bg-warm px-5 py-5 text-center sm:px-8">
        <p className="inline-flex items-center gap-2 text-xs text-muted">
          <LogoMark className="h-6 w-6" /> ResViz · Explore clause logic one derivation at a time.
        </p>
      </footer>

      <ProjectCreate
        open={modalOpen}
        editingProject={editingProject}
        onClose={() => {
          setModalOpen(false);
          setEditingProject(null);
        }}
        onSubmit={handleModalSubmit}
      />

      <Toast message={toastMessage} />
    </div>
  );
}
