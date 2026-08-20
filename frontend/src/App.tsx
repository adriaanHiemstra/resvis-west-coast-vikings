import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FolderOpen, Network, PenLine, Plus, StickyNote } from "lucide-react";
import type { Project, ProjectDraft } from "@shared/api/types";
import { Logo, LogoMark, Button, Toast } from "@shared/components";
import { formatDate } from "@shared/lib/format";
import { useProjects, useToast } from "@shared/hooks";
import { ProjectCreate, ProjectLibrary } from "@features/project";
import { KnowledgeBaseUpload, ClauseReview } from "@features/knowledge-base";
import { PropositionEditor } from "@features/proposition-input";

type ViewName = "home" | "projects" | "workspace";

export default function App() {
  const [view, setView] = useState<ViewName>("home");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const { toastMessage, showToast } = useToast();
  const {
    projects,
    selectedProject,
    createProject,
    renameProject,
    duplicateProject,
    deleteProject,
    openProject,
    updateProject,
    upsertAnnotation,
    removeAnnotation,
  } = useProjects();

  useEffect(() => {
    if (view === "workspace" && !selectedProject) setView("projects");
  }, [view, selectedProject]);

  const editorSummary = useMemo(() => {
    if (!selectedProject) return "";
    const clauseCount = selectedProject.knowledgeBase
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean).length;
    const goalReady = selectedProject.goal.trim() !== "";
    return `${clauseCount} knowledge clause${clauseCount === 1 ? "" : "s"} · ${goalReady ? "goal ready" : "add a goal"}`;
  }, [selectedProject]);

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
      setView("workspace");
      showToast("Project created.");
    }
    setModalOpen(false);
    setEditingProject(null);
  }

  function handleOpenProject(id: string) {
    openProject(id);
    setView("workspace");
  }

  function handleDeleteProject(id: string) {
    deleteProject(id);
    showToast("Project deleted.");
  }

  function handleRun() {
    showToast("The resolution engine is not yet implemented. This is a placeholder.");
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
                a step-wise resolution trace.
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
                <p className="mt-3 text-sm font-semibold text-[#31463b]">Attach useful notes to individual symbols.</p>
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

        {view === "workspace" && selectedProject && (
          <section aria-labelledby="workspace-heading" className="animate-viewIn">
            <div className="mb-6 flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.17em] text-[#517063]">Resolution workspace</p>
                <h1 id="workspace-heading" className="mt-1 text-3xl font-bold tracking-tight text-ink">
                  Resolve a logical goal
                </h1>
                <p className="mt-2 text-sm text-muted">
                  Student: {selectedProject.studentName} · Last edited {formatDate(selectedProject.updatedAt)}
                </p>
              </div>
              <Button variant="secondary" icon={<ArrowLeft size={16} />} onClick={() => setView("projects")}>
                All Projects
              </Button>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(330px,0.8fr)]">
              <div className="space-y-6">
                <KnowledgeBaseUpload
                  value={selectedProject.knowledgeBase}
                  error={null}
                  projectName={selectedProject.name}
                  onChange={(value) => updateProject(selectedProject.id, { knowledgeBase: value })}
                />
                <PropositionEditor
                  value={selectedProject.goal}
                  error={null}
                  summary={editorSummary}
                  running={false}
                  onChange={(value) => updateProject(selectedProject.id, { goal: value })}
                  onRun={handleRun}
                />
              </div>
              <aside className="space-y-6">
                <ClauseReview
                  knowledgeBase={selectedProject.knowledgeBase}
                  annotations={selectedProject.annotations}
                  onSave={(symbol, meaning) => upsertAnnotation(selectedProject.id, symbol, meaning)}
                  onRemove={(annotationId) => removeAnnotation(selectedProject.id, annotationId)}
                />
              </aside>
            </div>
          </section>
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
