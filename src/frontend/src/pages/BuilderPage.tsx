import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AppWindow,
  Bot,
  Code2,
  Copy,
  Globe,
  ImageIcon,
  Loader2,
  MonitorPlay,
  Paperclip,
  RefreshCw,
  Send,
  User,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Project } from "../backend";
import { Variant_user_assistant } from "../backend";
import { useGetProject, useSendMessageToAI } from "../hooks/useQueries";

interface Props {
  project: Project;
  onProjectUpdate: (p: Project) => void;
}

interface PendingImage {
  file: File;
  base64: string;
  previewUrl: string;
}

function outputTypeLabel(type: string): string {
  if (type === "webpage") return "Webpage";
  if (type === "presentation") return "Presentation";
  if (type === "app") return "App";
  return type || "App";
}

function OutputTypeIcon({
  type,
  className,
}: { type: string; className?: string }) {
  if (type === "webpage") return <Globe className={className} />;
  if (type === "presentation") return <MonitorPlay className={className} />;
  return <AppWindow className={className} />;
}

function outputTypeBadgeClass(type: string): string {
  if (type === "webpage")
    return "text-blue-400 bg-blue-400/10 border-blue-400/30";
  if (type === "presentation")
    return "text-purple-400 bg-purple-400/10 border-purple-400/30";
  return "text-cyan bg-primary/10 border-primary/30";
}

// Strip backend annotation suffix from user messages
function cleanMessageContent(content: string): string {
  return content
    .replace(/\s*\[User also attached an image for reference\]\s*$/, "")
    .trim();
}

