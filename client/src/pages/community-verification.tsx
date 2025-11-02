import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { EvidenceViewer } from "@/components/ui/evidence-viewer";
import { AlertCircle, ThumbsUp, ThumbsDown, Users, Timer, Calendar, Eye } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import VoiceRecorder from "@/components/voice-recorder";
import { useToast } from "@/hooks/use-toast";
import type { Grievance } from "@shared/schema";


import { useI18n } from '@/lib/i18n';
import TermsFooter from "@/components/ui/terms-footer";

export default function CommunityVerification() {
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [comments, setComments] = useState<{ [key: string]: string }>({});
  const [selectedGrievance, setSelectedGrievance] = useState<string | null>(null);
  const [selected, setSelected] = useState<Grievance | null>(null);
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState("date");

  // Get current user's ID from token on mount
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUserId(payload.sub || payload.id);
      } catch (e) {
        setUserId(null);
      }
    }
  }, []);

  const { data: grievances, isLoading } = useQuery<Grievance[]>({
    queryKey: ["/api/grievances/verification/pending"],
  });

  const userSatisfactionMutation = useMutation({
    mutationFn: ({ id, satisfaction }: { id: string; satisfaction: "satisfied" | "not_satisfied" }) =>
      apiRequest("POST", `/api/grievances/${id}/user-satisfaction`, { satisfaction }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grievances/verification/pending"] });
      toast({
        title: "Satisfaction Submitted",
        description: "Your response has been recorded and blockchain verified.",
      });
    },
  });

  const communityVoteMutation = useMutation({
    mutationFn: ({ id, voteType, comments }: { id: string; voteType: "verify" | "dispute"; comments?: string }) =>
      apiRequest("POST", `/api/grievances/${id}/community-vote`, { voteType, comments }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grievances/verification/pending"] });
      toast({
        title: "Vote Recorded",
        description: "Your community vote has been submitted successfully.",
      });
      setComments({});
      setSelectedGrievance(null);
    },
  });

  const getDaysRemaining = (deadline: Date | string | null): number => {
    if (!deadline) return 0;
    const today = new Date();
    const due = new Date(deadline);
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const sortedGrievances = (grievances || []).slice().sort((a, b) => {
    if (sortOption === "date") {
      return new Date(b.resolvedAt || b.createdAt).getTime() - new Date(a.resolvedAt || a.createdAt).getTime();
    }
    if (sortOption === "status") {
      return (a.status || "PENDING").localeCompare(b.status || "PENDING");
    }
    if (sortOption === "deadline") {
      return getDaysRemaining(a.verificationDeadline) - getDaysRemaining(b.verificationDeadline);
    }
    return 0;
  });

  if (isLoading) {
    return (
      <>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">{t('loadingYourGrievances')}</p>
            </div>
          </div>
        </div>
        <Dialog open={open} onOpenChange={(v) => { if (!v) setSelected(null); setOpen(v); }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader className="sticky top-0 bg-background z-10 pb-4 mb-4 border-b">
              <DialogTitle className="text-2xl flex items-center gap-2">
                {t('grievanceDetailsTitle')}
                <span className="text-sm text-muted-foreground">#{selected?.grievanceNumber}</span>
              </DialogTitle>
              <DialogDescription>{t('grievanceDetailsSubtitle')}</DialogDescription>
            </DialogHeader>

            {selected ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-2">{t('problemTitle') || 'Title'}</h3>
                    <p className="text-lg">{selected.title}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">{t('sortStatus') || 'Status'}</h3>
                    <Badge className="bg-status-resolved text-white">{t('statusResolved')}</Badge>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">{t('villageLabel') || 'Village'}</h3>
                    <p>{selected.villageName}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">{t('categoryLabel') || 'Category'}</h3>
                    <p>{selected.category}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">{t('resolvedOn') || 'Resolved On'}</h3>
                    <p className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {selected.resolvedAt ? format(new Date(selected.resolvedAt), "MMM dd, yyyy") : "N/A"}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">{t('communityVerification') || 'Community Verification'}</h3>
                    <p>✓ {selected.communityVerifyCount} {t('verifyButton')} • ✗ {selected.communityDisputeCount} {t('disputeButton')}</p>
                  </div>
                  <div className="md:col-span-2">
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">{selected.description}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Resolution Notes</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{selected.resolutionNotes}</p>
                </div>

                <div className="border-t pt-4">
                  <EvidenceViewer
                    images={selected.evidenceFiles}
                    audioUrl={selected.voiceRecordingUrl}
                    audioTranscript={selected.voiceTranscription}
                  />
                </div>

                {selected.userSatisfaction && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">User Satisfaction</h3>
                    <p className={`flex items-center gap-2 ${
                      selected.userSatisfaction === 'satisfied' ? 'text-status-resolved' : 'text-status-overdue'
                    }`}>
                      {selected.userSatisfaction === 'satisfied' ? (
                        <>
                          <ThumbsUp className="w-4 h-4" />
                          User is satisfied with the resolution
                        </>
                      ) : (
                        <>
                          <ThumbsDown className="w-4 h-4" />
                          User is not satisfied with the resolution
                        </>
                      )}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div>No grievance selected.</div>
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Users className="w-8 h-8" />
          {t('communityVerificationTitle')}
        </h1>
        <p className="text-lg text-muted-foreground">{t('communityVerificationSubtitle')}</p>
      </div>

      {/* Sorting Options */}
      <div className="flex items-center justify-end mb-4 gap-2">
        <label htmlFor="sort" className="text-sm font-medium">{t('sortByLabel')}</label>
        <select
          id="sort"
          className="border rounded px-2 py-1 text-sm"
          value={sortOption}
          onChange={e => setSortOption(e.target.value)}
        >
          <option value="date">{t('sortDate')}</option>
          <option value="status">{t('sortStatus')}</option>
          <option value="deadline">{t('sortDeadline')}</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {sortedGrievances.length === 0 ? (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <div className="text-muted-foreground">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">{t('noGrievancesPending')}</p>
                <p className="text-sm mt-2">{t('noGrievancesFound')}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          sortedGrievances.map((grievance) => {
            const daysRemaining = getDaysRemaining(grievance.verificationDeadline);
            const highlight = daysRemaining <= 2;
            return (
              <Card key={grievance.id} className={`border-l-4 hover:shadow-md transition-shadow flex flex-col justify-between ${highlight ? 'border-l-red-500 bg-red-50 dark:bg-red-950/20' : 'border-l-status-verification'}`}>
                <CardContent className="p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-base line-clamp-1">{grievance.title}</div>
                      <div className="text-xs text-muted-foreground">#{grievance.grievanceNumber} • {grievance.villageName}</div>
                    </div>
                    <Button variant="outline" size="icon" onClick={() => { setSelected(grievance); setOpen(true); }}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-3 text-xs mt-2">
                    <span className="flex items-center gap-1"><Timer className="w-3 h-3 text-status-verification" />{daysRemaining}d</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3 text-status-resolved" />{grievance.communityVerifyCount}✓</span>
                    <span className="flex items-center gap-1 text-muted-foreground">{grievance.communityDisputeCount}✗</span>
                    <span className="ml-auto text-right text-xs text-muted-foreground">{grievance.resolvedAt ? format(new Date(grievance.resolvedAt), "MMM d") : "N/A"}</span>
                  </div>
                  {/* Verification progress */}
                  <div className="mt-3">
                    {(() => {
                      const verified = grievance.communityVerifyCount || 0;
                      const disputed = grievance.communityDisputeCount || 0;
                      const total = Math.max(verified + disputed, 1);
                      const percent = Math.round((verified / total) * 100);
                      return (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{t('verificationProgress')}</span>
                            <span className="font-medium">{t('verificationProgressPercent').replace('{percent}', String(percent))}</span>
                          </div>
                          <Progress value={percent} className="h-2" />
                        </div>
                      );
                    })()}
                  </div>
                  {/* Community actions for non-reporters */}
                  {grievance.userId !== userId && (
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => communityVoteMutation.mutate({ id: grievance.id, voteType: "verify" })}
                        disabled={communityVoteMutation.isPending}
                        data-testid={`button-verify-${grievance.id}`}
                      >
                        <ThumbsUp className="w-4 h-4 mr-1.5" />
                        {t('verifyButton')}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setSelectedGrievance(selectedGrievance === grievance.id ? null : grievance.id)}
                        data-testid={`button-dispute-${grievance.id}`}
                      >
                        <ThumbsDown className="w-4 h-4 mr-1.5" />
                        {t('disputeButton')}
                      </Button>
                    </div>
                  )}
                  {/* Dispute comment box for non-reporters */}
                  {selectedGrievance === grievance.id && grievance.userId !== userId && (
                    <div className="mt-2 p-2 bg-muted/30 rounded">
                      <label className="text-xs font-medium mb-1 block">{t('explainDisputeLabel')}</label>
                      <Textarea
                        value={comments[grievance.id] || ""}
                        onChange={e => setComments({ ...comments, [grievance.id]: e.target.value })}
                        placeholder={t('explainDisputeLabel')}
                        className="min-h-[60px] mb-2"
                        data-testid={`textarea-dispute-comments-${grievance.id}`}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedGrievance(null)}
                        >
                          {t('cancel')}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            communityVoteMutation.mutate({ id: grievance.id, voteType: "dispute", comments: comments[grievance.id] });
                            setSelectedGrievance(null);
                          }}
                          disabled={!comments[grievance.id]?.trim() || communityVoteMutation.isPending}
                          data-testid={`button-submit-dispute-${grievance.id}`}
                        >
                          {t('submitDispute')}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
      <Dialog open={open} onOpenChange={(v) => { if (!v) setSelected(null); setOpen(v); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sticky top-0 bg-background z-10 pb-4 mb-4 border-b">
            <DialogTitle className="text-2xl flex items-center gap-2">
              {t('grievanceDetailsTitle')}
              <span className="text-sm text-muted-foreground">#{selected?.grievanceNumber}</span>
            </DialogTitle>
            <DialogDescription>Complete information about the grievance</DialogDescription>
          </DialogHeader>
          {selected ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">Title</h3>
                  <p className="text-lg">{selected.title}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Status</h3>
                  <Badge className="bg-status-resolved text-white">RESOLVED</Badge>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Village</h3>
                  <p>{selected.villageName}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Category</h3>
                  <p>{selected.category}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Resolved On</h3>
                  <p className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {selected.resolvedAt ? format(new Date(selected.resolvedAt), "MMM dd, yyyy") : "N/A"}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Community Verification</h3>
                  <p>✓ {selected.communityVerifyCount} Verified • ✗ {selected.communityDisputeCount} Disputed</p>
                </div>
                <div className="md:col-span-2">
                  <h3 className="font-semibold mb-2">{t('description') || 'Description'}</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{selected.description}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">{t('resolutionNotesTitle')}</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{selected.resolutionNotes}</p>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">{t('evidencePhotosTitle')}</h3>
                {selected.evidenceFiles && selected.evidenceFiles.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selected.evidenceFiles.map((url, i) => (
                      <img key={i} src={url} alt={`evidence-${i}`} className="w-full h-64 object-contain rounded border" />
                    ))}
                  </div>
                ) : (
                  <div className="p-4 border rounded">{t('noPhotosAvailable')}</div>
                )}
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">{t('voiceRecordingTitle')}</h3>
                {selected.voiceRecordingUrl ? (
                  <audio controls src={selected.voiceRecordingUrl} className="w-full" />
                ) : (
                  <div className="text-sm text-muted-foreground">No voice recording available.</div>
                )}
              </div>

              {selected.userSatisfaction && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">{t('userSatisfactionTitle') || 'User Satisfaction'}</h3>
                  <p className={`flex items-center gap-2 ${
                    selected.userSatisfaction === 'satisfied' ? 'text-status-resolved' : 'text-status-overdue'
                  }`}>
                    {selected.userSatisfaction === 'satisfied' ? (
                      <>
                        <ThumbsUp className="w-4 h-4" />
                        {t('userSatisfiedMessage')}
                      </>
                    ) : (
                      <>
                        <ThumbsDown className="w-4 h-4" />
                        {t('userNotSatisfiedMessage')}
                      </>
                    )}
                  </p>
                </div>
              )}
            </div>
                ) : (
              <div>{t('noGrievanceSelected')}</div>
            )}
        </DialogContent>
      </Dialog>
      <TermsFooter />
    </div>
  );
}
