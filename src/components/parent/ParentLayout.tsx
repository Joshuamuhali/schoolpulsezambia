/**
 * Parent Layout
 * Layout wrapper for parent portal pages
 */

import { Outlet } from "react-router-dom";
import { Card } from "@/components/ui/card";

export default function ParentLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Parent Portal Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Parent Portal
              </h1>
              <p className="text-sm text-gray-600">
                School Pulse
              </p>
            </div>
            <nav className="flex gap-4">
              <a href="/parent/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
                Dashboard
              </a>
              <a href="/parent/announcements" className="text-sm text-gray-600 hover:text-gray-900">
                Announcements
              </a>
              <a href="/parent/notifications" className="text-sm text-gray-600 hover:text-gray-900">
                Notifications
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}