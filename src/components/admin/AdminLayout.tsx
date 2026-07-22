import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  School,
  Users,
  DollarSign,
  CreditCard,
  Package,
  BarChart3,
  FileText,
  LifeBuoy,
  Settings,
  LogOut,
  Menu,
  Activity,
  ShieldCheck,
  Plus,
  Bell,
  Tags,
  CheckCircle,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { promoteToSuperAdmin } from "@/lib/services/users";
import { supabase } from "@/lib/supabase/client";

const navItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/admin/schools", icon: School, label: "Schools" },
  { to: "/admin/payments", icon: CreditCard, label: "Payments", badge: 15 },
  { to: "/admin/subscriptions", icon: DollarSign, label: "Subscriptions" },
  { to: "/admin/users", icon: Users, label: "Users" },
  { to: "/admin/features", icon: Package, label: "Features" },
  { to: "/admin/modules/pricing", icon: Tags, label: "Module Pricing" },
  { to: "/admin/approvals", icon: CheckCircle, label: "Approvals", badge: 15 },
  { to: "/admin/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/admin/audit", icon: FileText, label: "Audit Logs" },
  { to: "/admin/support", icon: LifeBuoy, label: "Support", badge: 8 },
  { to: "/admin/settings", icon: Settings, label: "Settings" },
];

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("");
  const navigate = useNavigate();
  const clearSession = useAppStore((s) => s.clearSession);

  // Fetch current user info
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("first_name, last_name, role")
            .eq("id", user.id)
            .single();

          if (profile) {
            const userProfile = profile as { first_name?: string; last_name?: string; role?: string };
            setUserName(`${userProfile.first_name || ""} ${userProfile.last_name || ""}`.trim() || user.email || "User");
            setUserRole(userProfile.role || "admin");
          }
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
      }
    };

    fetchUserInfo();
  }, []);

  const handleSignOut = () => {
    clearSession();
    navigate("/auth/login");
  };

  const handleCreateAdmin = async () => {
    if (!adminEmail.trim()) {
      setAdminError("Email is required");
      return;
    }

    setAdminLoading(true);
    setAdminError(null);

    try {
      await promoteToSuperAdmin(adminEmail);
      setAdminEmail("");
      setShowCreateAdminModal(false);
      alert(`${adminEmail} has been promoted to Super Admin`);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to promote user to Super Admin";
      setAdminError(msg);
    } finally {
      setAdminLoading(false);
    }
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <Activity className="h-7 w-7 text-sidebar-primary" />
        <div>
          <h2 className="font-display text-sm font-bold text-sidebar-foreground">Platform Command Center</h2>
          <div className="flex items-center gap-1 mt-0.5">
            <ShieldCheck className="h-3 w-3 text-primary" />
            <p className="text-xs text-primary font-medium">
              {userName ? `${userName} (${userRole})` : "Loading..."}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
            {item.badge !== undefined && (
              <Badge variant="destructive" className="ml-auto h-5 px-1.5 text-xs">
                {item.badge}
              </Badge>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3 space-y-2">
        <button
          onClick={() => setShowCreateAdminModal(true)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Admin
        </button>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden lg:flex lg:w-64 lg:flex-col bg-sidebar border-r border-sidebar-border">
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-foreground/50" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed left-0 top-0 h-full w-64 bg-sidebar z-50">
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center gap-4 border-b bg-card px-4 lg:px-8 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Admin Portal</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
              {userName ? userName.split(" ").map(n => n[0]).join("").toUpperCase() : "U"}
            </div>
            <Bell className="h-5 w-5 text-muted-foreground" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
