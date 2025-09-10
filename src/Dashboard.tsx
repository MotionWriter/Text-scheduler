import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { ContactsTab } from "./components/ContactsTab";
import { GroupsTab } from "./components/GroupsTab";
import { TemplatesTab } from "./components/TemplatesTab";
import { StudyMessagesTab } from "./components/StudyMessagesTab";
import { LessonContentTab } from "./components/LessonContentTab";
import { DeliveryManagementTab } from "./components/DeliveryManagementTab";
import { DeliveryNotifications } from "./components/DeliveryNotifications";
import { MessagesTab } from "./components/MessagesTab";
import { ApiKeysTab } from "./components/ApiKeysTab";
import { SetupTab } from "./components/SetupTab";
import { ChevronsUpDown } from "lucide-react";

type Tab = "messages" | "contacts" | "groups" | "templates" | "study-messages" | "lessons" | "delivery" | "api-keys";

export function Dashboard() {
  // Priority: Study Messages
  const [activeTab, setActiveTab] = useState<Tab>("study-messages");
  const [testMode, setTestMode] = useState(false);
  const user = useQuery(api.auth.loggedInUser);
  const verificationStatus = useQuery(api.userVerification.checkVerificationStatus);
  const isAdmin = user?.isAdmin || false;
  const isVerified = verificationStatus?.isVerified || false;

  // Build tabs in the requested priority order
  const tabs = [
    ...((!isAdmin || testMode) ? [
      { id: "study-messages" as const, label: "Study Messages", icon: "📖" },
    ] : []),
    { id: "groups" as const, label: "Groups", icon: "👨‍👩‍👧‍👦" },
    { id: "contacts" as const, label: "Contacts", icon: "👥" },
    { id: "messages" as const, label: "Scheduled Messages", icon: "📅" },
    ...(isAdmin && !testMode ? [
      { id: "lessons" as const, label: "Lesson Content", icon: "📚" },
      { id: "delivery" as const, label: "Message Delivery", icon: "📨" },
    ] : []),
    ...(isAdmin ? [{ id: "api-keys" as const, label: "API Keys", icon: "🔑" }] : []),
  ];

  // Ensure activeTab is valid and defaults to first available
  useEffect(() => {
    if (tabs.length > 0 && !tabs.some(t => t.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [JSON.stringify(tabs), activeTab]);

  // Dev E2E bypass: allow skipping Setup when ?e2e=1 is present (for automated tests)
  const devE2EBypass = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("e2e") === "1";

  // Show setup flow for unverified non-admin users (unless dev E2E bypass is active)
  if (!isVerified && !isAdmin && !devE2EBypass) {
    return <SetupTab />;
  }

  return (
    <div className="space-y-6">
      {/* Background notification system */}
      <DeliveryNotifications />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.email}</p>
        </div>
        {isAdmin && (
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">Admin Mode</span>
            <button
              onClick={() => {
                setTestMode(!testMode);
                if (!testMode) {
                  setActiveTab("study-messages");
                } else {
                  setActiveTab("lessons");
                }
              }}
              className={`relative inline-flex items-center h-6 rounded-full w-12 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 border ${
                testMode ? "bg-primary text-white border-primary" : "bg-[hsl(var(--table-header))] border-border"
              }`}
            >
              <span
                className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform shadow ${
                  testMode ? "translate-x-7" : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-sm text-gray-600">Test Mode</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="rounded-xl bg-muted shadow-sm p-0 sm:border sm:p-1">
        {/* Mobile compact tab selector */}
        <div className="sm:hidden mb-2">
          <div className="max-w-full relative rounded-2xl border border-border/60 bg-white/60 shadow-sm p-1">
            <select
              aria-label="Select tab"
              className="w-full h-12 rounded-xl border border-input bg-white pl-4 pr-12 text-lg font-medium text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring appearance-none"
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as Tab)}
            >
              {tabs.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-muted-foreground">
              <ChevronsUpDown className="h-4 w-4 opacity-70" />
            </span>
          </div>
        </div>
        <div className="hidden sm:block overflow-x-auto">
          <nav className="flex gap-2" role="tablist" aria-label="Primary">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 whitespace-nowrap px-3 py-2 sm:px-4 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 border ${
                    isActive
                      ? "bg-white text-foreground border-primary/30 shadow-sm"
                      : "text-muted-foreground border-transparent hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <span aria-hidden className="text-base">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      <div className="mt-6">
        {activeTab === "messages" && <MessagesTab />}
        {activeTab === "contacts" && <ContactsTab />}
        {activeTab === "groups" && <GroupsTab />}
        {activeTab === "templates" && !isAdmin && <TemplatesTab />}
        {activeTab === "study-messages" && (!isAdmin || testMode) && <StudyMessagesTab />}
        {activeTab === "lessons" && isAdmin && !testMode && <LessonContentTab />}
        {activeTab === "delivery" && isAdmin && !testMode && <DeliveryManagementTab />}
        {activeTab === "api-keys" && isAdmin && <ApiKeysTab />}
      </div>
    </div>
  );
}
