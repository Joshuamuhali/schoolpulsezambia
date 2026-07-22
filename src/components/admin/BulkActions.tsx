import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, Ban, Trash2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { updateSchoolState } from "@/lib/services/schools";
import type { School } from "@/lib/supabase/types";

interface BulkActionsProps {
  selectedSchools: School[];
  onClearSelection: () => void;
}

type ActionType = "activate" | "suspend" | null;

const BulkActions = ({ selectedSchools, onClearSelection }: BulkActionsProps) => {
  const qc = useQueryClient();
  const [action, setAction] = useState<ActionType>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const activateMutation = useMutation({
    mutationFn: async (schoolIds: string[]) => {
      setIsProcessing(true);
      const promises = schoolIds.map(id => updateSchoolState(id, "active"));
      await Promise.all(promises);
    },
    onSuccess: () => {
      toast.success(`${selectedSchools.length} school(s) activated successfully`);
      qc.invalidateQueries({ queryKey: ["admin-schools"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      handleClose();
    },
    onError: (err: Error) => toast.error(err.message),
    onSettled: () => setIsProcessing(false),
  });

  const suspendMutation = useMutation({
    mutationFn: async (schoolIds: string[]) => {
      setIsProcessing(true);
      const promises = schoolIds.map(id => updateSchoolState(id, "suspended"));
      await Promise.all(promises);
    },
    onSuccess: () => {
      toast.success(`${selectedSchools.length} school(s) suspended successfully`);
      qc.invalidateQueries({ queryKey: ["admin-schools"] });
      handleClose();
    },
    onError: (err: Error) => toast.error(err.message),
    onSettled: () => setIsProcessing(false),
  });

  const handleAction = () => {
    if (!action) return;

    const schoolIds = selectedSchools.map(s => s.id);

    if (action === "activate") {
      activateMutation.mutate(schoolIds);
    } else if (action === "suspend") {
      suspendMutation.mutate(schoolIds);
    }
  };

  const handleClose = () => {
    setAction(null);
    onClearSelection();
  };

  const getActionTitle = () => {
    if (action === "activate") return "Activate Schools";
    if (action === "suspend") return "Suspend Schools";
    return "Bulk Actions";
  };

  const getActionDescription = () => {
    if (action === "activate") {
      return `You are about to activate ${selectedSchools.length} school(s). They will gain full access to the platform.`;
    }
    if (action === "suspend") {
      return `You are about to suspend ${selectedSchools.length} school(s). They will lose access to the platform.`;
    }
    return `Select an action to perform on ${selectedSchools.length} school(s).`;
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 bg-primary/10 border border-primary/20 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">
              {selectedSchools.length}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium">
              {selectedSchools.length} school{selectedSchools.length !== 1 ? "s" : ""} selected
            </p>
            <p className="text-xs text-muted-foreground">
              {selectedSchools.map(s => s.name).join(", ")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAction("activate")}
            disabled={isProcessing}
            className="text-success border-success/30 hover:bg-success/10"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Activate
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAction("suspend")}
            disabled={isProcessing}
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            <Ban className="h-4 w-4 mr-2" />
            Suspend
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClearSelection}
            disabled={isProcessing}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={!!action} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getActionTitle()}</DialogTitle>
            <DialogDescription>{getActionDescription()}</DialogDescription>
          </DialogHeader>

          {isProcessing ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">
                    Processing {selectedSchools.length} school(s)...
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium">Selected Schools:</p>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {selectedSchools.map((school) => (
                    <div
                      key={school.id}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm"
                    >
                      <span className="font-medium">{school.name}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {school.subdomain}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {action === "suspend" && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Suspended schools will not be able to access the platform. This action can be reversed later.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAction}
                  disabled={isProcessing}
                  variant={action === "suspend" ? "destructive" : "default"}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      {action === "activate" && <CheckCircle className="h-4 w-4 mr-2" />}
                      {action === "suspend" && <Ban className="h-4 w-4 mr-2" />}
                      Confirm {action === "activate" ? "Activation" : "Suspension"}
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BulkActions;