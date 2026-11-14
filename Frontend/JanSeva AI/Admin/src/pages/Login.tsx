import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import "./Login.css";
import { auth } from "@/lib/auth";
import { getDashboardRoute } from "@/lib/rbac";

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [dark, setDark]         = useState(() =>
    typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : false
  );
  const [lang, setLang]         = useState("English");

  const handleLanguageToggle = () => {
    if (lang === "English") {
      setLang("Hindi (हिंदी)");
      toast.info("Hindi localization is coming soon for Government Officers");
    } else {
      setLang("English");
    }
  };

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const user = await auth.login(email, password);
      // Route to the correct dashboard based on the user's role
      const destination = getDashboardRoute(user.role);
      navigate({ to: destination as any });
    } catch (err: any) {
      setError(err.response?.data?.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-container">

        {/* ════════════════════════════════ LEFT PANEL ════════════════════════════════ */}
        <div className="left-panel">
          <div className="dots-pattern" />

          <div className="left-content">
            {/* Gov header */}
            <header className="login-header-top">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg"
                alt="Emblem of India"
                className="emblem dark:invert"
              />
              <div className="gov-text">
                <h3>Government of India</h3>
                <p>Ministry of Housing and Urban Affairs</p>
              </div>
            </header>

            <main className="hero-section">
              <h1 className="brand-title">
                JANSEVA <span className="ai-text">AI</span>
              </h1>
              <h2 className="brand-subtitle">AI-Powered Grievance Redressal Platform</h2>
              <div className="divider-line" />
              <p className="brand-description">
                Report any civic issue in your own language.<br />
                Smart. Simple. Secure.
              </p>

              {/* ── 4-column grid cards — identical layout to Citizen portal ── */}
              <div className="features-grid">
                <div className="feature-card">
                  <div className="icon-wrapper icon-blue">
                    <span className="material-symbols-rounded">language</span>
                  </div>
                  <p>Multi-Language<br />Support</p>
                </div>
                <div className="feature-card">
                  <div className="icon-wrapper icon-green">
                    <span className="material-symbols-rounded">verified_user</span>
                  </div>
                  <p>Secure &amp; Private</p>
                </div>
                <div className="feature-card">
                  <div className="icon-wrapper icon-light-blue">
                    <span className="material-symbols-rounded">auto_awesome</span>
                  </div>
                  <p>AI-Powered<br />Assistance</p>
                </div>
                <div className="feature-card">
                  <div className="icon-wrapper icon-purple">
                    <span className="material-symbols-rounded">radar</span>
                  </div>
                  <p>Real-time<br />Tracking</p>
                </div>
              </div>
            </main>
          </div>

          {/* City skyline */}
          <div className="cityscape-wrapper">
            <svg className="cityscape-svg" viewBox="0 0 1000 200" xmlns="http://www.w3.org/2000/svg">
              <g stroke="#94A3B8" fill="none" strokeWidth="1.2" opacity="0.6">
                <path d="M50 180 Q65 150 80 180 T110 180 Q125 155 140 180 T170 180" strokeWidth="1.5" />
                <circle cx="210" cy="165" r="15" /><line x1="210" y1="180" x2="210" y2="195" />
                <rect x="250" y="100" width="50" height="80" rx="2" />
                <rect x="260" y="110" width="10" height="10" /><rect x="280" y="110" width="10" height="10" />
                <rect x="260" y="130" width="10" height="10" /><rect x="280" y="130" width="10" height="10" />
                <rect x="260" y="150" width="10" height="10" /><rect x="280" y="150" width="10" height="10" />
                <rect x="310" y="120" width="40" height="60" rx="2" />
                <line x1="310" y1="135" x2="350" y2="135" /><line x1="310" y1="150" x2="350" y2="150" /><line x1="310" y1="165" x2="350" y2="165" />
                <line x1="180" y1="140" x2="180" y2="180" /><polygon points="175,140 185,140 180,130" />
                <line x1="370" y1="130" x2="370" y2="180" /><polygon points="365,130 375,130 370,120" />
                <rect x="400" y="130" width="200" height="50" />
                <path d="M380 130 L620 130 L600 100 L400 100 Z" />
                <rect x="460" y="85" width="80" height="15" />
                <path d="M460 85 C460 45, 540 45, 540 85" />
                <rect x="495" y="65" width="10" height="20" />
                <line x1="500" y1="65" x2="500" y2="35" />
                <path d="M500 40 L520 40 L520 50 L500 50" />
                <line x1="420" y1="130" x2="420" y2="180" /><line x1="440" y1="130" x2="440" y2="180" />
                <line x1="460" y1="130" x2="460" y2="180" /><line x1="540" y1="130" x2="540" y2="180" />
                <line x1="560" y1="130" x2="560" y2="180" /><line x1="580" y1="130" x2="580" y2="180" />
                <rect x="390" y="180" width="220" height="5" /><rect x="380" y="185" width="240" height="5" /><rect x="370" y="190" width="260" height="5" />
                <circle cx="650" cy="160" r="20" /><line x1="650" y1="180" x2="650" y2="195" />
                <rect x="680" y="90" width="50" height="90" rx="2" />
                <rect x="690" y="100" width="8" height="8" /><rect x="710" y="100" width="8" height="8" />
                <rect x="690" y="120" width="8" height="8" /><rect x="710" y="120" width="8" height="8" />
                <rect x="690" y="140" width="8" height="8" /><rect x="710" y="140" width="8" height="8" />
                <rect x="690" y="160" width="8" height="8" /><rect x="710" y="160" width="8" height="8" />
                <rect x="740" y="110" width="45" height="70" rx="2" />
                <circle cx="762" cy="130" r="10" /><circle cx="762" cy="155" r="10" />
                <rect x="795" y="130" width="40" height="50" rx="2" />
                <line x1="805" y1="140" x2="825" y2="140" /><line x1="805" y1="150" x2="825" y2="150" /><line x1="805" y1="160" x2="825" y2="160" />
                <line x1="640" y1="130" x2="640" y2="180" /><polygon points="635,130 645,130 640,120" />
                <line x1="850" y1="140" x2="850" y2="180" /><polygon points="845,140 855,140 850,130" />
                <path d="M850 180 Q865 150 880 180 T910 180 Q925 155 940 180 T970 180" strokeWidth="1.5" />
                <line x1="0" y1="195" x2="1000" y2="195" />
              </g>
            </svg>
          </div>

          <div className="left-footer">
            <span className="material-symbols-rounded">gpp_good</span>
            <span>Your data is safe and secure with Janseva AI</span>
          </div>
        </div>

        {/* ════════════════════════════════ RIGHT PANEL ════════════════════════════════ */}
        <div className="right-panel">
          <div className="login-card">

            {/* Top-right: Language + Theme toggle — identical to citizen portal */}
            <div className="card-header-actions">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  onClick={handleLanguageToggle}
                  className="lang-selector"
                  style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}
                >
                  <span className="material-symbols-rounded icon-sm">language</span>
                  {lang === "English" ? "English" : "हिंदी"}
                  <span className="material-symbols-rounded icon-sm">expand_more</span>
                </button>
                {/* Theme toggle — matches the sun icon from citizen portal */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  title="Toggle theme"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-white)",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                  }}
                >
                  <span className="material-symbols-rounded icon-sm">
                    {dark ? "light_mode" : "dark_mode"}
                  </span>
                </button>
              </div>
            </div>

            {/* Avatar + title */}
            <div className="login-header-main">
              <div className="avatar-wrapper">
                <span className="material-symbols-rounded">person</span>
              </div>
              <h2>Government Officer Login</h2>
              <p>Login to continue to Janseva AI</p>
            </div>

            {/* Login / (disabled) Register tabs — same visual structure as citizen */}
            <div style={{
              display: "flex",
              gap: "8px",
              marginBottom: "16px",
              borderBottom: "1px solid var(--border-color)",
              paddingBottom: "8px",
            }}>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: "8px",
                  border: "none",
                  background: "var(--primary)",
                  color: "var(--primary-foreground)",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "14px",
                }}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => toast.info("This portal is restricted to authorized municipal officers only.")}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: "8px",
                  border: "none",
                  background: "transparent",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "14px",
                  opacity: 0.7,
                }}
              >
                Officer Only
              </button>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626",
                borderRadius: "8px", padding: "10px 14px", fontSize: "13px", marginBottom: "12px",
              }}>
                {error}
              </div>
            )}

            {/* Form */}
            <form className="login-form" onSubmit={handleLogin}>

              {/* Email / Officer ID */}
              <div className="form-group">
                <label>Municipal Officer ID</label>
                <div className="input-group">
                  <div className="country-code">
                    <span className="material-symbols-rounded icon-sm">mail</span>
                  </div>
                  <input
                    type="email"
                    placeholder="Enter your Officer ID (Email)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="form-group">
                <label>Password</label>
                <div className="input-group">
                  <div className="country-code">
                    <span className="material-symbols-rounded icon-sm">lock</span>
                  </div>
                  <input
                    type={showPw ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "0 12px", color: "var(--text-muted)" }}
                  >
                    <span className="material-symbols-rounded icon-sm">
                      {showPw ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Login button */}
              <button
                type="submit"
                className="primary-btn"
                disabled={loading}
                style={{ marginTop: "18px" }}
              >
                {loading ? (
                  <>
                    <span className="material-symbols-rounded icon-sm">autorenew</span>
                    Logging in...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-rounded icon-sm">login</span>
                    Login
                  </>
                )}
              </button>

              <div className="divider"><span>OR</span></div>

              {/* Secondary button — same style as "Continue without Login" */}
              <button
                type="button"
                className="secondary-btn"
                onClick={() => toast.success("You are accessing a secured Government of India endpoint.")}
                style={{ cursor: "pointer", opacity: 0.85 }}
              >
                <span className="material-symbols-rounded icon-sm">shield</span>
                Secure Government Access Only
              </button>

            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
