import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Home, AlertCircle, LogOut } from "lucide-react";
import { ChapterManagement } from "@/components/admin/ChapterManagement";
import { ContentManagement } from "@/components/admin/ContentManagement";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { ActivityLog } from "@/components/admin/ActivityLog";
import { UserManagement } from "@/components/admin/UserManagement";

export default function Admin() {
  const [, setLocation] = useLocation();
  const { isAdmin, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("content");
  const [contentTab, setContentTab] = useState("chapters");

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-kdrama-cream/20 to-kdrama-sky/10">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-kdrama-thread">
              <AlertCircle className="w-5 h-5" />
              <CardTitle className="font-myeongjo">Access Denied</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-noto text-muted-foreground">
              You need admin privileges to access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-kdrama-cream/20 to-kdrama-sky/10">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-myeongjo text-2xl font-bold text-kdrama-ink dark:text-foreground">
            Admin Panel - 紅線日記
          </h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/")}
              data-testid="button-home"
            >
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-4 mb-8">
            <TabsTrigger value="content" className="font-noto" data-testid="tab-content">
              Content Management
            </TabsTrigger>
            <TabsTrigger value="analytics" className="font-noto" data-testid="tab-analytics">
              Analytics
            </TabsTrigger>
            <TabsTrigger value="activity" className="font-noto" data-testid="tab-activity">
              Activity Log
            </TabsTrigger>
            <TabsTrigger value="users" className="font-noto" data-testid="tab-users">
              Users
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-6">
            <Tabs value={contentTab} onValueChange={setContentTab}>
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6">
                <TabsTrigger value="chapters" className="font-noto" data-testid="tab-chapters">
                  Chapters
                </TabsTrigger>
                <TabsTrigger value="content" className="font-noto" data-testid="tab-content-editor">
                  Sections & Pages
                </TabsTrigger>
              </TabsList>

              <TabsContent value="chapters">
                <ChapterManagement />
              </TabsContent>

              <TabsContent value="content">
                <ContentManagement />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsDashboard />
          </TabsContent>

          <TabsContent value="activity">
            <ActivityLog />
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
