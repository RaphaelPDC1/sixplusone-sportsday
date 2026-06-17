/**
 * Admin Wildcard Monitor
 * View active wildcards, votes, and manage resolutions
 */
import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, XCircle, Clock } from "lucide-react";

interface AdminWildcardMonitorProps {
  eventId: number;
}

export function AdminWildcardMonitor({ eventId }: AdminWildcardMonitorProps) {
  const [expandedWildcard, setExpandedWildcard] = useState<number | null>(null);

  // Query: all wildcards for this event
  const wildcards = trpc.wildcards.getEventWildcards.useQuery({ eventId });

  const wildcardTypeLabels: Record<string, string> = {
    steal: "🎯 Steal",
    sabotage: "💣 Sabotage",
    double_down: "2️⃣ Double Down",
    all_in: "🎲 All In",
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
    active: "bg-blue-100 text-blue-800 border-blue-300",
    resolved: "bg-green-100 text-green-800 border-green-300",
    blocked: "bg-red-100 text-red-800 border-red-300",
    failed: "bg-gray-100 text-gray-800 border-gray-300",
  };

  const statusIcons: Record<string, React.ReactNode> = {
    pending: <Clock className="w-4 h-4" />,
    active: <AlertCircle className="w-4 h-4" />,
    resolved: <CheckCircle2 className="w-4 h-4" />,
    blocked: <XCircle className="w-4 h-4" />,
    failed: <XCircle className="w-4 h-4" />,
  };

  if (wildcards.isLoading) {
    return <div className="text-center text-gray-500 py-8">Loading wildcards...</div>;
  }

  const activeWildcards = (wildcards.data ?? []).filter((w) => w.status === "active" || w.status === "pending");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Wildcard Monitor</h3>
        <Badge variant="outline">{activeWildcards.length} Active</Badge>
      </div>

      {activeWildcards.length === 0 ? (
        <Card className="p-6 text-center text-gray-500">
          <p>No active wildcards for this event</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {activeWildcards.map((wc) => (
            <Card
              key={wc.id}
              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setExpandedWildcard(expandedWildcard === wc.id ? null : wc.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="text-2xl">{wildcardTypeLabels[wc.type]}</div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 capitalize">
                      {wc.ownerTeam} team
                      {wc.targetTeam && ` → ${wc.targetTeam}`}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {wc.status === "pending" ? "Awaiting votes" : "Vote in progress"}
                    </p>
                  </div>
                </div>
                <Badge className={`${statusColors[wc.status]} border`}>
                  <span className="flex items-center gap-1">
                    {statusIcons[wc.status]}
                    {wc.status}
                  </span>
                </Badge>
              </div>

              {/* Expanded Details */}
              {expandedWildcard === wc.id && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Owner Team</p>
                      <p className="font-semibold capitalize text-gray-900">{wc.ownerTeam}</p>
                    </div>
                    {wc.targetTeam && (
                      <div>
                        <p className="text-gray-600">Target Team</p>
                        <p className="font-semibold capitalize text-gray-900">{wc.targetTeam}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-gray-600">Created</p>
                      <p className="font-semibold text-gray-900">{new Date(wc.createdAt).toLocaleTimeString()}</p>
                    </div>
                    {wc.resolvedAt && (
                      <div>
                        <p className="text-gray-600">Resolved</p>
                        <p className="font-semibold text-gray-900">{new Date(wc.resolvedAt).toLocaleTimeString()}</p>
                      </div>
                    )}
                  </div>

                  {/* Vote Threshold */}
                  {(wc.status === "pending" || wc.status === "active") && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm font-semibold text-blue-900">Vote Status</p>
                      <p className="text-sm text-blue-700 mt-1">
                        Requires: Captain YES + 75% team weight approval
                      </p>
                    </div>
                  )}

                  {/* Action Buttons (for admin) */}
                  {wc.status === "active" && (
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="default" className="flex-1">
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1">
                        Block
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
