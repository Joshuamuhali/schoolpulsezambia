/**
 * Parent Dashboard
 * Main dashboard for parents to view their children's information
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import { parentService } from "@/lib/services/parentService";
import type { ChildInfo, AttendanceSummary, FeeSummary, LatestResult, Announcement, Notification } from "@/lib/services/parentService";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Calendar, DollarSign, GraduationCap, Users, FileText, ChevronRight, AlertCircle } from "lucide-react";

export default function ParentDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [attendanceSummaries, setAttendanceSummaries] = useState<Map<string, AttendanceSummary>>(new Map());
  const [feeSummaries, setFeeSummaries] = useState<Map<string, FeeSummary>>(new Map());
  const [latestResults, setLatestResults] = useState<Map<string, LatestResult[]>>(new Map());
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [parentProfile, setParentProfile] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      // Get parent profile
      const profile = await parentService.getCurrentParentProfile();
      if (!profile) {
        navigate("/parent/setup");
        return;
      }
      setParentProfile(profile);

      // Load dashboard data
      const dashboardData = await parentService.getParentDashboard(user.id);
      
      setChildren(dashboardData.children);
      setAttendanceSummaries(dashboardData.attendanceSummaries);
      setFeeSummaries(dashboardData.feeSummaries);
      setLatestResults(dashboardData.latestResults);
      setUnreadCount(dashboardData.unreadNotifications);

      // Load announcements
      const announcementsData = await parentService.getAnnouncements(profile.school_id, user.id, 10);
      setAnnouncements(announcementsData);

      // Load notifications
      const notificationsData = await parentService.getNotifications(user.id, 10);
      setNotifications(notificationsData);

    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600";
    if (percentage >= 75) return "text-yellow-600";
    return "text-red-600";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "normal": return "bg-blue-100 text-blue-800";
      case "low": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome, {parentProfile?.first_name}
              </h1>
              <p className="text-sm text-gray-600">Parent Dashboard</p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/parent/notifications")}
                className="relative"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Children Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {children.map((child) => {
            const attendance = attendanceSummaries.get(child.student_id);
            const fees = feeSummaries.get(child.student_id);
            const results = latestResults.get(child.student_id);

            return (
              <Card key={child.student_id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {child.student_name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {child.grade_name} {child.class_name && `• ${child.class_name}`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/parent/children/${child.student_id}`)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  {/* Attendance */}
                  {attendance && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        Attendance
                      </div>
                      <span className={`font-semibold ${getAttendanceColor(attendance.attendance_percentage)}`}>
                        {attendance.attendance_percentage}%
                      </span>
                    </div>
                  )}

                  {/* Fees */}
                  {fees && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-600">
                        <DollarSign className="h-4 w-4 mr-2" />
                        Fees Balance
                      </div>
                      <span className={`font-semibold ${fees.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        K{fees.balance.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {/* Latest Results */}
                  {results && results.length > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-600">
                        <GraduationCap className="h-4 w-4 mr-2" />
                        Latest Results
                      </div>
                      <span className="font-semibold text-blue-600">
                        {results[0].average}%
                      </span>
                    </div>
                  )}
                </div>

                <Button
                  className="w-full mt-4"
                  variant="outline"
                  onClick={() => navigate(`/parent/children/${child.student_id}`)}
                >
                  View Details
                </Button>
              </Card>
            );
          })}
        </div>

        {/* Announcements and Notifications */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Announcements */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Announcements
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/parent/announcements")}
              >
                View All
              </Button>
            </div>
            <div className="space-y-3">
              {announcements.length === 0 ? (
                <p className="text-sm text-gray-500">No announcements</p>
              ) : (
                announcements.slice(0, 5).map((announcement) => (
                  <div
                    key={announcement.id}
                    className="border-l-4 border-blue-500 pl-4 py-2"
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium text-sm">{announcement.title}</h4>
                      <Badge className={getPriorityColor(announcement.priority)}>
                        {announcement.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {announcement.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(announcement.publish_at).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Recent Notifications */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                Recent Notifications
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/parent/notifications")}
              >
                View All
              </Button>
            </div>
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <p className="text-sm text-gray-500">No notifications</p>
              ) : (
                notifications.slice(0, 5).map((notification) => (
                  <div
                    key={notification.id}
                    className={`border-l-4 ${notification.read_at ? 'border-gray-300' : 'border-blue-500'} pl-4 py-2`}
                  >
                    <h4 className="font-medium text-sm">{notification.title}</h4>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-gray-500">
                        {new Date(notification.created_at).toLocaleDateString()}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {notification.channel}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}