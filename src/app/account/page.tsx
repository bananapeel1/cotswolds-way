"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";

export default function AccountPage() {
  const { user, loading, signIn, signUp, signInWithGoogle, signOut } = useAuth();

  if (loading) {
    return (
      <>
        <Navbar />
        <section className="bg-primary py-20 px-8">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="font-headline text-5xl md:text-6xl font-bold text-white tracking-tight mb-4">
              Your Account
            </h1>
          </div>
        </section>
        <section className="py-20 px-8 bg-surface flex-grow">
          <div className="max-w-5xl mx-auto flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-secondary animate-spin">
              progress_activity
            </span>
          </div>
        </section>
        <Footer />
      </>
    );
  }

  if (user) {
    return (
      <>
        <Navbar />
        <section className="bg-primary py-20 px-8">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="font-headline text-5xl md:text-6xl font-bold text-white tracking-tight mb-4">
              Your Account
            </h1>
            <p className="font-body text-lg text-primary-fixed max-w-2xl mx-auto leading-relaxed">
              Welcome back, {user.user_metadata?.full_name || user.email}
            </p>
          </div>
        </section>
        <SignedInView />
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <section className="bg-primary py-20 px-8">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="font-headline text-5xl md:text-6xl font-bold text-white tracking-tight mb-4">
            Your Account
          </h1>
          <p className="font-body text-lg text-primary-fixed max-w-2xl mx-auto leading-relaxed">
            Sign in to manage your bookings, save itineraries, and get personalised trail recommendations.
          </p>
        </div>
      </section>
      <AuthForms
        signIn={signIn}
        signUp={signUp}
        signInWithGoogle={signInWithGoogle}
      />
      <Footer />
    </>
  );
}

/* ── Signed-In View ── */
function SignedInView() {
  const { user, signOut } = useAuth();

  return (
    <section className="py-20 px-8 bg-surface flex-grow">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Profile Card */}
        <div className="bg-surface-container-low rounded-xl p-8 shadow-[0_4px_24px_rgba(28,28,25,0.05)]">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-headline font-bold">
              {(user?.user_metadata?.full_name || user?.email || "?")[0].toUpperCase()}
            </div>
            <div>
              <h2 className="font-headline text-2xl font-bold text-primary">
                {user?.user_metadata?.full_name || "Walker"}
              </h2>
              <p className="font-body text-sm text-secondary">{user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-surface rounded-lg p-4">
              <p className="font-label text-xs uppercase tracking-widest text-secondary mb-1">
                Member Since
              </p>
              <p className="font-body text-sm text-primary font-semibold">
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString("en-GB", {
                      year: "numeric",
                      month: "long",
                    })
                  : "N/A"}
              </p>
            </div>
            <div className="bg-surface rounded-lg p-4">
              <p className="font-label text-xs uppercase tracking-widest text-secondary mb-1">
                Auth Provider
              </p>
              <p className="font-body text-sm text-primary font-semibold capitalize">
                {user?.app_metadata?.provider || "Email"}
              </p>
            </div>
          </div>

          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 text-tertiary font-label text-xs font-bold uppercase tracking-widest hover:text-tertiary-container transition-colors"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            Sign Out
          </button>
        </div>

        {/* Saved Itineraries Placeholder */}
        <div className="bg-surface-container-low rounded-xl p-8 shadow-[0_4px_24px_rgba(28,28,25,0.05)]">
          <h3 className="font-headline text-xl font-bold text-primary mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary">bookmark</span>
            Saved Itineraries
          </h3>
          <div className="bg-surface rounded-lg p-8 text-center">
            <span className="material-symbols-outlined text-4xl text-secondary/30 mb-3 block">
              route
            </span>
            <p className="font-body text-sm text-secondary mb-4">
              You haven&apos;t saved any itineraries yet. Plan your Cotswold Way walk and save it here.
            </p>
            <a
              href="/itinerary"
              className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-label text-xs font-bold uppercase tracking-widest hover:bg-primary-container transition-all"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Create Itinerary
            </a>
          </div>
        </div>

        {/* Upcoming Bookings Placeholder */}
        <div className="bg-surface-container-low rounded-xl p-8 shadow-[0_4px_24px_rgba(28,28,25,0.05)]">
          <h3 className="font-headline text-xl font-bold text-primary mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary">calendar_month</span>
            Your Bookings
          </h3>
          <div className="bg-surface rounded-lg p-8 text-center">
            <span className="material-symbols-outlined text-4xl text-secondary/30 mb-3 block">
              hotel
            </span>
            <p className="font-body text-sm text-secondary mb-4">
              No upcoming bookings. Browse trail-side accommodation to get started.
            </p>
            <a
              href="/search"
              className="inline-flex items-center gap-2 bg-tertiary text-on-tertiary px-5 py-2.5 rounded-lg font-label text-xs font-bold uppercase tracking-widest hover:bg-tertiary-container transition-all"
            >
              <span className="material-symbols-outlined text-sm">search</span>
              Find Accommodation
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Auth Forms (Sign In + Create Account) ── */
function AuthForms({
  signIn,
  signUp,
  signInWithGoogle,
}: {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
}) {
  return (
    <section className="py-20 px-8 bg-surface flex-grow">
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
        <SignInForm signIn={signIn} signInWithGoogle={signInWithGoogle} />
        <SignUpForm signUp={signUp} />
      </div>
    </section>
  );
}

/* ── Sign In Form ── */
function SignInForm({
  signIn,
  signInWithGoogle,
}: {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await signIn(email, password);
    if (result.error) {
      setError(result.error);
    }
    setSubmitting(false);
  };

  const handleGoogle = async () => {
    setError(null);
    const result = await signInWithGoogle();
    if (result.error) {
      setError(result.error);
    }
  };

  return (
    <div className="bg-surface-container-low rounded-xl p-8 shadow-[0_4px_24px_rgba(28,28,25,0.05)]">
      <h2 className="font-headline text-2xl font-bold text-primary mb-6">Sign In</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-error-container text-on-error-container px-4 py-3 rounded-lg font-body text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">error</span>
            {error}
          </div>
        )}
        <div>
          <label className="font-label text-xs uppercase tracking-widest text-secondary mb-1.5 block">
            Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full bg-surface border border-outline-variant/30 rounded-lg px-4 py-3 font-body text-sm text-primary placeholder:text-secondary/50 focus:outline-none focus:ring-2 focus:ring-tertiary/30"
          />
        </div>
        <div>
          <label className="font-label text-xs uppercase tracking-widest text-secondary mb-1.5 block">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="w-full bg-surface border border-outline-variant/30 rounded-lg px-4 py-3 font-body text-sm text-primary placeholder:text-secondary/50 focus:outline-none focus:ring-2 focus:ring-tertiary/30"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-tertiary text-on-tertiary px-6 py-3 rounded-lg font-label text-sm font-bold uppercase tracking-widest hover:bg-tertiary-container transition-all disabled:opacity-50"
        >
          {submitting ? "Signing In..." : "Sign In"}
        </button>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-outline-variant/30" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-surface-container-low px-4 font-body text-secondary text-xs">
              or continue with
            </span>
          </div>
        </div>

        {/* Google Sign In */}
        <button
          type="button"
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-2 bg-surface border border-outline-variant/30 rounded-lg px-4 py-3 font-label text-sm font-semibold text-primary hover:bg-surface-container-high transition-all"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Sign in with Google
        </button>
      </form>
    </div>
  );
}

