import { useRef, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const TEAM_COLORS: Record<string, string> = {
  red: "#B80000",
  blue: "#1A4FE8",
  pink: "#F72B8C",
  orange: "#FF6B00",
};

interface PhotoFeedProps {
  registrationId: string;
  teamColor: string;
}

export function PhotoFeed({ registrationId, teamColor }: PhotoFeedProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadingRef = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);

  const { data: photos = [], refetch } = trpc.sportsday.listPhotos.useQuery(undefined, {
    refetchInterval: 15_000,
  });

  const uploadMutation = trpc.sportsday.uploadPhoto.useMutation({
    onSuccess: () => {
      toast.success("Photo shared with everyone!");
      setPendingImage(null);
      setCaption("");
      setShowComposer(false);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message ?? "Upload failed");
    },
    onSettled: () => {
      setUploading(false);
      uploadingRef.current = false;
    },
  });

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Always reset the input value immediately so re-selecting the same file works
    // and so the browser doesn't re-fire onChange on re-render
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too large — max 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPendingImage(ev.target?.result as string);
      setShowComposer(true);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleSubmit = () => {
    if (!pendingImage || !registrationId) return;
    if (uploadingRef.current) return;
    uploadingRef.current = true;
    setUploading(true);
    uploadMutation.mutate({
      registrationId,
      imageDataUrl: pendingImage,
      caption: caption.trim() || undefined,
    });
  };

  const openPicker = () => fileInputRef.current?.click();

  // Duplicate photos for seamless infinite scroll
  const doubled = [...photos, ...photos];

  return (
    <div className="mt-10 mb-2">
      {/* Single file input — rendered ONCE, always present, never duplicated */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header row — always shown */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[10px] tracking-[0.3em]" style={{ color: teamColor }}>
          📸 MOMENTS{photos.length > 0 ? ` (${photos.length})` : ""}
        </span>
        <button
          onClick={openPicker}
          className="font-mono text-[10px] tracking-widest border px-3 py-1.5 transition-opacity hover:opacity-70"
          style={{ borderColor: `${teamColor}60`, color: teamColor }}
        >
          + ADD PHOTO
        </button>
      </div>

      {/* Empty state */}
      {photos.length === 0 && !showComposer && (
        <div
          className="border border-dashed flex items-center justify-center py-8"
          style={{ borderColor: `${teamColor}30` }}
        >
          <p className="font-mono text-white/30 text-xs tracking-wider text-center">
            No photos yet — be the first to share a moment
          </p>
        </div>
      )}

      {/* Scrolling banner */}
      {photos.length > 0 && (
        <div
          className="overflow-hidden relative"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
        >
          <div
            className="flex gap-3"
            style={{
              animation: `marqueeScroll ${Math.max(20, photos.length * 4)}s linear infinite`,
              animationPlayState: paused ? "paused" : "running",
              width: "max-content",
            }}
          >
            {doubled.map((photo, idx) => (
              <div
                key={`${photo.id}-${idx}`}
                className="flex-shrink-0 relative group"
                style={{ width: 160 }}
              >
                <div
                  className="overflow-hidden border"
                  style={{
                    borderColor: `${TEAM_COLORS[photo.uploaderTeam] ?? teamColor}60`,
                    height: 160,
                  }}
                >
                  <img
                    src={photo.url}
                    alt={photo.caption ?? `Photo by ${photo.uploaderName}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                {/* Team colour bar at top */}
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ background: TEAM_COLORS[photo.uploaderTeam] ?? teamColor }}
                />
                {/* Name + team stamp overlay */}
                <div
                  className="absolute bottom-0 left-0 right-0 px-2 py-2"
                  style={{
                    background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 60%, transparent 100%)",
                  }}
                >
                  <div
                    className="font-mono text-[10px] font-bold tracking-widest truncate"
                    style={{ color: TEAM_COLORS[photo.uploaderTeam] ?? teamColor }}
                  >
                    {photo.uploaderName.split(" ")[0].toUpperCase()}
                  </div>
                  <div
                    className="font-mono text-[8px] tracking-[0.2em] uppercase"
                    style={{ color: `${TEAM_COLORS[photo.uploaderTeam] ?? teamColor}99` }}
                  >
                    {photo.uploaderTeam} TEAM
                  </div>
                  {photo.caption && (
                    <p className="font-mono text-white/55 text-[8px] tracking-wide truncate mt-0.5">
                      {photo.caption}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Composer modal */}
      {showComposer && pendingImage && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div
            className="bg-[#0A0A0A] border w-full max-w-sm p-6 space-y-4"
            style={{ borderColor: `${teamColor}60` }}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm tracking-widest" style={{ color: teamColor }}>
                SHARE MOMENT
              </span>
              <button
                onClick={() => { setShowComposer(false); setPendingImage(null); setCaption(""); }}
                className="text-white/50 hover:text-white transition-colors font-mono text-sm"
              >
                ✕
              </button>
            </div>

            {/* Preview */}
            <div className="overflow-hidden border" style={{ borderColor: `${teamColor}40`, height: 200 }}>
              <img src={pendingImage} alt="Preview" className="w-full h-full object-cover" />
            </div>

            {/* Caption */}
            <input
              type="text"
              placeholder="Add a caption (optional)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={280}
              className="w-full bg-white/5 border border-white/20 font-mono text-xs tracking-wider text-white placeholder-white/30 px-3 py-2 focus:outline-none focus:border-white/40"
            />

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowComposer(false); setPendingImage(null); setCaption(""); }}
                className="flex-1 font-mono text-xs tracking-widest border border-white/20 py-2 text-white/60 hover:text-white transition-colors"
              >
                CANCEL
              </button>
              <button
                onClick={handleSubmit}
                disabled={uploading}
                className="flex-1 font-mono text-xs tracking-widest py-2 text-black font-bold transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ background: teamColor }}
              >
                {uploading ? "UPLOADING..." : "SHARE →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
