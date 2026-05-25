"use client";

import { useState, useEffect } from "react";
import { Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { apiFetch } from "@/lib/api-client";

interface EditTagDialogProps {
  tag: { _id: string; name: string };
  onSuccess: (updatedTag: { _id: string; name: string }) => void;
}

export function EditTagDialog({ tag, onSuccess }: EditTagDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(tag.name);
  const [error, setError] = useState<string | null>(null);
  const { isLoading, execute } = useAsyncAction();

  // Reset à l'ouverture
  useEffect(() => {
    if (open) {
      setName(tag.name);
      setError(null);
    }
  }, [open, tag.name]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Tag name is required");
      return;
    }
    if (name.trim() === tag.name) {
      setOpen(false);
      return;
    }

    await execute(async () => {
      const res = await apiFetch(`/api/tags/${tag._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = (await res.json()) as {
        success: boolean;
        data: { _id: string; name: string };
        error?: string;
      };

      if (data.success) {
        onSuccess(data.data);
        setOpen(false);
      } else {
        setError(data.error || "Failed to update tag");
      }
    });
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setOpen(true)}
        title="Edit tag"
      >
        <Pencil className="w-3.5 h-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Tag</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Input
              placeholder="Tag name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              autoFocus
            />
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
