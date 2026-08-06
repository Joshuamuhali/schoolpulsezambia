import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Phone,
  Mail,
  MessageCircle,
  Calendar,
  UserPlus,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  Eye,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  fetchLeads,
  fetchLeadStats,
  updateLeadStatus,
  assignLead,
  addLeadNotes,
  convertLeadToSchool,
  deleteLead,
  bulkUpdateLeadStatus,
  bulkAssignLeads,
} from "@/lib/services/leadService";
import type { SchoolLead, LeadStatus, LeadStats } from "@/types/lead";
import {
  LEAD_STATUS_OPTIONS,
  CONTACT_METHOD_OPTIONS,
  SCHOOL_TYPE_OPTIONS,
  TIMELINE_OPTIONS,
} from "@/types/lead";

const statusConfig: Record<LeadStatus, { label: string; color: string; icon: any }> = {
  new: { label: "New Lead", color: "bg-blue-500/10 text-blue-700 border-blue-200", icon: Users },
  contacted: { label: "Contacted", color: "bg-yellow-500/10 text-yellow-700 border-yellow-200", icon: Phone },
  discovery_call: { label: "Discovery Call", color: "bg-purple-500/10 text-purple-700 border-purple-200", icon: MessageCircle },
  demo_scheduled: { label: "Demo Scheduled", color: "bg-orange-500/10 text-orange-700 border-orange-200", icon: Calendar },
  trial_started: { label: "Trial Started", color: "bg-indigo-500/10 text-indigo-700 border-indigo-200", icon: Clock },
  converted: { label: "Converted", color: "bg-green-500/10 text-green-700 border-green-200", icon: CheckCircle },
  lost: { label: "Lost", color: "bg-red-500/10 text-red-700 border-red-200", icon: XCircle },
};

const SchoolLeadsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [selectedLead, setSelectedLead] = useState<SchoolLead | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [notes, setNotes] = useState("");
  const [newStatus, setNewStatus] = useState<LeadStatus>("new");

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["lead-stats"],
    queryFn: fetchLeadStats,
    staleTime: 60_000,
  });

  const { data: leads, isLoading: leadsLoading, refetch } = useQuery({
    queryKey: ["leads", statusFilter, searchQuery],
    queryFn: () =>
      fetchLeads({
        status: statusFilter === "all" ? undefined : (statusFilter as LeadStatus),
        search: searchQuery || undefined,
      }),
    staleTime: 30_000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: LeadStatus }) =>
      updateLeadStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead-stats"] });
      toast.success("Lead status updated");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, adminId }: { id: string; adminId: string }) =>
      assignLead(id, adminId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead assigned successfully");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const notesMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      addLeadNotes(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setShowDetailDialog(false);
      setNotes("");
      toast.success("Notes added successfully");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const convertMutation = useMutation({
    mutationFn: convertLeadToSchool,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead-stats"] });
      setShowDetailDialog(false);
      toast.success("Lead converted to school! Redirecting...", {
        description: `School created: ${result.subdomain}`,
      });
      setTimeout(() => {
        navigate("/admin/schools");
      }, 2000);
    },
    onError: (error: any) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead-stats"] });
      toast.success("Lead deleted");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const bulkStatusMutation = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: LeadStatus }) =>
      bulkUpdateLeadStatus(ids, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead-stats"] });
      setSelectedLeads([]);
      toast.success("Bulk status update completed");
    },
  });

  const handleViewDetails = (lead: SchoolLead) => {
    setSelectedLead(lead);
    setNotes(lead.notes || "");
    setNewStatus(lead.status);
    setShowDetailDialog(true);
  };

  const handleConvert = () => {
    if (!selectedLead) return;
    if (!confirm("Are you sure you want to convert this lead to a school? This will create a new school account.")) return;
    convertMutation.mutate(selectedLead.id);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this lead? This action cannot be undone.")) return;
    deleteMutation.mutate(id);
  };

  const handleBulkStatusUpdate = () => {
    if (selectedLeads.length === 0) return;
    const status = prompt("Enter new status (new, contacted, discovery_call, demo_scheduled, trial_started, converted, lost):");
    if (!status || !LEAD_STATUS_OPTIONS.find(opt => opt.value === status)) {
      toast.error("Invalid status");
      return;
    }
    bulkStatusMutation.mutate({ ids: selectedLeads, status: status as LeadStatus });
  };

  const toggleSelectAll = () => {
    if (selectedLeads.length === leads?.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(leads?.map(l => l.id) || []);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedLeads(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const statCards = [
    { label: "New Leads", value: stats?.new_leads, color: "text-blue-600", icon: Users },
    { label: "Contacted", value: stats?.contacted, color: "text-yellow-600", icon: Phone },
    { label: "Discovery Calls", value: stats?.discovery_calls, color: "text-purple-600", icon: MessageCircle },
    { label: "Demos Scheduled", value: stats?.demos_scheduled, color: "text-orange-600", icon: Calendar },
    { label: "Converted", value: stats?.converted, color: "text-green-600", icon: CheckCircle },
    { label: "Total Leads", value: stats?.total_leads, color: "text-primary", icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold mb-2">School Leads</h1>
        <p className="text-muted-foreground">Manage and convert interested schools into active customers</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <p className="text-2xl font-bold">{stat.value ?? 0}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by school name, contact name, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {LEAD_STATUS_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedLeads.length > 0 && (
              <Button
                variant="outline"
                onClick={handleBulkStatusUpdate}
                className="whitespace-nowrap"
              >
                <Filter className="h-4 w-4 mr-2" />
                Update Selected ({selectedLeads.length})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Leads List */}
      <Card>
        <CardHeader>
          <CardTitle>All Leads ({leads?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {leadsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : !leads || leads.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No leads found. Submit the homepage form to create your first lead.
            </p>
          ) : (
            <div className="space-y-2">
              {leads.map((lead) => {
                const status = statusConfig[lead.status];
                return (
                  <div
                    key={lead.id}
                    className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedLeads.includes(lead.id)}
                      onChange={() => toggleSelect(lead.id)}
                      className="h-4 w-4"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold truncate">{lead.school_name}</p>
                        <Badge variant="outline" className={status.color}>
                          <status.icon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>{lead.contact_name} • {lead.contact_role}</span>
                        <span className="flex items-center gap-1">
                          {lead.preferred_contact_method === "whatsapp" ? (
                            <MessageCircle className="h-3 w-3" />
                          ) : (
                            <Mail className="h-3 w-3" />
                          )}
                          {lead.email}
                        </span>
                        <span>{lead.location_city}, {lead.location_province}</span>
                        <span>{formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewDetails(lead)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(lead.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lead Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedLead && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedLead.school_name}</DialogTitle>
                <DialogDescription>
                  Lead submitted {formatDistanceToNow(new Date(selectedLead.created_at), { addSuffix: true })}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Status & Actions */}
                <div className="flex flex-wrap items-center gap-3">
                  <Select value={newStatus} onValueChange={(value) => setNewStatus(value as LeadStatus)}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_STATUS_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => updateStatusMutation.mutate({ id: selectedLead.id, status: newStatus })}
                    disabled={updateStatusMutation.isPending}
                  >
                    Update Status
                  </Button>
                  {selectedLead.status !== "converted" && selectedLead.status !== "lost" && (
                    <Button
                      onClick={handleConvert}
                      disabled={convertMutation.isPending}
                      className="ml-auto"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Convert to School
                    </Button>
                  )}
                </div>

                {/* School Information */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-muted-foreground">School Type</Label>
                    <p className="font-medium">
                      {SCHOOL_TYPE_OPTIONS.find(opt => opt.value === selectedLead.school_type)?.label}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Location</Label>
                    <p className="font-medium">
                      {selectedLead.location_city}{selectedLead.location_city && selectedLead.location_province ? ", " : ""}{selectedLead.location_province}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Student Count</Label>
                    <p className="font-medium">
                      {selectedLead.student_count_range.replace(/_/g, " ")}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Current System</Label>
                    <p className="font-medium capitalize">
                      {selectedLead.current_system.replace(/_/g, " ")}
                    </p>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-3">
                  <h3 className="font-semibold">Contact Person</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-muted-foreground">Name</Label>
                      <p className="font-medium">{selectedLead.contact_name}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Role</Label>
                      <p className="font-medium capitalize">{selectedLead.contact_role}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Phone</Label>
                      <p className="font-medium flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        {selectedLead.phone}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Email</Label>
                      <p className="font-medium flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        {selectedLead.email}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Preferred Contact Method</Label>
                      <p className="font-medium capitalize">
                        {selectedLead.preferred_contact_method.replace(/_/g, " ")}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Timeline</Label>
                      <p className="font-medium capitalize">
                        {selectedLead.timeline.replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Interested Modules */}
                <div>
                  <Label className="text-muted-foreground">Interested Modules</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedLead.interested_modules.map(module => (
                      <Badge key={module} variant="secondary">
                        {module.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Message */}
                {selectedLead.message && (
                  <div>
                    <Label className="text-muted-foreground">Message</Label>
                    <p className="mt-1 text-sm">{selectedLead.message}</p>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about this lead..."
                    rows={3}
                    className="mt-2"
                  />
                  <Button
                    onClick={() => notesMutation.mutate({ id: selectedLead.id, notes })}
                    disabled={notesMutation.isPending}
                    className="mt-2"
                    size="sm"
                  >
                    Save Notes
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SchoolLeadsPage;