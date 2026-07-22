import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

const SettingsPage = () => (
  <div className="space-y-6">
    <div>
      <h1 className="font-display text-2xl font-bold">Settings</h1>
      <p className="text-muted-foreground">School configuration and preferences</p>
    </div>
    <Card className="shadow-card">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Settings className="h-8 w-8 text-primary" />
        </div>
        <h3 className="font-display text-lg font-semibold">Settings & Configuration</h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          School branding, feature management, user roles, and system configuration will be available here.
        </p>
      </CardContent>
    </Card>
  </div>
);

export default SettingsPage;
