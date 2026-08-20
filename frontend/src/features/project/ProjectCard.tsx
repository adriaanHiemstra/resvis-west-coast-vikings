import { Copy, FolderOpen, Pencil, Trash2 } from "lucide-react";
import type { Project } from "@shared/api/types";
import { formatDate } from "@shared/lib/format";

interface ProjectCardProps {
  project: Project;
  onOpen: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function ProjectCard({ project, onOpen, onRename, onDuplicate, onDelete }: ProjectCardProps) {
  return (
    <article className="border border-line bg-warm p-5 transition-all duration-150 hover:-translate-y-0.5 hover:border-[#86a89c] hover:shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="m-0 text-lg font-bold text-ink">{project.name}</h2>
          <p className="mt-1 text-sm text-[#51635a]">Student: {project.studentName}</p>
        </div>
        <span className="shrink-0 border border-[#a7bcae] bg-[#edf0e8] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#365448]">
          {project.trace ? "Trace saved" : "Draft"}
        </span>
      </div>
      <p className="mt-5 text-xs leading-relaxed text-muted">
        Last opened {formatDate(project.lastOpenedAt)} · Edited {formatDate(project.updatedAt)}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-1.5 border border-forest bg-lime px-3 py-2 text-xs font-bold text-forest transition-transform duration-150 hover:-translate-y-0.5"
        >
          <FolderOpen size={14} /> Open
        </button>
        <button
          type="button"
          onClick={onRename}
          className="inline-flex items-center gap-1.5 border border-[#8fa397] bg-warm px-3 py-2 text-xs font-bold text-[#234438] transition-transform duration-150 hover:-translate-y-0.5"
        >
          <Pencil size={14} /> Rename
        </button>
        <button
          type="button"
          onClick={onDuplicate}
          className="inline-flex items-center gap-1.5 border border-[#8fa397] bg-warm px-3 py-2 text-xs font-bold text-[#234438] transition-transform duration-150 hover:-translate-y-0.5"
        >
          <Copy size={14} /> Duplicate
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-1.5 border border-[#d49a8f] bg-[#fff7f4] px-3 py-2 text-xs font-bold text-[#9b382d] transition-transform duration-150 hover:-translate-y-0.5"
        >
          <Trash2 size={14} /> Delete
        </button>
      </div>
    </article>
  );
}
