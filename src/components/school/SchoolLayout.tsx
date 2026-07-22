import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  ClipboardCheck,
  BookOpen,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  Activity,
  MessageSquare,
  Calendar,
  BarChart3,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PreviewBanner } from "@/components/PreviewBanner";
import { EmailConfirmationBanner } from "@/components/auth/EmailConfirmationBanner";
import { useAppStore, type FeatureKey } from "@/store/appStore";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useSidebarItems } from "@/hooks/useSidebarItems";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type NavItem = {
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
  featureKey?: FeatureKey;
  end?: boolean;
};

const navItems: NavItem[] = [
  { to: "/school", icon: LayoutDashboard, label: "Overview", end: true },
  { to: "/school/students", icon: GraduationCap, label: "Students", featureKey: "students" },
  { to: "/school/teachers", icon: Users, label: "Teachers", featureKey: "teachers" },
  { to: "/school/attendance", icon: ClipboardCheck, label: "Attendance", featureKey: "attendance" },
  { to: "/school/exams", icon: BookOpen, label: "Exams", featureKey: "exams" },
  { to: "/school/finance", icon: CreditCard, label: "Finance", featureKey: "finance" },
  { to: "/school/communication", icon: MessageSquare, label: "Communication", featureKey: "communication" },
  { to: "/school/timetable", icon: Calendar, label: "Timetable", featureKey: "timetable" },
  { to: "/school/analytics", icon: BarChart3, label: "Analytics", featureKey: "analytics" },
  { to: "/school/settings", icon: Settings, label: "Settings" },
];

function NavItemLink({ item }: { item: NavItem }) {
  const navigate = useNavigate();
  const access = item.featureKey
    ? // eslint-disable-next-line react-hooks/rules-of-hooks
      useFeatureAccess(item.featureKey)
    : { enabled: true, locked: false };

  const handleClick = (e: React.MouseEvent) => {
    if (access.locked) {
      e.preventDefault();
    }
  };

  const inner = (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={handleClick}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          isActive && !access.locked
            ? "bg-sidebar-primary text-sidebar-primary-foreground"
            : access.locked
            ? "text-sidebar-foreground/30 cursor-not-allowed"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )
      }
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{item.label}</span>
      {access.locked && <Lock className="h-3 w-3 opacity-50" />}
    </NavLink>
  );

  if (access.locked) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs text-xs">
          Feature not activated
        </TooltipContent>
      </Tooltip>
    );
  }

  return inner;
}

const SchoolLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const schoolName = useAppStore((s) => s.currentSchool?.name ?? "My School");
  const clearSession = useAppStore((s) => s.clearSession);
  const sidebarItems = useSidebarItems();

  const handleSignOut = () => {
    clearSession();
    navigate("/auth/login");
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <Activity className="h-7 w-7 text-sidebar-primary" />
        <div>
          <h2 className="font-display text-sm font-bold text-sidebar-foreground">School Pulse</h2>
          <p className="text-xs text-sidebar-foreground/50 truncate max-w-[120px]">{schoolName}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-4 overflow-y-auto">
        {sidebarItems.map((item) => (
          <NavItemLink key={item.to} item={item} />
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
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
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col bg-sidebar border-r border-sidebar-border">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-foreground/50" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed left-0 top-0 h-full w-64 bg-sidebar z-50">
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Preview / suspended / payment_pending banner */}
        <PreviewBanner />
        
        {/* Email confirmation banner */}
        <div className="px-4 lg:px-8 pt-4">
          <EmailConfirmationBanner />
        </div>

        <header className="flex h-16 items-center gap-4 border-b bg-card px-4 lg:px-8 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
              A
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SchoolLayout;
