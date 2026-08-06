import { useMemo } from "react";
import { useAppStore } from "@/store/appStore";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  ClipboardCheck,
  BookOpen,
  CreditCard,
  MessageSquare,
  Calendar,
  BarChart3,
  Settings,
  Package,
} from "lucide-react";
import type { FeatureKey } from "@/store/appStore";

export interface NavItem {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  featureKey?: FeatureKey;
}

/**
 * Hook that returns filtered navigation items based on active modules
 * Only shows navigation items for which the school has active feature flags
 */
export function useSidebarItems() {
  const currentSchool = useAppStore((s) => s.currentSchool);

  const allItems = useMemo(
    () => [
      { to: "/dashboard", icon: LayoutDashboard, label: "Overview", featureKey: undefined },
      { to: "/dashboard/students", icon: GraduationCap, label: "Students", featureKey: "students" as FeatureKey },
      { to: "/dashboard/teachers", icon: Users, label: "Teachers", featureKey: "teachers" as FeatureKey },
      { to: "/dashboard/attendance", icon: ClipboardCheck, label: "Attendance", featureKey: "attendance" as FeatureKey },
      { to: "/dashboard/exams", icon: BookOpen, label: "Exams", featureKey: "exams" as FeatureKey },
      { to: "/dashboard/finance", icon: CreditCard, label: "Finance", featureKey: "finance" as FeatureKey },
      { to: "/dashboard/communication", icon: MessageSquare, label: "Communication", featureKey: "communication" as FeatureKey },
      { to: "/dashboard/timetable", icon: Calendar, label: "Timetable", featureKey: "timetable" as FeatureKey },
      { to: "/dashboard/analytics", icon: BarChart3, label: "Analytics", featureKey: "analytics" as FeatureKey },
      { to: "/dashboard/features", icon: Package, label: "Features" },
      { to: "/dashboard/settings", icon: Settings, label: "Settings", featureKey: undefined },
    ],
    []
  );

  // Filter items based on feature access
  const filteredItems = useMemo(() => {
    if (!currentSchool) return allItems;

    // Return all items for now
    // The FeatureGate component in the layout will handle locking individual features
    return allItems;
  }, [allItems, currentSchool]);

  return filteredItems;
}