import { useState } from "react";
import { signInAnonymously, signInWithEmailAndPassword } from "firebase/auth";
import { Link } from "react-router-dom";
import { auth } from "../lib/firebase";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleAnonymous() {
    setLoading(true);
    setError(null);
    try {
      await signInAnonymously(auth);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-700/80 bg-slate-800/60 p-8">
        <h2 className="text-xl font-bold text-white">Sign in (optional)</h2>
        <p className="mt-2 text-sm text-slate-400">
          Use demo mode for local development, or email/password when configured in Firebase.
        </p>
        <form onSubmit={handleEmail} className="mt-6 space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-sky-600 py-2 font-medium text-white hover:bg-sky-500 disabled:opacity-50"
          >
            Sign in with email
          </button>
        </form>
        <button
          type="button"
          onClick={handleAnonymous}
          disabled={loading}
          className="mt-3 w-full rounded-lg border border-slate-600 py-2 text-slate-300 hover:bg-slate-700/50"
        >
          Continue as guest (demo)
        </button>
        <Link to="/" className="mt-4 block text-center text-sm text-sky-400 hover:underline">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