export default function BuilderPage({ project, onProjectUpdate }: Props) {
  const projectId = project.id;
  const { data: liveProject } = useGetProject(projectId);
  const sendMessage = useSendMessageToAI();

  const [message, setMessage] = useState("");
  const [htmlContent, setHtmlContent] = useState(project.generatedHTML || "");
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentProject = liveProject || project;

  useEffect(() => {
    if (liveProject) {
      setHtmlContent(liveProject.generatedHTML || "");
      onProjectUpdate(liveProject);
    }
  }, [liveProject, onProjectUpdate]);

  const msgCount = currentProject.conversationHistory.length;
  const isPending = sendMessage.isPending;
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on message count changes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgCount, isPending]);

  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.srcdoc = htmlContent;
    }
  }, [htmlContent]);

  const processImageFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      // Strip data:image/...;base64, prefix to get pure base64
      const base64 = result.split(",")[1] ?? result;
      const previewUrl = result;
      setPendingImages((prev) => [...prev, { file, base64, previewUrl }]);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) processImageFile(file);
    // Reset input so same file can be picked again
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) processImageFile(file);
  };

  const removeImage = (idx: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSend = async () => {
    const msg = message.trim();
    if (!msg || sendMessage.isPending) return;
    const imageBase64 = pendingImages[0]?.base64 ?? null;
    setMessage("");
    setPendingImages([]);
    try {
      await sendMessage.mutateAsync({ projectId, message: msg, imageBase64 });
    } catch (e) {
      toast.error(`AI error: ${e}`);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(htmlContent);
    toast.success("Copied to clipboard!");
  };

  const handleRefreshPreview = () => {
    if (iframeRef.current) {
      iframeRef.current.srcdoc = "";
      setTimeout(() => {
        if (iframeRef.current) iframeRef.current.srcdoc = htmlContent;
      }, 50);
    }
  };

  const outputType = currentProject.outputType || "app";
  const thinkingLabel = `AI is generating your ${outputTypeLabel(outputType).toLowerCase()}...`;

  return (
    <div className="h-full flex overflow-hidden">
      {/* LEFT: AI Chat */}
      <div
        data-ocid="builder.chat.panel"
        className="flex flex-col w-80 flex-shrink-0 border-r border-border"
        style={{ backgroundColor: "oklch(var(--panel-bg))" }}
      >
        {/* Panel Header */}
        <div
          className="flex items-center gap-2 px-4 h-10 border-b border-border"
          style={{ backgroundColor: "oklch(var(--panel-header))" }}
        >
          <Bot className="h-4 w-4 text-cyan" />
          <span className="text-xs font-semibold text-foreground">AI Chat</span>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-3 p-4">
            {currentProject.conversationHistory.length === 0 && (
              <div
                data-ocid="builder.chat.empty_state"
                className="flex flex-col items-center gap-3 py-8 text-center"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                  <Bot className="h-5 w-5 text-cyan" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Describe the {outputTypeLabel(outputType).toLowerCase()} you
                  want to build. You can also attach images for reference.
                </p>
              </div>
            )}
            {currentProject.conversationHistory.map((msg, i) => {
              const isUser = msg.role === Variant_user_assistant.user;
              const msgKey = `msg-${i}-${msg.role}`;
              const cleanedContent = isUser
                ? cleanMessageContent(msg.content)
                : msg.content;
              // Check if original message had image annotation
              const hadImage =
                isUser &&
                msg.content.includes(
                  "[User also attached an image for reference]",
                );
              return (
                <motion.div
                  key={msgKey}
                  data-ocid={`builder.chat.item.${i + 1}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div
                    className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] ${
                      isUser
                        ? "bg-accent/30 text-accent-foreground"
                        : "bg-primary/20 border border-primary/30 text-cyan"
                    }`}
                  >
                    {isUser ? (
                      <User className="h-3 w-3" />
                    ) : (
                      <Bot className="h-3 w-3" />
                    )}
                  </div>
                  <div
                    className={`max-w-[200px] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                      isUser
                        ? "bg-accent/20 text-foreground rounded-tr-sm"
                        : "bg-muted text-foreground rounded-tl-sm border border-border"
                    }`}
                  >
                    {cleanedContent}
                    {hadImage && (
                      <div className="flex items-center gap-1 mt-1.5 opacity-60">
                        <ImageIcon className="h-3 w-3" />
                        <span className="text-[10px]">Image attached</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {/* Thinking bubble */}
            <AnimatePresence>
              {sendMessage.isPending && (
                <motion.div
                  data-ocid="builder.chat.loading_state"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex gap-2"
                >
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 border border-primary/30">
                    <Bot className="h-3 w-3 text-cyan" />
                  </div>
                  <div className="bg-muted border border-border rounded-xl rounded-tl-sm px-3 py-2 flex items-center gap-1.5">
                    <span className="thinking-dot" />
                    <span className="thinking-dot" />
                    <span className="thinking-dot" />
                    <span className="text-xs text-muted-foreground ml-1">
                      {thinkingLabel}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>
        </ScrollArea>

        {/* Input area */}
        <div
          className={`p-3 border-t border-border transition-colors ${
            isDragOver ? "bg-primary/10" : ""
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Image preview strip */}
          {pendingImages.length > 0 && (
            <div className="flex gap-2 mb-2 flex-wrap">
              {pendingImages.map((img, idx) => (
                <div key={img.previewUrl} className="relative group">
                  <img
                    src={img.previewUrl}
                    alt="attachment"
                    className="h-14 w-14 object-cover rounded-lg border border-border"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {isDragOver && (
            <div className="flex items-center justify-center gap-2 mb-2 py-2 rounded-lg border border-dashed border-primary/50 text-xs text-muted-foreground">
              <ImageIcon className="h-3.5 w-3.5 text-cyan" />
              Drop image to attach
            </div>
          )}

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <textarea
                data-ocid="builder.chat.message.textarea"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Describe what to build..."
                rows={2}
                className="w-full resize-none rounded-lg px-3 py-2 text-xs bg-input border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40"
                disabled={sendMessage.isPending}
              />
            </div>
            <div className="flex flex-col gap-1.5 self-end">
              {/* Attach image button */}
              <Button
                data-ocid="builder.chat.upload_button"
                type="button"
                size="icon"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 w-8 border-border text-muted-foreground hover:text-foreground flex-shrink-0"
                title="Attach image"
              >
                <Paperclip className="h-3.5 w-3.5" />
              </Button>
              {/* Send button */}
              <Button
                data-ocid="builder.chat.send.button"
                size="icon"
                onClick={handleSend}
                disabled={!message.trim() || sendMessage.isPending}
                className="h-8 w-8 bg-primary text-primary-foreground hover:bg-primary/90 flex-shrink-0"
              >
                {sendMessage.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileInputChange}
          />
        </div>
      </div>

      {/* CENTER: Code Editor */}
      <div
        data-ocid="builder.code.panel"
        className="flex flex-col flex-1 border-r border-border min-w-0"
        style={{ backgroundColor: "oklch(var(--code-bg))" }}
      >
        {/* Panel Header */}
        <div
          className="flex items-center justify-between px-4 h-10 border-b border-border flex-shrink-0"
          style={{ backgroundColor: "oklch(var(--panel-header))" }}
        >
          <div className="flex items-center gap-2">
            <Code2 className="h-4 w-4 text-cyan" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-foreground px-3 py-1 border-b-2 border-primary/70 bg-muted/40">
                index.html
              </span>
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded border flex items-center gap-1 ${outputTypeBadgeClass(outputType)}`}
              >
                <OutputTypeIcon type={outputType} className="h-2.5 w-2.5" />
                {outputTypeLabel(outputType)}
              </span>
            </div>
          </div>
          <Button
            data-ocid="builder.code.copy.button"
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1.5"
          >
            <Copy className="h-3 w-3" />
            Copy
          </Button>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-hidden">
          {sendMessage.isPending && !htmlContent ? (
            <div
              data-ocid="builder.code.loading_state"
              className="p-4 space-y-2"
            >
              <Skeleton className="h-4 w-full bg-muted" />
              <Skeleton className="h-4 w-3/4 bg-muted" />
              <Skeleton className="h-4 w-5/6 bg-muted" />
            </div>
          ) : (
            <textarea
              data-ocid="builder.code.editor"
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              spellCheck={false}
              className="w-full h-full resize-none p-4 font-mono text-xs leading-relaxed bg-transparent text-foreground placeholder-muted-foreground focus:outline-none"
              placeholder={
                "// Generated HTML will appear here...\n// Chat with AI to generate your app!"
              }
              style={{
                color: "oklch(0.65 0.17 265)",
                caretColor: "oklch(var(--primary))",
              }}
            />
          )}
        </div>
      </div>

      {/* RIGHT: Live Preview */}
      <div
        data-ocid="builder.preview.panel"
        className="flex flex-col w-96 flex-shrink-0"
        style={{ backgroundColor: "oklch(var(--panel-bg))" }}
      >
        {/* Panel Header */}
        <div
          className="flex items-center justify-between px-4 h-10 border-b border-border"
          style={{ backgroundColor: "oklch(var(--panel-header))" }}
        >
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-destructive/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
            </div>
            <span className="text-xs font-semibold text-foreground">
              Live Preview
            </span>
          </div>
          <Button
            data-ocid="builder.preview.refresh.button"
            variant="ghost"
            size="sm"
            onClick={handleRefreshPreview}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1.5"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </Button>
        </div>

        {/* iframe */}
        <div className="flex-1 overflow-hidden bg-white">
          {!htmlContent ? (
            <div
              data-ocid="builder.preview.empty_state"
              className="flex flex-col items-center justify-center h-full gap-3 bg-background"
            >
              <div className="text-4xl">🖥️</div>
              <p className="text-xs text-muted-foreground text-center px-4">
                No preview yet. Chat with AI to generate your{" "}
                {outputTypeLabel(outputType).toLowerCase()}.
              </p>
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              data-ocid="builder.preview.canvas_target"
              srcDoc={htmlContent}
              sandbox="allow-scripts allow-same-origin"
              className="w-full h-full border-0"
              title="Live Preview"
            />
          )}
        </div>
      </div>
    </div>
  );
}
