import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2, Gauge, Mail, Lock, User, Building2, KeyRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/Button";
import { inputBase } from "../components/forms/inputStyles";
import { cx } from "../utils/format";

function LabeledInput({ label, icon: Icon, ...props }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-700">{label}</label>
      <div className="relative mt-1">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />}
        <input className={cx(inputBase, Icon && "pl-9")} {...props} />
      </div>
    </div>
  );
}

export function AuthPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("signin");
  const [form, setForm] = useState({
    email: "admin@gmail.com",
    password: "admin123",
    confirmPassword: "",
    companyName: "Chandra Precision Engineering Pvt Ltd",
    fullName: "Super Admin",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (mode === "signin") {
      if (!form.email || !form.password) {
        setError("Please enter both email and password.");
        return;
      }
      setLoading(true);
      const res = await login(form.email, form.password);
      setLoading(false);

      if (res.success) {
        navigate("/app/dashboard");
      } else {
        setError(res.message || "Invalid credentials.");
      }
    } else if (mode === "signup") {
      if (!form.fullName || !form.companyName || !form.email || !form.password) {
        setError("Please fill in all required fields.");
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      setLoading(true);
      const res = await login(form.email, form.password);
      setLoading(false);
      navigate("/app/dashboard");
    } else if (mode === "forgot") {
      if (!form.email) {
        setError("Please enter your registered email.");
        return;
      }
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setMode("resetSent");
      }, 600);
    }
  };

  const setPreset = (email, password) => {
    setForm((f) => ({ ...f, email, password }));
  };

  return (
    <div className="min-h-screen flex bg-ink-950">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-ink-950 via-ink-900 to-ink-950">
        <div
          className="absolute inset-0"
          style={{
            opacity: 0.5,
            backgroundImage:
              "linear-gradient(to right, rgba(16,185,129,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(16,185,129,0.08) 1px, transparent 1px), linear-gradient(to right, rgba(16,185,129,0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(16,185,129,0.16) 1px, transparent 1px)",
            backgroundSize: "20px 20px, 20px 20px, 100px 100px, 100px 100px",
          }}
        />
        <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 30% 20%, rgba(16,185,129,0.12), transparent 45%)" }} />
        <div className="absolute top-6 left-6 h-3 w-3 border-t border-l border-emerald-600/40" />
        <div className="absolute top-6 right-6 h-3 w-3 border-t border-r border-emerald-600/40" />
        <div className="absolute bottom-6 left-6 h-3 w-3 border-b border-l border-emerald-600/40" />
        <div className="absolute bottom-6 right-6 h-3 w-3 border-b border-r border-emerald-600/40" />
        
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-950/40">
              <Gauge className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-lg tracking-tight">
              Chandra Precision <span className="text-emerald-400">ERP</span>
            </span>
          </div>
          <div className="max-w-md">
            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-emerald-500/80 mb-3">Enterprise Manufacturing & Financial ERP</p>
            <h1 className="text-3xl font-bold leading-tight mb-4 tracking-tight">PostgreSQL Powered End-to-End Enterprise Solution</h1>
            <p className="text-slate-400 text-sm leading-relaxed">27 fully integrated modules, 222 screens, GST calculations, multi-company tenant management, and live relational analytics.</p>
          </div>
          <div className="flex items-center gap-8 text-sm text-slate-500 font-mono">
            <div>
              <div className="text-2xl font-bold text-white tracking-tight">27</div>modules
            </div>
            <div>
              <div className="text-2xl font-bold text-white tracking-tight">222</div>screens
            </div>
            <div>
              <div className="text-2xl font-bold text-white">100%</div>PostgreSQL backed
            </div>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-900/20">
              <Gauge className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-lg text-slate-900">Chandra Precision ERP</span>
          </div>

          {mode === "resetSent" ? (
            <div className="text-center">
              <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Check your email</h2>
              <p className="text-sm text-slate-500 mb-6">We've sent password reset instructions to {form.email}.</p>
              <Button variant="secondary" className="w-full" onClick={() => setMode("signin")}>
                Back to sign in
              </Button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-slate-900 mb-1">
                {mode === "signin" ? "Sign in to ERP Workspace" : mode === "signup" ? "Create your organization" : "Reset your password"}
              </h2>
              <p className="text-sm text-slate-500 mb-5">
                {mode === "signin" ? "Access your 27 ERP modules and data." : mode === "signup" ? "Set up your workspace with PostgreSQL." : "Enter the email associated with your account."}
              </p>

              {mode === "signin" && (
                <div className="mb-4 p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-emerald-900 font-medium">
                    <KeyRound className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span>Demo: admin@gmail.com / admin123</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreset("admin@gmail.com", "admin123")}
                    className="text-[11px] font-semibold text-emerald-700 bg-white px-2 py-0.5 rounded shadow-xs hover:bg-emerald-100 transition-colors"
                  >
                    Auto-Fill
                  </button>
                </div>
              )}

              <form onSubmit={submit} className="flex flex-col gap-4">
                {mode === "signup" && (
                  <>
                    <LabeledInput label="Full Name" icon={User} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Rohan Sharma" />
                    <LabeledInput label="Company Name" icon={Building2} value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} placeholder="Chandra Precision Engineering Pvt. Ltd." />
                  </>
                )}
                <LabeledInput label="Email Address" icon={Mail} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="admin@gmail.com" />
                {mode !== "forgot" && (
                  <LabeledInput label="Password" icon={Lock} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
                )}
                {mode === "signup" && (
                  <LabeledInput label="Confirm Password" icon={Lock} type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} placeholder="••••••••" />
                )}
                {mode === "signin" && (
                  <button type="button" onClick={() => setMode("forgot")} className="text-xs text-emerald-700 hover:text-emerald-800 font-medium text-right -mt-2">
                    Forgot password?
                  </button>
                )}
                {error && <p className="text-xs text-rose-600 font-medium bg-rose-50 rounded-lg px-3 py-2">{error}</p>}
                <Button type="submit" variant="dark" className="w-full mt-1" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signin" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Reset Link"}
                </Button>
              </form>

              <p className="text-center text-sm text-slate-500 mt-6">
                {mode === "signin" ? (
                  <>
                    Need another account?{" "}
                    <button onClick={() => setMode("signup")} className="text-emerald-700 font-semibold hover:text-emerald-800">
                      Sign Up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button onClick={() => setMode("signin")} className="text-emerald-700 font-semibold hover:text-emerald-800">
                      Sign In
                    </button>
                  </>
                )}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
