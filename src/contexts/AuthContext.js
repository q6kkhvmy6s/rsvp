import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user) {
                // Fetch user profile (role, etc.)
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    setUserProfile(userDoc.data());
                } else {
                    // Profile might not exist if just created via Google but not yet saved in component
                    // We'll handle creation in the login function, but this is a fallback check
                    setUserProfile(null);
                }
            } else {
                setUserProfile(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const login = (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    const loginWithGoogle = async (role = 'promoter') => {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Check if user profile exists
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            // Create new profile if it doesn't exist
            await setDoc(userDocRef, {
                uid: user.uid,
                email: user.email,
                username: user.displayName || user.email.split('@')[0],
                role: role,
                events: []
            });
            // Fetch it to update state immediately
            const newUserDoc = await getDoc(userDocRef);
            setUserProfile(newUserDoc.data());
        } else {
            setUserProfile(userDoc.data());
        }

        return result;
    };

    const signup = async (email, password, username, role = 'promoter') => {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const user = result.user;

        // Create user profile in Firestore
        await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email,
            username: username,
            role: role,
            events: [] // List of event IDs this user is attached to
        });

        // Force fetch profile immediately
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        setUserProfile(userDoc.data());

        return result;
    };

    const logout = () => {
        return signOut(auth);
    };

    const value = {
        currentUser,
        userProfile,
        login,
        loginWithGoogle,
        signup,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
