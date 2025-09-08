import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

export function ApiKeysTab() {
  const apiKeys = useQuery(api.apiKeys.list) || [];
  const createApiKey = useMutation(api.apiKeys.create);
  const toggleApiKey = useMutation(api.apiKeys.toggle);
  const removeApiKey = useMutation(api.apiKeys.remove);

  const [showForm, setShowForm] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [newApiKey, setNewApiKey] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await createApiKey({ name: keyName });
      setNewApiKey(result.apiKey);
      setKeyName("");
      setShowForm(false);
      toast.success("API key created successfully");
    } catch (error) {
      toast.error("Failed to create API key");
    }
  };

  const handleToggle = async (id: Id<"apiKeys">, isActive: boolean) => {
    try {
      await toggleApiKey({ id, isActive: !isActive });
      toast.success(`API key ${!isActive ? "activated" : "deactivated"}`);
    } catch (error) {
      toast.error("Failed to update API key");
    }
  };

  const handleDelete = async (id: Id<"apiKeys">) => {
    if (confirm("Are you sure you want to delete this API key? This action cannot be undone.")) {
      try {
        await removeApiKey({ id });
        toast.success("API key deleted successfully");
      } catch (error) {
        toast.error("Failed to delete API key");
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("API key copied to clipboard");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">API Keys</h2>
          <p className="text-gray-600 mt-1">
            Create API keys for your Apple Shortcut to access scheduled messages
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create API Key
        </button>
      </div>

      {newApiKey && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            API Key Created Successfully!
          </h3>
          <p className="text-green-700 mb-3">
            Please copy this API key now. You won't be able to see it again.
          </p>
          <div className="flex items-center gap-2">
            <code className="bg-white px-3 py-2 rounded border flex-1 font-mono text-sm">
              {newApiKey}
            </code>
            <button
              onClick={() => copyToClipboard(newApiKey)}
              className="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 transition-colors"
            >
              Copy
            </button>
          </div>
          <button
            onClick={() => setNewApiKey(null)}
            className="mt-3 text-green-600 hover:text-green-800 text-sm"
          >
            Dismiss
          </button>
        </div>
      )}

      {showForm && (
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Create New API Key</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Key Name *
              </label>
              <input
                type="text"
                required
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., iPhone Shortcut, Production App"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">
          API Endpoints for Apple Shortcut
        </h3>
        <div className="space-y-2 text-sm text-blue-700">
          <div>
            <strong>Get Pending Messages:</strong>
            <code className="ml-2 bg-white px-2 py-1 rounded">GET /api/messages/pending</code>
          </div>
          <div>
            <strong>Get Messages by Category:</strong>
            <code className="ml-2 bg-white px-2 py-1 rounded">GET /api/messages/pending?category=Birthdays</code>
          </div>
          <div>
            <strong>Mark as Sent:</strong>
            <code className="ml-2 bg-white px-2 py-1 rounded">POST /api/messages/sent</code>
          </div>
          <div>
            <strong>Mark as Failed:</strong>
            <code className="ml-2 bg-white px-2 py-1 rounded">POST /api/messages/failed</code>
          </div>
          <p className="mt-2">
            Include your API key in the Authorization header: <code>Bearer your_api_key</code>
          </p>
          <div className="mt-3 p-3 bg-white rounded border">
            <p className="font-medium text-blue-800 mb-2">Available Categories:</p>
            <div className="flex flex-wrap gap-2">
              {["Birthdays", "Work Reminders", "Follow-ups", "Appointments", "Events", "Personal", "Marketing", "Other"].map(category => (
                <span key={category} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                  {category}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        {apiKeys.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No API keys yet. Create your first API key to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Used
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {apiKeys.map((key) => (
                  <tr key={key._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {key.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        key.isActive 
                          ? "bg-green-100 text-green-800" 
                          : "bg-red-100 text-red-800"
                      }`}>
                        {key.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {key.lastUsed 
                        ? new Date(key.lastUsed).toLocaleString()
                        : "Never"
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(key._creationTime).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleToggle(key._id, key.isActive)}
                        className={`mr-3 ${
                          key.isActive 
                            ? "text-red-600 hover:text-red-900" 
                            : "text-green-600 hover:text-green-900"
                        }`}
                      >
                        {key.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => handleDelete(key._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
