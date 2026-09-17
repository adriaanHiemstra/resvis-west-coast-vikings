import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useProjects } from "@shared/hooks/useProjects";
import { ProjectLibrary } from "@features/project/ProjectLibrary";
import type { Project } from "@shared/api/types";

// useProjects is backed by real window.localStorage (via useLocalStorage), and
// the storage keys are fixed strings shared by every hook instance - clear
// between tests so one test's projects can't leak into the next.
beforeEach(() => {
  localStorage.clear();
});

describe("useProjects lifecycle", () => {
  it("creates a project seeded with the default knowledge base and goal", () => {
    const { result } = renderHook(() => useProjects());

    let created!: Project;
    act(() => {
      created = result.current.createProject({ name: "Case A", studentName: "Jane" });
    });

    expect(result.current.projects).toHaveLength(1);
    expect(result.current.projects[0]).toMatchObject({
      id: created.id,
      name: "Case A",
      studentName: "Jane",
      knowledgeBase: "(¬P ∨ Q)\nP",
      goal: "Q",
      annotations: [],
      trace: null,
    });
  });

  it("prepends new projects, so the most recently created one is first", () => {
    const { result } = renderHook(() => useProjects());

    act(() => {
      result.current.createProject({ name: "First", studentName: "A" });
    });
    act(() => {
      result.current.createProject({ name: "Second", studentName: "B" });
    });

    expect(result.current.projects.map((p) => p.name)).toEqual(["Second", "First"]);
  });

  it("opens a project by id and records when it was opened", () => {
    const { result } = renderHook(() => useProjects());

    let created!: Project;
    act(() => {
      created = result.current.createProject({ name: "Case A", studentName: "Jane" });
    });
    expect(result.current.selectedProject).toBeNull();

    act(() => {
      result.current.openProject(created.id);
    });

    expect(result.current.selectedProject?.id).toBe(created.id);
    expect(result.current.selectedProject?.lastOpenedAt).not.toBeNull();
  });

  it("renames a project without touching its other fields", () => {
    const { result } = renderHook(() => useProjects());

    let created!: Project;
    act(() => {
      created = result.current.createProject({ name: "Old Name", studentName: "Jane" });
    });
    const originalKnowledgeBase = result.current.projects[0].knowledgeBase;

    act(() => {
      result.current.renameProject(created.id, { name: "New Name", studentName: "Janet" });
    });

    const renamed = result.current.projects[0];
    expect(renamed.id).toBe(created.id);
    expect(renamed.name).toBe("New Name");
    expect(renamed.studentName).toBe("Janet");
    expect(renamed.knowledgeBase).toBe(originalKnowledgeBase);
  });

  it("duplicates a project with a new id, a 'copy' suffix, fresh annotation ids, and a cleared trace", () => {
    const { result } = renderHook(() => useProjects());

    let created!: Project;
    act(() => {
      created = result.current.createProject({ name: "Original", studentName: "Jane" });
    });
    act(() => {
      result.current.upsertAnnotation(created.id, "P", "It is raining");
    });
    act(() => {
      result.current.setTrace(created.id, {
        verdict: true,
        steps: [],
        stepLimit: 100,
        stepLimitReached: false,
        kbClauses: [],
        goalClause: null,
        transcript: [],
      });
    });

    act(() => {
      result.current.duplicateProject(created.id);
    });

    expect(result.current.projects).toHaveLength(2);
    const [duplicate, original] = result.current.projects;

    expect(duplicate.name).toBe("Original copy");
    expect(duplicate.id).not.toBe(original.id);
    expect(duplicate.trace).toBeNull();
    expect(duplicate.traceIndex).toBe(0);
    expect(duplicate.annotations).toHaveLength(1);
    expect(duplicate.annotations[0].symbol).toBe("P");
    expect(duplicate.annotations[0].id).not.toBe(original.annotations[0].id);
  });

  it("deletes a project and clears the selection if it was the selected one", () => {
    const { result } = renderHook(() => useProjects());

    let created!: Project;
    act(() => {
      created = result.current.createProject({ name: "Doomed", studentName: "Jane" });
    });
    act(() => {
      result.current.openProject(created.id);
    });
    expect(result.current.selectedProject?.id).toBe(created.id);

    act(() => {
      result.current.deleteProject(created.id);
    });

    expect(result.current.projects).toHaveLength(0);
    expect(result.current.selectedProject).toBeNull();
  });

  it("upserts an annotation: the first save inserts, a second save for the same symbol updates in place", () => {
    const { result } = renderHook(() => useProjects());

    let created!: Project;
    act(() => {
      created = result.current.createProject({ name: "Case", studentName: "Jane" });
    });

    act(() => {
      result.current.upsertAnnotation(created.id, "P", "first meaning");
    });
    expect(result.current.projects[0].annotations).toHaveLength(1);
    const firstAnnotationId = result.current.projects[0].annotations[0].id;

    act(() => {
      result.current.upsertAnnotation(created.id, "P", "updated meaning");
    });

    const annotations = result.current.projects[0].annotations;
    expect(annotations).toHaveLength(1);
    expect(annotations[0].id).toBe(firstAnnotationId);
    expect(annotations[0].meaning).toBe("updated meaning");
  });

  it("removes only the targeted annotation, keyed by id rather than symbol", () => {
    const { result } = renderHook(() => useProjects());

    let created!: Project;
    act(() => {
      created = result.current.createProject({ name: "Case", studentName: "Jane" });
    });
    act(() => {
      result.current.upsertAnnotation(created.id, "P", "raining");
    });
    act(() => {
      result.current.upsertAnnotation(created.id, "Q", "wet road");
    });
    const toRemove = result.current.projects[0].annotations.find((a) => a.symbol === "P")!;

    act(() => {
      result.current.removeAnnotation(created.id, toRemove.id);
    });

    const remaining = result.current.projects[0].annotations;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].symbol).toBe("Q");
  });

  it("persists across a fresh hook instance, simulating a page reload", () => {
    const first = renderHook(() => useProjects());
    act(() => {
      first.result.current.createProject({ name: "Survives reload", studentName: "Jane" });
    });

    const second = renderHook(() => useProjects());

    expect(second.result.current.projects).toHaveLength(1);
    expect(second.result.current.projects[0].name).toBe("Survives reload");
  });
});

