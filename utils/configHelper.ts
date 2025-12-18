
export interface FirebaseConfig {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId?: string;
}

export const parseFirebaseConfig = (input: string): FirebaseConfig | null => {
    try {
        // 1. Try JSON parse first
        try {
            return JSON.parse(input);
        } catch {
            // Not JSON, continue to regex parsing
        }

        // 2. Regex parsing for JS object literal or partial text
        const keys = [
            'apiKey',
            'authDomain',
            'projectId',
            'storageBucket',
            'messagingSenderId',
            'appId'
        ];

        const config: any = {};
        let foundAny = false;

        keys.forEach(key => {
            // Match key: "value" or key: 'value'
            // Handles quotes and optional commas
            const regex = new RegExp(`${key}\\s*:\\s*["']([^"']+)["']`, 'i');
            const match = input.match(regex);
            if (match && match[1]) {
                config[key] = match[1];
                foundAny = true;
            }
        });

        if (foundAny && config.apiKey && config.projectId) {
            return config as FirebaseConfig;
        }

        return null;
    } catch (e) {
        console.error("Failed to parse config", e);
        return null;
    }
};
