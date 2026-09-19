import { useCallback, useMemo } from "react";
import type { DerivationTrace, Project, ProjectDraft } from "@shared/api/types";
import { useLocalStorage } from "./useLocalStorage";

const PROJECTS_KEY = "resviz-projects-v1";
const SELECTED_KEY = "resviz-selected-project-v1";

//const DEFAULT_KNOWLEDGE_BASE = "(¬P ∨ Q)\nP";
//const DEFAULT_GOAL = "Q";
const DEFAULT_KNOWLEDGE_BASE = "";
const DEFAULT_GOAL = "";

/* Short, collision-resistant id for a single-session local app - not
   cryptographically unique, just good enough for one browser's own data. */
function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function nowIso() {
  return new Date().toISOString();
}

/* All project state and the actions that change it, backed by
   localStorage (via useLocalStorage) so it survives a page reload. */
export function useProjects() {
  const [projects, setProjects] = useLocalStorage<Project[]>(PROJECTS_KEY, []);
  const [selectedProjectId, setSelectedProjectId] = useLocalStorage<string | null>(SELECTED_KEY, null);

  /* Not stored separately - derived from the two pieces of state above, so
     there's never a second copy of the selected project to drift out of sync. */
  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  /* Seeds a new project with a default knowledge base/goal and prepends it,
     so the most recently created project is always first in the list. */
  const createProject = useCallback(
    (draft: ProjectDraft) => {
      const timestamp = nowIso();
      const project: Project = {
        id: uid("proj"),
        name: draft.name.trim(),
        studentName: draft.studentName.trim(),
        knowledgeBase: DEFAULT_KNOWLEDGE_BASE,
        goal: DEFAULT_GOAL,
        annotations: [],
        trace: null,
        traceIndex: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
        lastOpenedAt: null,
      };
      setProjects((prev) => [project, ...prev]);
      return project;
    },
    [setProjects],
  );

  /* Updates only the name/student name - everything else about the project
     (knowledge base, goal, annotations, trace) is left untouched. */
  const renameProject = useCallback(
    (id: string, draft: ProjectDraft) => {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, name: draft.name.trim(), studentName: draft.studentName.trim(), updatedAt: nowIso() }
            : p,
        ),
      );
    },
    [setProjects],
  );

  /* Clones a project under a new id: annotations get fresh ids too (so
     editing one copy's notes can't affect the other), and the trace/index
     reset, since a copied project hasn't had resolution run on it yet. */
  const duplicateProject = useCallback(
    (id: string) => {
      setProjects((prev) => {
        const source = prev.find((p) => p.id === id);
        if (!source) return prev;
        const timestamp = nowIso();
        const duplicate: Project = {
          ...source,
          id: uid("proj"),
          name: `${source.name} copy`,
          annotations: source.annotations.map((a) => ({ ...a, id: uid("note") })),
          trace: null,
          traceIndex: 0,
          createdAt: timestamp,
          updatedAt: timestamp,
          lastOpenedAt: null,
        };
        return [duplicate, ...prev];
      });
    },
    [setProjects],
  );

  /* Removes the project, and also clears the current selection if the
     deleted project was the one open - otherwise selectedProject would
     keep pointing at an id that no longer exists. */
  const deleteProject = useCallback(
    (id: string) => {
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setSelectedProjectId((current) => (current === id ? null : current));
    },
    [setProjects, setSelectedProjectId],
  );

  /* Marks a project as selected and stamps lastOpenedAt, so the library
     view can show "last opened" without a separate access-log. */
  const openProject = useCallback(
    (id: string) => {
      setSelectedProjectId(id);
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, lastOpenedAt: nowIso() } : p)));
    },
    [setProjects, setSelectedProjectId],
  );

  /* Not currently called anywhere in the UI - the workspace screen only
     ever navigates back to the project library, it never explicitly closes. */
  const closeProject = useCallback(() => setSelectedProjectId(null), [setSelectedProjectId]);

  /* Generic partial update, deliberately restricted (via Pick) to the
     fields the workspace screen actually edits directly - name/studentName
     go through renameProject instead, to keep that validation separate. */
  const updateProject = useCallback(
    (id: string, patch: Partial<Pick<Project, "knowledgeBase" | "goal" | "trace" | "traceIndex">>) => {
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: nowIso() } : p)));
    },
    [setProjects],
  );

  /* Stores a fresh resolution result and resets traceIndex to 0, so the
     step debugger always starts a new trace from the first step. Called
     from App.tsx's handleRun once /resolution/run responds. */
  const setTrace = useCallback(
    (id: string, trace: DerivationTrace | null) => {
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, trace, traceIndex: 0, updatedAt: nowIso() } : p)));
    },
    [setProjects],
  );

  /* Moves the step debugger's current position within an already-stored
     trace - used by the step forward/backward controls. */
  const setTraceIndex = useCallback(
    (id: string, index: number) => {
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, traceIndex: index } : p)));
    },
    [setProjects],
  );

  /* Update/Insert (Upsert), keyed by symbol (not id): at most one annotation per
     symbol per project, so saving an existing symbol edits it in place
     instead of adding a duplicate. */
  const upsertAnnotation = useCallback(
    (id: string, symbol: string, meaning: string) => {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          const timestamp = nowIso();
          const exists = p.annotations.some((a) => a.symbol === symbol);
          const annotations = exists
            ? p.annotations.map((a) => (a.symbol === symbol ? { ...a, meaning, createdAt: timestamp } : a))
            : [{ id: uid("note"), symbol, meaning, createdAt: timestamp }, ...p.annotations];
          return { ...p, annotations, updatedAt: timestamp };
        }),
      );
    },
    [setProjects],
  );

  /* Targets one annotation by its own id, not by symbol - safe even if two
     annotations somehow shared a symbol. */
  const removeAnnotation = useCallback(
    (id: string, annotationId: string) => {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, annotations: p.annotations.filter((a) => a.id !== annotationId), updatedAt: nowIso() }
            : p,
        ),
      );
    },
    [setProjects],
  );

  return {
    projects,
    selectedProjectId,
    selectedProject,
    createProject,
    renameProject,
    duplicateProject,
    deleteProject,
    openProject,
    closeProject,
    updateProject,
    setTrace,
    setTraceIndex,
    upsertAnnotation,
    removeAnnotation,
  };
}
