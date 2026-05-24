"use client";

import { useState, useRef } from "react";
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
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";

interface ConfirmDialogProps {
  trigger: ReactNode;
  title: string;
  description: string;
  onConfirm: () => void | Promise<void>;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
  children?: ReactNode;
}

/**
 * [FIX #10] ConfirmDialog avec contrôle de l'état d'ouverture.
 *
 * Avant: Le composant AlertDialog de Radix fermait le dialog immédiatement
 * quand l'utilisateur cliquait sur AlertDialogAction, avant même que
 * l'action asynchrone ne se termine. Si l'action échouait, le dialog
 * était déjà fermé sans feedback d'erreur.
 *
 * Maintenant: Le dialog est contrôlé manuellement via `open`/`onOpenChange`.
 * On ne le ferme QUE si l'action asynchrone réussit. En cas d'erreur,
 * un toast s'affiche et le dialog reste ouvert pour permettre de réessayer.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  onConfirm,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "destructive",
  children,
}: ConfirmDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const loadingRef = useRef(false);
  const { toast } = useToast();

  const handleConfirm = async (e: React.MouseEvent) => {
    // Empêcher le comportement par défaut de Radix (qui ferme le dialog)
    e.preventDefault();

    // Double-click protection via ref synchrone
    if (loadingRef.current) return;
    loadingRef.current = true;
    setIsLoading(true);

    try {
      await onConfirm();
      // Succès → fermer le dialog
      setOpen(false);
    } catch (error) {
      // Erreur → afficher un toast et garder le dialog ouvert
      const message = error instanceof Error ? error.message : "An unexpected error occurred. Please try again.";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent className="bg-card border-border">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel className="border-border bg-transparent hover:bg-accent" disabled={isLoading}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={
              variant === "destructive"
                ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                : "bg-orange-500 hover:bg-orange-600 text-white"
            }
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              confirmText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
