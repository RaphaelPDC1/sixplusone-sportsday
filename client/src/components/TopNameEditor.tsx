/**
 * TopNameEditor
 *
 * Shown before the payment form. Lets the user confirm or edit the name
 * that will be printed on their personalised team-colour top.
 *
 * - Saves topName to the registration record BEFORE payment is created
 * - Converts preview to uppercase
 * - Validates: letters, numbers, spaces only; max 14 chars (configurable)
 * - Profanity filter applied server-side; client shows generic error if rejected
 */

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { MAX_TOP_NAME_LENGTH } from "@shared/const";

interface TopNameEditorProps {
  registrationId: string;
  playerName: string;
  initialTopName?: string | null;
  onConfirmed: (topName: string) => void;
  onCancel?: () => void;
}

export function TopNameEditor({
  registrationId,
  playerName,
  initialTopName,
  onConfirmed,
  onCancel,
}: TopNameEditorProps) {
  // Default to first word of player name
  const defaultName = (initialTopName || playerName.split(" ")[0] || "").toUpperCase().slice(0, MAX_TOP_NAME_LENGTH);
  const [topName, setTopName] = useState(defaultName);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const saveTopName = trpc.sportsday.saveTopName.useMutation();

  const validate = (value: string): string => {
    if (!value.trim()) return "Top name is required.";
    if (value.length > MAX_TOP_NAME_LENGTH) return `Max ${MAX_TOP_NAME_LENGTH} characters.`;
    if (!/^[A-Za-z0-9 ]+$/.test(value)) return "Letters, numbers and spaces only.";
    return "";
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().slice(0, MAX_TOP_NAME_LENGTH);
    setTopName(val);
    setError(validate(val));
  };

  const handleConfirm = async () => {
    const validationError = validate(topName);
    if (validationError) { setError(validationError); return; }

    setSaving(true);
    try {
      await saveTopName.mutateAsync({ registrationId, topName: topName.trim() });
      onConfirmed(topName.trim());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not save top name. Please try again.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const remaining = MAX_TOP_NAME_LENGTH - topName.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="text-[#FF5500] font-mono text-xs tracking-widest uppercase mb-2">
          ONE-OF-ONE TOP
        </div>
        <h2 className="text-[#F2F0EB] font-display text-2xl font-bold leading-tight">
          What name goes on your top?
        </h2>
        <p className="text-[#F2F0EB]/60 text-sm mt-2">
          This is what will be printed on your personalised team-colour top.
          You can still edit this before production starts.
        </p>
      </div>

      {/* Preview */}
      <div className="bg-black/40 border border-white/10 rounded-lg p-6 text-center">
        <div className="text-[#F2F0EB]/30 font-mono text-xs tracking-widest uppercase mb-3">
          PREVIEW
        </div>
        <div
          className="font-display font-black tracking-widest text-4xl text-[#F2F0EB]"
          style={{ letterSpacing: "0.15em", textShadow: "0 0 30px rgba(255,85,0,0.3)" }}
        >
          {topName || <span className="text-white/20">YOUR NAME</span>}
        </div>
        <div className="text-[#FF5500]/60 font-mono text-xs tracking-widest mt-3 uppercase">
          Sports Day 002
        </div>
      </div>

      {/* Input */}
      <div>
        <div className="relative">
          <input
            type="text"
            value={topName}
            onChange={handleChange}
            onKeyDown={(e) => e.key === "Enter" && !saving && handleConfirm()}
            placeholder="YOUR NAME"
            maxLength={MAX_TOP_NAME_LENGTH}
            className={`w-full bg-transparent border-b-2 ${
              error ? "border-red-500" : "border-white/20 focus:border-[#FF5500]"
            } outline-none text-[#F2F0EB] font-display text-2xl py-3 placeholder:text-white/20 transition-colors tracking-widest uppercase`}
          />
          <span className={`absolute right-0 bottom-4 font-mono text-xs ${remaining <= 3 ? "text-[#FF5500]" : "text-white/30"}`}>
            {remaining}
          </span>
        </div>
        {error && (
          <p className="text-red-400 text-xs font-mono mt-2">{error}</p>
        )}
        <p className="text-[#F2F0EB]/30 text-xs mt-2">
          Letters, numbers and spaces only · Max {MAX_TOP_NAME_LENGTH} characters
        </p>
      </div>

      {/* Actions */}
      <div className="space-y-3 pt-2">
        <button
          onClick={handleConfirm}
          disabled={saving || !!error || !topName.trim()}
          className="w-full bg-[#FF5500] hover:bg-[#FF5500]/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-mono text-sm tracking-widest uppercase py-4 transition-all"
        >
          {saving ? "SAVING…" : "CONFIRM NAME → UNLOCK"}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="w-full text-[#F2F0EB]/40 hover:text-[#F2F0EB]/70 font-mono text-xs tracking-widest uppercase py-2 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      <p className="text-[#F2F0EB]/30 text-xs text-center">
        You can still change this after payment, until production starts.
      </p>
    </div>
  );
}
