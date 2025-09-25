import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Button } from "../components/ui/button";

export function SetupTab() {
  const apiKeys = useQuery(api.apiKeys.list) || [];
  const createApiKey = useMutation(api.apiKeys.create);
  const rotateKey = useMutation(api.apiKeys.rotate);
  const [currentStep, setCurrentStep] = useState(1);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isCreatingApiKey, setIsCreatingApiKey] = useState(false);

  const handleCreateApiKey = async () => {
    setIsCreatingApiKey(true);
    try {
      if (apiKeys.length > 0) {
        // Rotate the most relevant key (prefer an active one)
        const existing = (apiKeys as any[]).find((k: any) => k.isActive) || apiKeys[0];
        const res = await rotateKey({ fromKeyId: (existing as any)._id, name: `Rotated from ${(existing as any).name || "existing"} (Setup)` });
        setApiKey(res.apiKey);
        setCurrentStep(4);
        toast.success("Secret password replaced! Update your Shortcut with the new one.");
      } else {
        const result = await createApiKey({ name: "iPhone Shortcut Setup" });
        setApiKey(result.apiKey);
        setCurrentStep(4);
        toast.success("Secret password created!");
      }
    } catch (error) {
      toast.error("Failed to create or rotate secret password");
    } finally {
      setIsCreatingApiKey(false);
    }
  };

  // Primary mobile CTA by step
  const getMobilePrimaryCta = () => {
    if (currentStep === 1) {
      return { label: "Get Started", onClick: () => setCurrentStep(2), disabled: false } as const;
    }
    if (currentStep === 2) {
      return { label: "Download & Continue", onClick: downloadShortcut, disabled: false } as const;
    }
    if (currentStep === 3) {
      return { label: isCreatingApiKey ? "Creating..." : "Create", onClick: handleCreateApiKey, disabled: isCreatingApiKey } as const;
    }
    if (currentStep === 4 && apiKey) {
      return { label: "Continue to Test", onClick: () => setCurrentStep(5), disabled: false } as const;
    }
    return null;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Secret password copied to clipboard!");
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
    setCurrentStep(3);
    toast.success("Shortcut downloaded! Open it on your iPhone to install.");
  };


  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {currentStep === 1 && (
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome to Message Scheduler! 📱
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            To get started, you'll need to set up the Apple Shortcut on your iPhone. 
            This allows you to send messages directly from your phone using your scheduled content.
          </p>
        </div>
      )}


      {/* Step Content */}
      {currentStep === 1 ? (
        <div className="text-center">
          <Button onClick={() => setCurrentStep(2)} className="hidden md:inline-flex px-8 h-11">
            Get Started
          </Button>
        </div>
      ) : (
      <div className="bg-white rounded-lg shadow-sm border p-6 sm:p-8">

        {currentStep === 2 && (
          <div className="text-center space-y-6">
            <div className="text-5xl sm:text-6xl mb-4">📱</div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Download Apple Shortcut</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Tap Download to install the shortcut on your iPhone.
            </p>
            <Button onClick={downloadShortcut} className="hidden md:inline-flex px-8 min-h-[44px]">
              Download
            </Button>
          </div>
        )}

        {currentStep === 3 && (
          <div className="text-center space-y-6">
            <div className="text-5xl sm:text-6xl mb-4">🔑</div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Create Your Secret Password</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              You'll use a secret password so the shortcut can connect to your account securely.
              Tap the button below to create yours.
            </p>
            
            {apiKeys.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-blue-800 font-medium">
                  You already have {apiKeys.length} secret password(s).
                </p>
                <p className="text-blue-600 text-sm mt-1">
                  We'll safely replace your old one with a new secret password.
                </p>
              </div>
            )}

            <Button onClick={handleCreateApiKey} disabled={isCreatingApiKey} className="hidden md:inline-flex px-8 min-h-[44px]">
              {isCreatingApiKey ? "Creating..." : "Create"}
            </Button>
          </div>
        )}

        {currentStep === 4 && apiKey && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                Your secret password is ready!
              </h2>
              <p className="text-gray-700">
                Copy this secret password and paste it into your Apple Shortcut:
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-2">
                <code className="bg-gray-50 px-3 py-2 rounded border flex-1 font-mono text-sm break-all">
                  {apiKey}
                </code>
                <Button variant="secondary" onClick={() => copyToClipboard(apiKey)} className="w-full sm:w-auto">
                  Copy
                </Button>
              </div>
              
              <div className="space-y-2 text-sm text-gray-700">
                <p className="font-medium">Instructions:</p>
                <ol className="list-decimal list-inside space-y-1 ml-4">
                  <li>Copy this secret above.</li>
                  <li>Go back to the Message Scheduler shortcut on your iPhone</li>
                  <li>When prompted for your secret password, paste the value above</li>
                  <li>Click "Add Shortcut"</li>
                  <li>Return here and click "Continue to Test" below</li>
                </ol>
              </div>
            </div>

            <div className="text-center">
              <Button onClick={() => setCurrentStep(5)} className="hidden md:inline-flex px-8 min-h-[44px]">
                Continue to Test
              </Button>
            </div>
          </div>
        )}

        {currentStep === 5 && (
          <div className="text-center space-y-6">
            <div className="text-5xl sm:text-6xl mb-4">🧪</div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Test Your Connection</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Now run the Message Scheduler shortcut on your iPhone to test the connection. 
              This will verify that everything is working and activate your account.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">
                Last Step, Connection Instructions:
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-left text-blue-700">
                <li>Open the Shortcuts app on your iPhone</li>
                <li>Find the "Message Scheduler" shortcut (If it didn't open up automatically)</li>
                <li>Tap the play button to run the shortcut</li>
                <li>Return to this page - it should automatically refresh and show you're verified</li>
              </ol>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">
                <strong>Waiting for verification...</strong> Run the shortcut on your iPhone to complete setup.
              </p>
            </div>

            <p className="text-sm text-gray-500">
              Having trouble? Make sure you're connected to the internet and that you pasted your secret password correctly.
            </p>
          </div>
        )}
      </div>
      )}

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
            className="flex-1 border border-gray-300 text-gray-700 rounded-lg px-4 h-11 font-medium"
          >
            Back
          </button>
        )}
        {primary && (
          <Button
            onClick={primary.onClick}
            disabled={primary.disabled}
            className="flex-[2] h-11 px-5 whitespace-nowrap"
          >
            {primary.label}
          </Button>
        )}
      </div>
    </div>
  );
}
