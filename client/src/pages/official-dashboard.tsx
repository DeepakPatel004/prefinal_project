import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Clock, CheckCircle2, Eye, Calendar, MapPin, XCircle, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { getToken } from "@/lib/authService";
import { useToast } from "@/hooks/use-toast";
import type { Grievance } from "@shared/schema";
import TermsFooter from "@/components/ui/terms-footer";
import { useI18n } from '@/lib/i18n';

export default function OfficialDashboard() {
  const [selected, setSelected] = useState<Grievance | null>(null);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [selectedTimeline, setSelectedTimeline] = useState<{ [key: string]: number }>({});
  const [cannotResolveReasons, setCannotResolveReasons] = useState<{ [key: string]: string }>({});
  const [showCannotResolveForm, setShowCannotResolveForm] = useState<{ [key: string]: boolean }>({});
  const [showResolutionInput, setShowResolutionInput] = useState<{ [key: string]: boolean }>({});
  const [resolutionNotes, setResolutionNotes] = useState<{ [key: string]: string }>({});

  const { data: grievances, isLoading } = useQuery<Grievance[]>({
    queryKey: ["/api/grievances/assigned"],
  });

  const acceptTaskMutation = useMutation({
    mutationFn: async ({ id, timeline }: { id: string; timeline: number }) => {
      const response = await fetch(`/api/grievances/${id}/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
        body: JSON.stringify({ resolutionTimeline: timeline }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Network response was not ok: ${response.status} - ${body}`);
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate the assigned grievances list and related queries so UI refreshes
      queryClient.invalidateQueries({ queryKey: ["/api/grievances/assigned"] });
      queryClient.invalidateQueries({ queryKey: ["/api/grievances/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/grievances/verification/pending"] });
      setOpen(false);
      toast({
        title: "Success",
        description: "Task accepted successfully",
      });
    },
    onError: (error) => {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to accept task",
        variant: "destructive",
      });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const response = await fetch(`/api/grievances/${id}/resolve`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
        body: JSON.stringify({
          resolutionNotes: notes,
        }),
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      return response.json();
    },
      onSuccess: (_, variables) => {
        // Refresh assigned lists and community verification lists
        queryClient.invalidateQueries({ queryKey: ["/api/grievances/assigned"] });
        queryClient.invalidateQueries({ queryKey: ["/api/grievances/my"] });
        queryClient.invalidateQueries({ queryKey: ["/api/grievances/verification/pending"] });
      toast({
        title: "Success",
        description: "Grievance marked as resolved successfully",
      });
      // Reset state for this grievance
      setShowResolutionInput(prev => ({ ...prev, [variables.id]: false }));
      setResolutionNotes(prev => ({ ...prev, [variables.id]: "" }));
    },
    onError: (error) => {
      console.error("Error:", error);
      toast({
        title: t('error'),
        description: t('failedToResolve'),
        variant: "destructive",
      });
    },
  });

  const cannotResolveMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await apiRequest("POST", `/api/grievances/${id}/cannot-resolve`, { reason });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grievances/assigned"] });
      toast({
        title: t('grievanceEscalated'),
        description: t('grievanceEscalatedDesc'),
      });
      setCannotResolveReasons({});
      setShowCannotResolveForm({});
    },
  });

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: "bg-blue-500",
      medium: "bg-status-verification",
      high: "bg-status-overdue",
    };
    return colors[priority as keyof typeof colors] || "bg-status-verification";
  };

  const newAssignments = grievances?.filter(g => g.status === "pending") || [];
  const inProgress = grievances?.filter(g => g.status === "in_progress") || [];
  const overdue = grievances?.filter(g => {
    if (!g.dueDate || g.status === "resolved") return false;
    return new Date(g.dueDate) < new Date();
  }) || [];

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">{t('loadingAssignments')}</p>
          </div>
      </div>

      <Dialog open={open} onOpenChange={(v) => { if (!v) setSelected(null); setOpen(v); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('grievanceMedia')}</DialogTitle>
            <DialogDescription>{t('grievanceMediaDesc')}</DialogDescription>
          </DialogHeader>

          {selected ? (
            <div className="space-y-4">
              <div>
                {selected.evidenceFiles && selected.evidenceFiles.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selected.evidenceFiles.map((url, i) => (
                      <img key={i} src={url} alt={`evidence-${i}`} className="w-full h-64 object-contain rounded" />
                    ))}
                  </div>
                ) : (
                  <div className="p-4 border rounded">{t('noPhotosAvailable')}</div>
                )}
              </div>

              <div>
                {selected.voiceRecordingUrl ? (
                  <audio controls src={selected.voiceRecordingUrl} className="w-full" />
                ) : (
                  <div className="text-sm text-muted-foreground">{t('noVoiceRecording')}</div>
                )}
              </div>
            </div>
          ) : (
            <div>No grievance selected.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <span>{t('assignedGrievances')}</span>
          <Badge variant="secondary" className="text-lg px-3 py-1">
            {t('panchayatOfficer')}
          </Badge>
        </h1>
        <p className="text-lg text-muted-foreground">{t('officialSubtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-status-overdue mb-1">{newAssignments.length}</div>
              <div className="text-sm text-muted-foreground">{t('newAssignments')}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-status-progress mb-1">{inProgress.length}</div>
              <div className="text-sm text-muted-foreground">{t('inProgressLabel')}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-status-overdue mb-1">{overdue.length}</div>
              <div className="text-sm text-muted-foreground">{t('overdue')}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {newAssignments.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">{t('newAssignments')}</h2>
            <div className="space-y-4">
              {newAssignments.map((grievance) => (
                <Card
                  key={grievance.id}
                  className="border-l-4 border-l-status-overdue"
                  data-testid={`card-assignment-${grievance.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-status-overdue text-white">
                            <AlertCircle className="w-4 h-4 mr-1.5" />
                            {t('newAssignmentStatus')}
                          </Badge>
                          <span className="text-sm text-muted-foreground">#{grievance.grievanceNumber}</span>
                          <Badge className={`${getPriorityColor(grievance.priority)} text-white`}>
                            {grievance.priority.toUpperCase()}
                          </Badge>
                        </div>
                        <CardTitle className="text-xl">{grievance.title}</CardTitle>
                        <CardDescription className="mt-2 line-clamp-2">
                          {grievance.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Village</div>
                        <div className="text-sm font-medium flex items-center gap-1.5">
                          <MapPin className="w-4 h-4" />
                          {grievance.villageName}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Submitted</div>
                        <div className="text-sm font-medium flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(grievance.createdAt), "MMM dd, yyyy")}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Category</div>
                        <div className="text-sm font-medium">{grievance.category}</div>
                      </div>
                      <div className="col-span-3 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelected(grievance);
                            setOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </div>

                    {showCannotResolveForm[grievance.id] ? (
                      <div className="bg-status-overdue/10 border border-status-overdue/30 p-4 rounded-lg space-y-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-status-overdue mt-0.5" />
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold mb-1">{t('cannotResolveTitle')}</h4>
                            <p className="text-sm text-muted-foreground">
                              {t('cannotResolveDesc')}
                            </p>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            {t('reasonForEscalation')}
                          </label>
                          <Textarea
                            value={cannotResolveReasons[grievance.id] || ""}
                            onChange={(e) =>
                              setCannotResolveReasons({ ...cannotResolveReasons, [grievance.id]: e.target.value })
                            }
                            placeholder="                            {t('escalationReasonPlaceholder')}"
                            className="min-h-32"
                            data-testid={`textarea-cannot-resolve-${grievance.id}`}
                          />
                          <p className="text-sm text-muted-foreground mt-1">
                            {cannotResolveReasons[grievance.id]?.length || 0} / 100 characters
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="destructive"
                            onClick={() =>
                              cannotResolveMutation.mutate({
                                id: grievance.id,
                                reason: cannotResolveReasons[grievance.id],
                              })
                            }
                            disabled={
                              !cannotResolveReasons[grievance.id] ||
                              cannotResolveReasons[grievance.id].length < 100 ||
                              cannotResolveMutation.isPending
                            }
                            data-testid={`button-submit-cannot-resolve-${grievance.id}`}
                          >
                            <TrendingUp className="w-4 h-4 mr-1.5" />
                            {t('confirmEscalation')}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              const newForm = { ...showCannotResolveForm };
                              delete newForm[grievance.id];
                              setShowCannotResolveForm(newForm);
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-muted/30 p-4 rounded-lg space-y-3">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Can you resolve this grievance?</label>
                          <p className="text-sm text-muted-foreground mb-3">
                            If you can resolve this, accept the task and set a timeline. If not, escalate it to the next authority level.
                          </p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            variant="destructive"
                            onClick={() => setShowCannotResolveForm({ ...showCannotResolveForm, [grievance.id]: true })}
                            data-testid={`button-cannot-resolve-${grievance.id}`}
                          >
                            <XCircle className="w-4 h-4 mr-1.5" />
                            Cannot Resolve
                          </Button>
                        </div>
                        <div className="border-t pt-3 mt-3">
                          <label className="text-sm font-medium mb-2 block">OR Set Resolution Timeline to Accept</label>
                          <div className="flex gap-3 items-center flex-wrap">
                            <Select
                              onValueChange={(value) =>
                                setSelectedTimeline({ ...selectedTimeline, [grievance.id]: parseInt(value) })
                              }
                              defaultValue="15"
                            >
                              <SelectTrigger className="w-48" data-testid={`select-timeline-${grievance.id}`}>
                                <SelectValue placeholder="Select Days" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="7">7 days</SelectItem>
                                <SelectItem value="15">15 days</SelectItem>
                                <SelectItem value="30">30 days</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              onClick={() =>
                                acceptTaskMutation.mutate({
                                  id: grievance.id,
                                  timeline: selectedTimeline[grievance.id] || 15,
                                })
                              }
                              disabled={acceptTaskMutation.isPending}
                              data-testid={`button-accept-task-${grievance.id}`}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1.5" />
                              {t('acceptTaskButton')}
                            </Button>
                            <Button variant="outline" data-testid={`button-view-full-details-${grievance.id}`} onClick={() => { setSelected(grievance); setOpen(true); }}>
                              <Eye className="w-4 h-4 mr-1.5" />
                              {t('viewFullDetails')}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {inProgress.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">{t('inProgress')}</h2>
            <div className="space-y-4">
              {inProgress.map((grievance) => (
                <Card
                  key={grievance.id}
                  className="border-l-4 border-l-status-progress"
                  data-testid={`card-in-progress-${grievance.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-status-progress text-white">
                            <Clock className="w-4 h-4 mr-1.5" />
                            {t('inProgress')}
                          </Badge>
                          <span className="text-sm text-muted-foreground">#{grievance.grievanceNumber}</span>
                        </div>
                        <CardTitle className="text-xl">{grievance.title}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">{t('villageLabel')}</div>
                        <div className="text-sm font-medium">{grievance.villageName}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Due Date</div>
                        <div className="text-sm font-medium">
                          {grievance.dueDate ? format(new Date(grievance.dueDate), "MMM dd, yyyy") : "Not set"}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Category</div>
                        <div className="text-sm font-medium">{grievance.category}</div>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap items-center">
                      {/* Resolve Dialog (professional modal) */}
                      <Dialog
                        open={!!showResolutionInput[grievance.id]}
                        onOpenChange={(v) => setShowResolutionInput(prev => ({ ...prev, [grievance.id]: v }))}
                      >
                        <Button
                          variant="default"
                          data-testid={`button-mark-resolved-${grievance.id}`}
                          onClick={() => setShowResolutionInput(prev => ({ ...prev, [grievance.id]: true }))}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1.5" />
                          Mark as Resolved
                        </Button>

                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Mark grievance as resolved</DialogTitle>
                            <DialogDescription>
                              Provide a concise resolution note. This will set the grievance to pending verification and notify the user.
                            </DialogDescription>
                          </DialogHeader>

                          <div className="mt-2">
                            <label className="text-sm font-medium mb-2 block">Resolution notes</label>
                            <Textarea
                              placeholder="Describe what you did to resolve the grievance..."
                              value={resolutionNotes[grievance.id] || ""}
                              onChange={(e) => setResolutionNotes(prev => ({ ...prev, [grievance.id]: e.target.value }))}
                              className="min-h-32"
                              data-testid={`textarea-resolution-${grievance.id}`}
                            />
                            <p className="text-sm text-muted-foreground mt-2">{(resolutionNotes[grievance.id] || "").length} / 500 characters</p>
                          </div>

                          <div className="flex justify-end gap-2 mt-4">
                            <Button
                              variant="default"
                              onClick={() => resolveMutation.mutate({ id: grievance.id, notes: resolutionNotes[grievance.id] || "" })}
                              disabled={!resolutionNotes[grievance.id] || resolveMutation.isPending}
                              data-testid={`button-submit-resolution-${grievance.id}`}
                            >
                              {resolveMutation.isPending ? t('submitting') : t('submitResolution')}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setShowResolutionInput(prev => ({ ...prev, [grievance.id]: false }));
                                setResolutionNotes(prev => ({ ...prev, [grievance.id]: "" }));
                              }}
                            >
                              {t('cancel')}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      {/* Cannot Resolve Dialog */}
                      <Dialog
                        open={!!showCannotResolveForm[grievance.id]}
                        onOpenChange={(v) => setShowCannotResolveForm(prev => ({ ...prev, [grievance.id]: v }))}
                      >
                        <Button
                          variant="destructive"
                          onClick={() => setShowCannotResolveForm(prev => ({ ...prev, [grievance.id]: true }))}
                          data-testid={`button-cannot-resolve-${grievance.id}`}
                        >
                          <XCircle className="w-4 h-4 mr-1.5" />
                          {t('cannotResolve')}
                        </Button>

                        <DialogContent className="max-w-xl">
                          <DialogHeader>
                            <DialogTitle>{t('escalateGrievance')}</DialogTitle>
                            <DialogDescription>
                              {t('escalateInfo')}
                            </DialogDescription>
                          </DialogHeader>

                          <div className="mt-2">
                            <label className="text-sm font-medium mb-2 block">{t('reasonForEscalation')}</label>
                            <Textarea
                              value={cannotResolveReasons[grievance.id] || ""}
                              onChange={(e) => setCannotResolveReasons({ ...cannotResolveReasons, [grievance.id]: e.target.value })}
                              placeholder={t('escalationReasonPlaceholder')}
                              className="min-h-40"
                              data-testid={`textarea-cannot-resolve-${grievance.id}`}
                            />
                            <p className="text-sm text-muted-foreground mt-2">{cannotResolveReasons[grievance.id]?.length || 0} / 100 characters</p>
                          </div>

                          <div className="flex justify-end gap-2 mt-4">
                            <Button
                              variant="destructive"
                              onClick={() => cannotResolveMutation.mutate({ id: grievance.id, reason: cannotResolveReasons[grievance.id] })}
                              disabled={!cannotResolveReasons[grievance.id] || cannotResolveReasons[grievance.id].length < 100 || cannotResolveMutation.isPending}
                              data-testid={`button-submit-cannot-resolve-${grievance.id}`}
                            >
                              {cannotResolveMutation.isPending ? "Escalating..." : "Confirm Escalation"}
                            </Button>
                            <Button variant="outline" onClick={() => setShowCannotResolveForm(prev => ({ ...prev, [grievance.id]: false }))}>Cancel</Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button variant="outline" data-testid={`button-view-details-in-progress-${grievance.id}`} onClick={() => { setSelected(grievance); setOpen(true); }}>
                        <Eye className="w-4 h-4 mr-1.5" />
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {grievances && grievances.length === 0 && (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <div className="text-muted-foreground">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No grievances assigned</p>
                <p className="text-sm mt-2">New assignments will appear here</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={(v) => { if (!v) setSelected(null); setOpen(v); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sticky top-0 bg-background z-10 pb-4 mb-4 border-b">
            <DialogTitle className="text-2xl flex items-center gap-2">
              Grievance Details
              <span className="text-sm text-muted-foreground">#{selected?.grievanceNumber}</span>
            </DialogTitle>
            <DialogDescription>{t('grievanceDetailsDesc')}</DialogDescription>
          </DialogHeader>

          {selected ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">{t('titleLabel')}</h3>
                  <p className="text-lg">{selected.title}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">{t('statusLabel')}</h3>
                  <Badge className={`
                    ${selected.status === 'pending' ? 'bg-status-overdue' : 
                      selected.status === 'in_progress' ? 'bg-status-progress' : 
                      'bg-status-resolved'} text-white`}>
                    {selected.status.toUpperCase().replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">{t('villageLabel')}</h3>
                  <p className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {selected.villageName}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">{t('categoryLabel')}</h3>
                  <p>{selected.category}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">{t('submittedOnLabel')}</h3>
                  <p className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(selected.createdAt), "MMM dd, yyyy")}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">{t('dueDateLabel')}</h3>
                  <p>{selected.dueDate ? format(new Date(selected.dueDate), "MMM dd, yyyy") : "Not set"}</p>
                </div>
                <div className="md:col-span-2">
                  <h3 className="font-semibold mb-2">{t('description')}</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{selected.description}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">{t('evidencePhotos')}</h3>
                {selected.evidenceFiles && selected.evidenceFiles.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selected.evidenceFiles.map((url: string, i: number) => (
                      <img key={i} src={url} alt={`evidence-${i}`} className="w-full h-64 object-contain rounded border" />
                    ))}
                  </div>
                ) : (
                  <div className="p-4 border rounded">{t('noPhotosAvailable')}</div>
                )}
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">{t('voiceRecording')}</h3>
                {selected.voiceRecordingUrl ? (
                  <audio controls src={selected.voiceRecordingUrl} className="w-full" />
                ) : (
                  <div className="text-sm text-muted-foreground">{t('noVoiceRecording')}</div>
                )}
              </div>

              {selected.resolutionNotes && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">{t('resolutionNotesTitle')}</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{selected.resolutionNotes}</p>
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
