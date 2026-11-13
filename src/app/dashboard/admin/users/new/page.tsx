"use client";

import { z } from "zod";
import Link from "next/link";
import { toast } from "sonner";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { UserRole } from "@/types";
import { isValidPhoneNumber } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { zodResolver } from "@hookform/resolvers/zod";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { ArrowLeft, User, Shield, Key, Eye, EyeOff } from "lucide-react";
import { useLocalizationContext } from "@/components/providers/LocalizationProvider";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-policy";

// Enhanced validation schema for user creation - will be created inside component to access t()
const createUserSchemaFactory = (t: (key: string) => string) =>
  z
    .object({
      firstName: z
        .string()
        .min(1, t("admin.createUser.validation.firstNameRequired"))
        .max(50, t("admin.createUser.validation.firstNameTooLong")),
      lastName: z
        .string()
        .min(1, t("admin.createUser.validation.lastNameRequired"))
        .max(50, t("admin.createUser.validation.lastNameTooLong")),
      email: z
        .string()
        .email(t("admin.createUser.validation.invalidEmail"))
        .toLowerCase(),
      password: z
        .string()
        .min(MIN_PASSWORD_LENGTH, t("admin.createUser.validation.passwordMinLength"))
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
          t("admin.createUser.validation.passwordComplexity")
        ),
      confirmPassword: z
        .string()
        .min(1, t("admin.createUser.validation.confirmPasswordRequired")),
      phone: z
        .string()
        .optional()
        .refine((phone) => !phone || isValidPhoneNumber(phone), {
          message: t("admin.createUser.validation.invalidPhone"),
        }),
      role: z
        .string()
        .min(1, t("admin.createUser.validation.selectValidRole")),
      isActive: z.boolean(),
      sendWelcomeEmail: z.boolean(),
      avatar: z.string().optional(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("admin.createUser.validation.passwordsDontMatch"),
      path: ["confirmPassword"],
    });

type CreateUserFormData = z.infer<ReturnType<typeof createUserSchemaFactory>>;

