import { useState } from "react";
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

type Tab = "messages" | "contacts" | "groups" | "templates" | "study-messages" | "lessons" | "delivery" | "api-keys";

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("messages");
  const [testMode, setTestMode] = useState(false);
  const user = useQuery(api.auth.loggedInUser);
  const verificationStatus = useQuery(api.userVerification.checkVerificationStatus);
  const isAdmin = user?.isAdmin || false;
  const isVerified = verificationStatus?.isVerified || false;

  const tabs = [
    { id: "messages" as const, label: "Scheduled Messages", icon: "📅" },
    { id: "contacts" as const, label: "Contacts", icon: "👥" },
    { id: "groups" as const, label: "Groups", icon: "👨‍👩‍👧‍👦" },
    ...(isAdmin && !testMode ? [
      { id: "lessons" as const, label: "Lesson Content", icon: "📚" },
      { id: "delivery" as const, label: "Message Delivery", icon: "📨" },
    ] : []),
    ...((!isAdmin || testMode) ? [
      { id: "study-messages" as const, label: "Study Messages", icon: "📖" },
    ] : []),
    ...(isAdmin ? [{ id: "api-keys" as const, label: "API Keys", icon: "🔑" }] : []),
  ];

  // Show setup flow for unverified non-admin users
  if (!isVerified && !isAdmin) {
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

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
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
