import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function SetupTab() {
  const user = useQuery(api.auth.loggedInUser);
  const apiKeys = useQuery(api.apiKeys.list) || [];
  const createApiKey = useMutation(api.apiKeys.create);
  const [currentStep, setCurrentStep] = useState(1);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isCreatingApiKey, setIsCreatingApiKey] = useState(false);

  const handleCreateApiKey = async () => {
    setIsCreatingApiKey(true);
    try {
      const result = await createApiKey({ name: "iPhone Shortcut Setup" });
      setApiKey(result.apiKey);
      setCurrentStep(3);
      toast.success("API key created successfully!");
    } catch (error) {
      toast.error("Failed to create API key");
    } finally {
      setIsCreatingApiKey(false);
    }
  };

  // Primary mobile CTA by step
  const getMobilePrimaryCta = () => {
    if (currentStep === 1) {
      return { label: "Download Shortcut & Continue", onClick: downloadShortcut, disabled: false } as const;
    }
    if (currentStep === 2) {
      return { label: isCreatingApiKey ? "Creating..." : "Create API Key", onClick: handleCreateApiKey, disabled: isCreatingApiKey } as const;
    }
    if (currentStep === 3 && apiKey) {
      return { label: "Continue to Test", onClick: () => setCurrentStep(4), disabled: false } as const;
    }
    return null;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("API key copied to clipboard!");
  };

  const downloadShortcut = () => {
    // Download the shortcut file from the public directory
    // Update this path if you rename the file in /public.
    // The actual downloaded filename will match the file's name in /public.
    const shortcutUrl = "/MBS Messaging Shortcut.shortcut";
    const link = document.createElement('a');
    // Encode in case the file name contains spaces or special characters
    link.href = encodeURI(shortcutUrl);
    // Use the default filename from the URL by setting an empty download attribute
    link.setAttribute('download', '');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setCurrentStep(2);
    toast.success("Shortcut downloaded! Open it on your iPhone to install.");
  };

  const steps = [
    {
      number: 1,
      title: "Download Apple Shortcut",
      description: "Download the Message Scheduler shortcut to your iPhone",
      completed: currentStep > 1,
    },
    {
      number: 2,
      title: "Create API Key",
      description: "Generate an API key for your shortcut to connect securely",
      completed: currentStep > 2,
    },
    {
      number: 3,
      title: "Configure Shortcut",
      description: "Add your API key to the shortcut settings",
      completed: currentStep > 3,
    },
    {
      number: 4,
      title: "Run Test",
      description: "Test the connection to activate your account",
      completed: false,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Welcome to Message Scheduler! 📱
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          To get started, you'll need to set up the Apple Shortcut on your iPhone. 
          This allows you to send messages directly from your phone using your scheduled content.
        </p>
      </div>

      {/* Progress Steps - mobile first (vertical), desktop horizontal */}
      <div className="mb-6">
        {/* Mobile (vertical) */}
        <ol className="md:hidden space-y-4">
          {steps.map((step) => (
            <li key={step.number} className="flex items-start">
              <div
                className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step.completed
                    ? "bg-green-500 text-white"
                    : currentStep === step.number
                    ? "bg-blue-500 text-white"
                    : "bg-gray-300 text-gray-600"
                }`}
              >
                {step.completed ? "✓" : step.number}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">{step.title}</p>
                <p className="text-xs text-gray-500">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>

        {/* Desktop (horizontal) */}
        <div className="hidden md:flex items-center mb-2">
          {steps.map((step, index) => (
            <div key={step.number} className="flex-1 flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step.completed
                    ? "bg-green-500 text-white"
                    : currentStep === step.number
                    ? "bg-blue-500 text-white"
                    : "bg-gray-300 text-gray-600"
                }`}
              >
                {step.completed ? "✓" : step.number}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">{step.title}</p>
                <p className="text-xs text-gray-500">{step.description}</p>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-4 ${step.completed ? "bg-green-500" : "bg-gray-300"}`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-sm border p-6 sm:p-8">
        {currentStep === 1 && (
          <div className="text-center space-y-6">
            <div className="text-5xl sm:text-6xl mb-4">📱</div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Download Apple Shortcut</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Download the Message Scheduler shortcut to your iPhone. This shortcut will allow you 
              to send your scheduled messages directly from your phone.
            </p>
            <button
              onClick={downloadShortcut}
              className="hidden md:inline-flex items-center justify-center bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold min-h-[44px]"
            >
              Download Shortcut File
            </button>
            <p className="text-sm text-gray-500">
              After downloading, open the file on your iPhone to install the shortcut
            </p>
          </div>
        )}

        {currentStep === 2 && (
          <div className="text-center space-y-6">
            <div className="text-5xl sm:text-6xl mb-4">🔑</div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Create Your API Key</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              You'll need an API key to securely connect your shortcut to your account. 
              Click the button below to generate your personal API key.
            </p>
            
            {apiKeys.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-blue-800 font-medium">
                  You already have {apiKeys.length} API key(s) created
                </p>
                <p className="text-blue-600 text-sm mt-1">
                  You can create a new one for this setup or use an existing one
                </p>
              </div>
            )}

            <button
              onClick={handleCreateApiKey}
              disabled={isCreatingApiKey}
              className="hidden md:inline-flex items-center justify-center bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 min-h-[44px]"
            >
              {isCreatingApiKey ? "Creating..." : "Create API Key"}
            </button>
          </div>
        )}

        {currentStep === 3 && apiKey && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-5xl sm:text-6xl mb-4">⚙️</div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Configure Your Shortcut</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Copy your API key below and paste it into your iPhone shortcut when prompted.
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-800 mb-3">
                Your API Key is Ready!
              </h3>
              <p className="text-green-700 mb-4">
                Copy this API key and paste it into your Apple Shortcut:
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4">
                <code className="bg-white px-3 py-2 rounded border flex-1 font-mono text-sm break-all">
                  {apiKey}
                </code>
                <button
                  onClick={() => copyToClipboard(apiKey)}
                  className="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 transition-colors whitespace-nowrap w-full sm:w-auto min-h-[44px]"
                >
                  Copy
                </button>
              </div>
              
              <div className="space-y-3 text-sm text-green-800">
                <p><strong>Instructions:</strong></p>
                <ol className="list-decimal list-inside space-y-1 ml-4">
                  <li>Open the Message Scheduler shortcut on your iPhone</li>
                  <li>When prompted for an API key, paste the key above</li>
                  <li>Save the shortcut configuration</li>
                  <li>Return here and click "Continue to Test" below</li>
                </ol>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={() => setCurrentStep(4)}
                className="hidden md:inline-flex items-center justify-center bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold min-h-[44px]"
              >
                Continue to Test
              </button>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="text-center space-y-6">
            <div className="text-5xl sm:text-6xl mb-4">🧪</div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Test Your Connection</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Now run the Message Scheduler shortcut on your iPhone to test the connection. 
              This will verify that everything is working and activate your account.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">
                Test Instructions:
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-left text-blue-700">
                <li>Open the Shortcuts app on your iPhone</li>
                <li>Find the "Message Scheduler" shortcut</li>
                <li>Tap to run the shortcut</li>
                <li>The shortcut should successfully connect and show a confirmation</li>
                <li>Return to this page - it should automatically refresh and show you're verified</li>
              </ol>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">
                <strong>Waiting for verification...</strong> Run the shortcut on your iPhone to complete setup.
              </p>
            </div>

            <p className="text-sm text-gray-500">
              Having trouble? Make sure you're connected to the internet and that you pasted the API key correctly.
            </p>
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Need Help?</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <h4 className="font-medium text-gray-900">Can't install the shortcut?</h4>
            <p>Make sure you're opening the .shortcut file on your iPhone, not on a computer.</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">API key not working?</h4>
            <p>Double-check that you copied the entire key without any extra spaces.</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Shortcut not connecting?</h4>
            <p>Verify your iPhone has an internet connection and try running the shortcut again.</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Still having issues?</h4>
            <p>Contact support with your user email: {user?.email}</p>
          </div>
        </div>
      </div>
      {/* Sticky mobile CTA footer */}
      <MobileStickyCtas 
        currentStep={currentStep} 
        canGoBack={currentStep > 1 && !apiKey} 
        onBack={() => setCurrentStep((s) => Math.max(1, s - 1))} 
        primary={getMobilePrimaryCta()} 
      />
    </div>
  );
}

// Mobile-only sticky CTA bar
function MobileStickyCtas({
  currentStep,
  canGoBack,
  onBack,
  primary,
}: {
  currentStep: number;
  canGoBack: boolean;
  onBack: () => void;
  primary: { label: string; onClick: () => void; disabled?: boolean } | null;
}) {
  // Hide on desktop and on step 4 (waiting for verification)
  if (!primary && !(canGoBack && currentStep === 2)) {
    // nothing actionable to show
    return null;
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-20 md:hidden bg-white border-t shadow-[0_-2px_8px_rgba(0,0,0,0.05)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="max-w-4xl mx-auto p-4 flex items-center gap-3">
        {canGoBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex-1 border border-gray-300 text-gray-700 rounded-lg px-4 py-3 min-h-[44px] font-medium"
          >
            Back
          </button>
        )}
        {primary && (
          <button
            type="button"
            onClick={primary.onClick}
            disabled={primary.disabled}
            className="flex-[2] bg-blue-600 disabled:opacity-60 text-white rounded-lg px-4 py-3 min-h-[44px] font-semibold"
          >
            {primary.label}
          </button>
        )}
      </div>
    </div>
  );
}
