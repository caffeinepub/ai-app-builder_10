import { Button } from "@/components/ui/button";
import { Download, ExternalLink, Github, Globe, Rocket } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import type { Project } from "../backend";
import { useGetProject } from "../hooks/useQueries";

interface Props {
  project: Project;
}

const deployOptions = [
  {
    name: "Netlify Drop",
    icon: Globe,
    description:
      "Drag and drop your HTML file onto Netlify Drop for instant free hosting.",
    url: "https://app.netlify.com/drop",
    cta: "Open Netlify Drop",
    accent: "text-cyan",
  },
  {
    name: "GitHub Pages",
    icon: Github,
    description:
      "Push your HTML to a GitHub repo and enable GitHub Pages for free static hosting.",
    url: "https://pages.github.com",
    cta: "Learn More",
    accent: "text-foreground",
  },
  {
    name: "Vercel",
    icon: Rocket,
    description:
      "Import your project to Vercel for blazing-fast free hosting with a CDN.",
    url: "https://vercel.com/new",
    cta: "Open Vercel",
    accent: "text-accent-blue",
  },
];

const quickSteps = [
  'Click "Download HTML" above to get your file',
  "Go to app.netlify.com/drop",
  "Drag and drop your HTML file onto the page",
  "Your site is live instantly with a free URL!",
];

export default function DeployPage({ project }: Props) {
  const { data: liveProject } = useGetProject(project.id);
  const currentProject = liveProject || project;
  const html = currentProject.generatedHTML || "";

  const handleDownload = () => {
    if (!html) {
      toast.error("No HTML to download. Generate your app first.");
      return;
    }
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentProject.name.replace(/\s+/g, "-").toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded!");
  };

  return (
    <div
      className="h-full overflow-y-auto"
      style={{ backgroundColor: "oklch(var(--background))" }}
    >
      <div className="max-w-3xl mx-auto px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Deploy</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Download your generated site and host it for free on any static
            hosting platform.
          </p>
        </div>

        {/* Download Section */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-xl border border-border bg-card mb-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-1">
                Download HTML
              </h2>
              <p className="text-xs text-muted-foreground">
                Download your project as a single{" "}
                <code className="text-cyan bg-primary/10 px-1 rounded">
                  index.html
                </code>{" "}
                file.
                {!html && " Go to Builder first to generate HTML."}
              </p>
            </div>
            <Button
              data-ocid="deploy.download.button"
              onClick={handleDownload}
              disabled={!html}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 flex-shrink-0"
            >
              <Download className="h-4 w-4" />
              Download HTML
            </Button>
          </div>

          {html && (
            <div className="mt-4 p-3 rounded-lg bg-muted/40 border border-border">
              <p className="text-xs text-muted-foreground">
                <span className="text-foreground font-medium">
                  {currentProject.name}.html
                </span>{" "}
                — {Math.ceil(html.length / 1024)} KB • Generated HTML
              </p>
            </div>
          )}
        </motion.div>

        {/* Hosting Options */}
        <h2 className="text-sm font-semibold text-foreground mb-3">
          Free Hosting Platforms
        </h2>
        <div className="grid gap-4">
          {deployOptions.map((opt, idx) => (
            <motion.div
              key={opt.name}
              data-ocid={`deploy.hosting.item.${idx + 1}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="flex items-center gap-4 p-5 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-muted border border-border">
                <opt.icon className={`h-5 w-5 ${opt.accent}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground">
                  {opt.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {opt.description}
                </p>
              </div>
              <Button
                data-ocid={`deploy.hosting.link.${idx + 1}`}
                variant="outline"
                size="sm"
                asChild
                className="flex-shrink-0 border-border text-foreground hover:bg-muted gap-1.5"
              >
                <a href={opt.url} target="_blank" rel="noopener noreferrer">
                  {opt.cta}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Steps Guide */}
        <div className="mt-6 p-5 rounded-xl border border-border bg-card">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Quick Deploy Steps (Netlify)
          </h3>
          <ol className="space-y-2">
            {quickSteps.map((step) => (
              <li
                key={step}
                className="flex items-start gap-3 text-xs text-muted-foreground"
              >
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-cyan text-[10px] font-bold">
                  {quickSteps.indexOf(step) + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()}. Built with ❤️ using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan hover:underline"
            >
              caffeine.ai
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
