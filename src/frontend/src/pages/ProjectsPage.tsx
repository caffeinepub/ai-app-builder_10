import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  AppWindow,
  Clock,
  FolderOpen,
  Globe,
  Loader2,
  MonitorPlay,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { Project } from "../backend";
import {
  useCreateProject,
  useDeleteProject,
  useGetUserProjects,
} from "../hooks/useQueries";

type OutputType = "webpage" | "presentation" | "app";

const OUTPUT_TYPE_OPTIONS: {
  id: OutputType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}[] = [
  {
    id: "webpage",
    label: "Webpage",
    icon: Globe,
    description: "Professional website with modern design",
  },
  {
    id: "presentation",
    label: "Presentation",
    icon: MonitorPlay,
    description: "Reveal.js slide deck with animations",
  },
  {
    id: "app",
    label: "App",
    icon: AppWindow,
    description: "Interactive web application",
  },
];

function outputTypeLabel(type: string): string {
  if (type === "webpage") return "Webpage";
  if (type === "presentation") return "Presentation";
  if (type === "app") return "App";
  return type || "App";
}

function outputTypeColor(type: string): string {
  if (type === "webpage")
    return "text-blue-400 bg-blue-400/10 border-blue-400/30";
  if (type === "presentation")
    return "text-purple-400 bg-purple-400/10 border-purple-400/30";
  return "text-cyan bg-primary/10 border-primary/30";
}

interface Props {
  onOpenProject: (project: Project) => void;
}

function formatDate(ns: bigint): string {
  const ms = Number(ns / 1_000_000n);
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ProjectsPage({ onOpenProject }: Props) {
  const { data: projects, isLoading } = useGetUserProjects();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();

  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [outputType, setOutputType] = useState<OutputType>("app");
  const [deleteId, setDeleteId] = useState<bigint | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createProject.mutateAsync({
        name: newName.trim(),
        description: newDesc.trim(),
        outputType,
      });
      setShowNew(false);
      setNewName("");
      setNewDesc("");
      setOutputType("app");
      toast.success("Project created!");
    } catch (e) {
      toast.error(`Failed to create project: ${e}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteProject.mutateAsync(deleteId);
      setDeleteId(null);
      toast.success("Project deleted.");
    } catch (e) {
      toast.error(`Failed to delete: ${e}`);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Projects</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create and manage your AI-generated apps & websites
            </p>
          </div>
          <Button
            data-ocid="projects.new.button"
            onClick={() => setShowNew(true)}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div
            data-ocid="projects.loading_state"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 rounded-xl bg-muted" />
            ))}
          </div>
        ) : !projects || projects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            data-ocid="projects.empty_state"
            className="flex flex-col items-center justify-center gap-4 py-24 text-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
              <Sparkles className="h-8 w-8 text-cyan" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              No projects yet
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              Start by creating your first AI-powered project. Describe what you
              want and watch it come to life.
            </p>
            <Button
              onClick={() => setShowNew(true)}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 mt-2"
            >
              <Plus className="h-4 w-4" />
              Create First Project
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project, idx) => (
              <motion.div
                key={project.id.toString()}
                data-ocid={`projects.item.${idx + 1}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group relative flex flex-col gap-3 p-5 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-card/80 transition-all cursor-pointer"
                onClick={() => onOpenProject(project)}
              >
                {/* Delete button */}
                <button
                  type="button"
                  data-ocid={`projects.delete_button.${idx + 1}`}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteId(project.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>

                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                    <FolderOpen className="h-4 w-4 text-cyan" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">
                      {project.name}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {project.description || "No description"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(project.updatedAt)}</span>
                    </div>
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${outputTypeColor(project.outputType)}`}
                    >
                      {outputTypeLabel(project.outputType)}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {project.conversationHistory.length} messages
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* New Project Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent
          data-ocid="projects.new.dialog"
          className="bg-card border-border max-w-lg"
        >
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Create New Project
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Output type selector */}
            <div className="space-y-2">
              <Label className="text-sm text-foreground">Output Type</Label>
              <div className="grid grid-cols-3 gap-2">
                {OUTPUT_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    data-ocid={`projects.new.outputtype.${opt.id}.toggle`}
                    onClick={() => setOutputType(opt.id)}
                    className={[
                      "flex flex-col items-center gap-2 p-3 rounded-xl border text-center transition-all",
                      outputType === opt.id
                        ? "border-primary/70 bg-primary/10 text-cyan"
                        : "border-border bg-muted/30 text-muted-foreground hover:border-border/80 hover:bg-muted/50",
                    ].join(" ")}
                  >
                    <opt.icon className="h-5 w-5" />
                    <div>
                      <div className="text-xs font-semibold">{opt.label}</div>
                      <div className="text-[10px] mt-0.5 leading-tight opacity-70">
                        {opt.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm text-foreground">Project Name</Label>
              <Input
                data-ocid="projects.new.name.input"
                placeholder="My Awesome App"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                className="bg-input border-border text-foreground"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-foreground">Description</Label>
              <Textarea
                data-ocid="projects.new.description.textarea"
                placeholder="Describe what you want to build..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="bg-input border-border text-foreground resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              data-ocid="projects.new.cancel.button"
              variant="outline"
              onClick={() => setShowNew(false)}
              className="border-border text-foreground hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              data-ocid="projects.new.submit.button"
              onClick={handleCreate}
              disabled={!newName.trim() || createProject.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {createProject.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Project"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent
          data-ocid="projects.delete.dialog"
          className="bg-card border-border"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              Delete Project?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will permanently delete the project and all its data. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              data-ocid="projects.delete.cancel.button"
              className="border-border text-foreground hover:bg-muted"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="projects.delete.confirm.button"
              onClick={handleDelete}
              disabled={deleteProject.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteProject.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
