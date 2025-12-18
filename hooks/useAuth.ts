import { useState, useEffect } from 'react';
import { User, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';

export const useAuth = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!auth) {
            setLoading(false);
            return;
        }
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const login = async () => {
        try {
            if (!auth) throw new Error('Firebase configuration missing. Please check your settings.');
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            setError(null);
        } catch (err: any) {
            console.error("Login failed", err);
            setError(err.message);
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
        } catch (err: any) {
            console.error("Logout failed", err);
        }
    };

    return { user, loading, error, login, logout };
};
