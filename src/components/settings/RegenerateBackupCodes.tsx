"use client";

import { useState } from "react";
import { RefreshCw, AlertTriangle, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { apiFetch } from "@/lib/api-client";

interface RegenerateBackupCodesProps {
  onSuccess: (newCodes: string[]) => void;
}

export function RegenerateBackupCodes({ onSuccess }: RegenerateBackupCodesProps) {
  const [done, setDone] = useState(false);
  const { isLoading, execute } = useAsyncAction();

  const handleRegenerate = async () => {
    await execute(async () => {
      const res = await apiFetch("/api/auth/2fa/regenerate-backup-codes", {
        method: "POST",
      });

      const data = await res.json();

      if (data.success) {
        onSuccess(data.data.backupCodes);
        setDone(true);
        setTimeout(() => setDone(false), 3000);
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 text-muted-foreground hover:text-foreground"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : done ? (
            <Check className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          {done ? "New codes generated!" : "Regenerate Backup Codes"}
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Regenerate Backup Codes?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              This will permanently replace all your current backup codes
              with 8 new ones.
            </span>
            <span className="block font-medium text-foreground">
              Your old backup codes will stop working immediately.
            </span>
            <span className="block">
              Make sure to save the new codes in a safe place.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRegenerate}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {isLoading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
            ) : (
              "Yes, Generate New Codes"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
