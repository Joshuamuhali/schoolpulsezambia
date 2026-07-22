import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  Clock,
  Bell,
  CheckCircle,
  XCircle,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAppStore } from "@/store/appStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as attendanceService from "@/lib/services/attendanceService";

export function AttendanceSettingsPage() {
  const currentSchool = useAppStore((s) => s.currentSchool);
  const queryClient = useQueryClient();

  const [settings, setSettings] = useState({
    allow_editing: true,
    late_threshold_minutes: 15,
    attendance_method: "present_absent_late" as "present_absent" | "present_absent_late" | "custom",
    notify_parents_on_absence: false,
    notify_parents_on_late: false,
  });

  const { data: existingSettings, isLoading } = useQuery({
    queryKey: ["attendance-settings", currentSchool?.id],
    queryFn: () => attendanceService.getAttendanceSettings(currentSchool!.id),
    enabled: !!currentSchool?.id,
  });

  useEffect(() => {
    if (existingSettings) {
      setSettings({
        allow_editing: existingSettings.allow_editing,
        late_threshold_minutes: existingSettings.late_threshold_minutes,
        attendance_method: existingSettings.attendance_method,
        notify_parents_on_absence: existingSettings.notify_parents_on_absence,
        notify_parents_on_late: existingSettings.notify_parents_on_late,
      });
    }
  }, [existingSettings]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (existingSettings?.id) {
        return attendanceService.updateAttendanceSettings(existingSettings.id, data);
      } else {
        return attendanceService.createAttendanceSettings({
          ...data,
          school_id: currentSchool!.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-settings"] });
      toast.success("Settings saved successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save settings");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(settings);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold">Attendance Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure attendance tracking preferences
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Attendance Method */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Method</CardTitle>
            <CardDescription>
              Choose how attendance will be recorded
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Attendance Status Options</label>
              <Select
                value={settings.attendance_method}
                onValueChange={(value: any) => setSettings({ ...settings, attendance_method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present_absent">Present / Absent Only</SelectItem>
                  <SelectItem value="present_absent_late">Present / Absent / Late</SelectItem>
                  <SelectItem value="custom">Custom Statuses</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {settings.attendance_method === "present_absent" && "Teachers can only mark students as Present or Absent"}
                {settings.attendance_method === "present_absent_late" && "Teachers can mark students as Present, Absent, or Late"}
                {settings.attendance_method === "custom" && "You can define custom attendance statuses"}
              </p>
            </div>

            {settings.attendance_method === "present_absent_late" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Late Threshold (minutes)</label>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    min="0"
                    max="120"
                    value={settings.late_threshold_minutes}
                    onChange={(e) => setSettings({ ...settings, late_threshold_minutes: parseInt(e.target.value) || 0 })}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">minutes</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Students arriving after this many minutes will be marked as Late
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Editing Permissions */}
        <Card>
          <CardHeader>
            <CardTitle>Editing Permissions</CardTitle>
            <CardDescription>
              Control who can edit attendance records
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">Allow Attendance Editing</label>
                <p className="text-xs text-muted-foreground">
                  Teachers can edit attendance after submission
                </p>
              </div>
              <Switch
                checked={settings.allow_editing}
                onCheckedChange={(checked) => setSettings({ ...settings, allow_editing: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Parent Notifications</CardTitle>
            <CardDescription>
              Configure when parents should be notified
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <label className="text-sm font-medium">Notify on Absence</label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Send notification when student is marked absent
                </p>
              </div>
              <Switch
                checked={settings.notify_parents_on_absence}
                onCheckedChange={(checked) => setSettings({ ...settings, notify_parents_on_absence: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <label className="text-sm font-medium">Notify on Late Arrival</label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Send notification when student arrives late
                </p>
              </div>
              <Switch
                checked={settings.notify_parents_on_late}
                onCheckedChange={(checked) => setSettings({ ...settings, notify_parents_on_late: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex gap-2">
          <Button type="submit" disabled={saveMutation.isPending} className="flex-1">
            <Save className="mr-2 h-4 w-4" />
            {saveMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}