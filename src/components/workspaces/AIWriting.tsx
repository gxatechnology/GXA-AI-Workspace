import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Bookmark,
  Check,
  ChevronDown,
  Copy,
  Download,
  Eye,
  FileText,
  FolderPlus,
  Loader2,
  LockKeyhole,
  Menu,
  PanelRight,
  Plus,
  RotateCw,
  Save,
  Search,
  Sparkles,
  Square,
  Trash2,
  Upload,
  WandSparkles,
  X,
} from "lucide-react";
import {
  WRITER_CATEGORIES,
  WRITER_LANGUAGES,
  WRITER_LENGTHS,
  WRITER_TEMPLATES,
  type WriterExportFormat,
  type WriterFieldDefinition,
  type WriterTemplateDefinition,
} from "../../../shared/writerRegistry";
import type { WorkspaceId } from "../../types";
import {
  fetchSystemConfig,
  fetchUsage,
  isUserPremium,
  type SystemConfig,
  type UsageStats,
} from "../../utils/limits";
import { generateWriterContent, WriterApiError } from "../../utils/writer";

interface AIWritingProps {
  currentUser?: any;
  onOpenUpgradeModal?: () => void;
  initialText?: string;
  onSelectWorkspace?: (id: WorkspaceId) => void;
  setSharedText?: (text: string) => void;
}

interface ProjectItem {
  id: string;
  name: string;
}
interface SavedPrompt {
  id: string;
  title: string;
  prompt: string;
}
interface DocumentVersion {
  id: string;
  title: string;
  content: string;
  timestamp: number;
}
type MobilePane = "templates" | "editor" | "preview";
type TemplateView =
  | "recommended"
  | "favorites"
  | "recent"
  | "free"
  | "pro"
  | "new"
  | "all";

const countWords = (value: string) =>
  value.trim() ? value.trim().split(/\s+/).length : 0;
const readingTime = (value: string) =>
  value.trim() ? Math.max(1, Math.ceil(countWords(value) / 225)) : 0;
const planLabel = (plan: string) =>
  plan === "pro_plus" ? "Pro Plus" : plan === "pro" ? "Pro" : "Free";
const authUserFromStorage = () => {
  try {
    const stored = JSON.parse(localStorage.getItem("gxa_user") || "null");
    return stored?.sessionToken && !stored?.guest ? stored : null;
  } catch {
    return null;
  }
};
const defaultsFor = (template: WriterTemplateDefinition) =>
  Object.fromEntries(
    template.inputFields.map((field) => [field.id, field.defaultValue || ""]),
  );
const errorMessageFor = (field: WriterFieldDefinition) =>
  field.validationMessage || `${field.label} is required.`;

