import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, AlertCircle, Eye, CheckCircle, Ban } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import BulkActions from "@/components/admin/BulkActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { fetchAllSchools, updateSchoolState } from "@/lib/services/schools";
import type { School } from "@/lib/supabase/types";

const accessStateBadge: Record<string, string> = {
  draft:           "bg-muted text-muted-foreground",
  preview:         "bg-primary/10 text-primary border-primary/20",
  payment_pending: "bg-warning/20 text-warning border-warning/30",
  active:          "bg-success/20 text-success border-success/30",
  suspended:       "bg-destructive/10 text-destructive border-destructive/30",
};

const SchoolsPage = () => {
  const [search, setSearch] = useState("");
  const [selectedSchools, setSelectedSchools] = useState<School[]>([]);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: schools, isLoading, error } = useQuery({
    queryKey: ["admin-schools"],
    queryFn: fetchAllSchools,
    staleTime: 30_000,
  });

  const activateMutation = useMutation({
    mutationFn: (schoolId: string) => updateSchoolState(schoolId, "active"),
    onSuccess: () => { toast.success("School activated"); qc.invalidateQueries({ queryKey: ["admin-schools"] }); qc.invalidateQueries({ queryKey: ["admin-stats"] }); },
    onError: (err: Error) => toast.error(err.message),
  });

  const suspendMutation = useMutation({
    mutationFn: (schoolId: string) => updateSchoolState(schoolId, "suspended"),
    onSuccess: () => { toast.success("School suspended"); qc.invalidateQueries({ queryKey: ["admin-schools"] }); },
    onError: (err: Error) => toast.error(err.message),
  });

  const filtered = (schools ?? []).filter((s: School) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.subdomain.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectSchool = (school: School, isSelected: boolean) => {
    if (isSelected) {
      setSelectedSchools(prev => [...prev, school]);
    } else {
      setSelectedSchools(prev => prev.filter(s => s.id !== school.id));
    }
  };

  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      setSelectedSchools(filtered);
    } else {
      setSelectedSchools([]);
    }
  };

  const handleClearSelection = () => {
    setSelectedSchools([]);
  };

  const isAllSelected = filtered.length > 0 && selectedSchools.length === filtered.length;
  const isPartiallySelected = selectedSchools.length > 0 && selectedSchools.length < filtered.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Schools</h1>
        <p className="text-muted-foreground">
          {isLoading ? "Loading…" : `${schools?.length ?? 0} school${schools?.length !== 1 ? "s" : ""} registered`}
        </p>
      </div>

      {selectedSchools.length > 0 && (
        <BulkActions
          selectedSchools={selectedSchools}
          onClearSelection={handleClearSelection}
        />
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load schools.</AlertDescription>
        </Alert>
      )}

      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search schools…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-medium text-muted-foreground w-12">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isPartiallySelected;
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </th>
                  <th className="pb-3 font-medium text-muted-foreground">School Name</th>
                  <th className="pb-3 font-medium text-muted-foreground">Subdomain</th>
                  <th className="pb-3 font-medium text-muted-foreground">Status</th>
                  <th className="pb-3 font-medium text-muted-foreground">Registered</th>
                  <th className="pb-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b">
                      {[40, 28, 16, 24, 32].map((w, j) => (
                        <td key={j} className="py-3"><Skeleton className={`h-4 w-${w}`} /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      {search ? "No schools match your search." : "No schools registered yet."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((school: School) => {
                    const isSelected = selectedSchools.some(s => s.id === school.id);

                    return (
                      <tr key={school.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleSelectSchool(school, e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </td>
                        <td className="py-3 font-medium">{school.name}</td>
                        <td className="py-3 text-muted-foreground font-mono text-xs">{school.subdomain}</td>
                        <td className="py-3">
                          <Badge variant="outline" className={accessStateBadge[school.state] ?? ""}>
                            {school.state.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {new Date(school.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 gap-1 text-xs"
                              onClick={() => navigate(`/admin/schools/${school.id}`)}
                            >
                              <Eye className="h-3 w-3" /> View
                            </Button>
                            {school.state !== "active" && (
                              <Button
                                variant="ghost" size="sm"
                                className="h-7 px-2 gap-1 text-xs text-success hover:text-success"
                                onClick={() => activateMutation.mutate(school.id)}
                                disabled={activateMutation.isPending}
                              >
                                <CheckCircle className="h-3 w-3" /> Activate
                              </Button>
                            )}
                            {school.state !== "suspended" && (
                              <Button
                                variant="ghost" size="sm"
                                className="h-7 px-2 gap-1 text-xs text-destructive hover:text-destructive"
                                onClick={() => suspendMutation.mutate(school.id)}
                                disabled={suspendMutation.isPending}
                              >
                                <Ban className="h-3 w-3" /> Suspend
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
    </div>
  );
};

export default SchoolsPage;
