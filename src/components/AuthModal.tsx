import React, { useState } from "react";
import {
  auth,
  db,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  googleProvider,
  updateProfile
} from "../firebase";
import { X, Mail, Lock, User, LogIn, UserPlus, AlertCircle, ShieldCheck } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignInMock?: () => void;
}

export default function AuthModal({ isOpen, onClose, onSignInMock }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleDemoSignIn = () => {
    if (onSignInMock) {
      onSignInMock();
    }
    onClose();
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        if (!displayName.trim()) {
          throw new Error("Full name is required.");
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, {
          displayName: displayName.trim()
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onClose();
    } catch (err: any) {
      console.error("Auth error:", err);
      let errMsg = "An error occurred during authentication.";
      if (err.code === "auth/email-already-in-use") {
        errMsg = "This email is already registered.";
      } else if (err.code === "auth/invalid-credential") {
        errMsg = "Invalid email or password.";
      } else if (err.code === "auth/weak-password") {
        errMsg = "Password should be at least 6 characters.";
      } else if (err.code === "auth/operation-not-allowed") {
        errMsg = "⚠️ Authentication provider is not enabled. Please go to your Firebase Console (Build > Authentication > Sign-in method) and enable the 'Email/Password' provider.";
      } else if (err.message) {
        errMsg = err.message;
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      onClose();
    } catch (err: any) {
      if (err.code === "auth/popup-closed-by-user") {
        console.warn("Google sign in cancelled by user.");
        setError("Sign-in cancelled: The Google popup was closed before completion.");
      } else {
        console.error("Google sign in error:", err);
        if (err.code === "auth/operation-not-allowed") {
          setError("⚠️ Google Sign-In is not enabled. Please go to your Firebase Console (Build > Authentication > Sign-in method) and enable the 'Google' provider.");
        } else {
          setError(err.message || "Google sign-in failed.");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-natural-charcoal/60 backdrop-blur-xs" id="auth-modal-overlay">
      <div className="relative w-full max-w-md bg-white rounded-[32px] border border-natural-border shadow-xl p-6 overflow-hidden md:p-8" id="auth-modal-content">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-serif italic font-semibold text-natural-charcoal">
              {isSignUp ? "Join Janālok" : "Access Citizen Portal"}
            </h3>
            <p className="text-xs text-natural-forest font-medium mt-1">
              {isSignUp ? "Create your verified citizen account" : "Sign in to manage complaints and view policy updates"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-natural-charcoal/60 hover:bg-natural-bone hover:text-natural-charcoal transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-start space-x-2.5 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          {isSignUp && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-natural-forest px-1">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-natural-forest/60">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="Dhananjay Narula"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-natural-cream/20 border border-natural-border rounded-2xl text-xs font-medium focus:outline-hidden focus:border-natural-forest focus:ring-1 focus:ring-natural-forest"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-natural-forest px-1">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-natural-forest/60">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                placeholder="citizen@janalok.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-natural-cream/20 border border-natural-border rounded-2xl text-xs font-medium focus:outline-hidden focus:border-natural-forest focus:ring-1 focus:ring-natural-forest"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-natural-forest px-1">
              Password
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-natural-forest/60">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-natural-cream/20 border border-natural-border rounded-2xl text-xs font-medium focus:outline-hidden focus:border-natural-forest focus:ring-1 focus:ring-natural-forest"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-natural-forest text-natural-cream rounded-2xl text-xs font-bold shadow-xs hover:bg-[#4A5741] transition-colors cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {isSignUp ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Account</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        {/* Test/Demo Account Access */}
        <div className="mt-4 p-4 bg-amber-50/70 border border-amber-200/60 rounded-2xl flex flex-col space-y-2">
          <div className="flex items-center space-x-2 text-amber-800">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-bold">Judges & Demo Access</span>
          </div>
          <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
            Click below to instantly sign in as the chief architect **Dhananjay Narula (Demo User)**. Runs fully offline bypassing cloud constraints.
          </p>
          <button
            type="button"
            onClick={handleDemoSignIn}
            disabled={loading}
            className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer"
          >
            <User className="w-3.5 h-3.5" />
            <span>Sign In as Dhananjay Narula</span>
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center my-5">
          <div className="flex-1 h-px bg-natural-border" />
          <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-natural-forest/50">Or continue with</span>
          <div className="flex-1 h-px bg-natural-border" />
        </div>

        {/* Google Sign-In */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-3 bg-white border border-natural-border text-natural-charcoal rounded-2xl text-xs font-bold hover:bg-natural-bone transition-colors cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span>Google Sign-In</span>
        </button>

        {/* Toggle Sign-In/Sign-Up */}
        <div className="mt-6 text-center text-xs">
          <span className="text-natural-charcoal/70 font-medium">
            {isSignUp ? "Already have an account?" : "New to Janālok?"}
          </span>{" "}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-natural-forest font-bold hover:underline cursor-pointer focus:outline-none"
          >
            {isSignUp ? "Sign In instead" : "Create one now"}
          </button>
        </div>

      </div>
    </div>
  );
}
