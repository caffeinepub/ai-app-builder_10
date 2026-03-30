import { Button } from "@/components/ui/button";
import { Maximize2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import type { Project } from "../backend";
import { useGetProject } from "../hooks/useQueries";

interface Props {
  project: Project;
}

export default function PreviewPage({ project }: Props) {
  const { data: liveProject } = useGetProject(project.id);
  const currentProject = liveProject || project;
  const [key, setKey] = useState(0);

  const html = currentProject.generatedHTML || "";

  const handleRefresh = () => setKey((k) => k + 1);

  const handleFullscreen = () => {
    const iframe = document.getElementById(
      "preview-iframe",
    ) as HTMLIFrameElement;
    iframe?.requestFullscreen?.();
  };

  if (!html) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center gap-4"
        style={{ backgroundColor: "oklch(var(--panel-bg))" }}
      >
        <div className="text-5xl">🖥️</div>
        <h2 className="text-lg font-semibold text-foreground">
          No Preview Available
        </h2>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Go to the Builder tab and chat with AI to generate your website HTML
          first.
        </p>
      </div>
    );
  }

  return (
    <div
      className="h-full flex flex-col"
      style={{ backgroundColor: "oklch(var(--panel-bg))" }}
    >
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-4 h-10 border-b border-border flex-shrink-0"
        style={{ backgroundColor: "oklch(var(--panel-header))" }}
      >
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-destructive/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {currentProject.name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            data-ocid="preview.refresh.button"
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1.5"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </Button>
          <Button
            data-ocid="preview.fullscreen.button"
            variant="ghost"
            size="sm"
            onClick={handleFullscreen}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1.5"
          >
            <Maximize2 className="h-3 w-3" />
            Fullscreen
          </Button>
        </div>
      </div>

      {/* Full preview */}
      <div className="flex-1 overflow-hidden bg-white">
        <iframe
          key={key}
          id="preview-iframe"
          data-ocid="preview.canvas_target"
          srcDoc={html}
          sandbox="allow-scripts allow-same-origin"
          className="w-full h-full border-0"
          title="Preview"
        />
      </div>
    </div>
  );
}
