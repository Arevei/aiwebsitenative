import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Logo } from "../components/Logo";
import { ThemeToggle } from "../components/ThemeToggle";
import { useAuth } from "../context/AuthContext";
import api, { formatError } from "../lib/api";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back");
      const workspaces = await api.get("/workspaces").then((r) => r.data || []).catch(() => []);
      const latest = workspaces[0];
      nav(latest ? `/app/w/${latest.id}` : "/welcome", { replace: true });
    } catch (err) {
      toast.error(formatError(err.response?.data?.detail) || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-10 bg-primary text-primary-foreground grain">
        <Logo className="text-lg text-primary-foreground" />
        <div>
          <h2 className="font-display text-4xl font-black leading-tight">
            Never Miss a Real Estate Lead
          </h2>
          <p className="mt-4 text-primary-foreground/80 max-w-md">
            Your CRM, Run by AI Manager
          </p>
        </div>
        <span className="text-sm text-primary-foreground/60">AI Native CRM</span>
      </div>

      <div className="flex flex-col p-6 sm:p-10">
        <div className="flex justify-between items-center">
          <Logo className="lg:hidden" />
          <div className="ml-auto"><ThemeToggle /></div>
        </div>
        <div className="flex-1 grid place-items-center">
          <form onSubmit={submit} className="w-full max-w-sm space-y-5" data-testid="login-form">
            <div>
              <h1 className="font-display text-3xl font-black">Log in</h1>
              <p className="text-muted-foreground mt-1 text-sm">Welcome back to Arevei.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" data-testid="login-email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@arevei.ai" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" data-testid="login-forgot-password-link" className="text-xs font-semibold text-primary hover:underline">Forgot password?</Link>
              </div>
              <Input id="password" type="password" data-testid="login-password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Password" />
            </div>
            <button
              type="submit"
              disabled={loading}
              data-testid="login-submit"
              className="w-full h-11 rounded-full bg-primary text-primary-foreground font-semibold hover:-translate-y-0.5 transition-transform disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Log in"}
            </button>
            <p className="text-sm text-muted-foreground text-center">
              No account?{" "}
              <Link to="/register" data-testid="to-register" className="text-primary font-medium hover:underline">Sign up</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
