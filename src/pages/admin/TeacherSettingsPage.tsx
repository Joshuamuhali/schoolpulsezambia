/**
 * School Teacher Settings Page
 * Configure teacher assignment model and growth settings
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Save,
  RefreshCw,
  Settings,
  TrendingUp,
  Pin,
  Calendar,
  CheckCircle,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  getSchoolTeacherSettings,
  updateSchoolTeacherSettings,
  type SchoolTeacherSettings,
} from "@/lib/services/staffService";
import { useAppStore } from "@/store/appStore";

const TeacherSettingsPage = () => {
  const { currentSchool } = useAppStore();
  const qc = useQueryClient();

  const [defaultGrowthModel, setDefaultGrowthModel] = useState<"fixed" | "floating" | "hybrid">("floating");
  const [autoAssignOnAccept, setAutoAssignOnAccept] = useState(false);
  const [notifyPrincipalOnRegistration, setNotifyPrincipalOnRegistration] = useState(true);
  const [requirePrincipalApproval, setRequirePrincipalApproval] = useState(true);
  const [autoPromoteTeachers, setAutoPromoteTeachers] = useState(true);
  const [autoAssignNewStudents, setAutoAssignNewStudents] = useState(true);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["school-teacher-settings", currentSchool?.id],
    queryFn: () => currentSchool?.id ? getSchoolTeacherSettings(currentSchool.id) : null,
    enabled: !!currentSchool?.id,
  });

  // Update local state when settings load
  if (settings) {
    setDefaultGrowthModel(settings.default_growth_model);
    setAutoAssignOnAccept(settings.auto_assign_on_accept);
    setNotifyPrincipalOnRegistration(settings.notify_principal_on_registration);
    setRequirePrincipalApproval(settings.require_principal_approval);
    setAutoPromoteTeachers(settings.auto_promote_teachers);
    setAutoAssignNewStudents(settings.auto_assign_new_students);
  }

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<SchoolTeacherSettings>) =>
      updateSchoolTeacherSettings(currentSchool?.id || "", updates),
    onSuccess: () => {
      toast.success("Settings updated successfully");
      qc.invalidateQueries({ queryKey: ["school-teacher-settings"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSave = () => {
    updateMutation.mutate({
      default_growth_model: defaultGrowthModel,
      auto_assign_on_accept: autoAssignOnAccept,
      notify_principal_on_registration: notifyPrincipalOnRegistration,
      require_principal_approval: requirePrincipalApproval,
      auto_promote_teachers: autoPromoteTeachers,
      auto_assign_new_students: autoAssignNewStudents,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Teacher Settings</h1>
          <p className="text-muted-foreground">
            Configure teacher assignment model and growth settings
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Default Teacher Growth Model */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Default Teacher Growth Model
              </CardTitle>
              <CardDescription>
                How should teachers be assigned to grades by default?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup value={defaultGrowthModel} onValueChange={(v: any) => setDefaultGrowthModel(v)}>
                <div className="space-y-4">
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <RadioGroupItem value="floating" id="floating" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="floating" className="flex items-center gap-2 font-medium cursor-pointer">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                        Grade-Floating (Dynamic)
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Teachers move with their students to the next grade each year.
                      </p>
                      <div className="mt-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
                        Example: Teacher A → Grade 5 → Grade 6 → Grade 7 (same students)
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <RadioGroupItem value="fixed" id="fixed" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="fixed" className="flex items-center gap-2 font-medium cursor-pointer">
                        <Pin className="h-4 w-4 text-green-600" />
                        Grade-Fixed (Static)
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Teachers stay with the same grade year after year.
                      </p>
                      <div className="mt-2 text-xs text-green-600 bg-green-50 p-2 rounded">
                        Example: Teacher A → Grade 5 (always, new students each year)
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <RadioGroupItem value="hybrid" id="hybrid" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="hybrid" className="flex items-center gap-2 font-medium cursor-pointer">
                        <Calendar className="h-4 w-4 text-orange-600" />
                        Hybrid (Manual)
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Teachers are manually assigned each year by admin.
                      </p>
                      <div className="mt-2 text-xs text-orange-600 bg-orange-50 p-2 rounded">
                        Example: Admin decides annually based on needs
                      </div>
                    </div>
                  </motion.div>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Auto-Assignment Settings */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Auto-Assignment Settings
              </CardTitle>
              <CardDescription>
                Configure automatic teacher assignment behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="auto-assign">Auto-assign on registration</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically assign teachers to default grade/class upon registration
                  </p>
                </div>
                <Switch
                  id="auto-assign"
                  checked={autoAssignOnAccept}
                  onCheckedChange={setAutoAssignOnAccept}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="notify-principal">Notify principal on registration</Label>
                  <p className="text-sm text-muted-foreground">
                    Send notification to principal when teacher accepts invitation
                  </p>
                </div>
                <Switch
                  id="notify-principal"
                  checked={notifyPrincipalOnRegistration}
                  onCheckedChange={setNotifyPrincipalOnRegistration}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="require-approval">Require principal approval</Label>
                  <p className="text-sm text-muted-foreground">
                    Teachers need principal approval before accessing full features
                  </p>
                </div>
                <Switch
                  id="require-approval"
                  checked={requirePrincipalApproval}
                  onCheckedChange={setRequirePrincipalApproval}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="auto-promote">Auto-promote teachers at year-end</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically promote teachers to next grade with students (floating model)
                  </p>
                </div>
                <Switch
                  id="auto-promote"
                  checked={autoPromoteTeachers}
                  onCheckedChange={setAutoPromoteTeachers}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="auto-assign-students">Auto-assign new students</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically assign new students to teachers based on grade/class
                  </p>
                </div>
                <Switch
                  id="auto-assign-students"
                  checked={autoAssignNewStudents}
                  onCheckedChange={setAutoAssignNewStudents}
                />
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="shadow-card lg:col-span-2 bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <h4 className="font-medium text-blue-900">About Teacher Growth Models</h4>
                  <div className="text-sm text-blue-800 space-y-2">
                    <p>
                      <strong>Grade-Floating (Dynamic):</strong> Best for primary schools where teachers build long-term relationships with students. Teachers move up with their cohort each year.
                    </p>
                    <p>
                      <strong>Grade-Fixed (Static):</strong> Best for subject specialists who focus on specific grade levels. Teachers become experts in their grade's curriculum.
                    </p>
                    <p>
                      <strong>Hybrid (Manual):</strong> Maximum flexibility for schools with mixed needs. Principal decides each year based on teacher skills and school requirements.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TeacherSettingsPage;
