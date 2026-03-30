import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Key,
  Loader2,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useGetApiKey, useSetApiKey } from "../hooks/useQueries";

const howToSteps = [
  "Go to platform.openai.com",
  "Sign up or log in to your account",
  "Navigate to API Keys section",
  "Create a new secret key and paste it above",
];

export default function SettingsPage() {
  const { data: existingKey, isLoading } = useGetApiKey();
  const setApiKey = useSetApiKey();
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (existingKey) {
      setKey(existingKey);
    }
  }, [existingKey]);

  const handleSave = async () => {
    const trimmed = key.trim();
    if (!trimmed) return;
    try {
      await setApiKey.mutateAsync(trimmed);
      toast.success("API key saved successfully!");
    } catch (e) {
      toast.error(`Failed to save API key: ${e}`);
    }
  };

  const maskedKey = existingKey
    ? `${existingKey.slice(0, 7)}${".".repeat(20)}${existingKey.slice(-4)}`
    : "";

  return (
    <div
      className="h-full overflow-y-auto"
      style={{ backgroundColor: "oklch(var(--background))" }}
    >
      <div className="max-w-2xl mx-auto px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure your AI provider and preferences.
          </p>
        </div>

        {/* API Key Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-xl border border-border bg-card"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
              <Key className="h-4 w-4 text-cyan" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                OpenAI API Key
              </h2>
              <p className="text-xs text-muted-foreground">
                Required to use AI generation features
              </p>
            </div>
          </div>

          {existingKey && (
            <div
              data-ocid="settings.apikey.success_state"
              className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20"
            >
              <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
              <p className="text-xs text-green-400">
                API key is configured:{" "}
                <span className="font-mono">{maskedKey}</span>
              </p>
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm text-foreground">API Key</Label>
              <div className="relative">
                <Input
                  data-ocid="settings.apikey.input"
                  type={showKey ? "text" : "password"}
                  placeholder={
                    existingKey ? "Enter new key to update..." : "sk-..."
                  }
                  value={
                    showKey
                      ? key
                      : key
                        ? `${key.slice(0, 4)}${"\u2022".repeat(20)}${key.slice(-4)}`
                        : ""
                  }
                  onChange={(e) => setKey(e.target.value)}
                  onFocus={() => setShowKey(true)}
                  onBlur={() => setShowKey(false)}
                  className="bg-input border-border text-foreground font-mono pr-10"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              data-ocid="settings.apikey.save.button"
              onClick={handleSave}
              disabled={!key.trim() || setApiKey.isPending || isLoading}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {setApiKey.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save API Key"
              )}
            </Button>
          </div>

          <div className="mt-5 pt-5 border-t border-border">
            <h3 className="text-xs font-semibold text-foreground mb-2">
              How to get an API Key
            </h3>
            <ol className="space-y-1.5">
              {howToSteps.map((step) => (
                <li
                  key={step}
                  className="flex items-start gap-2 text-xs text-muted-foreground"
                >
                  <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-foreground">
                    {howToSteps.indexOf(step) + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <a
              data-ocid="settings.openai.link"
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 text-xs text-cyan hover:underline"
            >
              Open OpenAI Platform
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </motion.div>

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
