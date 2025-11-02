import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/lib/authContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Clock, CheckCircle2, Calendar, Eye } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BlockchainStatus } from "@/components/ui/blockchain-status";
import { useToast } from "@/hooks/use-toast";
import type { Grievance } from "@shared/schema";
import { useI18n } from '@/lib/i18n';
import TermsFooter from "@/components/ui/terms-footer";

export default function UserDashboard() {
  const { t } = useI18n();
  const [selected, setSelected] = useState<Grievance | null>(null);
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  
  const { data: myGrievances = [], isLoading } = useQuery<Grievance[]>({
    queryKey: ["/api/grievances/my"],
    enabled: !!user,
  });

  const getStatusColor = (status: string) => {
    const colors = {
      pending: "bg-amber-600",
      in_progress: "bg-blue-600",
      resolved: "bg-emerald-700",
      pending_verification: "bg-purple-600",
      overdue: "bg-rose-700",
    };
    return colors[status as keyof typeof colors] || "bg-amber-600";
  };

  const translateStatus = (status: string) => {
    switch (status) {
      case 'pending':
        return t('statusPending');
      case 'in_progress':
        return t('statusInProgress');
      case 'resolved':
        return t('statusResolved');
      case 'pending_verification':
        return t('statusVerification');
      case 'overdue':
        return t('overdue');
      default:
        return status.replace('_', ' ').toUpperCase();
    }
  };

  const filterGrievances = (status?: string) => {
    if (!status) return myGrievances;
    if (status === "overdue") {
      return myGrievances.filter(g => {
        const daysOverdue = g.dueDate ? getDaysOverdue(new Date(g.dueDate)) : 0;
        return daysOverdue > 0 && g.status !== "resolved";
      });
    }
    return myGrievances.filter(g => g.status === status);
  };

  const getDaysOverdue = (dueDate: Date) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = today.getTime() - due.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (isLoading || authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">{t('loadingGrievances')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <span>{t('myGrievancesTitle')}</span>
        </h1>
        <p className="text-lg text-muted-foreground">{t('trackAndManage')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground mb-1">{myGrievances.length || 0}</div>
                <div className="text-sm text-muted-foreground">{t('totalGrievances')}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-status-pending mb-1">
                {filterGrievances("pending").length}
              </div>
                <div className="text-sm text-muted-foreground">{t('pendingLabel')}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-status-progress mb-1">
                {filterGrievances("in_progress").length}
              </div>
                <div className="text-sm text-muted-foreground">{t('inProgressLabel')}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-status-resolved mb-1">
                {filterGrievances("resolved").length}
              </div>
                <div className="text-sm text-muted-foreground">{t('resolvedLabel')}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="w-full">
         <TabsList className="grid w-full grid-cols-5 max-w-2xl mb-6">
         <TabsTrigger value="all">{t('tabAll')}</TabsTrigger>
         <TabsTrigger value="pending">{t('tabPending')}</TabsTrigger>
         <TabsTrigger value="overdue">{t('tabOverdue')}</TabsTrigger>
         <TabsTrigger value="pending_verification">{t('tabVerification')}</TabsTrigger>
         <TabsTrigger value="resolved">{t('tabResolved')}</TabsTrigger>
        </TabsList>

        {["all", "pending", "overdue", "pending_verification", "resolved"].map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-4">
            {filterGrievances(tab === "all" ? undefined : tab).length === 0 ? (
              <Card>
                <CardContent className="pt-12 pb-12 text-center">
                  <div className="text-muted-foreground">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">{t('noGrievancesFound')}</p>
                    <p className="text-sm mt-2">{t('submitNewGrievancePrompt')}</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              filterGrievances(tab === "all" ? undefined : tab).map((grievance) => {
                const daysOverdue = grievance.dueDate ? getDaysOverdue(new Date(grievance.dueDate)) : 0;
                const isOverdue = daysOverdue > 0 && grievance.status !== "resolved";
                
                return (
                  <Card
                    key={grievance.id}
                    className={`border-l-4 ${
                      isOverdue ? "border-l-rose-700" : grievance.status === "pending" ? "border-l-amber-600" :
                      grievance.status === "in_progress" ? "border-l-blue-600" :
                      grievance.status === "resolved" ? "border-l-emerald-700" :
                      grievance.status === "pending_verification" ? "border-l-purple-600" : "border-l-amber-600"
                    }`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2">{grievance.title}</CardTitle>
                          <div className="flex flex-wrap gap-2 mb-2">
            <Badge variant="outline" className={`px-3 py-1.5 text-sm font-medium text-white ${getStatusColor(grievance.status)}`}>
              {translateStatus(grievance.status)}
            </Badge>
            <Badge variant="outline" className="px-3 py-1.5 text-sm">
              {t('category')}: {grievance.category}
            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-sm text-muted-foreground space-y-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                              <span>{t('submittedLabel')}: {format(new Date(grievance.createdAt), 'PPp')}</span>
                          </div>
                          {grievance.dueDate && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                                <span>{t('dueDateLabel')}: {format(new Date(grievance.dueDate), 'PPp')}</span>
                            </div>
                          )}
                        </div>

                        {grievance.blockchainTxHash && (
                          <BlockchainStatus
                            txHash={grievance.blockchainTxHash}
                            verifiedAt={grievance.blockchainVerifiedAt ? new Date(grievance.blockchainVerifiedAt) : undefined}
                            status={grievance.blockchainStatus || 'pending'}
                          />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        {selected && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selected.title}</DialogTitle>
            </DialogHeader>
          </DialogContent>
        )}
      </Dialog>
      <TermsFooter />
    </div>
  );
}