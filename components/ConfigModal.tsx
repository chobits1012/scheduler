
import React, { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { parseFirebaseConfig } from '../utils/configHelper';
import { saveFirebaseConfig } from '../services/firebase';

interface ConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose }) => {
    const [input, setInput] = useState('');
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSave = () => {
        setError(null);
        const config = parseFirebaseConfig(input);

        if (config) {
            saveFirebaseConfig(config);
            onClose();
        } else {
            setError('無法解析設定。請確保您貼上了完整的 firebaseConfig 物件，包含 apiKey 和 projectId。');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />

            <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-4 flex justify-between items-center bg-stone-50 border-b border-stone-100">
                    <h2 className="text-xl font-bold text-stone-800">連結 Firebase</h2>
                    <button onClick={onClose} className="bg-white hover:bg-stone-100 p-2 rounded-full transition text-stone-500 shadow-sm border border-stone-200">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto">
                    <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-700 leading-relaxed">
                        為了同步您的資料，我們需要連接到您的 Firebase 資料庫。
                        <br /><br />
                        請將 Firebase Console 中的
                        <code className="mx-1 bg-blue-100 px-1 py-0.5 rounded font-mono text-xs">const firebaseConfig = ...</code>
                        整段程式碼貼在下方：
                    </div>

                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={`const firebaseConfig = {\n  apiKey: "...",\n  authDomain: "...",\n  ...\n};`}
                        className="w-full h-48 bg-stone-50 rounded-xl p-4 text-xs font-mono text-stone-600 focus:ring-2 focus:ring-stone-200 outline-none border border-stone-200 resize-none"
                    />

                    {error && (
                        <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-lg">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleSave}
                        disabled={!input.trim()}
                        className="w-full bg-[#5D432C] text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-[#4A3423] active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                    >
                        <Save size={18} /> 儲存並連線
                    </button>

                    <p className="text-xs text-center text-stone-400">
                        設定將會安全地儲存在您的瀏覽器中 (LocalStorage)
                    </p>
                </div>
            </div>
        </div>
    );
};
