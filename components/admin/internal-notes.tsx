"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addInternalNote } from "@/lib/actions/admin-dashboard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StickyNote, CheckCircle } from "lucide-react";

interface Note {
  id: string;
  note: string;
  created_at: string;
  author: { first_name: string; last_name: string } | null;
}

interface Props {
  entityType: "booking" | "companion" | "incident" | "senior";
  entityId: string;
  existingNotes: Note[];
}

export function InternalNotes({ entityType, entityId, existingNotes }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  function handleSubmit() {
    if (!note.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await addInternalNote({ entityType, entityId, note });
      if (result.success) {
        setNote("");
        setShowForm(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-sage-500" />
          Internal Notes
          {existingNotes.length > 0 && (
            <span className="text-xs text-gray-400 font-normal">({existingNotes.length})</span>
          )}
        </h3>
        <Button variant="outline" size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ Add Note"}
        </Button>
      </div>

      {showForm && (
        <div className="space-y-2">
          <Textarea
            rows={3}
            placeholder="Add an internal note (visible to admins only)..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={2000}
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">{note.length}/2000</p>
            <Button size="sm" onClick={handleSubmit} disabled={isPending || !note.trim()} className="flex items-center gap-2">
              <CheckCircle className="h-3.5 w-3.5" />
              {isPending ? "Saving..." : "Save Note"}
            </Button>
          </div>
        </div>
      )}

      {existingNotes.length === 0 && !showForm && (
        <p className="text-sm text-gray-400 italic">No internal notes yet.</p>
      )}

      {existingNotes.length > 0 && (
        <div className="space-y-3">
          {existingNotes.map((n) => (
            <div key={n.id} className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-yellow-800">
                  {n.author ? `${n.author.first_name} ${n.author.last_name}` : "Admin"}
                </p>
                <p className="text-xs text-yellow-600">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
              <p className="text-sm text-yellow-900 whitespace-pre-line">{n.note}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
