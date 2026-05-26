import { Link, Route, Routes } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <nav className="border-b border-slate-800 bg-slate-900/80 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center">
          <Link to="/" className="font-semibold text-sky-400 hover:text-sky-300">
            FumeGuard
          </Link>
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
      </Routes>
    </Layout>
  );
}
