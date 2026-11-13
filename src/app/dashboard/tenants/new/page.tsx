"use client";

import { z } from "zod";
import Link from "next/link";
import {
  showSimpleError,
  showSimpleSuccess,
} from "@/lib/toast-notifications";
import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  User,
  Briefcase,
  Phone,
  FileText,
  Key,
  Calendar as CalendarIcon,
  Upload,
  File,
  Image as ImageIcon,
  X,
  CheckCircle2,
  EyeOff,
  Eye,
  Save,
} from "lucide-react";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { useLocalizationContext } from "@/components/providers/LocalizationProvider";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-policy";
import { allowAlphabetsOnly, allowNumbersOnly } from "@/lib/utils";

// Create tenant schema factory function to use translations
const createTenantSchema = (t: (key: string) => string) =>
  z
    .object({
      // User Information
      firstName: z
        .string()
        .min(1, t("tenants.form.validation.firstNameRequired")),
      lastName: z
        .string()
        .min(1, t("tenants.form.validation.lastNameRequired")),
      email: z.string().email(t("tenants.form.validation.emailInvalid")),
      phone: z
        .string()
        .min(1, t("tenants.form.validation.phoneRequired"))
        .transform((val) =>
          val.replace(/[\s()-]/g, "").replace(/^(?:\+44|0044)/, "0")
        )
        .refine(
          (val) => /^0\d{9,10}$/.test(val),
          "Enter a valid phone number (e.g. 07700 900000)"
        ),
      avatar: z.string().optional(),

      // Password Information
      password: z
        .string()
        .min(MIN_PASSWORD_LENGTH, t("tenants.form.validation.passwordMinLength"))
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
          t("tenants.form.validation.passwordComplexity")
        ),
      confirmPassword: z
        .string()
        .min(1, t("tenants.form.validation.confirmPasswordRequired")),

      // Tenant Status
      tenantStatus: z.enum(
        [
          "application_submitted",
          "under_review",
          "approved",
          "active",
          "inactive",
          "moved_out",
          "terminated",
        ],
        {
          errorMap: () => ({
            message: t("tenants.form.validation.tenantStatusInvalid"),
          }),
        }
      ),

      // Personal Information
      dateOfBirth: z.date({
        required_error: t("tenants.form.validation.dateOfBirthRequired"),
      }),
      nino: z
        .string()
        .optional()
        .transform((val) => {
          if (!val || val.trim() === "") return undefined;
          // Normalise: strip spaces + uppercase ("qq 12 34 56 c" -> "QQ123456C")
          return val.replace(/\s+/g, "").toUpperCase();
        })
        .refine(
          (val) =>
            !val ||
            // 2 prefix letters + 6 digits + 1 suffix (A–D). Excludes invalid
            // prefix letters and the disallowed prefixes BG, GB, KN, NK, NT,
            // TN, ZZ.
            /^(?!BG|GB|KN|NK|NT|TN|ZZ)[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\d{6}[A-D]$/.test(
              val
            ),
          { message: t("tenants.form.validation.ninoInvalid") }
        ),

      // Employment Information
      employer: z.string().optional(),
      position: z.string().optional(),
      income: z
        .number()
        .min(0, t("tenants.form.validation.incomePositive"))
        .optional(),
      employmentStartDate: z.string().optional(),

      // Emergency Contact (All Optional)
      emergencyContactName: z.string().min(1, t("tenants.form.validation.contactNameRequired")),
      emergencyContactRelationship: z.string().min(1, t("tenants.form.validation.contactRelationshipRequired")),
      emergencyContactPhone: z.string().min(1, t("tenants.form.validation.contactPhoneRequired"))
        .transform((val) =>
          val.replace(/[\s()-]/g, "").replace(/^(?:\+44|0044)/, "0")
        )
        .refine(
          (val) => /^0\d{9,10}$/.test(val),
          "Enter a valid phone number (e.g. 07700 900000)"
        ),
      emergencyContactEmail: z
        .string()
        .min(1, t("tenants.form.validation.contactEmailRequired"))
        .email(t("tenants.form.validation.emailInvalid")),

      // Additional Information
      creditScore: z.number().min(300).max(850).optional(),

      moveInDate: z
        .string()
        .optional()
        .transform((val) => {
          if (!val || val.trim() === "") return undefined;
          return val.trim();
        })
        .refine(
          (val) => {
            if (!val) return true;

            const date = new Date(val);
            if (isNaN(date.getTime())) return false;

            const fiveYearsAgo = new Date();
            fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

            const fiveYearsFromNow = new Date();
            fiveYearsFromNow.setFullYear(fiveYearsFromNow.getFullYear() + 5);

            return date >= fiveYearsAgo && date <= fiveYearsFromNow;
          },
          {
            message: t("tenants.form.validation.moveInDateRange"),
          }
        ),
      notes: z.string().optional(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("tenants.form.validation.passwordsMismatch"),
      path: ["confirmPassword"],
    });

type TenantFormData = z.infer<ReturnType<typeof createTenantSchema>>;

type RecentlyAddedTenant = {
  name: string;
  email: string;
  timestamp: string;
};

// Local-only draft storage key (drafts never leave the browser).
const TENANT_DRAFT_KEY = "tenure:tenant-draft";

export default function NewTenantPage() {
  const { t } = useLocalizationContext();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [filePreviews, setFilePreviews] = useState<Record<string, string>>({});
  const [recentlyAdded, setRecentlyAdded] = useState<RecentlyAddedTenant[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [restorableDraft, setRestorableDraft] =
    useState<Partial<TenantFormData> | null>(null);

  // Tracks which button submitted so onSubmit knows what to do afterwards.
  // A ref (not state) because it must be readable synchronously in onSubmit.
  const submitIntentRef = useRef<"save" | "saveAndAnother">("save");
  // Mirror of the intent in state, purely for per-button loading labels.
  const [pendingIntent, setPendingIntent] = useState<
    null | "save" | "saveAndAnother"
  >(null);

  const tenantSchema = createTenantSchema(t);

  const form = useForm<TenantFormData>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      avatar: "",
      password: "",
      confirmPassword: "",
      tenantStatus: "application_submitted",
      dateOfBirth: undefined,
      nino: "",
      employer: "",
      position: "",
      income: undefined,
      employmentStartDate: "",
      emergencyContactName: "",
      emergencyContactRelationship: "",
      emergencyContactPhone: "",
      emergencyContactEmail: "",
      creditScore: undefined,
      moveInDate: "",
      notes: "",
    },
  });

  const resetFormCompletely = () => {
    form.reset();
    setAvatarUrl("");
    setDocumentFiles([]);
    setFilePreviews({});
  };

  // ─── Draft persistence (local) ──────────────────────────────────────────
  // Drafts live in the browser only and deliberately exclude sensitive
  // fields (password, confirm password, NINO). Uploaded document files aren't
  // serialisable, so they're not part of a draft.
  const SENSITIVE_DRAFT_FIELDS: (keyof TenantFormData)[] = [
    "password",
    "confirmPassword",
    "nino",
  ];

  const saveDraft = () => {
    try {
      const values = form.getValues();
      const draft: any = { ...values };
      SENSITIVE_DRAFT_FIELDS.forEach((key) => delete draft[key]);
      const payload = { savedAt: new Date().toISOString(), values: draft };
      window.localStorage.setItem(TENANT_DRAFT_KEY, JSON.stringify(payload));
      setDraftSavedAt(payload.savedAt);
      setRestorableDraft(null);
      showSimpleSuccess(
        "Draft saved",
        "Your progress is saved on this device."
      );
    } catch {
      showSimpleError("Couldn't save draft", "Saving the draft failed.");
    }
  };

  const clearDraft = () => {
    try {
      window.localStorage.removeItem(TENANT_DRAFT_KEY);
    } catch {
      // ignore storage errors
    }
    setDraftSavedAt(null);
    setRestorableDraft(null);
  };

  const applyDraft = (values: Partial<TenantFormData>) => {
    const revived: any = { ...values };
    // dateOfBirth was serialised to a string — turn it back into a Date.
    if (revived.dateOfBirth) revived.dateOfBirth = new Date(revived.dateOfBirth);
    form.reset({ ...form.getValues(), ...revived });
    if (revived.avatar) setAvatarUrl(revived.avatar);
    setRestorableDraft(null);
  };

  // On mount, surface any saved draft so the user can choose to restore it.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(TENANT_DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.values) {
        setRestorableDraft(parsed.values as Partial<TenantFormData>);
        setDraftSavedAt(parsed.savedAt || null);
      }
    } catch {
      // ignore malformed draft
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAvatarUploaded = (url: string) => {
    setAvatarUrl(url);
    form.setValue("avatar", url);
  };

  const handleAvatarRemoved = () => {
    setAvatarUrl("");
    form.setValue("avatar", "");
  };

  const cleanupUploadedDocuments = async (urls: string[]) => {
    if (urls.length === 0) return;
    await Promise.allSettled(
      urls.map((url) =>
        fetch(`/api/upload?url=${encodeURIComponent(url)}`, {
          method: "DELETE",
        })
      )
    );
  };

  const uploadDocuments = async (files: File[]) => {
    if (files.length === 0) return [];

    const uploadedUrls: string[] = [];

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "document");
        formData.append("folder", "PropertyPro/tenant-documents/pending");

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.success) {
          throw new Error(
            payload?.error ||
            payload?.message ||
            `Failed to upload ${file.name}`
          );
        }

        const url = payload?.data?.url as string | undefined;
        if (!url) {
          throw new Error(`Upload returned no URL for ${file.name}`);
        }

        uploadedUrls.push(url);
      } catch (error) {
        await cleanupUploadedDocuments(uploadedUrls);
        throw error;
      }
    }

    return uploadedUrls;
  };

  const generateFilePreview = (file: File) => {
    const fileKey = `${file.name}-${file.size}`;

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreviews((prev) => ({
          ...prev,
          [fileKey]: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocumentChange = (files: FileList | null) => {
    if (!files) return;

    const incomingFiles = Array.from(files);
    const maxFiles = 20;
    const maxFileSizeBytes = 10 * 1024 * 1024;
    const allowedTypes = new Set([
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ]);

    const validIncoming = incomingFiles.filter((file) => {
      if (file.size > maxFileSizeBytes) {
        showSimpleError("File Too Large", `${file.name} exceeds 10MB limit`);
        return false;
      }
      if (!allowedTypes.has(file.type)) {
        showSimpleError("Invalid File Type", `${file.name} has unsupported file type`);
        return false;
      }
      return true;
    });

    setDocumentFiles((prev) => {
      const merged = [...prev, ...validIncoming];
      if (merged.length > maxFiles) {
        showSimpleError("File Limit", `Maximum ${maxFiles} documents allowed`);
        return merged.slice(0, maxFiles);
      }

      validIncoming.forEach((file) => generateFilePreview(file));

      return merged;
    });
  };

  const removeDocumentFile = (index: number) => {
    const file = documentFiles[index];
    const fileKey = `${file.name}-${file.size}`;

    setDocumentFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => {
      const newPreviews = { ...prev };
      delete newPreviews[fileKey];
      return newPreviews;
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleDocumentChange(e.dataTransfer.files);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) {
      return ImageIcon;
    }
    return File;
  };

  const onSubmit = async (data: TenantFormData) => {
    setIsLoading(true);

    let uploadedDocumentUrls: string[] = [];

    try {
      uploadedDocumentUrls = await uploadDocuments(documentFiles);

      const tenantData = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        phone: data.phone,
        role: "tenant",
        avatar: avatarUrl || undefined,
        tenantStatus: data.tenantStatus,
        dateOfBirth: data.dateOfBirth || undefined,
        nino: data.nino || undefined,
        employmentInfo: data.employer
          ? {
            employer: data.employer,
            position: data.position || "",
            income: data.income || 0,
            startDate: data.employmentStartDate || undefined,
          }
          : undefined,
        emergencyContacts:
          [
            {
              name: data.emergencyContactName,
              relationship: data.emergencyContactRelationship,
              phone: data.emergencyContactPhone,
              email: data.emergencyContactEmail,
            },
          ],
        creditScore: data.creditScore,
        moveInDate: data.moveInDate || undefined,
        applicationNotes: data.notes || undefined,
        documents: uploadedDocumentUrls,
      };

      const response = await fetch("/api/tenants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tenantData),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage =
          result.error ||
          result.message ||
          t("tenants.form.toasts.createError");
        await cleanupUploadedDocuments(uploadedDocumentUrls);
        throw new Error(errorMessage);
      }

      // Success
      const fullName = `${data.firstName.trim()} ${data.lastName.trim()}`;

      showSimpleSuccess(
        t("tenants.form.toasts.createSuccess", {
          values: { name: fullName },
        })
      );

      // Track recently added
      setRecentlyAdded((prev) => [
        {
          name: fullName,
          email: data.email.trim(),
          timestamp: format(new Date(), "h:mm a"),
        },
        ...prev.slice(0, 4), // keep last 5
      ]);

      // Saved successfully — drop any local draft.
      clearDraft();

      if (submitIntentRef.current === "saveAndAnother") {
        // Optional path: stay on the page and start a fresh tenant.
        resetFormCompletely();
      } else {
        // Default path: finish and return to the tenants list.
        router.push("/dashboard/tenants");
      }

    } catch (error) {
      await cleanupUploadedDocuments(uploadedDocumentUrls);

      showSimpleError(
        "Create Failed",
        error instanceof Error
          ? error.message
          : t("tenants.form.toasts.createError")
      );
    } finally {
      setIsLoading(false);
      setPendingIntent(null);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              {t("tenants.form.header.title")}
            </h1>
            <p className="text-muted-foreground text-lg">
              {t("tenants.form.header.subtitle")}
            </p>
          </div>
          <Link href="/dashboard/tenants">
            <Button
              variant="ghost"
              size="sm"
              className="hover:bg-accent/50 transition-colors border-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("tenants.form.actions.backToTenants")}
            </Button>
          </Link>
        </div>

        {/* Recently Added Feedback */}
        {recentlyAdded.length > 0 && (
          <Card className="bg-emerald-950/20 border-emerald-800/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                Recently Added ({recentlyAdded.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1.5">
              {recentlyAdded.map((tenant, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center text-muted-foreground"
                >
                  <span className="font-medium">{tenant.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs opacity-80">{tenant.timestamp}</span>
                    <span className="text-xs opacity-70">{tenant.email}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Saved draft restore prompt */}
        {restorableDraft && (
          <Card className="bg-amber-950/20 border-amber-800/30">
            <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-5 w-5 text-amber-400" />
                <span className="text-muted-foreground">
                  You have an unsaved draft
                  {draftSavedAt && (
                    <span className="opacity-80">
                      {" "}from {format(new Date(draftSavedAt), "h:mm a")}
                    </span>
                  )}
                  . Restore it?
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={clearDraft}
                  className="text-muted-foreground hover:text-destructive"
                >
                  Discard
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => applyDraft(restorableDraft)}
                >
                  Restore draft
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Avatar Upload */}
              <div className="lg:col-span-4">
                <Card className="border-0 shadow-lg bg-linear-to-br from-white to-gray-50/50 dark:from-primary/10 dark:to-background">
                  <CardHeader className="text-center pb-4">
                    <CardTitle className="flex items-center justify-center gap-2 text-xl">
                      <User className="h-6 w-6 text-primary" />
                      {t("tenants.form.sections.avatar.title")}
                    </CardTitle>
                    <CardDescription className="text-base">
                      {t("tenants.form.sections.avatar.description")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-center pb-8">
                    <AvatarUpload
                      currentAvatar={avatarUrl}
                      onAvatarUploaded={handleAvatarUploaded}
                      onAvatarRemoved={handleAvatarRemoved}
                      disabled={isLoading}
                      userInitials={
                        `${form.watch("firstName")?.[0] || ""}${form.watch("lastName")?.[0] || ""}`.toUpperCase() ||
                        "U"
                      }
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Personal Information */}
              <div className="lg:col-span-8">
                <Card className="border-0 shadow-lg bg-linear-to-br from-white to-gray-50/50 dark:from-primary/10 dark:to-background">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <User className="h-6 w-6 text-primary" />
                      {t("tenants.form.sections.personalInfo.title")}
                    </CardTitle>
                    <CardDescription className="text-base">
                      {t("tenants.form.sections.personalInfo.description")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-sm font-semibold text-foreground">
                              {t("tenants.form.fields.firstName.label")}
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t("tenants.form.fields.firstName.placeholder")}
                                className="h-11 border-2 border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 bg-background/50 transition-all duration-200"
                                {...field}
                                onKeyDown={allowAlphabetsOnly}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-sm font-semibold text-foreground">
                              {t("tenants.form.fields.lastName.label")}
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t("tenants.form.fields.lastName.placeholder")}
                                className="h-11 border-2 border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 bg-background/50 transition-all duration-200"
                                {...field}
                                onKeyDown={allowAlphabetsOnly}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-sm font-semibold text-foreground">
                              {t("tenants.form.fields.email.label")}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder={t("tenants.form.fields.email.placeholder")}
                                className="h-11 border-2 border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 bg-background/50 transition-all duration-200"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-sm font-semibold text-foreground">
                              {t("tenants.form.fields.phone.label")}
                            </FormLabel>
                            <FormControl>
                              <Input
                                maxLength={11}
                                placeholder={t("tenants.form.fields.phone.placeholder")}
                                className="h-11 border-2 border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 bg-background/50 transition-all duration-200"
                                {...field}
                                onKeyDown={allowNumbersOnly}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="dateOfBirth"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-sm font-semibold text-foreground">
                              {t("tenants.form.fields.dateOfBirth.label")}
                            </FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className="h-11 w-full justify-start text-left font-normal border-2 border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 bg-background/50 transition-all duration-200"
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? (
                                      format(field.value, "dd-MM-yyyy")
                                    ) : (
                                      <span>
                                        {t("tenants.form.fields.dateOfBirth.placeholder")}
                                      </span>
                                    )}
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) =>
                                    date > new Date() || date < new Date("1900-01-01")
                                  }
                                  initialFocus
                                  captionLayout="dropdown"
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="nino"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-sm font-semibold text-muted-foreground">
                              {t("tenants.form.fields.nino.label")}
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t("tenants.form.fields.nino.placeholder")}
                                className="h-11 border-2 border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 bg-background/50 transition-all duration-200"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Account Setup */}
              <div className="lg:col-span-6">
                <Card className="border-0 shadow-lg bg-linear-to-br from-white to-gray-50/50 dark:from-primary/10 dark:to-background">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <Key className="h-6 w-6 text-primary" />
                      {t("tenants.form.sections.accountSetup.title")}
                    </CardTitle>
                    <CardDescription className="text-base">
                      {t("tenants.form.sections.accountSetup.description")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-1 gap-6">
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold text-foreground">
                              {t("tenants.form.fields.password.label")}
                            </FormLabel>
                            <div className="relative">
                              <FormControl>
                                <Input
                                  type={showPassword ? "text" : "password"}
                                  placeholder={t("tenants.form.fields.password.placeholder")}
                                  className="h-11 border-2 border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 bg-background/50 transition-all duration-200 pr-10"
                                  {...field}
                                />
                              </FormControl>
                              <button
                                type="button"
                                onClick={() => setShowPassword((prev) => !prev)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                              >
                                {showPassword
                                  ? <EyeOff className="h-4 w-4" />
                                  : <Eye className="h-4 w-4" />
                                }
                              </button>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold text-foreground">
                              {t("tenants.form.fields.confirmPassword.label")}
                            </FormLabel>
                            <div className="relative">
                              <FormControl>
                                <Input
                                  type={showPassword ? "text" : "password"}
                                  placeholder={t("tenants.form.fields.password.placeholder")}
                                  className="h-11 border-2 border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 bg-background/50 transition-all duration-200 pr-10"
                                  {...field}
                                />
                              </FormControl>
                              <button
                                type="button"
                                onClick={() => setShowPassword((prev) => !prev)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                              >
                                {showPassword
                                  ? <EyeOff className="h-4 w-4" />
                                  : <Eye className="h-4 w-4" />
                                }
                              </button>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tenantStatus"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold text-foreground">
                              {t("tenants.form.fields.tenantStatus.label")}
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-11 border-2 border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 bg-background/50 transition-all duration-200">
                                  <SelectValue
                                    placeholder={t("tenants.form.fields.tenantStatus.placeholder")}
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="application_submitted">
                                  {t("tenants.status.applicationSubmitted")}
                                </SelectItem>
                                <SelectItem value="under_review">
                                  {t("tenants.status.underReview")}
                                </SelectItem>
                                <SelectItem value="approved">{t("tenants.status.approved")}</SelectItem>
                                <SelectItem value="active">{t("tenants.status.active")}</SelectItem>
                                <SelectItem value="inactive">{t("tenants.status.inactive")}</SelectItem>
                                <SelectItem value="moved_out">{t("tenants.status.movedOut")}</SelectItem>
                                <SelectItem value="terminated">{t("tenants.status.terminated")}</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Employment Information */}
              <div className="lg:col-span-6">
                <Card className="border-0 shadow-lg bg-linear-to-br from-white to-gray-50/50 dark:from-primary/10 dark:to-background">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <Briefcase className="h-6 w-6 text-primary" />
                      {t("tenants.form.sections.employment.title")}
                    </CardTitle>
                    <CardDescription className="text-base">
                      {t("tenants.form.sections.employment.description")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-6">
                      <FormField
                        control={form.control}
                        name="employer"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold text-muted-foreground">
                              {t("tenants.form.fields.employer.label")}
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t("tenants.form.fields.employer.placeholder")}
                                className="h-11 border-2 border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 bg-background/50 transition-all duration-200"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="position"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold text-muted-foreground">
                              {t("tenants.form.fields.position.label")}
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t("tenants.form.fields.position.placeholder")}
                                className="h-11 border-2 border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 bg-background/50 transition-all duration-200"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="income"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-semibold text-muted-foreground">
                                {t("tenants.form.fields.income.label")}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder={t("tenants.form.fields.income.placeholder")}
                                  className="h-11 border-2 border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 bg-background/50 transition-all duration-200"
                                  minLength={6}
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(
                                      e.target.value ? Number(e.target.value) : undefined
                                    )
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="employmentStartDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-semibold text-muted-foreground">
                                {t("tenants.form.fields.employmentStartDate.label")}
                              </FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className="h-11 w-full justify-start text-left font-normal border-2 border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 bg-background/50 transition-all duration-200"
                                    >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {field.value ? (
                                        format(new Date(field.value), "dd-MM-yyyy")
                                      ) : (
                                        <span>
                                          {t("tenants.form.fields.employmentStartDate.placeholder")}
                                        </span>
                                      )}
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={field.value ? new Date(field.value) : undefined}
                                    onSelect={(date) =>
                                      field.onChange(date ? format(date, "yyyy-MM-dd") : "")
                                    }
                                    disabled={(date) => date > new Date()}
                                    initialFocus
                                    captionLayout="dropdown"
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Emergency Contact */}
              <div className="lg:col-span-7">
                <Card className="border-0 shadow-lg bg-linear-to-br from-white to-gray-50/50 dark:from-primary/10 dark:to-background">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <Phone className="h-6 w-6 text-primary" />
                      {t("tenants.form.sections.emergencyContact.title")}
                    </CardTitle>
                    <CardDescription className="text-base">
                      {t("tenants.form.sections.emergencyContact.description")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="emergencyContactName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold text-muted-foreground">
                              {t("tenants.form.fields.emergencyContactName.label")}
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t("tenants.form.fields.emergencyContactName.placeholder")}
                                className="h-11 border-2 border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 bg-background/50 transition-all duration-200"
                                {...field}
                                onKeyDown={allowAlphabetsOnly}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="emergencyContactRelationship"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold text-muted-foreground">
                              {t("tenants.form.fields.emergencyContactRelationship.label")}
                            </FormLabel>
                            <FormControl>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <SelectTrigger className="h-11 border-2 border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 bg-background/50 transition-all duration-200">
                                  <SelectValue
                                    placeholder={t("tenants.form.fields.emergencyContactRelationship.placeholder")}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="spouse">
                                    {t("tenants.form.fields.emergencyContactRelationship.spouse")}
                                  </SelectItem>
                                  <SelectItem value="parent">
                                    {t("tenants.form.fields.emergencyContactRelationship.parent")}
                                  </SelectItem>
                                  <SelectItem value="sibling">
                                    {t("tenants.form.fields.emergencyContactRelationship.sibling")}
                                  </SelectItem>
                                  <SelectItem value="child">
                                    {t("tenants.form.fields.emergencyContactRelationship.child")}
                                  </SelectItem>
                                  <SelectItem value="friend">
                                    {t("tenants.form.fields.emergencyContactRelationship.friend")}
                                  </SelectItem>
                                  <SelectItem value="other">
                                    {t("tenants.form.fields.emergencyContactRelationship.other")}
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="emergencyContactPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold text-muted-foreground">
                              {t("tenants.form.fields.emergencyContactPhone.label")}
                            </FormLabel>
                            <FormControl>
                              <Input
                                max-length={11}
                                placeholder={t("tenants.form.fields.emergencyContactPhone.placeholder")}
                                className="h-11 border-2 border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 bg-background/50 transition-all duration-200"
                                {...field}
                                onKeyDown={allowNumbersOnly}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="emergencyContactEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold text-muted-foreground">
                              {t("tenants.form.fields.emergencyContactEmail.label")}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder={t("tenants.form.fields.emergencyContactEmail.placeholder")}
                                className="h-11 border-2 border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 bg-background/50 transition-all duration-200"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Additional Information */}
              <div className="lg:col-span-5">
                <Card className="border-0 shadow-lg bg-linear-to-br from-white to-gray-50/50 dark:from-primary/10 dark:to-background">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <FileText className="h-6 w-6 text-primary" />
                      {t("tenants.form.sections.additionalInfo.title")}
                    </CardTitle>
                    <CardDescription className="text-base">
                      {t("tenants.form.sections.additionalInfo.description")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="creditScore"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-muted-foreground">
                            {t("tenants.form.fields.creditScore.label")}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder={t("tenants.form.fields.creditScore.placeholder")}
                              min="300"
                              max="850"
                              className="h-11 border-2 border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 bg-background/50 transition-all duration-200"
                              {...field}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value ? Number(e.target.value) : undefined
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="moveInDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-muted-foreground">
                            {t("tenants.form.fields.moveInDate.label")}
                          </FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className="h-11 w-full justify-start text-left font-normal border-2 border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 bg-background/50 transition-all duration-200"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? (
                                    format(new Date(field.value), "dd-MM-yyyy")
                                  ) : (
                                    <span>
                                      {t("tenants.form.fields.moveInDate.placeholder")}
                                    </span>
                                  )}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value ? new Date(field.value) : undefined}
                                onSelect={(date) =>
                                  field.onChange(date ? format(date, "yyyy-MM-dd") : "")
                                }
                                disabled={(date) => {
                                  const fiveYearsAgo = new Date();
                                  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
                                  const fiveYearsFromNow = new Date();
                                  fiveYearsFromNow.setFullYear(fiveYearsFromNow.getFullYear() + 5);
                                  return date < fiveYearsAgo || date > fiveYearsFromNow;
                                }}
                                initialFocus
                                captionLayout="dropdown"
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Documents */}
              <div className="lg:col-span-12">
                <Card className="border-0 shadow-lg bg-linear-to-br from-white to-gray-50/50 dark:from-primary/10 dark:to-background">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <FileText className="h-6 w-6 text-primary" />
                      {t("tenants.applicationForm.steps.documents")}
                    </CardTitle>
                    <CardDescription className="text-base">
                      Upload tenant documents (PDF, Word, images). Files upload when you create the tenant.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`relative border-2 border-dashed rounded-lg transition-all duration-300 ${isDragging
                        ? "border-primary bg-primary/5 scale-[1.02]"
                        : "border-border/60 hover:border-primary/50 bg-background/50"
                        }`}
                    >
                      <input
                        type="file"
                        id="document-upload"
                        multiple
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                        onChange={(e) => handleDocumentChange(e.target.files)}
                        disabled={isLoading}
                        className="hidden"
                      />
                      <label
                        htmlFor="document-upload"
                        className="flex flex-col items-center justify-center py-12 px-6 cursor-pointer"
                      >
                        <div
                          className={`rounded-full p-4 mb-4 transition-all duration-300 ${isDragging ? "bg-primary/20 scale-110" : "bg-primary/10"
                            }`}
                        >
                          <Upload
                            className={`h-10 w-10 transition-colors duration-300 ${isDragging ? "text-primary" : "text-primary/70"
                              }`}
                          />
                        </div>
                        <p className="text-lg font-semibold text-foreground mb-2">
                          {isDragging ? "Drop files here" : "Drag & drop files or click to browse"}
                        </p>
                        <p className="text-sm text-muted-foreground text-center">
                          Supported formats: PDF, Word, JPG, PNG, WebP
                          <br />
                          Maximum file size: 10MB • Maximum files: 20
                        </p>
                      </label>
                    </div>

                    {documentFiles.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-foreground">
                            Uploaded Files ({documentFiles.length}/20)
                          </h3>
                          {documentFiles.length > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDocumentFiles([]);
                                setFilePreviews({});
                              }}
                              disabled={isLoading}
                              className="text-xs text-muted-foreground hover:text-destructive"
                            >
                              Clear All
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {documentFiles.map((file, index) => {
                            const fileKey = `${file.name}-${file.size}`;
                            const preview = filePreviews[fileKey];
                            const FileIcon = getFileIcon(file);
                            const isImage = file.type.startsWith("image/");

                            return (
                              <div
                                key={`${file.name}-${file.size}-${index}`}
                                className="group relative rounded-lg border-2 border-border/60 bg-background/50 overflow-hidden hover:border-primary/50 hover:shadow-md transition-all duration-300"
                              >
                                <div className="aspect-square bg-muted/30 flex items-center justify-center p-4">
                                  {isImage && preview ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={preview}
                                      alt={file.name}
                                      className="w-full h-full object-cover rounded"
                                    />
                                  ) : (
                                    <div className="flex flex-col items-center justify-center">
                                      <FileIcon className="h-16 w-16 text-primary/70 mb-2" />
                                      <span className="text-xs text-muted-foreground font-medium uppercase">
                                        {file.type.includes("pdf")
                                          ? "PDF"
                                          : file.type.includes("word") || file.type.includes("document")
                                            ? "DOC"
                                            : file.name.split(".").pop()}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                <div className="p-3 bg-background/80 backdrop-blur-sm">
                                  <div className="truncate text-sm font-medium text-foreground mb-1">
                                    {file.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                  </div>
                                </div>

                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  onClick={() => removeDocumentFile(index)}
                                  disabled={isLoading}
                                  className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Notes */}
              <div className="lg:col-span-12">
                <Card className="border-0 shadow-lg bg-linear-to-br from-white to-gray-50/50 dark:from-primary/10 dark:to-background">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <FileText className="h-6 w-6 text-primary" />
                      {t("tenants.form.sections.notes.title")}
                    </CardTitle>
                    <CardDescription className="text-base">
                      {t("tenants.form.sections.notes.description")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-muted-foreground">
                            {t("tenants.form.fields.notes.label")}
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={t("tenants.form.fields.notes.placeholder")}
                              className="min-h-[120px] border-2 border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 bg-background/50 transition-all duration-200 resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>


            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                {t("tenants.form.actions.requiredFields")}
                {draftSavedAt && (
                  <span className="ml-2 text-xs opacity-80">
                    • Draft saved {format(new Date(draftSavedAt), "h:mm a")}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link href="/dashboard/tenants">
                  <Button
                    type="button"
                    variant="ghost"
                    className="hover:bg-accent/50 transition-all duration-200"
                  >
                    {t("tenants.form.actions.cancel")}
                  </Button>
                </Link>

                {/* Save progress locally without creating the tenant */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={saveDraft}
                  disabled={isLoading}
                  className="border-2 hover:bg-accent/50 transition-all duration-200"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Save as Draft
                </Button>

                {/* Optional: save the current tenant and start another */}
                <Button
                  type="submit"
                  variant="outline"
                  disabled={isLoading}
                  onClick={() => {
                    submitIntentRef.current = "saveAndAnother";
                    setPendingIntent("saveAndAnother");
                  }}
                  className="border-2 hover:bg-accent/50 transition-all duration-200"
                >
                  {isLoading && pendingIntent === "saveAndAnother" ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    "Save & Add Another"
                  )}
                </Button>

                {/* Primary: save the current tenant and finish */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  onClick={() => {
                    submitIntentRef.current = "save";
                    setPendingIntent("save");
                  }}
                >
                  {isLoading && pendingIntent === "save" ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving tenant...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Tenant
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}