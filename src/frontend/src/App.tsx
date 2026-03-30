import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Bot,
  ChevronDown,
  Eye,
  FolderOpen,
  LogIn,
  LogOut,
  Rocket,
  Settings,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { Project } from "./backend";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import BuilderPage from "./pages/BuilderPage";
import DeployPage from "./pages/DeployPage";
import PreviewPage from "./pages/PreviewPage";
import ProjectsPage from "./pages/ProjectsPage";
import SettingsPage from "./pages/SettingsPage";

export type NavView =
  | "projects"
  | "builder"
  | "preview"
  | "deploy"
  | "settings";

export default function App() {
  const { login, clear, loginStatus, identity, isInitializing } =
    useInternetIdentity();
  const { isFetching } = useActor();
  const [view, setView] = useState<NavView>("projects");
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  const isAuthenticated = loginStatus === "success" && !!identity;

  const principal = identity?.getPrincipal().toString();
  const shortPrincipal = principal
    ? `${principal.slice(0, 5)}...${principal.slice(-3)}`
    : "";

  const openProject = (project: Project) => {
    setActiveProject(project);
    setView("builder");
  };

  const navItems = [
    { id: "projects" as NavView, icon: FolderOpen, label: "Projects" },
    {
      id: "builder" as NavView,
      icon: Bot,
      label: "Build AI",
      disabled: !activeProject,
    },
    {
      id: "preview" as NavView,
      icon: Eye,
      label: "Preview",
      disabled: !activeProject,
    },
    {
      id: "deploy" as NavView,
      icon: Rocket,
      label: "Deploy",
      disabled: !activeProject,
    },
  ];

  if (isInitializing || (isAuthenticated && isFetching)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <Zap className="h-8 w-8 text-cyan" />
            <span className="text-2xl font-bold text-foreground tracking-tight">
              AI Builder
            </span>
          </div>
          <Skeleton className="h-2 w-48 bg-muted" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col items-center gap-8 max-w-md text-center px-6"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 border border-primary/30">
              <Zap className="h-6 w-6 text-cyan" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-foreground">AI Builder</h1>
              <p className="text-xs text-muted-foreground">
                Intelligent App & Website Creator
              </p>
            </div>
          </div>
          <div className="w-full p-8 rounded-2xl border border-border bg-card space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              Welcome Back
            </h2>
            <p className="text-sm text-muted-foreground">
              Sign in with Internet Identity to create AI-powered apps and
              websites.
            </p>
            <Button
              data-ocid="login.button"
              onClick={login}
              disabled={loginStatus === "logging-in"}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 font-semibold"
            >
              {loginStatus === "logging-in" ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Sign In
                </span>
              )}
            </Button>
            {loginStatus === "loginError" && (
              <p
                data-ocid="login.error_state"
                className="text-sm text-destructive text-center"
              >
                Login failed. Please try again.
              </p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Powered by Internet Computer Protocol
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={400}>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        {/* App Header */}
        <header className="fixed top-0 left-0 right-0 z-30 h-12 flex items-center px-4 gap-4 border-b border-border bg-card">
          {/* Brand */}
          <div className="flex items-center gap-2 min-w-[180px]">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 border border-primary/30">
              <Zap className="h-4 w-4 text-cyan" />
            </div>
            <span className="text-sm font-bold text-foreground">
              AI Builder
            </span>
            {activeProject && (
              <>
                <span className="text-border">/</span>
                <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                  {activeProject.name}
                </span>
              </>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* User */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-muted/60 border border-border cursor-pointer">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[10px] bg-primary/20 text-cyan">
                  {shortPrincipal.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-foreground">{shortPrincipal}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={clear}
                  data-ocid="header.logout.button"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Sign Out</TooltipContent>
            </Tooltip>
          </div>
        </header>

        {/* Left Nav Rail */}
        <nav
          data-ocid="nav.panel"
          className="fixed left-0 top-12 bottom-0 z-20 w-16 flex flex-col items-center py-3 gap-1 border-r border-border bg-sidebar"
        >
          {navItems.map((item) => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  data-ocid={`nav.${item.id}.link`}
                  onClick={() => !item.disabled && setView(item.id)}
                  disabled={item.disabled}
                  className={[
                    "flex flex-col items-center gap-1 w-12 py-2 rounded-lg transition-all text-[10px] font-medium",
                    view === item.id
                      ? "bg-primary/15 text-cyan border border-primary/30"
                      : item.disabled
                        ? "text-muted-foreground/40 cursor-not-allowed"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                  ].join(" ")}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {item.disabled ? "Open a project first" : item.label}
              </TooltipContent>
            </Tooltip>
          ))}

          <div className="flex-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                data-ocid="nav.settings.link"
                onClick={() => setView("settings")}
                className={[
                  "flex flex-col items-center gap-1 w-12 py-2 rounded-lg transition-all text-[10px] font-medium",
                  view === "settings"
                    ? "bg-primary/15 text-cyan border border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                ].join(" ")}
              >
                <Settings className="h-5 w-5" />
                <span>Settings</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Settings</TooltipContent>
          </Tooltip>
        </nav>

        {/* Main Content */}
        <main className="ml-16 mt-12 flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              className="h-full"
            >
              {view === "projects" && (
                <ProjectsPage onOpenProject={openProject} />
              )}
              {view === "builder" && activeProject && (
                <BuilderPage
                  project={activeProject}
                  onProjectUpdate={setActiveProject}
                />
              )}
              {view === "preview" && activeProject && (
                <PreviewPage project={activeProject} />
              )}
              {view === "deploy" && activeProject && (
                <DeployPage project={activeProject} />
              )}
              {view === "settings" && <SettingsPage />}
            </motion.div>
          </AnimatePresence>
        </main>

        <Toaster />
      </div>
    </TooltipProvider>
  );
}
