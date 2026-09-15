import { useMemo, useState } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";
import type { DerivationTrace } from "@shared/api/types";
import { buildTreeLayout } from "./fullTreeLayout";
import { TreeNodeBox } from "./TreeNodeBox";

interface FullTreeViewProps {
  trace: DerivationTrace;
  currentIndex: number;
}

const COLUMN_WIDTH = 190;
const ROW_HEIGHT = 76;
const NODE_HALF_WIDTH = 75;

/** Shows every clause in the derivation as one connected diagram, instead of one step at a time. */
export function FullTreeView({ trace, currentIndex }: FullTreeViewProps) {
  const { nodes, edges } = useMemo(() => buildTreeLayout(trace), [trace]);
  const [zoom, setZoom] = useState(1);

  const currentStep = trace.steps[currentIndex];
  const currentNodeIds = new Set(
    currentStep
      ? [
          currentStep.parents[0].id,
          currentStep.parents[1].id,
          currentStep.resolvent ? currentStep.resolvent.id : `empty-${currentStep.index}`,
        ]
      : [],
  );

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const centerOf = (node: { column: number; row: number }) => ({
    x: node.column * COLUMN_WIDTH + NODE_HALF_WIDTH,
    y: node.row * ROW_HEIGHT + ROW_HEIGHT / 2,
  });

  const maxColumn = nodes.reduce((max, node) => Math.max(max, node.column), 0);
  const maxRow = nodes.reduce((max, node) => Math.max(max, node.row), 0);
  const width = (maxColumn + 1) * COLUMN_WIDTH;
  const height = (maxRow + 1) * ROW_HEIGHT;

  return (
    <div className="border-t border-line">
      <div className="flex items-center justify-end gap-2 border-b border-line bg-[#f1f4ec] px-4 py-2">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}
          aria-label="Zoom out"
          className="grid h-7 w-7 place-items-center border border-[#b7c7bb] text-forest hover:bg-[#e3e9dd]"
        >
          <ZoomOut size={13} />
        </button>
        <button
          type="button"
          onClick={() => setZoom(1)}
          className="font-mono text-xs text-[#365448] hover:underline"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(2, z + 0.2))}
          aria-label="Zoom in"
          className="grid h-7 w-7 place-items-center border border-[#b7c7bb] text-forest hover:bg-[#e3e9dd]"
        >
          <ZoomIn size={13} />
        </button>
      </div>

      <div className="trace-scroll overflow-auto p-6">
        <div style={{ width: width * zoom, height: height * zoom }}>
          <div className="relative" style={{ width, height, transform: `scale(${zoom})`, transformOrigin: "top left" }}>
            <svg width={width} height={height} className="absolute left-0 top-0 text-line" aria-hidden="true">
              {edges.map((edge, i) => {
                const from = nodeById.get(edge.fromId);
                const to = nodeById.get(edge.toId);
                if (!from || !to) return null;
                const a = centerOf(from);
                const b = centerOf(to);
                const isCurrent = currentStep?.index === edge.stepIndex;
                return (
                  <line
                    key={i}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={isCurrent ? "#177d78" : "currentColor"}
                    strokeWidth={isCurrent ? 2.5 : 1.5}
                  />
                );
              })}
            </svg>
            {nodes.map((node) => {
              const { x, y } = centerOf(node);
              const tone = node.clause === null ? "final" : node.column === 0 ? "parent" : "resolvent";
              return (
                <div key={node.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: x, top: y }}>
                  <TreeNodeBox clause={node.clause} tone={tone} highlighted={currentNodeIds.has(node.id)} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
