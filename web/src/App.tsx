import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { auth } from "./lib/firebase";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";

function Layout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  return (
    <div className="min-h-screen">
      <nav className="border-b border-slate-800 bg-slate-900/80 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link to="/" className="font-semibold text-sky-400 hover:text-sky-300">
            FumeGuard
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/" className="text-slate-300 hover:text-white">
              Dashboard
            </Link>
            <Link to="/login" className="text-slate-300 hover:text-white">
              {user ? "Account" : "Login"}
            </Link>
            {user && (
              <span className="text-slate-500">
                {user.isAnonymous ? "Guest" : user.email}
              </span>
            )}
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </Layout>
  );
}
