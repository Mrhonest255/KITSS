import React from 'react';
import { XIcon } from './icons/XIcon';

interface ApiInfoPanelProps {
    onClose: () => void;
}

const ApiInfoPanel: React.FC<ApiInfoPanelProps> = ({ onClose }) => {
    return (
        <div className="max-w-7xl mx-auto bg-indigo-900/30 border border-indigo-700 rounded-lg p-6 mb-8 relative shadow-lg">
            <button onClick={onClose} className="absolute top-4 right-4 text-indigo-300 hover:text-white">
                <XIcon className="h-6 w-6" />
            </button>
            <h3 className="text-xl font-bold text-white mb-3">Connect to Live AI</h3>
            <p className="text-indigo-200 mb-4">
                You are currently in <span className="font-bold">"Mock Mode"</span>. To generate unique content, please provide your Gemini API key.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h4 className="font-semibold text-white mb-2">For Local Development:</h4>
                    <ol className="list-decimal list-inside text-sm text-indigo-300 space-y-2">
                        <li>Create a file named <code className="bg-indigo-900/50 px-1 py-0.5 rounded">.env</code> in the project root.</li>
                        <li>Add this line to the file:
                            <pre className="bg-slate-900/50 p-2 rounded-md text-xs mt-1 overflow-x-auto">VITE_API_KEY=YOUR_API_KEY_HERE</pre>
                        </li>
                        <li className="font-bold text-yellow-300">
                           Stop and restart the development server to apply the new key.
                        </li>
                    </ol>
                </div>
                <div>
                    <h4 className="font-semibold text-white mb-2">For Vercel Deployment:</h4>
                     <ol className="list-decimal list-inside text-sm text-indigo-300 space-y-1">
                        <li>Go to your project's settings in Vercel.</li>
                        <li>Navigate to the **Environment Variables** section.</li>
                        <li>Add a new variable with the name <code className="bg-indigo-900/50 px-1 py-0.5 rounded">VITE_API_KEY</code>.</li>
                        <li>Paste your API key as the value and save.</li>
                        <li>Redeploy your project to apply the changes.</li>
                    </ol>
                </div>
            </div>
             <div className="mt-4 p-3 bg-red-900/40 border border-red-700 rounded-lg text-sm">
                <p className="font-bold text-red-300">⚠️ Security Warning</p>
                <p className="text-red-400 mt-1">
                    Never commit your <code className="bg-red-900/50 px-1 rounded">.env</code> file to version control (e.g., GitHub). The provided <code className="bg-red-900/50 px-1 rounded">.gitignore</code> file is configured to prevent this.
                </p>
            </div>
        </div>
    );
};

export default ApiInfoPanel;
