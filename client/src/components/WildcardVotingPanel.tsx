/**
 * Wildcard Voting Panel
 * Displays available wildcards, vote interface, and Steal/Block response window
 */
import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Clock, Zap } from "lucide-react";

interface WildcardVotingPanelProps {
  teamName: "red" | "blue" | "pink" | "orange";
  eventId: number;
}

export function WildcardVotingPanel({ teamName, eventId }: WildcardVotingPanelProps) {
  const [selectedWildcard, setSelectedWildcard] = useState<"steal" | "sabotage" | "double_down" | "all_in" | null>(null);
  const [targetTeam, setTargetTeam] = useState<"red" | "blue" | "pink" | "orange" | null>(null);
  const [voting, setVoting] = useState(false);

  // Query: card budget
  const cardBudget = trpc.powerUps.getCardBudget.useQuery({ teamName });

  // Query: active wildcards for this event
  const activeWildcards = trpc.powerUps.getActiveWildcards.useQuery({ eventId });

  // Mutation: open a vote
  const openVote = trpc.powerUps.openVote.useMutation({
    onSuccess: () => {
      setSelectedWildcard(null);
      setTargetTeam(null);
      activeWildcards.refetch();
    },
  });

  // Mutation: cast a vote
  const castVote = trpc.powerUps.castVote.useMutation({
    onSuccess: () => {
      setVoting(false);
    },
  });

  const teams: Array<"red" | "blue" | "pink" | "orange"> = ["red", "blue", "pink", "orange"];
  const otherTeams = teams.filter((t) => t !== teamName);

  const wildcardDescriptions: Record<string, { title: string; description: string; icon: React.ReactNode }> = {
    steal: {
      title: "🎯 Steal",
      description: "Vote to steal a player from another team for this event.",
      icon: <Zap className="w-5 h-5" />,
    },
    sabotage: {
      title: "💣 Sabotage",
      description: "Vote to deduct 5 points from another team.",
      icon: <AlertCircle className="w-5 h-5" />,
    },
    double_down: {
      title: "2️⃣ Double Down",
      description: "Double the points from your next placed event.",
      icon: <Zap className="w-5 h-5" />,
    },
    all_in: {
      title: "🎲 All In",
      description: "All-or-nothing: triple points if you place, zero if you don't.",
      icon: <Zap className="w-5 h-5" />,
    },
  };

  const canUseWildcard = (cardBudget.data?.cardsRemaining ?? 0) > 0;
  const hasActiveWildcard = (activeWildcards.data ?? []).some((w) => w.ownerTeam === teamName);

  return (
    <div className="space-y-6">
      {/* Card Budget */}
      <Card className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Wildcard Budget</h3>
            <p className="text-sm text-gray-600">Cards remaining this event</p>
          </div>
          <div className="text-4xl font-bold text-purple-600">{cardBudget.data?.cardsRemaining ?? 0}</div>
        </div>
      </Card>

      {/* Active Wildcards */}
      {hasActiveWildcard && (
        <Card className="p-4 border-blue-200 bg-blue-50">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-blue-900">Vote in Progress</h4>
              <p className="text-sm text-blue-700 mt-1">Your team has an active wildcard vote. Check back to cast your vote!</p>
            </div>
          </div>
        </Card>
      )}

      {/* Wildcard Selection */}
      {!hasActiveWildcard && canUseWildcard && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Select a Wildcard</h3>

          {/* Wildcard Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(["steal", "sabotage", "double_down", "all_in"] as const).map((type) => {
              const desc = wildcardDescriptions[type];
              return (
                <button
                  key={type}
                  onClick={() => setSelectedWildcard(type)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedWildcard === type
                      ? "border-purple-500 bg-purple-50"
                      : "border-gray-200 bg-white hover:border-purple-300"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="text-xl">{desc.icon}</div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{desc.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{desc.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Target Team Selection (for Steal/Sabotage) */}
          {selectedWildcard && ["steal", "sabotage"].includes(selectedWildcard) && (
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-900">Target Team</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {otherTeams.map((team) => (
                  <button
                    key={team}
                    onClick={() => setTargetTeam(team)}
                    className={`p-3 rounded-lg border-2 font-semibold capitalize transition-all ${
                      targetTeam === team
                        ? `border-${team}-500 bg-${team}-100 text-${team}-900`
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {team}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Open Vote Button */}
          <Button
            onClick={() => {
              if (selectedWildcard && (["double_down", "all_in"].includes(selectedWildcard) || targetTeam)) {
                openVote.mutate({
                  teamName,
                  eventId,
                  wildcardType: selectedWildcard,
                  targetTeam: targetTeam ?? undefined,
                });
              }
            }}
            disabled={!selectedWildcard || (["steal", "sabotage"].includes(selectedWildcard) && !targetTeam) || openVote.isPending}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            {openVote.isPending ? "Opening vote..." : "Open Vote"}
          </Button>
        </div>
      )}

      {/* No Cards */}
      {!canUseWildcard && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-red-900">No Power Up Cards</h4>
              <p className="text-sm text-red-700 mt-1">Your team has used all power up cards for this event.</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