export default function CreateUserPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { t } = useLocalizationContext();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [roleOptions, setRoleOptions] = useState<
    { value: string; label: string; description: string; isSystem: boolean }[]
  >([]);

  // Create schema with translations
  const createUserSchema = createUserSchemaFactory(t);

  // Check permissions
  const canCreateUsers = [UserRole.ADMIN, UserRole.MANAGER].includes(
    session?.user?.role as UserRole
  );

  const form = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      role: UserRole.MANAGER,
      isActive: true,
      sendWelcomeEmail: true,
      avatar: "",
    },
  });

  const getDefaultRoleOptions = () => [
    {
      value: UserRole.ADMIN,
      label: t("admin.createUser.roles.admin.label"),
      description: t("admin.createUser.roles.admin.description"),
      isSystem: true,
    },
    {
      value: UserRole.MANAGER,
      label: t("admin.createUser.roles.manager.label"),
      description: t("admin.createUser.roles.manager.description"),
      isSystem: true,
    },
    {
      value: UserRole.TENANT,
      label: t("admin.createUser.roles.tenant.label"),
      description: t("admin.createUser.roles.tenant.description"),
      isSystem: true,
    },
  ];

  React.useEffect(() => {
    let cancelled = false;
    const loadRoles = async () => {
      try {
        const res = await fetch("/api/roles?includeSystem=true");
        if (!res.ok) {
          setRoleOptions(getDefaultRoleOptions());
          return;
        }
        const payload = await res.json();
        const rolesRaw = payload?.data?.roles ?? payload?.roles ?? [];
        const mapped = rolesRaw.map((r: any) => {
          const isSystem = Object.values(UserRole).includes(r.name);
          return {
            value: r.name,
            label: isSystem
              ? t(`admin.createUser.roles.${r.name}.label`)
              : r.label,
            description: isSystem
              ? t(`admin.createUser.roles.${r.name}.description`)
              : r.description,
            isSystem: !!r.isSystem,
          };
        });
        const defaults = getDefaultRoleOptions();
        const byName = new Map<string, any>();
        [...defaults, ...mapped].forEach((opt) => {
          byName.set(opt.value, opt);
        });
        const merged = Array.from(byName.values());
        if (!cancelled) setRoleOptions(merged);
      } catch {
        setRoleOptions(getDefaultRoleOptions());
      }
    };
    loadRoles();
    return () => {
      cancelled = true;
    };
  }, [t]);

  React.useEffect(() => {
    if (roleOptions.length > 0) {
      const current = form.getValues("role");
      if (!current || !roleOptions.some((r) => r.value === current)) {
        const preferred = roleOptions.find((r) => r.value === UserRole.MANAGER);
        form.setValue("role", preferred?.value ?? roleOptions[0].value);
      }
    }
  }, [roleOptions, form]);

  const handleAvatarUploaded = (url: string) => {
    setAvatarUrl(url);
    form.setValue("avatar", url);
  };

  const handleAvatarRemoved = () => {
    setAvatarUrl("");
    form.setValue("avatar", "");
  };

  const onSubmit = async (data: CreateUserFormData) => {
    setIsLoading(true);
    try {
      // Create user data with avatar
      const userData = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        phone: data.phone,
        role: data.role,
        avatar: avatarUrl || undefined,
        isActive: data.isActive,
      };

      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage =
          result.error || result.message || "Failed to create user";
        throw new Error(errorMessage);
      }

      toast.success(
        t("admin.createUser.toast.success", {
          values: { firstName: data.firstName, lastName: data.lastName },
        })
      );
      router.push("/dashboard/admin/users");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("admin.createUser.toast.error")
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Role options based on current user's permissions
  const getRoleOptions = () => {
    return roleOptions.length ? roleOptions : getDefaultRoleOptions();
  };

  if (!canCreateUsers) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">
            {t("admin.createUser.accessDenied")}
          </h3>
          <p className="text-muted-foreground mb-2">
            {t("admin.createUser.accessDeniedDesc")}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {t("admin.createUser.accessDeniedRole", {
              values: { role: session?.user?.role || "Unknown" },
            })}
          </p>
          <div className="space-y-2">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("admin.createUser.goBack")}
            </Button>
            {!session?.user && (
              <p className="text-xs text-muted-foreground">
                {t("admin.createUser.signInPrompt")}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Enhanced Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              {t("admin.createUser.title")}
            </h1>
            <p className="text-muted-foreground text-md">
              {t("admin.createUser.subtitle")}
            </p>
          </div>
          <Link href="/dashboard/admin/users">
            <Button
              variant="ghost"
              size="sm"
              className="hover:bg-accent/50 transition-colors border-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              {t("admin.createUser.backToUsers")}
            </Button>
          </Link>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Modern Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Avatar Upload - Enhanced Card */}
              <div className="lg:col-span-4">
                <Card className="border-0 shadow-lg bg-linear-to-br from-white to-gray-50/50 dark:from-primary/10 dark:to-background">
                  <CardHeader className="text-center pb-4">
                    <CardTitle className="flex items-center justify-center gap-2 text-xl">
                      <User className="h-6 w-6 text-primary" />
                      {t("admin.createUser.profilePhoto.title")}
                    </CardTitle>
                    <CardDescription className="text-base">
                      {t("admin.createUser.profilePhoto.description")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-center pb-8">
                    <AvatarUpload
                      currentAvatar={avatarUrl}
                      onAvatarUploaded={handleAvatarUploaded}
                      onAvatarRemoved={handleAvatarRemoved}
                      disabled={isLoading}
                      userInitials={
                        `${form.watch("firstName")?.[0] || ""}${
                          form.watch("lastName")?.[0] || ""
                        }`.toUpperCase() || "U"
                      }
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Personal Information - Enhanced Large Card */}
              <div className="lg:col-span-8">
                <Card className="border-0 shadow-lg bg-linear-to-br from-white to-gray-50/50 dark:from-primary/10 dark:to-background">
                  <CardHeader className="pb-6">
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <User className="h-6 w-6 text-primary" />
                      {t("admin.createUser.personalInfo.title")}
                    </CardTitle>
                    <CardDescription className="text-base">
                      {t("admin.createUser.personalInfo.description")}
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
                              {t("admin.createUser.personalInfo.firstName")}
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t(
                                  "admin.createUser.personalInfo.firstNamePlaceholder"
                                )}
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
                        name="lastName"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-sm font-semibold text-foreground">
                              {t("admin.createUser.personalInfo.lastName")}
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t(
                                  "admin.createUser.personalInfo.lastNamePlaceholder"
                                )}
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
                        name="email"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-sm font-semibold text-foreground">
                              {t("admin.createUser.personalInfo.email")}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder={t(
                                  "admin.createUser.personalInfo.emailPlaceholder"
                                )}
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
                            <FormLabel className="text-sm font-semibold text-muted-foreground">
                              {t("admin.createUser.personalInfo.phone")}
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t(
                                  "admin.createUser.personalInfo.phonePlaceholder"
                                )}
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

              {/* Account Setup - Enhanced Medium Card */}
              <div className="lg:col-span-6">
                <Card className="border-0 shadow-lg bg-linear-to-br from-white to-gray-50/50 dark:from-primary/10 dark:to-background">
                  <CardHeader className="pb-6">
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <Key className="h-6 w-6 text-primary" />
                      {t("admin.createUser.accountSetup.title")}
                    </CardTitle>
                    <CardDescription className="text-base">
                      {t("admin.createUser.accountSetup.description")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-sm font-semibold text-foreground">
                              {t("admin.createUser.accountSetup.password")}
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showPassword ? "text" : "password"}
                                  placeholder={t(
                                    "admin.createUser.accountSetup.passwordPlaceholder"
                                  )}
                                  className="h-11 border-2 border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 bg-background/50 transition-all duration-200"
                                  {...field}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                  onClick={() => setShowPassword(!showPassword)}
                                >
                                  {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-sm font-semibold text-foreground">
                              {t(
                                "admin.createUser.accountSetup.confirmPassword"
                              )}
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={
                                    showConfirmPassword ? "text" : "password"
                                  }
                                  placeholder={t(
                                    "admin.createUser.accountSetup.confirmPasswordPlaceholder"
                                  )}
                                  className="h-11 border-2 border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 bg-background/50 transition-all duration-200"
                                  {...field}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                  onClick={() =>
                                    setShowConfirmPassword(!showConfirmPassword)
                                  }
                                >
                                  {showConfirmPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-sm font-semibold text-foreground">
                              {t("admin.createUser.accountSetup.role")}
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="h-11 border-2 border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 bg-background/50 transition-all duration-200">
                                  <SelectValue
                                    placeholder={t(
                                      "admin.createUser.accountSetup.rolePlaceholder"
                                    )}
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {getRoleOptions().map((role) => (
                                  <SelectItem
                                    key={role.value}
                                    value={role.value}
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-medium">
                                        {role.label}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {role.description}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
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

              {/* User Settings - Enhanced Medium Card */}
              <div className="lg:col-span-6">
                <Card className="border-0 shadow-lg bg-linear-to-br from-white to-gray-50/50 dark:from-primary/10 dark:to-background">
                  <CardHeader className="pb-6">
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <Shield className="h-6 w-6 text-primary" />
                      {t("admin.createUser.userSettings.title")}
                    </CardTitle>
                    <CardDescription className="text-base">
                      {t("admin.createUser.userSettings.description")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                      <FormField
                        control={form.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-semibold text-foreground">
                                {t(
                                  "admin.createUser.userSettings.activeAccount"
                                )}
                              </FormLabel>
                              <p className="text-sm text-muted-foreground">
                                {t(
                                  "admin.createUser.userSettings.activeAccountDesc"
                                )}
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="sendWelcomeEmail"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-semibold text-foreground">
                                {t(
                                  "admin.createUser.userSettings.sendWelcomeEmail"
                                )}
                              </FormLabel>
                              <p className="text-sm text-muted-foreground">
                                {t(
                                  "admin.createUser.userSettings.sendWelcomeEmailDesc"
                                )}
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Enhanced Form Actions */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {t("admin.createUser.requiredFields")}
              </div>
              <div className="flex items-center gap-4">
                <Link href="/dashboard/admin/users">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-2 hover:bg-accent/50 transition-all duration-200"
                  >
                    {t("admin.createUser.cancel")}
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={isLoading}
                  size="sm"
                  className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {t("admin.createUser.creating")}
                    </>
                  ) : (
                    t("admin.createUser.createUser")
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
