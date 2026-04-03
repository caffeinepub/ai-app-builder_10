import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import {
  useGetActiveProvider,
  useGetProviderApiKeys,
  useSetActiveProvider,
  useSetProviderApiKey,
} from "../hooks/useQueries";

interface ProviderConfig {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  placeholder: string;
  apiKeyUrl: string;
  apiKeyLabel: string;
  color: string;
  iconBg: string;
  iconText: string;
  icon: React.ReactNode;
}

const openAiIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className="h-5 w-5"
    role="img"
    aria-label="OpenAI logo"
  >
    <title>OpenAI logo</title>
    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387 2.02-1.168a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.412-.663zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
  </svg>
);

const anthropicIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className="h-5 w-5"
    role="img"
    aria-label="Anthropic logo"
  >
    <title>Anthropic logo</title>
    <path d="M17.3 1.5h-3.6L8.5 22.5h3.7l1.2-3.6h5.2l1.2 3.6h3.7L17.3 1.5zm-3.1 13.7l1.8-5.5 1.8 5.5h-3.6zM6.7 1.5H3L0 22.5h3.7l.8-4.4h4l.8 4.4H13L9.7 1.5H6.7zm-.9 13.2l1.3-7.8 1.3 7.8H5.8z" />
  </svg>
);

const googleIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className="h-5 w-5"
    role="img"
    aria-label="Google logo"
  >
    <title>Google logo</title>
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const providers: ProviderConfig[] = [
  {
    id: "openai",
    name: "OpenAI",
    subtitle: "GPT-4o",
    description:
      "Power your apps with OpenAI's latest GPT-4o model for advanced reasoning and generation.",
    placeholder: "sk-...",
    apiKeyUrl: "https://platform.openai.com/api-keys",
    apiKeyLabel: "Get API Key from OpenAI Platform",
    color: "text-emerald-400",
    iconBg: "bg-emerald-500/10 border-emerald-500/20",
    iconText: "text-emerald-400",
    icon: openAiIcon,
  },
  {
    id: "anthropic",
    name: "Anthropic",
    subtitle: "Claude Opus",
    description:
      "Use Anthropic's Claude Opus — one of the most powerful and safe AI models available.",
    placeholder: "sk-ant-...",
    apiKeyUrl: "https://console.anthropic.com/settings/keys",
    apiKeyLabel: "Get API Key from Anthropic Console",
    color: "text-orange-400",
    iconBg: "bg-orange-500/10 border-orange-500/20",
    iconText: "text-orange-400",
    icon: anthropicIcon,
  },
  {
    id: "google",
    name: "Google",
    subtitle: "Gemini 2.5 Pro",
    description:
      "Harness Google's Gemini 2.5 Pro for multimodal intelligence and long-context reasoning.",
    placeholder: "AIza...",
    apiKeyUrl: "https://aistudio.google.com/app/apikey",
    apiKeyLabel: "Get API Key from Google AI Studio",
    color: "text-blue-400",
    iconBg: "bg-blue-500/10 border-blue-500/20",
    iconText: "text-blue-400",
    icon: googleIcon,
  },
];

function maskKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 7)}${".".repeat(16)}${key.slice(-4)}`;
}

interface ProviderCardProps {
  provider: ProviderConfig;
  existingKey: string | null;
  isActive: boolean;
  onSetActive: () => void;
  isSettingActive: boolean;
}

function ProviderCard({
  provider,
  existingKey,
  isActive,
  onSetActive,
  isSettingActive,
}: ProviderCardProps) {
  const setProviderApiKey = useSetProviderApiKey();
  const [keyValue, setKeyValue] = useState("");
  const [showKey, setShowKey] = useState(false);

  const handleSave = async () => {
    const trimmed = keyValue.trim();
    if (!trimmed) return;
    try {
      await setProviderApiKey.mutateAsync({
        provider: provider.id,
        apiKey: trimmed,
      });
      toast.success(`${provider.name} API key saved!`);
      setKeyValue("");
    } catch (e) {
      toast.error(`Failed to save key: ${e}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={[
        "p-5 rounded-xl border bg-card transition-all duration-200",
        isActive
          ? "border-primary/60 shadow-glow ring-1 ring-primary/20"
          : "border-border hover:border-border/80",
      ].join(" ")}
    >
      {/* Card header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg border ${provider.iconBg} ${provider.iconText} flex-shrink-0`}
          >
            {provider.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                {provider.name}
              </h3>
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 h-4 border-current/30 ${provider.color}`}
              >
                {provider.subtitle}
              </Badge>
              {existingKey && (
                <Badge className="text-[10px] px-1.5 py-0 h-4 bg-green-500/15 text-green-400 border border-green-500/20">
                  <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                  Configured
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed max-w-sm">
              {provider.description}
            </p>
          </div>
        </div>

        {/* Active toggle button */}
        <button
          type="button"
          data-ocid={`settings.${provider.id}.toggle`}
          onClick={onSetActive}
          disabled={isActive || isSettingActive}
          className={[
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border flex-shrink-0",
            isActive
              ? "bg-primary/15 border-primary/40 text-cyan cursor-default"
              : "bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:border-border/80 cursor-pointer",
          ].join(" ")}
        >
          {isSettingActive ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : isActive ? (
            <Zap className="h-3 w-3" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          {isActive ? "Active" : "Set Active"}
        </button>
      </div>

      {/* Existing key display */}
      {existingKey && (
        <div
          data-ocid={`settings.${provider.id}.success_state`}
          className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-green-500/8 border border-green-500/15"
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
          <span className="text-xs text-green-400 font-mono">
            {maskKey(existingKey)}
          </span>
          <span className="text-xs text-muted-foreground ml-auto">
            Key configured
          </span>
        </div>
      )}

      {/* Key input */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            {existingKey ? "Update API Key" : "Enter API Key"}
          </Label>
          <div className="relative">
            <Input
              data-ocid={`settings.${provider.id}.input`}
              type={showKey ? "text" : "password"}
              placeholder={
                existingKey
                  ? "Enter new key to update..."
                  : provider.placeholder
              }
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              className="bg-input border-border text-foreground font-mono text-xs pr-10 h-9"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              aria-label={showKey ? "Hide API key" : "Show API key"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showKey ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <a
            data-ocid={`settings.${provider.id}.link`}
            href={provider.apiKeyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 text-xs hover:underline transition-colors ${provider.color}`}
          >
            <ExternalLink className="h-3 w-3" />
            {provider.apiKeyLabel}
          </a>
          <Button
            data-ocid={`settings.${provider.id}.save.button`}
            size="sm"
            onClick={handleSave}
            disabled={!keyValue.trim() || setProviderApiKey.isPending}
            className="h-8 px-4 bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
          >
            {setProviderApiKey.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Key"
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export default function SettingsPage() {
  const { data: providerKeys, isLoading: isLoadingKeys } =
    useGetProviderApiKeys();
  const { data: activeProvider, isLoading: isLoadingProvider } =
    useGetActiveProvider();
  const setActiveProvider = useSetActiveProvider();

  const resolvedActive = activeProvider ?? "openai";
  const isLoading = isLoadingKeys || isLoadingProvider;

  const handleSetActive = async (providerId: string) => {
    try {
      await setActiveProvider.mutateAsync(providerId);
      const providerName =
        providers.find((p) => p.id === providerId)?.name ?? providerId;
      toast.success(`${providerName} set as active provider`);
    } catch (e) {
      toast.error(`Failed to set active provider: ${e}`);
    }
  };

  return (
    <div
      className="h-full overflow-y-auto"
      style={{ backgroundColor: "oklch(var(--background))" }}
    >
      <div className="max-w-2xl mx-auto px-8 py-8">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure your AI provider and preferences.
          </p>
        </motion.div>

        {/* Active Provider Selector */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-cyan" />
            <h2 className="text-sm font-semibold text-foreground">
              Active AI Provider
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Choose which AI provider powers your app generation. The active
            provider's key must be configured below.
          </p>
          <div
            className="grid grid-cols-3 gap-3"
            data-ocid="settings.provider.panel"
          >
            {providers.map((provider) => {
              const isActive = resolvedActive === provider.id;
              return (
                <button
                  key={provider.id}
                  type="button"
                  data-ocid={`settings.${provider.id}.tab`}
                  onClick={() => handleSetActive(provider.id)}
                  disabled={
                    isActive || isLoading || setActiveProvider.isPending
                  }
                  className={[
                    "flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-all duration-200 cursor-pointer",
                    isActive
                      ? "bg-primary/10 border-primary/50 shadow-glow"
                      : "bg-card border-border hover:border-border/80 hover:bg-muted/40",
                  ].join(" ")}
                >
                  {isLoading ? (
                    <Skeleton className="h-8 w-8 rounded-lg" />
                  ) : (
                    <div
                      className={[
                        "flex h-8 w-8 items-center justify-center rounded-lg border",
                        isActive
                          ? `${provider.iconBg} ${provider.iconText}`
                          : "bg-muted/60 border-border text-muted-foreground",
                      ].join(" ")}
                    >
                      {provider.icon}
                    </div>
                  )}
                  <div>
                    <p
                      className={`text-xs font-semibold ${
                        isActive ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {provider.name}
                    </p>
                    <p
                      className={`text-[10px] ${
                        isActive ? provider.color : "text-muted-foreground/60"
                      }`}
                    >
                      {provider.subtitle}
                    </p>
                  </div>
                  {isActive && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 border border-primary/30">
                      <div className="h-1.5 w-1.5 rounded-full bg-cyan animate-pulse" />
                      <span className="text-[10px] text-cyan font-medium">
                        Active
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Provider API Key Cards */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">API Keys</h2>
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 h-4 text-muted-foreground"
            >
              {
                [
                  providerKeys?.openai,
                  providerKeys?.anthropic,
                  providerKeys?.google,
                ].filter(Boolean).length
              }{" "}
              / 3 configured
            </Badge>
          </div>

          {isLoading
            ? providers.map((p) => (
                <div
                  key={p.id}
                  className="p-5 rounded-xl border border-border bg-card"
                  data-ocid={`settings.${p.id}.loading_state`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                  <Skeleton className="h-9 w-full" />
                </div>
              ))
            : providers.map((provider, i) => {
                const existingKey =
                  provider.id === "openai"
                    ? (providerKeys?.openai ?? null)
                    : provider.id === "anthropic"
                      ? (providerKeys?.anthropic ?? null)
                      : (providerKeys?.google ?? null);

                return (
                  <motion.div
                    key={provider.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.06 }}
                  >
                    <ProviderCard
                      provider={provider}
                      existingKey={existingKey}
                      isActive={resolvedActive === provider.id}
                      onSetActive={() => handleSetActive(provider.id)}
                      isSettingActive={setActiveProvider.isPending}
                    />
                  </motion.div>
                );
              })}
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
