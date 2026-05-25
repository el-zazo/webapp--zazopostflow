"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Loader2, User, Shield, ShieldCheck, Palette, AlertTriangle, Trash2, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useTheme } from "next-themes";
import { useSearchParams, useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { LogoutButton } from "@/components/shared/LogoutButton";
import { TwoFactorSetup } from "@/components/settings/TwoFactorSetup";
import { apiFetch } from "@/lib/api-client";

// ── Password strength logic ──────────────────────────────────────────
function getPasswordStrength(pass: string): number {
  if (!pass) return 0;

  const hasLower = /[a-z]/.test(pass);
  const hasUpper = /[A-Z]/.test(pass);
  const hasDigit = /[0-9]/.test(pass);
  const hasSpecial = /[^a-zA-Z0-9]/.test(pass);

  // Bar 4 (Green): ≥12 characters + uppercase + lowercase + digit + special
  if (pass.length >= 12 && hasUpper && hasLower && hasDigit && hasSpecial) {
    return 4;
  }
  // Bar 3 (Orange): ≥10 characters + uppercase + lowercase + digit
  if (pass.length >= 10 && hasUpper && hasLower && hasDigit) {
    return 3;
  }
  // Bar 2 (Yellow): ≥8 characters + (digit OR special)
  if (pass.length >= 8 && (hasDigit || hasSpecial)) {
    return 2;
  }
  // Bar 1 (Red): any non-empty password (weak baseline)
  return 1;
}

const STRENGTH_CONFIG: Record<number, { label: string; color: string; shadow: string }> = {
  0: { label: "", color: "bg-muted", shadow: "" },
  1: { label: "Weak", color: "bg-red-500", shadow: "shadow-[0_0_8px_rgba(239,68,68,0.5)]" },
  2: { label: "Fair", color: "bg-yellow-500", shadow: "shadow-[0_0_8px_rgba(234,179,8,0.5)]" },
  3: { label: "Good", color: "bg-orange-500", shadow: "shadow-[0_0_8px_rgba(249,115,22,0.5)]" },
  4: { label: "Very Strong", color: "bg-green-500", shadow: "shadow-[0_0_8px_rgba(34,197,94,0.5)]" },
};

const profileSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters"),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

function SettingsPageContent() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isLoading: profileLoading, execute: executeProfile } = useAsyncAction();
  const { isLoading: passwordLoading, execute: executePassword } = useAsyncAction();
  const { isLoading: deleteLoading, execute: executeDelete } = useAsyncAction();
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteRequested, setDeleteRequested] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState("");
  const [deleteRequires2FA, setDeleteRequires2FA] = useState(false);
  const [delete2FACode, setDelete2FACode] = useState("");
  const [user, setUser] = useState<{ username: string; email: string; theme: string } | null>(null);

  // ── 2FA State ─────────────────────────────────────────────────────────
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);

  // ── Active tab (supports URL param) ────────────────────────────────────
  const tabFromUrl = searchParams.get("tab") || "profile";
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  // ── Handle URL params for 2FA disable-by-email flow ────────────────────
  useEffect(() => {
    if (searchParams.get("disabled") === "true") {
      setIs2FAEnabled(false);
      toast({
        title: "2FA Disabled",
        description: "Two-factor authentication has been disabled successfully.",
      });
      router.replace("/settings?tab=security");
    } else if (searchParams.get("error") === "invalid-token") {
      toast({
        title: "Invalid Link",
        description: "The link is invalid or has expired. Please try again.",
        variant: "destructive",
      });
      router.replace("/settings?tab=security");
    }
  }, [searchParams, toast, router]);

  // ── Change Password 2FA State ──────────────────────────────────────────
  const [changePasswordRequires2FA, setChangePasswordRequires2FA] = useState(false);
  const [changePassword2FACode, setChangePassword2FACode] = useState("");

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: "",
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const newPasswordValue = passwordForm.watch("newPassword");
  const pwStrength = useMemo(() => getPasswordStrength(newPasswordValue ?? ""), [newPasswordValue]);
  const pwStrengthInfo = STRENGTH_CONFIG[pwStrength];

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await apiFetch("/api/auth/me");
        const data = (await res.json()) as {
          success: boolean;
          data: {
            user: {
              username: string;
              email: string;
              theme: string;
              two_factor_enabled?: boolean;
            };
          };
        };
        if (data.success) {
          setUser(data.data.user);
          profileForm.reset({
            username: data.data.user.username,
          });
          // Set theme from user preference
          if (data.data.user.theme) {
            setTheme(data.data.user.theme);
          }
          // ── Récupérer le statut 2FA ────────────────────────────────
          setIs2FAEnabled(data.data.user.two_factor_enabled || false);
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
      }
    };
    fetchUser();
  }, [profileForm, setTheme]);

  const handleProfileSubmit = async (data: ProfileFormValues) => {
    await executeProfile(async () => {
      const res = await apiFetch("/api/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "profile", ...data }),
      });

      const result = (await res.json()) as {
        success: boolean;
        data?: { username: string; email: string; theme: string };
        error?: string;
      };
      if (result.success) {
        toast({ title: "Profile updated successfully!" });
        setUser(result.data ?? null);
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    });
  };

  const handlePasswordSubmit = async (data: PasswordFormValues) => {
    await executePassword(async () => {
      const res = await apiFetch("/api/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "password",
          ...data,
          twoFactorCode: changePassword2FACode || undefined,
        }),
      });

      const result = (await res.json()) as {
        success: boolean;
        requires2FA?: boolean;
        error?: string;
      };
      if (result.success) {
        toast({ title: "Password updated successfully!" });
        passwordForm.reset();
        setChangePasswordRequires2FA(false);
        setChangePassword2FACode("");
      } else if (result.requires2FA) {
        setChangePasswordRequires2FA(true);
        toast({
          title: "2FA Required",
          description: "Please enter your 2FA code to confirm.",
        });
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    });
  };

  const handleThemeToggle = async (isDark: boolean) => {
    const newTheme = isDark ? "dark" : "light";
    setTheme(newTheme);
    try {
      await apiFetch("/api/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "theme", theme: newTheme }),
      });
    } catch {
      // Theme change is local, silently fail on server save
    }
  };

  const handleRequestDelete = async () => {
    if (!deletePassword) {
      toast({
        title: "Password required",
        description: "Please enter your password to continue.",
        variant: "destructive",
      });
      return;
    }

    await executeDelete(async () => {
      const res = await apiFetch("/api/auth/request-delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: deletePassword,
          twoFactorCode: delete2FACode || undefined,
        }),
      });

      const data = (await res.json()) as {
        success: boolean;
        email: string;
        requires2FA?: boolean;
        error?: string;
      };

      if (data.success) {
        setDeleteRequested(true);
        setDeleteEmail(data.email);
        setDeletePassword("");
        setDelete2FACode("");
        setDeleteRequires2FA(false);
        toast({
          title: "Confirmation email sent",
          description: "Check your inbox to confirm account deletion.",
        });
      } else if (data.requires2FA) {
        setDeleteRequires2FA(true);
        toast({
          title: "2FA Required",
          description: "Enter your 2FA code to confirm account deletion.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Something went wrong",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Manage your account preferences
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/50 w-full flex h-auto flex-wrap gap-1 p-1">
          <TabsTrigger value="profile" className="gap-1.5 flex-1 min-w-[100px] text-xs sm:text-sm">
            <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="truncate">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5 flex-1 min-w-[100px] text-xs sm:text-sm">
            <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="truncate">Security</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-1.5 flex-1 min-w-[100px] text-xs sm:text-sm">
            <Palette className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="truncate">Appearance</span>
          </TabsTrigger>
          <TabsTrigger value="danger" className="gap-1.5 flex-1 min-w-[100px] text-xs sm:text-sm">
            <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="truncate">Danger</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Profile</CardTitle>
              <CardDescription className="text-muted-foreground">
                Update your profile information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form
                  onSubmit={profileForm.handleSubmit(handleProfileSubmit)}
                  className="space-y-4 max-w-md"
                >
                  <FormField
                    control={profileForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input
                            className="bg-background border-border"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <FormLabel>Email</FormLabel>
                    <Input
                      value={user?.email || ""}
                      disabled
                      className="bg-muted border-border"
                    />
                    <p className="text-xs text-muted-foreground">
                      Email cannot be changed
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                    disabled={profileLoading}
                  >
                    {profileLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </form>

                {/* Séparateur + Session / Logout */}
                <div className="border-t border-border pt-4 mt-6 max-w-md">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Session</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      You are logged in as{" "}
                      <span className="font-medium text-foreground">
                        {user?.email}
                      </span>
                    </p>

                    {/* Bouton logout visible sur mobile */}
                    <LogoutButton variant="settings" />
                  </div>
                </div>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <div className="space-y-6">
            {/* ── 2FA Section ────────────────────────────────────────────── */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Two-Factor Authentication</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Add an extra layer of security to your account with TOTP
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TwoFactorSetup
                  isEnabled={is2FAEnabled}
                  email={user?.email || ""}
                  onStatusChange={(enabled) => setIs2FAEnabled(enabled)}
                />
              </CardContent>
            </Card>

            {/* ── Change Password Section ────────────────────────────────── */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Change Password</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...passwordForm}>
                  <form
                    onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)}
                    className="space-y-4 max-w-md"
                  >
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              className="bg-background border-border"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="At least 12 characters"
                              className="bg-background border-border"
                              {...field}
                            />
                          </FormControl>
                          {/* Password strength bars */}
                          {newPasswordValue && newPasswordValue.length > 0 && (
                            <div className="space-y-2 pt-1">
                              <div className="flex gap-1.5">
                                {[1, 2, 3, 4].map((bar) => (
                                  <div
                                    key={bar}
                                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                                      bar <= pwStrength
                                        ? `${pwStrengthInfo.color} ${pwStrengthInfo.shadow}`
                                        : "bg-muted"
                                    }`}
                                  />
                                ))}
                              </div>
                              {pwStrengthInfo.label && (
                                <div className="flex items-center justify-between">
                                  <span
                                    className={`text-xs font-medium transition-all duration-300 ${
                                      pwStrength === 4
                                        ? "text-green-500"
                                        : pwStrength === 3
                                        ? "text-orange-500"
                                        : pwStrength === 2
                                        ? "text-yellow-500"
                                        : "text-red-500"
                                    }`}
                                  >
                                    {pwStrengthInfo.label}
                                  </span>
                                  {pwStrength === 4 && (
                                    <span className="text-xs text-green-500 animate-pulse">&#10003; Ready</span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              className="bg-background border-border"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* 2FA Code (conditionnel) */}
                    {changePasswordRequires2FA && (
                      <div className="space-y-1.5">
                        <FormLabel className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-orange-500" />
                          2FA Code Required
                        </FormLabel>
                        <Input
                          placeholder="6-digit code from authenticator"
                          value={changePassword2FACode}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                            setChangePassword2FACode(val);
                          }}
                          className="text-center tracking-widest font-mono bg-background border-border"
                          maxLength={6}
                          autoFocus
                        />
                        <p className="text-xs text-muted-foreground">
                          Your account has 2FA enabled. Enter your authenticator code to confirm.
                        </p>
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                      disabled={passwordLoading}
                    >
                      {passwordLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        "Update Password"
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Appearance</CardTitle>
              <CardDescription className="text-muted-foreground">
                Customize the look and feel of PostFlow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 max-w-md">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    Dark Mode
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Toggle between light and dark theme
                  </p>
                </div>
                <Switch
                  checked={theme === "dark"}
                  onCheckedChange={handleThemeToggle}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Danger Zone Tab */}
        <TabsContent value="danger">
          <Card className="bg-card border-destructive/30">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription className="text-muted-foreground">
                Irreversible actions that will permanently affect your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border border-destructive/30 rounded-xl p-6 space-y-4 bg-destructive/5">
                <div>
                  <h3 className="text-base font-semibold text-destructive">
                    Delete Account
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Permanently delete your account and all associated data.
                    This action cannot be undone.
                  </p>
                </div>

                {/* Message after request sent */}
                {deleteRequested ? (
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Confirmation email sent
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          We sent a confirmation link to{" "}
                          <span className="text-orange-500 font-medium">{deleteEmail}</span>.
                          Click the link to permanently delete your account.
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          The link expires in 1 hour.
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteRequested(false)}
                      className="w-full"
                    >
                      Cancel / Send Again
                    </Button>
                  </div>
                ) : (
                  // Delete form
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Confirm your password
                      </label>
                      <Input
                        type="password"
                        placeholder="Enter your current password"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        className="border-destructive/30 focus-visible:ring-destructive/30"
                      />
                    </div>

                    {/* 2FA Code (conditionnel) */}
                    {deleteRequires2FA && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2 text-foreground">
                          <ShieldCheck className="w-4 h-4 text-orange-500" />
                          2FA Code Required
                        </label>
                        <Input
                          placeholder="6-digit code from authenticator"
                          value={delete2FACode}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                            setDelete2FACode(val);
                          }}
                          className="text-center tracking-widest font-mono border-destructive/30"
                          maxLength={6}
                          autoFocus
                        />
                        <p className="text-xs text-muted-foreground">
                          Your account has 2FA enabled. Enter your authenticator code to confirm.
                        </p>
                      </div>
                    )}

                    <ConfirmDialog
                      trigger={
                        <Button
                          variant="destructive"
                          className="w-full"
                          disabled={!deletePassword || deleteLoading}
                        >
                          {deleteLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Sending confirmation...
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete My Account
                            </>
                          )}
                        </Button>
                      }
                      title="Delete Account"
                      description="A confirmation email will be sent to your address. You must click the link in the email to permanently delete your account. This action cannot be undone."
                      confirmText="Send Confirmation Email"
                      onConfirm={handleRequestDelete}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <SettingsPageContent />
    </Suspense>
  );
}