function AccessibleDialog({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => closeRef.current?.focus(), 0);
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="writer-dialog-title"
        aria-describedby={description ? "writer-dialog-description" : undefined}
        className="relative max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 sm:p-6"
      >
        <button
          ref={closeRef}
          onClick={onClose}
          aria-label={`Close ${title}`}
          className="absolute right-4 top-4 rounded-xl p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:hover:bg-zinc-800"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="pr-12">
          <h2
            id="writer-dialog-title"
            className="text-xl font-black text-slate-950 dark:text-white"
          >
            {title}
          </h2>
          {description && (
            <p
              id="writer-dialog-description"
              className="mt-1 text-sm leading-6 text-slate-500 dark:text-zinc-400"
            >
              {description}
            </p>
          )}
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

export default function AIWriting({
  currentUser,
  onOpenUpgradeModal,
  initialText = "",
  onSelectWorkspace,
  setSharedText,
}: AIWritingProps) {
  const authenticatedUser = useMemo(
    () =>
      currentUser?.sessionToken && !currentUser?.guest
        ? currentUser
        : authUserFromStorage(),
    [currentUser],
  );
  const authenticated = Boolean(authenticatedUser?.sessionToken);
  const [activeTemplateId, setActiveTemplateId] = useState("ai-writer");
  const activeTemplate = useMemo(
    () =>
      WRITER_TEMPLATES.find((template) => template.id === activeTemplateId) ||
      WRITER_TEMPLATES[0],
    [activeTemplateId],
  );
  const [templateValues, setTemplateValues] = useState<
    Record<string, Record<string, string>>
  >(() => ({ "ai-writer": defaultsFor(WRITER_TEMPLATES[0]) }));
  const [templateQuery, setTemplateQuery] = useState("");
  const [templateView, setTemplateView] = useState<TemplateView>("recommended");
  const [templateCategory, setTemplateCategory] = useState("All categories");
  const [templatePreview, setTemplatePreview] =
    useState<WriterTemplateDefinition | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [mobilePane, setMobilePane] = useState<MobilePane>("editor");
  const [laptopPane, setLaptopPane] = useState<"editor" | "preview">("editor");

  const [title, setTitle] = useState("");
  const [existingContent, setExistingContent] = useState(initialText);
  const [result, setResult] = useState("");
  const [selectedText, setSelectedText] = useState("");
  const [selectedRange, setSelectedRange] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [purpose, setPurpose] = useState("inform");
  const [tone, setTone] = useState("professional");
  const [language, setLanguage] = useState("English");
  const [length, setLength] = useState("medium");
  const [readingLevel, setReadingLevel] = useState("general");
  const [keywords, setKeywords] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generationError, setGenerationError] = useState("");
  const [generationStatus, setGenerationStatus] =
    useState("Ready to generate.");
  const [loading, setLoading] = useState(false);
  const [lastGeneratedSignature, setLastGeneratedSignature] = useState("");
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [online, setOnline] = useState(() => navigator.onLine);
  const requestControllerRef = useRef<AbortController | null>(null);
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  const importRef = useRef<HTMLInputElement>(null);

  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [limitsLoading, setLimitsLoading] = useState(true);
  const [premium, setPremium] = useState(() => isUserPremium(currentUser));

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [projectStatus, setProjectStatus] = useState<
    "guest" | "loading" | "ready" | "empty" | "error"
  >("guest");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectBusy, setProjectBusy] = useState(false);
  const [projectMessage, setProjectMessage] = useState("");

  const [promptLibrary, setPromptLibrary] = useState<SavedPrompt[]>([]);
  const [promptStatus, setPromptStatus] = useState<
    "guest" | "ready" | "empty" | "error"
  >("guest");
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);
  const [promptTitle, setPromptTitle] = useState("");
  const [promptText, setPromptText] = useState("");
  const [versions, setVersions] = useState<DocumentVersion[]>([]);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLimitsLoading(true);
    Promise.all([fetchSystemConfig(), fetchUsage(authenticatedUser)])
      .then(([nextConfig, nextUsage]) => {
        if (!cancelled) {
          setConfig(nextConfig);
          setUsage(nextUsage);
          setPremium(isUserPremium(authenticatedUser));
        }
      })
      .finally(() => {
        if (!cancelled) setLimitsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authenticatedUser]);

  const loadProjects = async () => {
    if (!authenticatedUser) {
      setProjectStatus("guest");
      setProjects([]);
      return;
    }
    setProjectStatus("loading");
    try {
      const response = await fetch("/api/projects", {
        headers: { Authorization: `Bearer ${authenticatedUser.sessionToken}` },
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(body.error || "Projects could not be loaded.");
      const nextProjects = Array.isArray(body.projects) ? body.projects : [];
      setProjects(nextProjects);
      setProjectStatus(nextProjects.length ? "ready" : "empty");
    } catch {
      setProjects([]);
      setProjectStatus("error");
    }
  };

  useEffect(() => {
    loadProjects();
  }, [authenticatedUser]);

  useEffect(() => {
    if (!authenticated) {
      setPromptStatus("guest");
      setPromptLibrary([]);
      return;
    }
    try {
      const storedPrompts = JSON.parse(
        localStorage.getItem("gxa_writer_saved_prompts") || "[]",
      );
      const storedFavorites = JSON.parse(
        localStorage.getItem("gxa_writer_favorites") || "[]",
      );
      const storedRecent = JSON.parse(
        localStorage.getItem("gxa_writer_recent") || "[]",
      );
      const storedVersions = JSON.parse(
        localStorage.getItem("gxa_writer_versions") || "[]",
      );
      const storedResult =
        localStorage.getItem("gxa_writer_active_content") || "";
      const storedTitle = localStorage.getItem("gxa_writer_active_title") || "";
      setPromptLibrary(Array.isArray(storedPrompts) ? storedPrompts : []);
      setPromptStatus(
        Array.isArray(storedPrompts) && storedPrompts.length
          ? "ready"
          : "empty",
      );
      setFavorites(Array.isArray(storedFavorites) ? storedFavorites : []);
      setRecent(Array.isArray(storedRecent) ? storedRecent : []);
      setVersions(Array.isArray(storedVersions) ? storedVersions : []);
      if (storedResult) setResult(storedResult);
      if (storedTitle) setTitle(storedTitle);
    } catch {
      setPromptStatus("error");
    }
  }, [authenticated]);

  const values =
    templateValues[activeTemplateId] || defaultsFor(activeTemplate);
  const requestSignature = useMemo(
    () =>
      JSON.stringify({
        activeTemplateId,
        values,
        purpose,
        tone,
        language,
        length,
        readingLevel,
        keywords,
        customInstructions,
        existingContent,
      }),
    [
      activeTemplateId,
      values,
      purpose,
      tone,
      language,
      length,
      readingLevel,
      keywords,
      customInstructions,
      existingContent,
    ],
  );
  const outputStale = Boolean(
    result &&
      lastGeneratedSignature &&
      requestSignature !== lastGeneratedSignature,
  );
  const inputWords = countWords(
    `${Object.values(values).join(" ")} ${keywords} ${customInstructions} ${existingContent}`,
  );
  const inputLimit = config?.writer_input_word_limit || 1500;
  const nearInputLimit =
    inputWords >= inputLimit * 0.85 && inputWords <= inputLimit;
  const overInputLimit = inputWords > inputLimit;
  const generationLimit = config?.writer_generations_limit || 5;
  const usedGenerations = Number(usage?.writer_generations || 0);
  const remainingGenerations = premium
    ? null
    : Math.max(0, generationLimit - usedGenerations);
  const quotaExhausted = remainingGenerations === 0;

  useEffect(() => {
    if (!authenticated || !result) return;
    setSaveStatus("saving");
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem("gxa_writer_active_content", result);
        localStorage.setItem("gxa_writer_active_title", title);
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [authenticated, result, title]);

  const filteredTemplates = useMemo(() => {
    const query = templateQuery.trim().toLowerCase();
    return WRITER_TEMPLATES.filter((template) => {
      if (
        query &&
        !`${template.name} ${template.category} ${template.description} ${template.keywords.join(" ")}`
          .toLowerCase()
          .includes(query)
      )
        return false;
      if (
        templateCategory !== "All categories" &&
        template.category !== templateCategory
      )
        return false;
      if (templateView === "recommended" && !template.featured) return false;
      if (templateView === "favorites" && !favorites.includes(template.id))
        return false;
      if (templateView === "recent" && !recent.includes(template.id))
        return false;
      if (templateView === "free" && template.requiredPlan !== "free")
        return false;
      if (templateView === "pro" && template.requiredPlan === "free")
        return false;
      if (templateView === "new" && !template.isNew) return false;
      return true;
    }).sort((a, b) =>
      templateView === "recent"
        ? recent.indexOf(a.id) - recent.indexOf(b.id)
        : Number(b.featured) - Number(a.featured) ||
          a.name.localeCompare(b.name),
    );
  }, [templateQuery, templateCategory, templateView, favorites, recent]);

  const persistList = (key: string, next: string[]) => {
    if (authenticated) localStorage.setItem(key, JSON.stringify(next));
  };
  const toggleFavorite = (templateId: string) => {
    const next = favorites.includes(templateId)
      ? favorites.filter((id) => id !== templateId)
      : [...favorites, templateId];
    setFavorites(next);
    persistList("gxa_writer_favorites", next);
  };
  const isLocked = (template: WriterTemplateDefinition) =>
    !premium && template.requiredPlan !== "free";
  const chooseTemplate = (template: WriterTemplateDefinition) => {
    if (isLocked(template)) {
      onOpenUpgradeModal?.();
      return;
    }
    setActiveTemplateId(template.id);
    setTemplateValues((previous) =>
      previous[template.id]
        ? previous
        : { ...previous, [template.id]: defaultsFor(template) },
    );
    setTone(template.defaultTone);
    setFieldErrors({});
    setGenerationError("");
    const nextRecent = [
      template.id,
      ...recent.filter((id) => id !== template.id),
    ].slice(0, 8);
    setRecent(nextRecent);
    persistList("gxa_writer_recent", nextRecent);
    setTemplatePreview(null);
    setMobilePane("editor");
    setLaptopPane("editor");
  };

  const updateField = (fieldId: string, nextValue: string) => {
    setTemplateValues((previous) => ({
      ...previous,
      [activeTemplateId]: {
        ...(previous[activeTemplateId] || defaultsFor(activeTemplate)),
        [fieldId]: nextValue,
      },
    }));
    setFieldErrors((previous) => {
      const next = { ...previous };
      delete next[fieldId];
      return next;
    });
    if (generationError.startsWith("Please complete")) setGenerationError("");
  };

  const importDraft = (file?: File) => {
    if (!file) return;
    const allowedExtension = /\.(txt|md|markdown)$/i.test(file.name);
    const allowedMime =
      !file.type || ["text/plain", "text/markdown"].includes(file.type);
    if (!allowedExtension || !allowedMime) {
      setGenerationError(
        "Choose a TXT or Markdown file. Your current form and draft are unchanged.",
      );
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setGenerationError(
        "The draft file must be 2 MB or smaller. Your current form and draft are unchanged.",
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setExistingContent(String(reader.result || ""));
      setAdvancedOpen(true);
      setGenerationError("");
      setGenerationStatus(`${file.name} was imported as source content.`);
    };
    reader.onerror = () =>
      setGenerationError(
        "The draft could not be read. Your current form and draft are unchanged.",
      );
    reader.readAsText(file);
  };

  const focusField = (fieldId: string) => {
    const element = fieldRefs.current[fieldId];
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => element?.focus(), 180);
  };
  const validateForm = () => {
    const nextErrors: Record<string, string> = {};
    for (const field of activeTemplate.inputFields) {
      const value = String(values[field.id] || "");
      if (field.required && !value.trim())
        nextErrors[field.id] = errorMessageFor(field);
      else if (value.length > field.maxLength)
        nextErrors[field.id] =
          `${field.label} must be ${field.maxLength.toLocaleString()} characters or fewer.`;
      else if (field.type === "url" && value) {
        try {
          new URL(value);
        } catch {
          nextErrors[field.id] = `${field.label} must be a complete URL.`;
        }
      }
    }
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      const count = Object.keys(nextErrors).length;
      setGenerationError(
        `Please complete ${count} required ${count === 1 ? "field" : "fields"}.`,
      );
      setGenerationStatus(
        "Generation paused because required fields need attention.",
      );
      setMobilePane("editor");
      setLaptopPane("editor");
      window.setTimeout(() => focusField(Object.keys(nextErrors)[0]), 80);
      return false;
    }
    setFieldErrors({});
    setGenerationError("");
    return true;
  };

  const runGeneration = async (
    mode:
      | "generate"
      | "continue"
      | "improve"
      | "expand"
      | "shorten"
      | "rewrite"
      | "inline" = "generate",
    inlineInstruction = "",
  ) => {
    if (loading) return;
    if (isLocked(activeTemplate)) {
      onOpenUpgradeModal?.();
      return;
    }
    if (mode === "generate" && !validateForm()) return;
    if (mode !== "generate" && !result.trim() && !selectedText.trim()) {
      setGenerationError(
        "Generate or add a draft before using this action. Your form is preserved.",
      );
      return;
    }
    if (!online) {
      setGenerationError(
        "You appear to be offline. Your form and draft are safe. Reconnect and try again.",
      );
      return;
    }
    if (overInputLimit) {
      setGenerationError(
        `Reduce the request to ${inputLimit.toLocaleString()} words or fewer. Your work is preserved.`,
      );
      return;
    }
    if (quotaExhausted) {
      setGenerationError(
        "Your writing limit has been reached. Your work is preserved. Compare plans for more generations.",
      );
      onOpenUpgradeModal?.();
      return;
    }
    setGenerationError("");
    setLoading(true);
    setGenerationStatus(`Generating ${activeTemplate.name}.`);
    setMobilePane("preview");
    setLaptopPane("preview");
    const controller = new AbortController();
    requestControllerRef.current = controller;
    try {
      const fieldKeywords = String(values.keywords || "");
      const response = await generateWriterContent(
        {
          templateId: activeTemplateId,
          fields: values,
          tone,
          language,
          length,
          audience: String(values.audienceDetails || "general audience"),
          purpose,
          readingLevel,
          keywords: `${fieldKeywords},${keywords}`
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
            .slice(0, 20),
          customInstructions: [customInstructions, inlineInstruction]
            .filter(Boolean)
            .join("\n"),
          existingContent: result || existingContent,
          selectedText: mode === "inline" ? selectedText : "",
          mode,
          requestId: crypto.randomUUID(),
        },
        controller.signal,
      );
      const nextResult =
        mode === "inline" && selectedRange
          ? result.slice(0, selectedRange.start) +
            response.text +
            result.slice(selectedRange.end)
          : response.text;
      setResult(nextResult);
      setLastGeneratedSignature(requestSignature);
      setUsage((previous) =>
        previous
          ? {
              ...previous,
              writer_generations: response.usage.writer_generations,
            }
          : previous,
      );
      setSelectedText("");
      setSelectedRange(null);
      setGenerationStatus(`${activeTemplate.name} draft is ready.`);
      if (authenticated) {
        const version: DocumentVersion = {
          id: crypto.randomUUID(),
          title: `${activeTemplate.name} draft`,
          content: nextResult,
          timestamp: Date.now(),
        };
        const nextVersions = [version, ...versions].slice(0, 30);
        setVersions(nextVersions);
        localStorage.setItem(
          "gxa_writer_versions",
          JSON.stringify(nextVersions),
        );
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setGenerationError(
          "Generation was cancelled. Your form and existing draft are preserved.",
        );
        setGenerationStatus("Generation cancelled.");
      } else if (error instanceof WriterApiError) {
        const backendErrors = Object.keys(error.fields || {}).length
          ? error.fields
          : error.field
            ? { [error.field]: error.message }
            : {};
        if (Object.keys(backendErrors).length) {
          setFieldErrors(backendErrors);
          setMobilePane("editor");
          setLaptopPane("editor");
          window.setTimeout(
            () => focusField(Object.keys(backendErrors)[0]),
            80,
          );
        }
        if (
          error.status === 403 ||
          error.code === "REQUEST_LIMIT" ||
          error.code === "WORD_LIMIT"
        )
          onOpenUpgradeModal?.();
        setGenerationError(
          `${error.message} Your form and draft are preserved.`,
        );
        setGenerationStatus("Generation failed.");
      } else {
        setGenerationError(
          "The writing service is unavailable. Your form and draft are preserved. Try again.",
        );
        setGenerationStatus("Writing service unavailable.");
      }
    } finally {
      setLoading(false);
      requestControllerRef.current = null;
    }
  };

  const stopGeneration = () => {
    requestControllerRef.current?.abort();
    setGenerationStatus("Stopping generation.");
  };
  const handoff = (workspace: WorkspaceId) => {
    if (!result.trim() || !onSelectWorkspace || !setSharedText) return;
    setSharedText(result);
    onSelectWorkspace(workspace);
  };
  const copyResult = async () => {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setGenerationError(
        "Copy failed. Your draft is unchanged; select the text and copy it manually.",
      );
    }
  };
  const exportResult = (format: WriterExportFormat) => {
    if (!result.trim()) return;
    const safeTitle =
      (title || activeTemplate.name)
        .replace(/[^a-z0-9._-]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 100) || "draft";
    const escaped = result
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const content =
      format === "html"
        ? `<!doctype html><html><head><meta charset="utf-8"><title>${safeTitle}</title></head><body><main><pre style="white-space:pre-wrap;font:16px/1.6 system-ui">${escaped}</pre></main></body></html>`
        : format === "md"
          ? `# ${title || activeTemplate.name}\n\n${result}`
          : result;
    const url = URL.createObjectURL(
      new Blob([content], {
        type: format === "html" ? "text/html" : "text/plain",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${safeTitle}.${format}`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const saveDocument = async () => {
    if (!authenticatedUser) {
      setGenerationError(
        "Log in or register to save this draft. Your work is preserved.",
      );
      return;
    }
    if (!result.trim()) {
      setGenerationError("Generate or add a draft before saving.");
      return;
    }
    setSaveStatus("saving");
    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authenticatedUser.sessionToken}`,
        },
        body: JSON.stringify({
          name: title.trim() || activeTemplate.name,
          content: result,
          type: "Writer Document",
          toolUsed: "AI Writer",
          projectId: selectedProjectId || undefined,
          metadata: {
            templateId: activeTemplateId,
            fields: values,
            tone,
            language,
            length,
          },
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Save failed.");
      setSaveStatus("saved");
      setProjectMessage(
        selectedProjectId
          ? "Draft saved to the selected project."
          : "Draft saved.",
      );
      setGenerationStatus("Draft saved.");
    } catch {
      setSaveStatus("error");
      setGenerationError(
        "The draft could not be saved. Your work is preserved. Try again.",
      );
    }
  };

  const createProject = async () => {
    if (!authenticatedUser || !projectName.trim() || projectBusy) return;
    setProjectBusy(true);
    setProjectMessage("");
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authenticatedUser.sessionToken}`,
        },
        body: JSON.stringify({
          name: projectName.trim(),
          type: "Writing",
          toolUsed: "AI Writer",
          previewText: result.slice(0, 160),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(body.error || "Project creation failed.");
      setProjects((previous) => [
        body.project,
        ...previous.filter((project) => project.id !== body.project.id),
      ]);
      setSelectedProjectId(body.project.id);
      setProjectStatus("ready");
      setProjectMessage(`${body.project.name} created and selected.`);
      setProjectDialogOpen(false);
      setProjectName("");
    } catch {
      setProjectMessage(
        "The project could not be created. Your draft is preserved.",
      );
    } finally {
      setProjectBusy(false);
    }
  };

  const savePrompt = () => {
    if (!authenticated) {
      setPromptDialogOpen(false);
      setGenerationError(
        "Log in or register to save reusable prompts. Your current entries are preserved.",
      );
      return;
    }
    if (!promptTitle.trim() || !promptText.trim()) return;
    const next = [
      {
        id: crypto.randomUUID(),
        title: promptTitle.trim(),
        prompt: promptText.trim(),
      },
      ...promptLibrary,
    ];
    try {
      localStorage.setItem("gxa_writer_saved_prompts", JSON.stringify(next));
      setPromptLibrary(next);
      setPromptStatus("ready");
      setPromptTitle("");
      setPromptText("");
      setPromptDialogOpen(false);
    } catch {
      setPromptStatus("error");
    }
  };
  const removePrompt = (id: string) => {
    const next = promptLibrary.filter((prompt) => prompt.id !== id);
    setPromptLibrary(next);
    setPromptStatus(next.length ? "ready" : "empty");
    if (authenticated)
      localStorage.setItem("gxa_writer_saved_prompts", JSON.stringify(next));
  };

  const requiredFields = activeTemplate.inputFields.filter(
    (field) => field.required,
  );
  const completedRequired = requiredFields.filter((field) =>
    String(values[field.id] || "").trim(),
  ).length;
  const validationErrors = Object.entries(fieldErrors);
  const paneTabs: Array<{ id: MobilePane; label: string }> = [
    { id: "templates", label: "Templates" },
    { id: "editor", label: "Editor" },
    { id: "preview", label: "Preview" },
  ];

  return (
    <div className="writer-workspace -m-3 flex h-[calc(100dvh-4rem)] min-h-0 flex-col overflow-hidden bg-white text-left dark:bg-zinc-950 sm:-m-5 lg:-m-7">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
            <WandSparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="text-base font-black text-slate-950 dark:text-white">
                AI Writer
              </h1>
              <span className="truncate rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 dark:bg-zinc-900 dark:text-zinc-300">
                {activeTemplate.name}
              </span>
            </div>
            <p className="truncate text-[11px] text-slate-500 dark:text-zinc-400">
              {authenticated
                ? saveStatus === "saving"
                  ? "Saving…"
                  : saveStatus === "saved"
                    ? "Saved"
                    : "Autosave ready"
                : "Guest draft · not saved"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-right text-[10px] text-slate-500 sm:block">
            {limitsLoading
              ? "Loading usage…"
              : premium
                ? `${planLabel(currentUser?.subscription || currentUser?.plan || "pro")} plan`
                : `${remainingGenerations} generations left`}
          </span>
          {!premium && (
            <button
              onClick={onOpenUpgradeModal}
              className="hidden rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-800 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 sm:block dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
            >
              Upgrade
            </button>
          )}
          <button
            onClick={() =>
              setLaptopPane((value) =>
                value === "editor" ? "preview" : "editor",
              )
            }
            className="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 lg:inline-flex xl:hidden dark:border-zinc-700"
          >
            <PanelRight className="h-4 w-4" />
            {laptopPane === "editor" ? "Preview" : "Editor"}
          </button>
          {loading ? (
            <button
              onClick={stopGeneration}
              className="hidden items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-black text-white lg:inline-flex"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              Stop
            </button>
          ) : (
            <button
              onClick={() => runGeneration("generate")}
              className="hidden items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-black text-white shadow-sm hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 lg:inline-flex"
            >
              <Sparkles className="h-4 w-4" />
              Generate
            </button>
          )}
        </div>
      </header>

      <div
        className="grid shrink-0 grid-cols-3 border-b border-slate-200 bg-white lg:hidden dark:border-zinc-800 dark:bg-zinc-950"
        role="tablist"
        aria-label="AI Writer workspace sections"
      >
        {paneTabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={mobilePane === tab.id}
            onClick={() => setMobilePane(tab.id)}
            className={`min-h-11 border-b-2 px-2 text-xs font-black ${mobilePane === tab.id ? "border-teal-500 text-teal-700 dark:text-teal-300" : "border-transparent text-slate-500"}`}
          >
            {tab.label}
            {tab.id === "editor" && requiredFields.length
              ? ` ${completedRequired}/${requiredFields.length}`
              : ""}
          </button>
        ))}
      </div>

      {!online && (
        <div
          role="status"
          className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
        >
          You are offline. Your current work is safe; generation will resume
          when you reconnect.
        </div>
      )}
      <div className="sr-only" role="status" aria-live="polite">
        {generationStatus}
      </div>

      <div className="grid min-h-0 flex-1 xl:grid-cols-[280px_minmax(430px,1fr)_minmax(330px,0.82fr)] lg:grid-cols-[270px_minmax(0,1fr)]">
        <aside
          data-writer-pane="templates"
          data-mobile-active={mobilePane === "templates"}
          className="writer-pane min-h-0 flex-col border-r border-slate-200 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div className="space-y-3 border-b border-slate-200 p-3 dark:border-zinc-800">
            <label className="relative block">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <span className="sr-only">Search writing templates</span>
              <input
                value={templateQuery}
                onChange={(event) => {
                  const query = event.target.value;
                  setTemplateQuery(query);
                  if (query.trim()) setTemplateView("all");
                }}
                placeholder="Search templates"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 dark:border-zinc-800 dark:bg-zinc-900"
              />
            </label>
            <div
              className="flex gap-1 overflow-x-auto pb-1"
              aria-label="Template views"
            >
              {(
                [
                  "recommended",
                  "favorites",
                  "recent",
                  "free",
                  "pro",
                  "new",
                  "all",
                ] as TemplateView[]
              ).map((view) => (
                <button
                  key={view}
                  onClick={() => setTemplateView(view)}
                  aria-pressed={templateView === view}
                  className={`shrink-0 rounded-full px-2.5 py-1.5 text-[10px] font-black capitalize ${templateView === view ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "bg-white text-slate-500 dark:bg-zinc-900 dark:text-zinc-400"}`}
                >
                  {view}
                </button>
              ))}
            </div>
            <label className="block">
              <span className="sr-only">Template category</span>
              <select
                value={templateCategory}
                onChange={(event) => setTemplateCategory(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold dark:border-zinc-800 dark:bg-zinc-900"
              >
                <option>All categories</option>
                {WRITER_CATEGORIES.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>
          </div>
          <div
            className="flex-1 space-y-2 overflow-y-auto p-3"
            aria-live="polite"
          >
            {filteredTemplates.map((template) => {
              const locked = isLocked(template);
              const selected = template.id === activeTemplateId;
              return (
                <article
                  key={template.id}
                  className={`rounded-2xl border p-3 transition ${selected ? "border-teal-500 bg-teal-50 shadow-sm dark:bg-teal-950/20" : "border-slate-200 bg-white hover:border-teal-300 dark:border-zinc-800 dark:bg-zinc-900"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => chooseTemplate(template)}
                      aria-current={selected ? "true" : undefined}
                      className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                    >
                      <span className="flex items-center gap-1.5">
                        <strong className="truncate text-xs text-slate-900 dark:text-white">
                          {template.name}
                        </strong>
                        {locked && (
                          <LockKeyhole className="h-3 w-3 shrink-0 text-amber-600" />
                        )}
                      </span>
                      <span className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-500 dark:text-zinc-400">
                        {template.description}
                      </span>
                    </button>
                    <button
                      onClick={() => toggleFavorite(template.id)}
                      aria-label={`${favorites.includes(template.id) ? "Remove" : "Add"} ${template.name} ${favorites.includes(template.id) ? "from" : "to"} favorites`}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:hover:bg-zinc-800"
                    >
                      <Bookmark
                        className={`h-4 w-4 ${favorites.includes(template.id) ? "fill-amber-500 text-amber-500" : ""}`}
                      />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex gap-1">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {planLabel(template.requiredPlan)}
                      </span>
                      {template.isNew && (
                        <span className="rounded-full bg-violet-100 px-2 py-1 text-[9px] font-black text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                          New
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setTemplatePreview(template)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-teal-700 hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-teal-300 dark:hover:bg-teal-950"
                    >
                      <Eye className="h-3 w-3" />
                      Preview
                    </button>
                  </div>
                </article>
              );
            })}
            {!filteredTemplates.length && (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center dark:border-zinc-700">
                <p className="text-sm font-black">No matching templates</p>
                <p className="mt-1 text-xs text-slate-500">
                  Change the search, category, or template view.
                </p>
                <button
                  onClick={() => {
                    setTemplateQuery("");
                    setTemplateCategory("All categories");
                    setTemplateView("all");
                  }}
                  className="mt-3 text-xs font-bold text-teal-700"
                >
                  Show all templates
                </button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-slate-200 p-3 dark:border-zinc-800">
            <button
              onClick={() => setPromptDialogOpen(true)}
              className="rounded-xl border border-slate-200 px-2 py-2 text-[10px] font-bold dark:border-zinc-700"
            >
              Prompt Library
            </button>
            <button
              onClick={() =>
                authenticated
                  ? setProjectDialogOpen(true)
                  : setGenerationError(
                      "Log in or register to create a project. Your current work is preserved.",
                    )
              }
              className="rounded-xl border border-slate-200 px-2 py-2 text-[10px] font-bold dark:border-zinc-700"
            >
              New Project
            </button>
          </div>
        </aside>

        <main
          data-writer-pane="editor"
          data-mobile-active={mobilePane === "editor"}
          data-laptop-active={laptopPane === "editor"}
          className="writer-pane min-h-0 flex-col bg-white dark:bg-zinc-950"
        >
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-zinc-800 sm:px-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-teal-700 dark:text-teal-300">
                Writing form
              </p>
              <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">
                {activeTemplate.name}
              </h2>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500 dark:text-zinc-400">
                {activeTemplate.description}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600 dark:bg-zinc-900 dark:text-zinc-300">
              {completedRequired}/{requiredFields.length} required
            </span>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            {generationError && (
              <div
                role="alert"
                aria-labelledby="writer-validation-title"
                className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h3
                      id="writer-validation-title"
                      className="text-sm font-black"
                    >
                      {generationError}
                    </h3>
                    {validationErrors.length > 0 && (
                      <ul className="mt-2 space-y-1 text-xs">
                        {validationErrors.map(([fieldId, message]) => (
                          <li key={fieldId}>
                            <button
                              onClick={() => focusField(fieldId)}
                              className="text-left font-semibold underline decoration-rose-300 underline-offset-2"
                            >
                              {message}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="mt-2 text-[11px] opacity-80">
                      Your entries and draft have not been removed.
                    </p>
                  </div>
                  <button
                    onClick={() => setGenerationError("")}
                    aria-label="Dismiss writing error"
                    className="rounded-lg p-1 hover:bg-rose-100 dark:hover:bg-rose-900"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                runGeneration("generate");
              }}
              noValidate
              className="space-y-5"
            >
              <fieldset className="space-y-4">
                <legend className="text-sm font-black text-slate-900 dark:text-white">
                  Template details
                </legend>
                {activeTemplate.inputFields.map((field) => {
                  const value = String(values[field.id] || "");
                  const invalid = Boolean(fieldErrors[field.id]);
                  const describedBy =
                    [
                      field.description ? `writer-${field.id}-help` : "",
                      invalid ? `writer-${field.id}-error` : "",
                    ]
                      .filter(Boolean)
                      .join(" ") || undefined;
                  const commonClass = `w-full rounded-xl border bg-white px-3 py-2.5 text-sm outline-none transition focus:ring-4 focus:ring-teal-500/10 dark:bg-zinc-900 ${invalid ? "border-rose-500 ring-2 ring-rose-200 dark:ring-rose-950" : "border-slate-200 focus:border-teal-500 dark:border-zinc-700"}`;
                  return (
                    <div key={field.id} className="scroll-mt-24">
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <label
                          htmlFor={`writer-${field.id}`}
                          className="text-xs font-black text-slate-700 dark:text-zinc-200"
                        >
                          {field.label}
                          {field.required && (
                            <span className="ml-1 text-rose-600" aria-hidden>
                              *
                            </span>
                          )}
                        </label>
                        <span className="text-[10px] text-slate-600 dark:text-zinc-400">
                          {value.length.toLocaleString()}/
                          {field.maxLength.toLocaleString()}
                        </span>
                      </div>
                      {field.type === "textarea" ? (
                        <textarea
                          ref={(element) => {
                            fieldRefs.current[field.id] = element;
                          }}
                          id={`writer-${field.id}`}
                          rows={
                            field.id === "topic" || field.id === "premise"
                              ? 5
                              : 3
                          }
                          value={value}
                          maxLength={field.maxLength + 1}
                          onChange={(event) =>
                            updateField(field.id, event.target.value)
                          }
                          placeholder={field.placeholder}
                          required={field.required}
                          aria-required={field.required}
                          aria-invalid={invalid}
                          aria-describedby={describedBy}
                          className={`${commonClass} resize-y`}
                        />
                      ) : field.type === "select" ? (
                        <select
                          ref={(element) => {
                            fieldRefs.current[field.id] = element;
                          }}
                          id={`writer-${field.id}`}
                          value={value}
                          onChange={(event) =>
                            updateField(field.id, event.target.value)
                          }
                          required={field.required}
                          aria-required={field.required}
                          aria-invalid={invalid}
                          aria-describedby={describedBy}
                          className={commonClass}
                        >
                          <option value="">
                            Select {field.label.toLowerCase()}
                          </option>
                          {field.options?.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          ref={(element) => {
                            fieldRefs.current[field.id] = element;
                          }}
                          id={`writer-${field.id}`}
                          type={field.type === "url" ? "url" : "text"}
                          value={value}
                          maxLength={field.maxLength + 1}
                          onChange={(event) =>
                            updateField(field.id, event.target.value)
                          }
                          placeholder={field.placeholder}
                          required={field.required}
                          aria-required={field.required}
                          aria-invalid={invalid}
                          aria-describedby={describedBy}
                          className={commonClass}
                        />
                      )}
                      {field.description && (
                        <p
                          id={`writer-${field.id}-help`}
                          className="mt-1 text-[11px] leading-4 text-slate-500 dark:text-zinc-400"
                        >
                          {field.description}
                        </p>
                      )}
                      {invalid && (
                        <p
                          id={`writer-${field.id}-error`}
                          role="alert"
                          className="mt-1.5 flex items-center gap-1 text-xs font-bold text-rose-600"
                        >
                          <AlertCircle className="h-3.5 w-3.5" />
                          {fieldErrors[field.id]}
                        </p>
                      )}
                    </div>
                  );
                })}
              </fieldset>

              {activeTemplate.legalReviewRequired && (
                <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                  This template creates an informational draft, not legal
                  advice. Have a qualified professional review it before use.
                </p>
              )}

              <fieldset className="space-y-3">
                <legend className="text-sm font-black text-slate-900 dark:text-white">
                  Output preferences
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-xs font-bold">
                    Purpose
                    <select
                      value={purpose}
                      onChange={(event) => setPurpose(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    >
                      <option value="inform">Inform</option>
                      <option value="educate">Educate</option>
                      <option value="persuade">Persuade</option>
                      <option value="sell">Sell</option>
                      <option value="explain">Explain</option>
                      <option value="entertain">Entertain</option>
                      <option value="convert">Convert</option>
                      <option value="build_trust">Build trust</option>
                      <option value="announce">Announce</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-xs font-bold">
                    Tone
                    <select
                      value={tone}
                      onChange={(event) => setTone(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    >
                      {activeTemplate.supportedTones.map((option) => (
                        <option
                          key={option}
                          value={option}
                          className="capitalize"
                        >
                          {option[0].toUpperCase() + option.slice(1)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 text-xs font-bold">
                    Language
                    <select
                      value={language}
                      onChange={(event) => setLanguage(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    >
                      {WRITER_LANGUAGES.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 text-xs font-bold">
                    Length
                    <select
                      value={length}
                      onChange={(event) => setLength(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm capitalize dark:border-zinc-700 dark:bg-zinc-900"
                    >
                      {WRITER_LENGTHS.map((option) => (
                        <option key={option}>
                          {option[0].toUpperCase() + option.slice(1)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </fieldset>

              <details
                open={advancedOpen}
                onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}
                className="rounded-2xl border border-slate-200 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900/50"
              >
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500">
                  Advanced settings{" "}
                  <ChevronDown
                    className={`h-4 w-4 transition ${advancedOpen ? "rotate-180" : ""}`}
                  />
                </summary>
                <div className="space-y-4 border-t border-slate-200 p-4 dark:border-zinc-800">
                  <label className="block space-y-1 text-xs font-bold">
                    Reading level
                    <select
                      value={readingLevel}
                      onChange={(event) => setReadingLevel(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                    >
                      <option value="general">General audience</option>
                      <option value="simple">Simple</option>
                      <option value="high_school">High school</option>
                      <option value="college">College</option>
                      <option value="expert">Expert</option>
                    </select>
                  </label>
                  <label className="block space-y-1 text-xs font-bold">
                    Additional keywords
                    <input
                      value={keywords}
                      onChange={(event) => setKeywords(event.target.value)}
                      placeholder="Optional comma-separated keywords"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                    />
                  </label>
                  <label className="block space-y-1 text-xs font-bold">
                    Additional instructions
                    <textarea
                      value={customInstructions}
                      onChange={(event) =>
                        setCustomInstructions(event.target.value)
                      }
                      maxLength={2000}
                      rows={3}
                      placeholder="Add constraints that are not already covered above."
                      className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                    />
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <label
                        htmlFor="writer-existing-content"
                        className="text-xs font-bold"
                      >
                        Existing draft or source content
                      </label>
                      <button
                        type="button"
                        onClick={() => importRef.current?.click()}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold dark:border-zinc-700"
                      >
                        <Upload className="h-3.5 w-3.5" /> Import TXT/MD
                      </button>
                      <input
                        ref={importRef}
                        type="file"
                        accept=".txt,.md,.markdown,text/plain,text/markdown"
                        className="sr-only"
                        onChange={(event) => {
                          importDraft(event.target.files?.[0]);
                          event.currentTarget.value = "";
                        }}
                      />
                    </div>
                    <textarea
                      id="writer-existing-content"
                      value={existingContent}
                      onChange={(event) =>
                        setExistingContent(event.target.value)
                      }
                      maxLength={60000}
                      rows={5}
                      placeholder="Optional: paste or import a draft to continue, rewrite, or use as source context."
                      className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                    />
                    <p className="text-[10px] leading-4 text-slate-500">
                      TXT and Markdown files up to 2 MB. Imported text stays in
                      your form until you generate.
                    </p>
                  </div>
                </div>
              </details>

              <div
                className={`rounded-xl border p-3 text-xs ${overInputLimit ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200" : nearInputLimit ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200" : "border-slate-200 bg-white text-slate-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span>
                    {inputWords.toLocaleString()} /{" "}
                    {inputLimit.toLocaleString()} input words
                  </span>
                  <span>
                    {overInputLimit
                      ? "Reduce input to generate"
                      : nearInputLimit
                        ? "Approaching plan limit"
                        : "Within plan limit"}
                  </span>
                </div>
              </div>
            </form>
          </div>
        </main>

        <aside
          data-writer-pane="preview"
          data-mobile-active={mobilePane === "preview"}
          data-laptop-active={laptopPane === "preview"}
          className="writer-pane min-h-0 flex-col border-l border-slate-200 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-teal-700 dark:text-teal-300">
                Preview
              </p>
              <h2 className="mt-1 text-sm font-black">
                {result
                  ? title || activeTemplate.name
                  : "Your draft will appear here"}
              </h2>
            </div>
            {result && (
              <span className="text-[10px] text-slate-500">
                {countWords(result)} words · {readingTime(result)} min read
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex h-full min-h-72 flex-col items-center justify-center rounded-2xl border border-teal-200 bg-white p-6 text-center dark:border-teal-900 dark:bg-zinc-900">
                <Loader2 className="h-8 w-8 animate-spin text-teal-600 motion-reduce:animate-none" />
                <h3 className="mt-4 text-sm font-black">
                  Generating {activeTemplate.name}
                </h3>
                <p className="mt-2 max-w-xs text-xs leading-5 text-slate-500">
                  Your form and existing draft remain safe. Stop the request at
                  any time.
                </p>
                <button
                  onClick={stopGeneration}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2 text-xs font-bold text-rose-700"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                  Stop generation
                </button>
              </div>
            ) : result ? (
              <div className="space-y-3">
                {outputStale && (
                  <div
                    role="status"
                    className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
                  >
                    Inputs changed after this draft was generated. Regenerate
                    when you want the preview to reflect them.
                  </div>
                )}
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Draft title"
                  aria-label="Draft title"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black dark:border-zinc-700 dark:bg-zinc-900"
                />
                <textarea
                  value={result}
                  onChange={(event) => setResult(event.target.value)}
                  onSelect={(event) => {
                    const target = event.currentTarget;
                    const next = target.value.slice(
                      target.selectionStart,
                      target.selectionEnd,
                    );
                    setSelectedText(next);
                    setSelectedRange(
                      next
                        ? {
                            start: target.selectionStart,
                            end: target.selectionEnd,
                          }
                        : null,
                    );
                  }}
                  aria-label="Generated draft"
                  className="min-h-[52dvh] w-full resize-y rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-7 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 dark:border-zinc-700 dark:bg-zinc-900"
                />
                {selectedText && (
                  <div className="rounded-xl border border-teal-200 bg-teal-50 p-3 dark:border-teal-900 dark:bg-teal-950/30">
                    <p className="text-[10px] font-black uppercase tracking-wide text-teal-800 dark:text-teal-200">
                      Selected text actions
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(
                        ["rewrite", "improve", "expand", "shorten"] as const
                      ).map((action) => (
                        <button
                          key={action}
                          onClick={() =>
                            runGeneration(
                              "inline",
                              `${action} the selected text while preserving verified facts.`,
                            )
                          }
                          className="rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-bold capitalize dark:bg-zinc-900"
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-full min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center dark:border-zinc-700 dark:bg-zinc-900">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                  <FileText className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-sm font-black">
                  Preview for {activeTemplate.name}
                </h3>
                <p className="mt-2 max-w-xs text-xs leading-5 text-slate-500">
                  Complete {requiredFields.length} required{" "}
                  {requiredFields.length === 1 ? "field" : "fields"} in the
                  Editor, then choose Generate.
                </p>
                <ul className="mt-4 space-y-1 text-left text-[11px] text-slate-500">
                  {activeTemplate.previewStructure.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-teal-600" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="space-y-3 border-t border-slate-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
            {result && (
              <>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={copyResult}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold dark:border-zinc-700"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <button
                    onClick={saveDocument}
                    disabled={saveStatus === "saving"}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold disabled:opacity-50 dark:border-zinc-700"
                  >
                    {saveStatus === "saving" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    Save
                  </button>
                  <button
                    onClick={() => runGeneration("generate")}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold dark:border-zinc-700"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                    Regenerate
                  </button>
                  <details className="relative">
                    <summary className="inline-flex min-h-10 list-none items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold dark:border-zinc-700">
                      <Download className="h-3.5 w-3.5" />
                      Export
                    </summary>
                    <div className="absolute bottom-12 right-0 z-20 flex w-40 flex-col rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                      {activeTemplate.compatibleExports.map((format) => (
                        <button
                          key={format}
                          onClick={() => exportResult(format)}
                          className="rounded-lg px-3 py-2 text-left text-xs font-bold hover:bg-slate-100 dark:hover:bg-zinc-800"
                        >
                          {format.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </details>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => runGeneration("continue")}
                    className="rounded-xl bg-slate-100 px-3 py-2 text-[10px] font-bold dark:bg-zinc-900"
                  >
                    Continue writing
                  </button>
                  <button
                    onClick={() => runGeneration("improve")}
                    className="rounded-xl bg-slate-100 px-3 py-2 text-[10px] font-bold dark:bg-zinc-900"
                  >
                    Improve
                  </button>
                  <button
                    onClick={() => handoff("grammar")}
                    className="rounded-xl bg-slate-100 px-3 py-2 text-[10px] font-bold dark:bg-zinc-900"
                  >
                    Open in Grammar
                  </button>
                  <button
                    onClick={() => handoff("ai-humanizer")}
                    className="rounded-xl bg-slate-100 px-3 py-2 text-[10px] font-bold dark:bg-zinc-900"
                  >
                    Open in Humanizer
                  </button>
                  <button
                    onClick={() => handoff("translation")}
                    className="rounded-xl bg-slate-100 px-3 py-2 text-[10px] font-bold dark:bg-zinc-900"
                  >
                    Translate
                  </button>
                  <button
                    onClick={() => setProjectDialogOpen(true)}
                    className="rounded-xl bg-slate-100 px-3 py-2 text-[10px] font-bold dark:bg-zinc-900"
                  >
                    Send to Project
                  </button>
                </div>
              </>
            )}
            <div>
              <label className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                Project assignment
                <select
                  value={selectedProjectId}
                  onChange={(event) => setSelectedProjectId(event.target.value)}
                  disabled={
                    projectStatus === "guest" ||
                    projectStatus === "loading" ||
                    projectStatus === "error"
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs normal-case dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <option value="">No project selected</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
              {projectStatus === "guest" && (
                <p className="mt-1 text-[10px] text-slate-500">
                  Log in to load and assign projects.
                </p>
              )}
              {projectStatus === "empty" && (
                <p className="mt-1 text-[10px] text-slate-500">
                  No projects yet. Create one when you are ready.
                </p>
              )}
              {projectStatus === "error" && (
                <p className="mt-1 flex items-center justify-between gap-2 text-[10px] text-rose-600">
                  <span>Projects could not be loaded.</span>
                  <button
                    onClick={loadProjects}
                    className="font-bold underline"
                  >
                    Retry
                  </button>
                </p>
              )}
              {projectMessage && (
                <p
                  role="status"
                  className="mt-1 text-[10px] text-teal-700 dark:text-teal-300"
                >
                  {projectMessage}
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>

      <div className="sticky bottom-0 z-30 flex shrink-0 items-center gap-2 border-t border-slate-200 bg-white p-3 lg:hidden dark:border-zinc-800 dark:bg-zinc-950">
        <button
          onClick={() => setMobilePane("templates")}
          aria-label="Open templates"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-zinc-700"
        >
          <Menu className="h-4 w-4" />
        </button>
        {loading ? (
          <button
            onClick={stopGeneration}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-xs font-black text-white"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
            Stop generation
          </button>
        ) : (
          <button
            onClick={() => runGeneration("generate")}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 text-xs font-black text-white"
          >
            <Sparkles className="h-4 w-4" />
            Generate {activeTemplate.name}
          </button>
        )}
        <button
          onClick={() => setMobilePane("preview")}
          aria-label="Open preview"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-zinc-700"
        >
          <PanelRight className="h-4 w-4" />
        </button>
      </div>

      <AccessibleDialog
        open={Boolean(templatePreview)}
        onClose={() => setTemplatePreview(null)}
        title={templatePreview?.name || "Template preview"}
        description={templatePreview?.description}
      >
        {templatePreview && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-zinc-950">
                <span className="text-[10px] font-black uppercase text-slate-400">
                  Plan
                </span>
                <p className="mt-1 text-sm font-black">
                  {planLabel(templatePreview.requiredPlan)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-zinc-950">
                <span className="text-[10px] font-black uppercase text-slate-400">
                  Setup
                </span>
                <p className="mt-1 text-sm font-black">
                  {templatePreview.setupComplexity}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-zinc-950">
                <span className="text-[10px] font-black uppercase text-slate-400">
                  Output
                </span>
                <p className="mt-1 text-sm font-black capitalize">
                  {templatePreview.outputType}
                </p>
              </div>
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wide text-slate-500">
                Required fields
              </h3>
              <ul className="mt-2 space-y-2 text-sm">
                {templatePreview.inputFields
                  .filter((field) => field.required)
                  .map((field) => (
                    <li key={field.id} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 text-teal-600" />
                      <span>
                        <strong>{field.label}</strong>
                        {field.description && (
                          <span className="block text-xs text-slate-500">
                            {field.description}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wide text-slate-500">
                Draft structure
              </h3>
              <ol className="mt-2 grid gap-2 sm:grid-cols-2">
                {templatePreview.previewStructure.map((item, index) => (
                  <li
                    key={item}
                    className="rounded-xl border border-slate-200 p-3 text-xs dark:border-zinc-700"
                  >
                    <span className="mr-2 font-black text-teal-600">
                      {index + 1}.
                    </span>
                    {item}
                  </li>
                ))}
              </ol>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => setTemplatePreview(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold dark:border-zinc-700"
              >
                Keep browsing
              </button>
              {isLocked(templatePreview) ? (
                <button
                  onClick={() => {
                    setTemplatePreview(null);
                    onOpenUpgradeModal?.();
                  }}
                  className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white dark:bg-white dark:text-slate-950"
                >
                  Compare plans for {planLabel(templatePreview.requiredPlan)}
                </button>
              ) : (
                <button
                  onClick={() => chooseTemplate(templatePreview)}
                  className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-black text-white"
                >
                  Use this template{" "}
                  <ArrowRight className="ml-1 inline h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </AccessibleDialog>

      <AccessibleDialog
        open={promptDialogOpen}
        onClose={() => setPromptDialogOpen(false)}
        title="Prompt Library"
        description="Save reusable instructions for your authenticated workspace. Templates and prompts remain separate."
      >
        {promptStatus === "guest" ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center dark:border-zinc-700">
            <h3 className="font-black">Sign in to save prompts</h3>
            <p className="mt-2 text-sm text-slate-500">
              Your current Writer form remains available. Prompt saving starts
              after authentication.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-3 rounded-2xl bg-slate-50 p-4 dark:bg-zinc-950">
              <label className="block text-xs font-black">
                Prompt title
                <input
                  value={promptTitle}
                  onChange={(event) => setPromptTitle(event.target.value)}
                  placeholder="For example: Brand voice rules"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </label>
              <label className="block text-xs font-black">
                Reusable instructions
                <textarea
                  value={promptText}
                  onChange={(event) => setPromptText(event.target.value)}
                  placeholder="Write the reusable instruction without private secrets."
                  rows={4}
                  className="mt-1 w-full resize-y rounded-xl border border-slate-200 bg-white p-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </label>
              <button
                onClick={savePrompt}
                disabled={!promptTitle.trim() || !promptText.trim()}
                className="rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-black text-white disabled:opacity-40"
              >
                <Plus className="mr-1 inline h-4 w-4" />
                Save prompt
              </button>
            </div>
            {promptStatus === "error" ? (
              <div
                role="alert"
                className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
              >
                Saved prompts could not be loaded. No “0 saved” count is shown
                because the load failed.
              </div>
            ) : promptLibrary.length ? (
              <ul className="space-y-2">
                {promptLibrary.map((prompt) => (
                  <li
                    key={prompt.id}
                    className="rounded-2xl border border-slate-200 p-4 dark:border-zinc-700"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-black">{prompt.title}</h3>
                        <p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-500">
                          {prompt.prompt}
                        </p>
                      </div>
                      <button
                        onClick={() => removePrompt(prompt.id)}
                        aria-label={`Delete ${prompt.title}`}
                        className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        setCustomInstructions(prompt.prompt);
                        setAdvancedOpen(true);
                        setPromptDialogOpen(false);
                        setMobilePane("editor");
                      }}
                      className="mt-3 rounded-lg bg-teal-50 px-3 py-2 text-xs font-bold text-teal-800 dark:bg-teal-950 dark:text-teal-200"
                    >
                      Use in this draft
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center dark:border-zinc-700">
                <h3 className="font-black">No saved prompts yet</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Save a reusable instruction above. This is different from a
                  failed load.
                </p>
              </div>
            )}
          </div>
        )}
      </AccessibleDialog>

      <AccessibleDialog
        open={projectDialogOpen}
        onClose={() => setProjectDialogOpen(false)}
        title="Create a writing project"
        description="Create one project and select it for this draft. Repeated clicks are blocked while the request is running."
      >
        {!authenticated ? (
          <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            Log in or register to create projects. Your current Writer work is
            preserved.
          </p>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              createProject();
            }}
            className="space-y-4"
          >
            <label className="block text-xs font-black">
              Project name
              <input
                autoComplete="off"
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                maxLength={120}
                placeholder="For example: Q3 website refresh"
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
            </label>
            {projectMessage && (
              <p role="status" className="text-xs text-rose-600">
                {projectMessage}
              </p>
            )}
            <button
              disabled={!projectName.trim() || projectBusy}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 text-sm font-black text-white disabled:opacity-40"
            >
              {projectBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FolderPlus className="h-4 w-4" />
              )}
              Create and select project
            </button>
          </form>
        )}
      </AccessibleDialog>
    </div>
  );
}
