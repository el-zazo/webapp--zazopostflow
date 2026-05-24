"use client";

import { useState } from "react";
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  Copy,
  Check,
  Eye,
  EyeOff,
  Loader2,
  AlertTriangle,
  Key,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { apiFetch } from "@/lib/api-client";
import { RegenerateBackupCodes } from "./RegenerateBackupCodes";

interface TwoFactorSetupProps {
  isEnabled: boolean;
  onStatusChange: (enabled: boolean) => void;
}

type Step = "idle" | "setup" | "verify" | "backup-codes" | "disable" | "view-backup-codes";

export function TwoFactorSetup({ isEnabled, onStatusChange }: TwoFactorSetupProps) {
  const [step, setStep] = useState<Step>("idle");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [backupCodesCopied, setBackupCodesCopied] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [disable2FACode, setDisable2FACode] = useState("");
  const [secretCopied, setSecretCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // View Backup Codes states
  const [backupCodesRevealed, setBackupCodesRevealed] = useState(false);
  const [viewBackupPassword, setViewBackupPassword] = useState("");
  const [viewBackupCode, setViewBackupCode] = useState("");
  const [viewedBackupCodes, setViewedBackupCodes] = useState<string[]>([]);
  const [viewBackupError, setViewBackupError] = useState<string | null>(null);

  const { isLoading: isSettingUp, execute: executeSetup } = useAsyncAction();
  const { isLoading: isVerifying, execute: executeVerify } = useAsyncAction();
  const { isLoading: isDisabling, execute: executeDisable } = useAsyncAction();
  const { isLoading: isViewingCodes, execute: executeViewCodes } = useAsyncAction();

  // ── Initier le setup 2FA ──────────────────────────────────
  const handleStartSetup = async () => {
    setError(null);
    await executeSetup(async () => {
      const res = await apiFetch("/api/auth/2fa/setup", { method: "POST" });
      const data = await res.json();

      if (data.success) {
        setQrCode(data.data.qrCode);
        setSecret(data.data.secret);
        setStep("setup");
      } else {
        setError(data.error || "Failed to start 2FA setup");
      }
    });
  };

  // ── Vérifier le code et activer ──────────────────────────
  const handleVerify = async () => {
    if (!verifyCode || verifyCode.length !== 6) return;
    setError(null);

    await executeVerify(async () => {
      const res = await apiFetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verifyCode }),
      });

      const data = await res.json();

      if (data.success) {
        setBackupCodes(data.data.backupCodes);
        setStep("backup-codes");
        onStatusChange(true);
      } else {
        setError(data.error || "Invalid code");
        setVerifyCode("");
      }
    });
  };

  // ── Désactiver 2FA ───────────────────────────────────────
  const handleDisable = async () => {
    if (!disablePassword) return;
    setError(null);

    await executeDisable(async () => {
      const res = await apiFetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: disablePassword,
          code: disable2FACode || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setStep("idle");
        setDisablePassword("");
        setDisable2FACode("");
        onStatusChange(false);
      } else {
        setError(data.error || "Failed to disable 2FA");
      }
    });
  };

  // ── Voir les backup codes ─────────────────────────────────
  const handleViewBackupCodes = async () => {
    if (!viewBackupPassword || !viewBackupCode) return;
    setViewBackupError(null);

    await executeViewCodes(async () => {
      const res = await apiFetch("/api/auth/2fa/backup-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: viewBackupPassword,
          code: viewBackupCode,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setViewedBackupCodes(data.data.backupCodes); // peut être []
        setBackupCodesRevealed(true); // toujours true si auth réussie
      } else {
        setViewBackupError(data.error || "Failed to retrieve backup codes");
      }
    });
  };

  // ── Copier le secret ─────────────────────────────────────
  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    } catch {
      // Fallback: fail silently
    }
  };

  // ── Copier les backup codes ──────────────────────────────
  const handleCopyBackupCodes = async () => {
    try {
      // Copier selon le contexte actif (setup ou view)
      const codesToCopy =
        viewedBackupCodes.length > 0 ? viewedBackupCodes : backupCodes;
      await navigator.clipboard.writeText(codesToCopy.join("\n"));
      setBackupCodesCopied(true);
      setTimeout(() => setBackupCodesCopied(false), 2000);
    } catch {
      // Fallback: fail silently
    }
  };

  // ── Reset état ───────────────────────────────────────────
  const handleClose = () => {
    setStep("idle");
    setQrCode("");
    setSecret("");
    setShowSecret(false);
    setVerifyCode("");
    setBackupCodes([]);
    setBackupCodesCopied(false);
    setDisablePassword("");
    setDisable2FACode("");
    setError(null);
    // Reset view backup codes
    setBackupCodesRevealed(false);
    setViewBackupPassword("");
    setViewBackupCode("");
    setViewedBackupCodes([]);
    setViewBackupError(null);
  };

  return (
    <div className="space-y-4">

      {/* Status Card */}
      <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20">
        <div className="flex items-center gap-3">
          {isEnabled ? (
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-green-500" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Shield className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-foreground">
              Two-Factor Authentication
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEnabled
                ? "Your account is protected with 2FA"
                : "Add an extra layer of security"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={isEnabled
              ? "border-green-500/30 bg-green-500/5 text-green-500"
              : "border-border text-muted-foreground"
            }
          >
            {isEnabled ? "Enabled" : "Disabled"}
          </Badge>

          {isEnabled ? (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Bouton View Backup Codes */}
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  setViewBackupError(null);
                  setBackupCodesRevealed(false);
                  setViewedBackupCodes([]);
                  setViewBackupPassword("");
                  setViewBackupCode("");
                  setStep("view-backup-codes");
                }}
              >
                <Key className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Backup Codes</span>
                <span className="sm:hidden">Codes</span>
              </Button>

              {/* Bouton Disable */}
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => { setError(null); setStep("disable"); }}
              >
                <ShieldOff className="w-3.5 h-3.5 mr-1.5" />
                Disable
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={handleStartSetup}
              disabled={isSettingUp}
            >
              {isSettingUp ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Shield className="w-3.5 h-3.5 mr-1.5" />
                  Enable
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* ── DIALOG SETUP ── */}
      <Dialog
        open={step === "setup"}
        onOpenChange={(open) => !open && handleClose()}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-orange-500" />
              Set Up Two-Factor Authentication
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">

            {/* Step 1: Scan QR */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-bold shrink-0">
                  1
                </div>
                <p className="text-sm font-medium">
                  Scan this QR code with your authenticator app
                </p>
              </div>

              <p className="text-xs text-muted-foreground ml-8">
                Use Google Authenticator, Authy, or any TOTP app.
              </p>

              {/* QR Code */}
              {qrCode && (
                <div className="flex justify-center">
                  <div className="p-3 bg-white rounded-xl border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrCode}
                      alt="2FA QR Code"
                      className="w-48 h-48"
                    />
                  </div>
                </div>
              )}

              {/* Afficher le secret manuellement */}
              <div className="ml-8 space-y-2">
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-orange-500 transition-colors"
                >
                  {showSecret ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                  {showSecret ? "Hide" : "Can't scan? Show"} setup key
                </button>

                {showSecret && (
                  <div className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-lg border border-border">
                    <code className="text-xs font-mono text-foreground flex-1 break-all">
                      {secret}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopySecret}
                      className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {secretCopied ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Separator */}
            <div className="border-t border-border" />

            {/* Step 2: Verify */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-bold shrink-0">
                  2
                </div>
                <p className="text-sm font-medium">
                  Enter the 6-digit code to confirm
                </p>
              </div>

              <div className="ml-8 space-y-2">
                <Input
                  placeholder="000000"
                  value={verifyCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setVerifyCode(val);
                    setError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                  className="text-center text-xl tracking-widest h-12 font-mono"
                  maxLength={6}
                  autoFocus
                />

                {error && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {error}
                  </p>
                )}

                <Button
                  onClick={handleVerify}
                  disabled={isVerifying || verifyCode.length !== 6}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {isVerifying ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying...</>
                  ) : (
                    "Activate 2FA"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG BACKUP CODES (Setup) ── */}
      <Dialog
        open={step === "backup-codes"}
        onOpenChange={(open) => { if (!open) handleClose(); }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-500">
              <ShieldCheck className="w-5 h-5" />
              2FA Enabled Successfully!
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
              <p className="text-xs text-yellow-400 font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Save these backup codes in a safe place
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                If you lose access to your authenticator app, you can use
                these codes to log in. Each code can only be used once.
              </p>
            </div>

            {/* Backup codes grid */}
            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((code, i) => (
                <div
                  key={i}
                  className="font-mono text-sm text-center py-2 px-3 bg-muted/50 rounded-lg border border-border text-foreground"
                >
                  {code}
                </div>
              ))}
            </div>

            {/* Copy all */}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleCopyBackupCodes}
            >
              {backupCodesCopied ? (
                <><Check className="w-4 h-4 text-green-500" />Copied!</>
              ) : (
                <><Copy className="w-4 h-4" />Copy All Codes</>
              )}
            </Button>

            <Button
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              onClick={handleClose}
            >
              I&apos;ve saved my backup codes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG DISABLE ── */}
      <Dialog
        open={step === "disable"}
        onOpenChange={(open) => !open && handleClose()}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldOff className="w-5 h-5" />
              Disable Two-Factor Authentication
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <p className="text-xs text-destructive">
                Disabling 2FA will make your account less secure.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Current Password
                </label>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={disablePassword}
                  onChange={(e) => {
                    setDisablePassword(e.target.value);
                    setError(null);
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  2FA Code{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </label>
                <Input
                  placeholder="6-digit code or backup code"
                  value={disable2FACode}
                  onChange={(e) => {
                    setDisable2FACode(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleDisable()}
                />
              </div>

              {error && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleClose}
                disabled={isDisabling}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleDisable}
                disabled={isDisabling || !disablePassword}
              >
                {isDisabling ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Disabling...</>
                ) : (
                  "Disable 2FA"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG VIEW BACKUP CODES ── */}
      <Dialog
        open={step === "view-backup-codes"}
        onOpenChange={(open) => !open && handleClose()}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-orange-500" />
              Your Backup Codes
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">

            {!backupCodesRevealed ? (
              // ── Formulaire auth ──
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Enter your password and current 2FA code to view your backup codes.
                </p>

                <div className="space-y-3">
                  {/* Password */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Password</label>
                    <Input
                      type="password"
                      placeholder="Enter your password"
                      value={viewBackupPassword}
                      onChange={(e) => {
                        setViewBackupPassword(e.target.value);
                        setViewBackupError(null);
                      }}
                    />
                  </div>

                  {/* 2FA Code */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                      2FA Code
                    </label>
                    <Input
                      placeholder="6-digit code"
                      value={viewBackupCode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                        setViewBackupCode(val);
                        setViewBackupError(null);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleViewBackupCodes()}
                      className="text-center text-xl tracking-widest h-11 font-mono"
                      maxLength={6}
                    />
                  </div>

                  {viewBackupError && (
                    <p className="text-xs text-destructive flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      {viewBackupError}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleClose}
                    disabled={isViewingCodes}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                    onClick={handleViewBackupCodes}
                    disabled={
                      isViewingCodes ||
                      !viewBackupPassword ||
                      viewBackupCode.length !== 6
                    }
                  >
                    {isViewingCodes ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying...</>
                    ) : (
                      "View Codes"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              // ── Afficher codes (même si 0) ──
              <div className="space-y-4">

                {viewedBackupCodes.length === 0 ? (
                  // ── Aucun code restant ──
                  <div className="text-center py-4 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                      <AlertTriangle className="w-6 h-6 text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        No backup codes remaining
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        All your backup codes have been used.
                        Generate new ones to keep your account secure.
                      </p>
                    </div>
                  </div>
                ) : (
                  // ── Codes existants ──
                  <>
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                      <p className="text-xs text-yellow-400 font-medium flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        Keep these codes safe and secret
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Each code can only be used once.
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {viewedBackupCodes.length}
                        </span>{" "}
                        backup codes remaining
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {viewedBackupCodes.map((code, i) => (
                        <div
                          key={i}
                          className="font-mono text-sm text-center py-2 px-3 bg-muted/50 rounded-lg border border-border text-foreground"
                        >
                          {code}
                        </div>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={handleCopyBackupCodes}
                    >
                      {backupCodesCopied ? (
                        <><Check className="w-4 h-4 text-green-500" />Copied!</>
                      ) : (
                        <><Copy className="w-4 h-4" />Copy All Codes</>
                      )}
                    </Button>
                  </>
                )}

                {/* Bouton Regenerate (toujours visible) */}
                <div className="border-t border-border pt-3">
                  <RegenerateBackupCodes
                    onSuccess={(newCodes) => {
                      setViewedBackupCodes(newCodes);
                    }}
                  />
                </div>

                <Button
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={handleClose}
                >
                  Done
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
