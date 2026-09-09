import { useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react";

function LoginCard({ onContinueAsGuest, onSignIn, onAdminSignIn }) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const handleSignIn = (event) => {
    event.preventDefault();

    setLoginError("");
    if (email.trim().toLowerCase() === "tenant1@gmail.com" && password === "Tenant@123") {
      onSignIn?.();
      return;
    }

    if (email.trim().toLowerCase() === "admin1@gmail.com" && password === "Admin@123") {
      onAdminSignIn?.();
      return;
    }

    setLoginError("The email or password is incorrect.");
  };

  return (
    <div className="w-full max-w-[570px]">
      <div className="mb-5">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.28em] text-blue-600 sm:text-xs">
          Welcome back
        </p>

        <h2 className="text-3xl font-extrabold tracking-[-0.035em] text-slate-950 sm:text-4xl">
          Sign in to Spartment
        </h2>

        <p className="mt-2 text-sm text-slate-500 sm:text-base">
          Access your dashboard and manage your properties effortlessly.
        </p>
      </div>

      <div className="rounded-[26px] border border-slate-200/80 bg-white p-6 shadow-[0_25px_70px_rgba(15,23,42,0.08)] sm:p-7">
        <form
          className="space-y-5"
          onSubmit={handleSignIn}
        >
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-semibold text-slate-800"
            >
              Email
            </label>

            <div className="relative">
              <Mail
                size={20}
                strokeWidth={1.8}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setLoginError("");
                }}
                autoComplete="email"
                required
                placeholder="Enter your email address"
                className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-semibold text-slate-800"
            >
              Password
            </label>

            <div className="relative">
              <LockKeyhole
                size={20}
                strokeWidth={1.8}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setLoginError("");
                }}
                autoComplete="current-password"
                required
                placeholder="Enter your password"
                className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />

              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showPassword ? (
                  <EyeOff size={20} strokeWidth={1.8} />
                ) : (
                  <Eye size={20} strokeWidth={1.8} />
                )}
              </button>
            </div>
          </div>

          {loginError && (
            <p role="alert" className="-mt-2 text-sm font-medium text-red-600">
              {loginError}
            </p>
          )}

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 accent-blue-600"
              />

              Remember me
            </label>

            <button
              type="button"
              className="text-sm font-medium text-blue-600 transition hover:text-blue-700 hover:underline"
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            className="flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(37,99,235,0.22)] transition duration-200 hover:bg-blue-700 hover:shadow-[0_12px_30px_rgba(37,99,235,0.3)] active:scale-[0.99]"
          >
            Sign in

            <ArrowRight
              size={19}
              strokeWidth={1.9}
            />
          </button>
        </form>

        <div className="my-5 flex items-center gap-4">
          <div className="h-px flex-1 bg-slate-200" />

          <span className="text-xs font-medium text-slate-400">
            OR
          </span>

          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <button
          type="button"
          onClick={onContinueAsGuest}
          className="flex h-14 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 transition hover:border-blue-200 hover:bg-blue-50/50"
        >
          <UserRound
            size={19}
            strokeWidth={1.8}
            className="text-slate-500"
          />

          Continue as Guest
        </button>

        <p className="mt-5 text-center text-[11px] leading-5 text-slate-400 sm:text-xs">
          By continuing, you agree to our{" "}
          <button
            type="button"
            className="font-medium text-blue-600 hover:underline"
          >
            Terms of Service
          </button>{" "}
          and{" "}
          <button
            type="button"
            className="font-medium text-blue-600 hover:underline"
          >
            Privacy Policy
          </button>
          .
        </p>
      </div>
    </div>
  );
}

export default LoginCard;
