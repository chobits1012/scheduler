import { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * A generic hook that syncs a specific data key (like 'jobs' or 'shifts')
 * between local state and Firestore.
 */
export const useCloudSync = <T>(
    user: User | null,
    collectionName: string, // 'jobs' or 'shifts'
    initialData: T,
    localStorageKey: string
): [T, (newData: T | ((prev: T) => T)) => void, () => Promise<boolean>, () => Promise<boolean>] => {
    const [data, setData] = useState<T>(() => {
        try {
            const saved = localStorage.getItem(localStorageKey);
            return saved ? JSON.parse(saved) : initialData;
        } catch (e) {
            console.error("Failed to load local data", e);
            return initialData;
        }
    });
    const [isSynced, setIsSynced] = useState(false);

    // Keep a ref to the latest data so we can upload it if the cloud is empty
    const dataRef = useRef<T>(data);
    useEffect(() => {
        dataRef.current = data;
    }, [data]);

    // 1. Initial Load from LocalStorage (for offline / instant load)
    useEffect(() => {
        const saved = localStorage.getItem(localStorageKey);
        if (saved) {
            try {
                setData(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse local data", e);
            }
        }
    }, [localStorageKey]);

    // 2. Manual Sync Functions (No detailed auto-sync listener to prevent data loss)

    const uploadData = async () => {
        if (!user) return;
        try {
            const docRef = doc(db, 'users', user.uid, 'data', collectionName);
            await setDoc(docRef, { value: data, updatedAt: new Date() });
            setIsSynced(true);
            return true;
        } catch (err) {
            console.error(`Failed to upload ${collectionName}:`, err);
            return false;
        }
    };

    const downloadData = async () => {
        if (!user) return;
        try {
            const docRef = doc(db, 'users', user.uid, 'data', collectionName);
            const snapshot = await getDoc(docRef);
            if (snapshot.exists()) {
                const cloudData = snapshot.data().value as T;
                setData(cloudData);
                localStorage.setItem(localStorageKey, JSON.stringify(cloudData));
                setIsSynced(true);
                return true;
            }
            return false;
        } catch (err) {
            console.error(`Failed to download ${collectionName}:`, err);
            return false;
        }
    };

    // 3. Setter to update local state only
    const updateData = (newData: T | ((prev: T) => T)) => {
        setData((prev) => {
            // Handle functional update correctly
            const resolvedValue = newData instanceof Function ? (newData as (prev: T) => T)(prev) : newData;

            // Save resolved value to local storage
            try {
                localStorage.setItem(localStorageKey, JSON.stringify(resolvedValue));
            } catch (e) {
                console.error("Failed to save to localStorage", e);
            }

            return resolvedValue;
        });
        setIsSynced(false); // Mark as out of sync on local change
    };

    return [data, updateData, uploadData, downloadData];
};