describe("ProjectLibrary", () => {
  function buildProject(overrides: Partial<Project> = {}): Project {
    return {
      id: "proj-1",
      name: "Alpha Case",
      studentName: "Jane Doe",
      knowledgeBase: "P",
      goal: "Q",
      annotations: [],
      trace: null,
      traceIndex: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      lastOpenedAt: null,
      ...overrides,
    };
  }

  it("filters the visible projects by project name or student name", () => {
    const projects = [
      buildProject({ id: "proj-1", name: "Alpha Case", studentName: "Jane Doe" }),
      buildProject({ id: "proj-2", name: "Beta Case", studentName: "John Smith" }),
    ];

    render(
      <ProjectLibrary
        projects={projects}
        onCreate={() => {}}
        onOpen={() => {}}
        onRename={() => {}}
        onDuplicate={() => {}}
        onDelete={() => {}}
      />,
    );

    expect(screen.getByText("Alpha Case")).toBeTruthy();
    expect(screen.getByText("Beta Case")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Find a project"), { target: { value: "john" } });

    expect(screen.queryByText("Alpha Case")).toBeNull();
    expect(screen.getByText("Beta Case")).toBeTruthy();
  });

  it("only calls onDelete once the confirmation modal is accepted, not on the card's own Delete click", () => {
    const onDelete = vi.fn();
    render(
      <ProjectLibrary
        projects={[buildProject()]}
        onCreate={() => {}}
        onOpen={() => {}}
        onRename={() => {}}
        onDuplicate={() => {}}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByText("Delete this project?")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Keep Project" }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByText("Delete this project?")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Project" }));

    expect(onDelete).toHaveBeenCalledWith("proj-1");
  });
});
