import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAYW1E2yhAwRnYE2r7HcKGGcc3DFPs4cPg",
  authDomain: "freelace-market.firebaseapp.com",
  projectId: "freelace-market",
  storageBucket: "freelace-market.appspot.com",
  messagingSenderId: "216559615054",
  appId: "1:216559615054:web:e0ee15b4521359fc26571f",
  measurementId: "G-SPKTPNM568"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    throw error;
  }
};
