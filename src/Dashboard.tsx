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

type Tab = "messages" | "contacts" | "groups" | "templates" | "study-messages" | "lessons" | "delivery" | "api-keys";

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("messages");
  const user = useQuery(api.auth.loggedInUser);
  const isAdmin = user?.isAdmin || false;

  const tabs = [
    { id: "messages" as const, label: "Scheduled Messages", icon: "📅" },
    { id: "contacts" as const, label: "Contacts", icon: "👥" },
    { id: "groups" as const, label: "Groups", icon: "👨‍👩‍👧‍👦" },
    ...(isAdmin ? [
      { id: "lessons" as const, label: "Lesson Content", icon: "📚" },
      { id: "delivery" as const, label: "Message Delivery", icon: "📨" },
    ] : [
      { id: "study-messages" as const, label: "Study Messages", icon: "📖" },
    ]),
    { id: "api-keys" as const, label: "API Keys", icon: "🔑" },
  ];

  return (
    <div className="space-y-6">
      {/* Background notification system */}
      <DeliveryNotifications />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.email}</p>
        </div>
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
        {activeTab === "study-messages" && !isAdmin && <StudyMessagesTab />}
        {activeTab === "lessons" && isAdmin && <LessonContentTab />}
        {activeTab === "delivery" && isAdmin && <DeliveryManagementTab />}
        {activeTab === "api-keys" && <ApiKeysTab />}
      </div>
    </div>
  );
}
