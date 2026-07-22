import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Settings,
  Save,
  RefreshCw,
  Globe,
  Mail,
  MessageSquare,
  CreditCard,
  Shield,
  Bell,
  Palette,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchSystemHealth } from "@/lib/services/adminService";
import { toast } from "sonner";

const SettingsPage = () => {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  // Platform Settings
  const [platformName, setPlatformName] = useState("School Pulse");
  const [platformEmail, setPlatformEmail] = useState("support@schoolpulse.com");
  const [supportPhone, setSupportPhone] = useState("+260 123 456 789");
  const [timezone, setTimezone] = useState("Africa/Lusaka");

  // Email Settings
  const [smtpHost, setSmtpHost] = useState("smtp.mailtrap.io");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [emailFrom, setEmailFrom] = useState("noreply@schoolpulse.com");

  // SMS Settings
  const [smsProvider, setSmsProvider] = useState("twilio");
  const [smsApiKey, setSmsApiKey] = useState("");
  const [smsSenderId, setSmsSenderId] = useState("SchoolPulse");

  // Payment Settings
  const [paymentProvider, setPaymentProvider] = useState("stripe");
  const [paymentApiKey, setPaymentApiKey] = useState("");
  const [paymentSecret, setPaymentSecret] = useState("");
  const [currency, setCurrency] = useState("ZMW");

  // Feature Flags
  const [enableRegistration, setEnableRegistration] = useState(true);
  const [enableTrialPeriod, setEnableTrialPeriod] = useState(true);
  const [trialDays, setTrialDays] = useState("14");
  const [requireEmailVerification, setRequireEmailVerification] = useState(true);
  const [enableTwoFactor, setEnableTwoFactor] = useState(false);

  // Notification Settings
  const [notifyNewSchool, setNotifyNewSchool] = useState(true);
  const [notifyPaymentReceived, setNotifyPaymentReceived] = useState(true);
  const [notifyPaymentPending, setNotifyPaymentPending] = useState(true);
  const [notifyTrialExpiring, setNotifyTrialExpiring] = useState(true);

  const { data: systemHealth, isLoading: healthLoading } = useQuery({
    queryKey: ["system-health"],
    queryFn: fetchSystemHealth,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      setSaving(true);
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // In a real app, this would save to database
      const settings = {
        platform: { platformName, platformEmail, supportPhone, timezone },
        email: { smtpHost, smtpPort, smtpUser, smtpPassword, emailFrom },
        sms: { smsProvider, smsApiKey, smsSenderId },
        payment: { paymentProvider, paymentApiKey, paymentSecret, currency },
        features: { enableRegistration, enableTrialPeriod, trialDays, requireEmailVerification, enableTwoFactor },
        notifications: { notifyNewSchool, notifyPaymentReceived, notifyPaymentPending, notifyTrialExpiring },
      };

      console.log("Saving settings:", settings);
      return settings;
    },
    onSuccess: () => {
      toast.success("Settings saved successfully");
      queryClient.invalidateQueries({ queryKey: ["system-health"] });
    },
    onError: () => {
      toast.error("Failed to save settings");
    },
    onSettled: () => {
      setSaving(false);
    },
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">System Settings</h1>
          <p className="text-muted-foreground">Manage platform configuration and preferences</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* System Health */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          {healthLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : systemHealth ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="text-sm font-medium flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-success" />
                  {systemHealth.status}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Database Size</p>
                <p className="text-sm font-medium">{systemHealth.database_size}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active Connections</p>
                <p className="text-sm font-medium">{systemHealth.active_connections}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last Checked</p>
                <p className="text-sm font-medium">
                  {new Date(systemHealth.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Unable to load system health</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="sms">SMS</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                Platform Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="platformName">Platform Name</Label>
                <Input
                  id="platformName"
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="platformEmail">Support Email</Label>
                <Input
                  id="platformEmail"
                  type="email"
                  value={platformEmail}
                  onChange={(e) => setPlatformEmail(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="supportPhone">Support Phone</Label>
                <Input
                  id="supportPhone"
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Africa/Lusaka">Africa/Lusaka (CAT)</SelectItem>
                    <SelectItem value="Africa/Johannesburg">Africa/Johannesburg (SAST)</SelectItem>
                    <SelectItem value="Africa/Nairobi">Africa/Nairobi (EAT)</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Settings */}
        <TabsContent value="email" className="space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                Email Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="smtpHost">SMTP Host</Label>
                <Input
                  id="smtpHost"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="smtpPort">SMTP Port</Label>
                <Input
                  id="smtpPort"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="smtpUser">SMTP Username</Label>
                <Input
                  id="smtpUser"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="smtpPassword">SMTP Password</Label>
                <Input
                  id="smtpPassword"
                  type="password"
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="emailFrom">From Email</Label>
                <Input
                  id="emailFrom"
                  type="email"
                  value={emailFrom}
                  onChange={(e) => setEmailFrom(e.target.value)}
                  className="mt-2"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SMS Settings */}
        <TabsContent value="sms" className="space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                SMS Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="smsProvider">SMS Provider</Label>
                <Select value={smsProvider} onValueChange={setSmsProvider}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="twilio">Twilio</SelectItem>
                    <SelectItem value="africastalking">Africa's Talking</SelectItem>
                    <SelectItem value="textlocal">TextLocal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="smsApiKey">API Key</Label>
                <Input
                  id="smsApiKey"
                  type="password"
                  value={smsApiKey}
                  onChange={(e) => setSmsApiKey(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="smsSenderId">Sender ID</Label>
                <Input
                  id="smsSenderId"
                  value={smsSenderId}
                  onChange={(e) => setSmsSenderId(e.target.value)}
                  className="mt-2"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Settings */}
        <TabsContent value="payment" className="space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                Payment Gateway Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="paymentProvider">Payment Provider</Label>
                <Select value={paymentProvider} onValueChange={setPaymentProvider}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stripe">Stripe</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                    <SelectItem value="mpesa">M-Pesa</SelectItem>
                    <SelectItem value="airtel">Airtel Money</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="paymentApiKey">API Key</Label>
                <Input
                  id="paymentApiKey"
                  type="password"
                  value={paymentApiKey}
                  onChange={(e) => setPaymentApiKey(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="paymentSecret">API Secret</Label>
                <Input
                  id="paymentSecret"
                  type="password"
                  value={paymentSecret}
                  onChange={(e) => setPaymentSecret(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="currency">Default Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ZMW">ZMW - Zambian Kwacha</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="KES">KES - Kenyan Shilling</SelectItem>
                    <SelectItem value="NGN">NGN - Nigerian Naira</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feature Flags */}
        <TabsContent value="features" className="space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                Platform Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enableRegistration">Enable School Registration</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Allow new schools to register on the platform
                  </p>
                </div>
                <Switch
                  id="enableRegistration"
                  checked={enableRegistration}
                  onCheckedChange={setEnableRegistration}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enableTrialPeriod">Enable Trial Period</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Offer trial period for new schools
                  </p>
                </div>
                <Switch
                  id="enableTrialPeriod"
                  checked={enableTrialPeriod}
                  onCheckedChange={setEnableTrialPeriod}
                />
              </div>
              {enableTrialPeriod && (
                <div>
                  <Label htmlFor="trialDays">Trial Period (Days)</Label>
                  <Input
                    id="trialDays"
                    type="number"
                    value={trialDays}
                    onChange={(e) => setTrialDays(e.target.value)}
                    className="mt-2 w-32"
                  />
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="requireEmailVerification">Require Email Verification</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Users must verify email before accessing the platform
                  </p>
                </div>
                <Switch
                  id="requireEmailVerification"
                  checked={requireEmailVerification}
                  onCheckedChange={setRequireEmailVerification}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enableTwoFactor">Enable Two-Factor Authentication</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Allow users to enable 2FA for enhanced security
                  </p>
                </div>
                <Switch
                  id="enableTwoFactor"
                  checked={enableTwoFactor}
                  onCheckedChange={setEnableTwoFactor}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                Platform Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notifyNewSchool">New School Registration</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Send notification when a new school registers
                  </p>
                </div>
                <Switch
                  id="notifyNewSchool"
                  checked={notifyNewSchool}
                  onCheckedChange={setNotifyNewSchool}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notifyPaymentReceived">Payment Received</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Send notification when a payment is received
                  </p>
                </div>
                <Switch
                  id="notifyPaymentReceived"
                  checked={notifyPaymentReceived}
                  onCheckedChange={setNotifyPaymentReceived}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notifyPaymentPending">Payment Pending Approval</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Send notification when a payment is pending approval
                  </p>
                </div>
                <Switch
                  id="notifyPaymentPending"
                  checked={notifyPaymentPending}
                  onCheckedChange={setNotifyPaymentPending}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notifyTrialExpiring">Trial Expiring Soon</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Send notification when a trial is about to expire
                  </p>
                </div>
                <Switch
                  id="notifyTrialExpiring"
                  checked={notifyTrialExpiring}
                  onCheckedChange={setNotifyTrialExpiring}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;