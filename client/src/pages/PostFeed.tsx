import { useState, useRef } from "react";
import { BackNav } from "@/components/ui/back-nav";

const LOGO_URL = "/manus-storage/logo-61_f0639c6b.webp";

interface Post {
  id: string;
  author: string;
  team: "red" | "blue" | "pink" | "orange";
  content: string;
  imageUrl?: string;
  timestamp: number;
  likes: number;
  comments: number;
  hasLiked: boolean;
}

const TEAM_COLORS: Record<string, { hex: string; glow: string }> = {
  red: { hex: "#FF6B6B", glow: "#FF6B6B80" },
  blue: { hex: "#4ECDC4", glow: "#4ECDC480" },
  pink: { hex: "#FF69B4", glow: "#FF69B480" },
  orange: { hex: "#FFA500", glow: "#FFA50080" },
};

// Mock posts data
const MOCK_POSTS: Post[] = [
  {
    id: "1",
    author: "Alex",
    team: "red",
    content: "🔥 Just crushed the sprint relay! Team Red is on FIRE!",
    timestamp: Date.now() - 5 * 60000,
    likes: 24,
    comments: 3,
    hasLiked: false,
  },
  {
    id: "2",
    author: "Jordan",
    team: "blue",
    content: "Strategy Board update: We're plotting our comeback 🎯",
    timestamp: Date.now() - 15 * 60000,
    likes: 18,
    comments: 5,
    hasLiked: false,
  },
  {
    id: "3",
    author: "Casey",
    team: "pink",
    content: "Energy levels at 💯 Let's go team!",
    timestamp: Date.now() - 30 * 60000,
    likes: 42,
    comments: 8,
    hasLiked: true,
  },
  {
    id: "4",
    author: "Morgan",
    team: "orange",
    content: "The chaos is real but we're having a blast! 🎉",
    timestamp: Date.now() - 45 * 60000,
    likes: 31,
    comments: 6,
    hasLiked: false,
  },
  {
    id: "5",
    author: "Sam",
    team: "red",
    content: "Hydration check! Gatorade is keeping us going 💧",
    timestamp: Date.now() - 60 * 60000,
    likes: 15,
    comments: 2,
    hasLiked: false,
  },
];

function PostFeed() {
  const [posts, setPosts] = useState<Post[]>(MOCK_POSTS);
  const [newPostContent, setNewPostContent] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleLike = (postId: string) => {
    setPosts(
      posts.map((post) =>
        post.id === postId
          ? {
              ...post,
              hasLiked: !post.hasLiked,
              likes: post.hasLiked ? post.likes - 1 : post.likes + 1,
            }
          : post
      )
    );
  };

  const handlePostCreate = () => {
    if (!newPostContent.trim()) return;

    const newPost: Post = {
      id: String(Date.now()),
      author: "You",
      team: ["red", "blue", "pink", "orange"][Math.floor(Math.random() * 4)] as any,
      content: newPostContent,
      timestamp: Date.now(),
      likes: 0,
      comments: 0,
      hasLiked: false,
    };

    setPosts([newPost, ...posts]);
    setNewPostContent("");
    setShowComposer(false);
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F2F0EB]">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-white/10 bg-[#0A0A0A]/95 backdrop-blur-sm">
        <div className="px-5 py-4 flex items-center justify-between max-w-2xl mx-auto w-full">
          <BackNav to="/reveal" inline label="BACK" />
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} alt="6+1" className="h-6 w-auto" style={{ filter: "invert(1)" }} />
            <span className="font-display text-sm tracking-widest">FEED</span>
          </div>
          <div className="w-16" />
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Post composer */}
        <div className="border border-white/10 bg-white/[0.02] p-4">
          {!showComposer ? (
            <button
              onClick={() => setShowComposer(true)}
              className="w-full py-3 px-4 border border-white/10 text-white/50 hover:text-white/70 transition-colors font-mono text-sm tracking-wider"
            >
              SHARE YOUR MOMENT →
            </button>
          ) : (
            <div className="space-y-3">
              <textarea
                ref={textareaRef}
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="What's happening?"
                className="w-full bg-white/5 border border-white/10 text-white placeholder-white/30 p-3 font-mono text-sm resize-none focus:outline-none focus:border-white/30 transition-colors"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={handlePostCreate}
                  disabled={!newPostContent.trim()}
                  className="flex-1 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 transition-colors font-mono text-xs tracking-wider"
                >
                  POST
                </button>
                <button
                  onClick={() => {
                    setShowComposer(false);
                    setNewPostContent("");
                  }}
                  className="flex-1 py-2 border border-white/10 hover:border-white/30 transition-colors font-mono text-xs tracking-wider"
                >
                  CANCEL
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Posts feed */}
        <div className="space-y-4">
          {posts.map((post) => {
            const teamColor = TEAM_COLORS[post.team];
            return (
              <div
                key={post.id}
                className="border transition-all"
                style={{
                  borderColor: `${teamColor.hex}40`,
                  background: `${teamColor.hex}08`,
                }}
              >
                {/* Post header */}
                <div className="p-4 border-b border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ background: teamColor.hex }}
                      />
                      <div>
                        <div className="font-display text-sm tracking-widest">{post.author}</div>
                        <div className="font-mono text-[10px] text-white/40">
                          {post.team.toUpperCase()} • {formatTime(post.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Post content */}
                <div className="p-4 space-y-3">
                  <p className="font-mono text-sm leading-relaxed">{post.content}</p>
                  {post.imageUrl && (
                    <div className="overflow-hidden border border-white/10">
                      <img
                        src={post.imageUrl}
                        alt="Post"
                        className="w-full h-auto object-cover"
                      />
                    </div>
                  )}
                </div>

                {/* Post footer - interactions */}
                <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
                  <button
                    onClick={() => handleLike(post.id)}
                    className="flex items-center gap-2 font-mono text-xs tracking-wider transition-colors"
                    style={{
                      color: post.hasLiked ? teamColor.hex : "rgba(255,255,255,0.4)",
                    }}
                  >
                    <span>{post.hasLiked ? "❤️" : "🤍"}</span>
                    <span>{post.likes}</span>
                  </button>
                  <button
                    className="flex items-center gap-2 font-mono text-xs tracking-wider text-white/40 hover:text-white/60 transition-colors"
                  >
                    <span>💬</span>
                    <span>{post.comments}</span>
                  </button>
                  <button
                    className="font-mono text-xs tracking-wider text-white/40 hover:text-white/60 transition-colors"
                  >
                    SHARE
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Load more */}
        <div className="py-4 text-center">
          <button className="font-mono text-xs tracking-wider text-white/40 hover:text-white/60 transition-colors">
            LOAD MORE →
          </button>
        </div>
      </div>
    </div>
  );
}

export default PostFeed;