/* ── Sign Up Form ── */
function SignUpForm({
  signUp,
}: {
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    const fullName = `${firstName} ${lastName}`.trim();
    const result = await signUp(email, password, fullName);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
    setSubmitting(false);
  };

  return (
    <div className="bg-surface-container-low rounded-xl p-8 shadow-[0_4px_24px_rgba(28,28,25,0.05)]">
      <h2 className="font-headline text-2xl font-bold text-primary mb-6">Create Account</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-error-container text-on-error-container px-4 py-3 rounded-lg font-body text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">error</span>
            {error}
          </div>
        )}
        {success && (
          <div className="bg-primary/10 text-primary px-4 py-3 rounded-lg font-body text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">check_circle</span>
            Account created! Check your email for a confirmation link.
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-label text-xs uppercase tracking-widest text-secondary mb-1.5 block">
              First Name
            </label>
            <input
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Jane"
              className="w-full bg-surface border border-outline-variant/30 rounded-lg px-4 py-3 font-body text-sm text-primary placeholder:text-secondary/50 focus:outline-none focus:ring-2 focus:ring-tertiary/30"
            />
          </div>
          <div>
            <label className="font-label text-xs uppercase tracking-widest text-secondary mb-1.5 block">
              Last Name
            </label>
            <input
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Walker"
              className="w-full bg-surface border border-outline-variant/30 rounded-lg px-4 py-3 font-body text-sm text-primary placeholder:text-secondary/50 focus:outline-none focus:ring-2 focus:ring-tertiary/30"
            />
          </div>
        </div>
        <div>
          <label className="font-label text-xs uppercase tracking-widest text-secondary mb-1.5 block">
            Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full bg-surface border border-outline-variant/30 rounded-lg px-4 py-3 font-body text-sm text-primary placeholder:text-secondary/50 focus:outline-none focus:ring-2 focus:ring-tertiary/30"
          />
        </div>
        <div>
          <label className="font-label text-xs uppercase tracking-widest text-secondary mb-1.5 block">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password"
            className="w-full bg-surface border border-outline-variant/30 rounded-lg px-4 py-3 font-body text-sm text-primary placeholder:text-secondary/50 focus:outline-none focus:ring-2 focus:ring-tertiary/30"
          />
          <p className="font-body text-secondary/60 text-xs mt-1">Minimum 8 characters</p>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary text-white px-6 py-3 rounded-lg font-label text-sm font-bold uppercase tracking-widest hover:bg-primary-container transition-all disabled:opacity-50"
        >
          {submitting ? "Creating Account..." : "Create Account"}
        </button>
      </form>

      {/* Benefits */}
      <div className="mt-8 pt-6 border-t border-outline-variant/30">
        <h3 className="font-headline text-lg font-semibold text-primary mb-4">
          Benefits of an Account
        </h3>
        <ul className="space-y-3">
          {[
            { icon: "bookmark", text: "Save itineraries and favourite properties" },
            { icon: "calendar_month", text: "Manage all your bookings in one place" },
            { icon: "notifications", text: "Get alerts for trail updates and deals" },
            { icon: "rate_review", text: "Leave reviews after your walk" },
          ].map((benefit) => (
            <li
              key={benefit.text}
              className="flex items-center gap-3 font-body text-secondary text-sm"
            >
              <span className="material-symbols-outlined text-lg text-tertiary">
                {benefit.icon}
              </span>
              {benefit.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
