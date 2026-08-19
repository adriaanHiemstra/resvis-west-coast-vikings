import { useCallback, useMemo } from "react";
import type { DerivationTrace, Project, ProjectDraft } from "@shared/api/types";
import { useLocalStorage } from "./useLocalStorage";

const PROJECTS_KEY = "resviz-projects-v1";
const SELECTED_KEY = "resviz-selected-project-v1";

const DEFAULT_KNOWLEDGE_BASE = "¬Rain ∨ WetRoad\nRain";
const DEFAULT_GOAL = "WetRoad";

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function nowIso() {
  return new Date().toISOString();
}

export function useProjects() {
  const [projects, setProjects] = useLocalStorage<Project[]>(PROJECTS_KEY, []);
  const [selectedProjectId, setSelectedProjectId] = useLocalStorage<string | null>(SELECTED_KEY, null);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

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

  const deleteProject = useCallback(
    (id: string) => {
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setSelectedProjectId((current) => (current === id ? null : current));
    },
    [setProjects, setSelectedProjectId],
  );

  const openProject = useCallback(
    (id: string) => {
      setSelectedProjectId(id);
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, lastOpenedAt: nowIso() } : p)));
    },
    [setProjects, setSelectedProjectId],
  );

  const closeProject = useCallback(() => setSelectedProjectId(null), [setSelectedProjectId]);

  const updateProject = useCallback(
    (id: string, patch: Partial<Pick<Project, "knowledgeBase" | "goal" | "trace" | "traceIndex">>) => {
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: nowIso() } : p)));
    },
    [setProjects],
  );

  const setTrace = useCallback(
    (id: string, trace: DerivationTrace | null) => {
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, trace, traceIndex: 0, updatedAt: nowIso() } : p)));
    },
    [setProjects],
  );

  const setTraceIndex = useCallback(
    (id: string, index: number) => {
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, traceIndex: index } : p)));
    },
    [setProjects],
  );

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
