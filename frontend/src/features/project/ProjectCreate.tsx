import { useEffect, useState } from "react";
import type { Project, ProjectDraft } from "@shared/api/types";
import { Button, Modal, TextField } from "@shared/components";

interface ProjectCreateProps {
  open: boolean;
  editingProject: Project | null;
  onClose: () => void;
  onSubmit: (draft: ProjectDraft) => void;
}

/* One modal form serving both create and rename - editingProject being
   non-null is what decides which mode this is, in the title and on submit. */
export function ProjectCreate({ open, editingProject, onClose, onSubmit }: ProjectCreateProps) {
  const [name, setName] = useState("");
  const [studentName, setStudentName] = useState("");
  const [error, setError] = useState("");

  /* Re-seeds the form fields every time the modal opens: blank for create,
     or the existing project's values for rename. Runs on `open` rather
     than mount, since this component stays mounted between opens. */
  useEffect(() => {
    if (open) {
      setName(editingProject?.name ?? "");
      setStudentName(editingProject?.studentName ?? "");
      setError("");
    }
  }, [open, editingProject]);

  /* Both fields are required - blocks the actual onSubmit call and shows an
     inline error instead of letting an empty name/student name through. */
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !studentName.trim()) {
      setError("Both project name and student name are required.");
      return;
    }
    onSubmit({ name: name.trim(), studentName: studentName.trim() });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      kicker={editingProject ? "Edit case" : "New learning case"}
      title={editingProject ? "Rename project" : "Create a ResViz project"}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <TextField
          id="project-name"
          label="Project name"
          value={name}
          maxLength={70}
          autoComplete="off"
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <TextField
          id="student-name"
          label="Student name"
          value={studentName}
          maxLength={70}
          autoComplete="name"
          onChange={(e) => setStudentName(e.target.value)}
        />
        {error && (
          <p className="text-sm text-danger-text" role="alert">
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            {editingProject ? "Save changes" : "Save Project"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
