import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { requestLoginOtp, verifyLoginOtp } from "../api/userApi";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

const OTP_LENGTH = 6;
const OTP_EXPIRY_SECONDS = Number(import.meta.env.VITE_OTP_EXPIRY_SECONDS) || 300; // Configurable via .env
const RESEND_COOLDOWN_SECONDS = Number(import.meta.env.VITE_OTP_RESEND_COOLDOWN_SECONDS) || 60; // Configurable via .env

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  // Step 1: 'email' | Step 2: 'otp'
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(new Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);

  // Timers
  const [expirySeconds, setExpirySeconds] = useState(OTP_EXPIRY_SECONDS);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Input refs for 6 OTP boxes
  const inputRefs = useRef([]);

  useEffect(() => {
    document.title = "Passwordless Login | Jayam Web Solutions";
    const params = new URLSearchParams(window.location.search);
    if (params.get("reason") === "expired") {
      toast.error("Session expired. Please sign in again.");
      const url = new URL(window.location);
      url.searchParams.delete("reason");
      window.history.replaceState({}, document.title, url.pathname);
    }
  }, []);

  // Expiry countdown timer
  useEffect(() => {
    let timer;
    if (step === "otp" && expirySeconds > 0) {
      timer = setInterval(() => {
        setExpirySeconds((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, expirySeconds]);

  // Resend cooldown timer
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Handle Step 1: Request OTP
  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const response = await requestLoginOtp(cleanEmail);
      toast.success(response?.message || "Verification code dispatched to your email!");
      setStep("otp");
      setOtp(new Array(OTP_LENGTH).fill(""));
      setExpirySeconds(OTP_EXPIRY_SECONDS);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);

      // Focus first OTP input after DOM renders
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to dispatch verification code";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP digit changes
  const handleOtpChange = (element, index) => {
    const value = element.value;
    if (isNaN(value)) return;

    const newOtp = [...otp];
    // Take only the last entered digit
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle Backspace navigation
  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  // Handle Paste event for entire 6-digit code
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split("");
      setOtp(digits);
      inputRefs.current[OTP_LENGTH - 1]?.focus();
      // Auto verify after short delay
      triggerVerify(digits.join(""));
    }
  };

  // Trigger verify with full string
  const triggerVerify = async (codeToVerify) => {
    if (loading) return;
    setLoading(true);
    try {
      const data = await verifyLoginOtp(email.trim().toLowerCase(), codeToVerify);
      login(data);
      toast.success("Welcome back! Login verified.");
      navigate("/dashboard");
    } catch (err) {
      const msg = err.response?.data?.message || "Invalid or expired verification code";
      toast.error(msg);
      // Clear OTP on error and re-focus first box
      setOtp(new Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 2: Verify OTP submit
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const fullOtp = otp.join("");
    if (fullOtp.length !== OTP_LENGTH) {
      toast.error("Please enter all 6 digits of the verification code");
      return;
    }
    if (expirySeconds <= 0) {
      toast.error("Code has expired. Please request a new one.");
      return;
    }
    await triggerVerify(fullOtp);
  };

  // Format seconds to mm:ss
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="bg-background text-on-surface min-h-screen flex items-center justify-center p-4 md:p-8">
      {/* Container */}
      <main className="w-full max-w-[460px] flex flex-col items-center animate-in fade-in zoom-in-95 duration-400">
        
        {/* Brand Header */}
        <div className="mb-6 md:mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span
              className="material-symbols-outlined text-primary text-[32px] md:text-[36px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              account_balance_wallet
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-on-surface tracking-tight">
              Billing Manager
            </h1>
          </div>
          <p className="text-xs md:text-sm text-on-surface-variant font-medium">
            Enterprise Financial & Invoice Portal
          </p>
        </div>

        {/* Auth Card */}
        <section className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-xl shadow-black/5 overflow-hidden backdrop-blur-sm">
          
          {/* Card Accent Top Line */}
          <div className="h-1.5 w-full bg-gradient-to-r from-primary via-blue-600 to-indigo-600"></div>

          <div className="p-6 md:p-8 flex flex-col gap-6">

            {/* Step 1: Email Form */}
            {step === "email" ? (
              <form onSubmit={handleRequestOtp} className="flex flex-col gap-5">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-3">
                    <span className="material-symbols-outlined text-2xl">mail_lock</span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-on-surface mb-1">
                    Passwordless Sign In
                  </h2>
                  <p className="text-xs md:text-sm text-on-surface-variant">
                    Enter your authorized administrator email to receive a secure 6-digit login code.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                    Admin Email Address
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant text-xl pointer-events-none">
                      mail
                    </span>
                    <input
                      type="email"
                      required
                      autoFocus
                      placeholder="name@jayamwebsolutions.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full py-3.5 px-4 bg-primary text-white rounded-xl font-semibold text-sm shadow-md hover:bg-primary/95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Dispatching Login Code...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Login Code</span>
                      <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </>
                  )}
                </button>

                <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-on-surface-variant border-t border-outline-variant/40">
                  <span className="material-symbols-outlined text-sm text-emerald-600">verified_user</span>
                  <span>Direct SMTP Delivery • Redis Hash Protected</span>
                </div>
              </form>
            ) : (
              /* Step 2: OTP Verification Form */
              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-5">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 mb-3">
                    <span className="material-symbols-outlined text-2xl">verified_user</span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-on-surface mb-1">
                    Enter Verification Code
                  </h2>
                  <p className="text-xs md:text-sm text-on-surface-variant">
                    We sent a 6-digit code to{" "}
                    <span className="font-semibold text-on-surface">{email}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setStep("email")}
                    className="inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline mt-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                    Change email
                  </button>
                </div>

                {/* 6 Digit Input Group */}
                <div className="flex justify-center gap-2 md:gap-2.5 my-2" onPaste={handlePaste}>
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(e.target, index)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      disabled={loading}
                      className="w-11 h-14 md:w-12 md:h-14 text-center text-xl md:text-2xl font-bold bg-surface-container-low border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all disabled:opacity-50"
                    />
                  ))}
                </div>

                {/* Expiry & Resend Information */}
                <div className="flex items-center justify-between text-xs px-1 text-on-surface-variant font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">schedule</span>
                    <span>
                      {expirySeconds > 0 ? (
                        <>Expires in: <strong className="text-on-surface font-mono">{formatTime(expirySeconds)}</strong></>
                      ) : (
                        <span className="text-rose-600 font-bold">Code Expired</span>
                      )}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={resendCooldown > 0 || loading}
                    className="text-primary font-semibold hover:underline disabled:opacity-40 disabled:no-underline cursor-pointer flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-xs">refresh</span>
                    {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : "Resend Code"}
                  </button>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || otp.join("").length !== OTP_LENGTH || expirySeconds <= 0}
                  className="w-full py-3.5 px-4 bg-primary text-white rounded-xl font-semibold text-sm shadow-md hover:bg-primary/95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Verifying & Signing In...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify & Access Dashboard</span>
                      <span className="material-symbols-outlined text-lg">login</span>
                    </>
                  )}
                </button>

                {/* Back to Step 1 */}
                <button
                  type="button"
                  onClick={() => setStep("email")}
                  className="w-full py-2 text-xs font-semibold text-on-surface-variant hover:text-on-surface flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  <span>Use a different email</span>
                </button>
              </form>
            )}

          </div>
        </section>

        {/* Footer info */}
        <p className="mt-6 text-[11px] text-on-surface-variant/70 text-center">
          &copy; {new Date().getFullYear()} Jayam Web Solutions. All access logged and monitored.
        </p>

      </main>
    </div>
  );
};

export default Login;
