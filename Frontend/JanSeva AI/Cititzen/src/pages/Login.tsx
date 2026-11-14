import { useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import "./Login.css";
import { useAuth, getErrorMessage } from "../lib/auth";
import { useT, useI18n } from "../lib/i18n";
import { ThemeToggle } from "../components/ThemeToggle";
import { LanguageSwitcher } from "../components/LanguageSwitcher";

type Mode = "login" | "register";

export function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const t = useT();
  const { lang } = useI18n();

  // Login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Register fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError(t.login.errorEmptyFields);
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      navigate({ to: "/dashboard" });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    if (regPassword !== confirmPassword) {
      setError(t.login.errorPasswordMatch);
      return;
    }
    if (regPassword.length < 8) {
      setError(t.login.errorPasswordLength);
      return;
    }
    setLoading(true);
    try {
      await register({
        email: regEmail,
        password: regPassword,
        firstName,
        lastName,
      });
      // Registration successful: switch to login mode and clear fields
      setSuccessMsg("Account created successfully! Please log in.");
      setMode("login");
      setEmail(regEmail); // Pre-fill email for convenience
      setPassword("");
      setRegEmail("");
      setRegPassword("");
      setConfirmPassword("");
      setFirstName("");
      setLastName("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-container">
        {/* Left Panel — unchanged */}
        <div className="left-panel">
          <div className="dots-pattern"></div>

          <div className="left-content">
            <header className="login-header-top">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg"
                alt="Emblem of India"
                className="emblem dark:invert"
              />
              <div className="gov-text">
                <h3>{t.login.heroGov}</h3>
                <p>{t.login.heroMinistry}</p>
              </div>
            </header>

            <main className="hero-section">
              <h1 className="brand-title">
                {t.login.heroJanseva} <span className="ai-text">{t.login.heroAi}</span>
              </h1>
              <h2 className="brand-subtitle">{t.login.heroPlatform}</h2>
              <div className="divider-line"></div>
              <p className="brand-description">
                {t.login.heroReport}
                <br />
                {t.login.heroSmart}
              </p>

              <div className="features-grid">
                <div className="feature-card">
                  <div className="icon-wrapper icon-blue">
                    <span className="material-symbols-rounded">language</span>
                  </div>
                  <p>{t.login.featMultiLang}</p>
                </div>
                <div className="feature-card">
                  <div className="icon-wrapper icon-green">
                    <span className="material-symbols-rounded">verified_user</span>
                  </div>
                  <p>{t.login.featSecure}</p>
                </div>
                <div className="feature-card">
                  <div className="icon-wrapper icon-light-blue">
                    <span className="material-symbols-rounded">auto_awesome</span>
                  </div>
                  <p>{t.login.featAi}</p>
                </div>
                <div className="feature-card">
                  <div className="icon-wrapper icon-purple">
                    <span className="material-symbols-rounded">radar</span>
                  </div>
                  <p>{t.login.featTracking}</p>
                </div>
              </div>
            </main>
          </div>

          <div className="cityscape-wrapper">
            <svg
              className="cityscape-svg"
              viewBox="0 0 1000 200"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g stroke="#94A3B8" fill="none" strokeWidth="1.2" opacity="0.6">
                <path d="M100 40 Q110 20 130 30 T160 40 Q170 60 140 60 T100 40" fill="var(--bg-light)" stroke="none" />
                <path d="M800 60 Q810 40 830 50 T860 60 Q870 80 840 80 T800 60" fill="var(--bg-light)" stroke="none" />
                <path d="M880 30 Q890 20 900 25 T920 30 Q925 40 910 40 T880 30" fill="var(--bg-light)" stroke="none" />
                <path d="M200 50 Q205 45 210 50 Q215 45 220 50" />
                <path d="M230 40 Q235 35 240 40 Q245 35 250 40" />
                <path d="M50 180 Q65 150 80 180 T110 180 Q125 155 140 180 T170 180" strokeWidth="1.5" />
                <circle cx="210" cy="165" r="15" />
                <line x1="210" y1="180" x2="210" y2="195" />
                <rect x="250" y="100" width="50" height="80" rx="2" />
                <rect x="260" y="110" width="10" height="10" />
                <rect x="280" y="110" width="10" height="10" />
                <rect x="260" y="130" width="10" height="10" />
                <rect x="280" y="130" width="10" height="10" />
                <rect x="260" y="150" width="10" height="10" />
                <rect x="280" y="150" width="10" height="10" />
                <rect x="310" y="120" width="40" height="60" rx="2" />
                <line x1="310" y1="135" x2="350" y2="135" />
                <line x1="310" y1="150" x2="350" y2="150" />
                <line x1="310" y1="165" x2="350" y2="165" />
                <line x1="180" y1="140" x2="180" y2="180" />
                <polygon points="175,140 185,140 180,130" />
                <line x1="370" y1="130" x2="370" y2="180" />
                <polygon points="365,130 375,130 370,120" />
                <rect x="400" y="130" width="200" height="50" />
                <path d="M380 130 L620 130 L600 100 L400 100 Z" />
                <rect x="460" y="85" width="80" height="15" />
                <path d="M460 85 C460 45, 540 45, 540 85" />
                <rect x="495" y="65" width="10" height="20" />
                <line x1="500" y1="65" x2="500" y2="35" />
                <path d="M500 40 L520 40 L520 50 L500 50" />
                <line x1="420" y1="130" x2="420" y2="180" />
                <line x1="440" y1="130" x2="440" y2="180" />
                <line x1="460" y1="130" x2="460" y2="180" />
                <line x1="540" y1="130" x2="540" y2="180" />
                <line x1="560" y1="130" x2="560" y2="180" />
                <line x1="580" y1="130" x2="580" y2="180" />
                <rect x="390" y="180" width="220" height="5" />
                <rect x="380" y="185" width="240" height="5" />
                <rect x="370" y="190" width="260" height="5" />
                <circle cx="650" cy="160" r="20" />
                <line x1="650" y1="180" x2="650" y2="195" />
                <path d="M850 180 Q865 150 880 180 T910 180 Q925 155 940 180 T970 180" strokeWidth="1.5" />
                <rect x="680" y="90" width="50" height="90" rx="2" />
                <rect x="690" y="100" width="8" height="8" />
                <rect x="710" y="100" width="8" height="8" />
                <rect x="690" y="120" width="8" height="8" />
                <rect x="710" y="120" width="8" height="8" />
                <rect x="690" y="140" width="8" height="8" />
                <rect x="710" y="140" width="8" height="8" />
                <rect x="690" y="160" width="8" height="8" />
                <rect x="710" y="160" width="8" height="8" />
                <rect x="740" y="110" width="45" height="70" rx="2" />
                <circle cx="762" cy="130" r="10" />
                <circle cx="762" cy="155" r="10" />
                <rect x="795" y="130" width="40" height="50" rx="2" />
                <line x1="805" y1="140" x2="825" y2="140" />
                <line x1="805" y1="150" x2="825" y2="150" />
                <line x1="805" y1="160" x2="825" y2="160" />
                <line x1="640" y1="130" x2="640" y2="180" />
                <polygon points="635,130 645,130 640,120" />
                <line x1="850" y1="140" x2="850" y2="180" />
                <polygon points="845,140 855,140 850,130" />
                <line x1="0" y1="195" x2="1000" y2="195" />
              </g>
            </svg>
          </div>

          <div className="left-footer">
            <span className="material-symbols-rounded">gpp_good</span>
            <span>{t.common.secure}</span>
          </div>
        </div>

        {/* Right Panel */}
        <div className="right-panel">
          <div className="login-card">
            <div className="card-header-actions">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <LanguageSwitcher variant="card" />
                <ThemeToggle />
              </div>
            </div>

            <div className="login-header-main">
              <div className="avatar-wrapper">
                <span className="material-symbols-rounded">person</span>
              </div>
              <h2>{mode === "login" ? t.login.welcomeBack : t.login.createAccount}</h2>
              <p>
                {mode === "login" ? t.login.subtitle : t.login.registerSubtitle}
              </p>
            </div>

            {/* Mode toggle */}
            <div
              style={{
                display: "flex",
                gap: "8px",
                marginBottom: "16px",
                borderBottom: "1px solid var(--border, #e2e8f0)",
                paddingBottom: "8px",
              }}
            >
              <button
                type="button"
                onClick={() => { setMode("login"); setError(""); setSuccessMsg(""); }}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: "8px",
                  border: "none",
                  background: mode === "login" ? "var(--primary)" : "transparent",
                  color: mode === "login" ? "var(--primary-foreground)" : "inherit",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "14px",
                  transition: "all 0.2s",
                }}
              >
                {t.login.tabLogin}
              </button>
              <button
                type="button"
                onClick={() => { setMode("register"); setError(""); setSuccessMsg(""); }}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: "8px",
                  border: "none",
                  background: mode === "register" ? "var(--primary)" : "transparent",
                  color: mode === "register" ? "var(--primary-foreground)" : "inherit",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "14px",
                  transition: "all 0.2s",
                }}
              >
                {t.login.tabRegister}
              </button>
            </div>

            {/* Error / Success */}
            {error && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#dc2626",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  fontSize: "13px",
                  marginBottom: "12px",
                }}
              >
                {error}
              </div>
            )}
            {successMsg && (
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  color: "#16a34a",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  fontSize: "13px",
                  marginBottom: "12px",
                }}
              >
                {successMsg}
              </div>
            )}

            {/* ── LOGIN FORM ── */}
            {mode === "login" && (
              <form className="login-form" onSubmit={handleLogin}>
                <div className="form-group">
                  <label>{t.login.emailLabel}</label>
                  <div className="input-group">
                    <div className="country-code">
                      <span className="material-symbols-rounded icon-sm">mail</span>
                    </div>
                    <input
                      type="email"
                      placeholder={t.login.emailPlaceholder}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      lang={lang === "hi" ? "hi" : "en"}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>{t.login.passwordLabel}</label>
                  <div className="input-group">
                    <div className="country-code">
                      <span className="material-symbols-rounded icon-sm">lock</span>
                    </div>
                    <input
                      type="password"
                      placeholder={t.login.passwordPlaceholder}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="primary-btn"
                  disabled={loading}
                  style={{ marginTop: "18px" }}
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-rounded icon-sm animate-spin">autorenew</span>
                      {t.login.loggingIn}
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-rounded icon-sm">login</span>
                      {t.login.loginBtn}
                    </>
                  )}
                </button>

                <div className="divider">
                  <span>{t.login.orDivider}</span>
                </div>

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => navigate({ to: "/dashboard" })}
                >
                  <span className="material-symbols-rounded icon-sm">person</span>
                  {t.login.continueWithout}
                </button>
              </form>
            )}

            {/* ── REGISTER FORM ── */}
            {mode === "register" && (
              <form className="login-form" onSubmit={handleRegister}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div className="form-group">
                    <label>{t.login.firstNameLabel}</label>
                    <div className="input-group">
                      <input
                        type="text"
                        placeholder={t.login.firstNamePlaceholder}
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>{t.login.lastNameLabel}</label>
                    <div className="input-group">
                      <input
                        type="text"
                        placeholder={t.login.lastNamePlaceholder}
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: "10px" }}>
                  <label>{t.login.emailLabel}</label>
                  <div className="input-group">
                    <div className="country-code">
                      <span className="material-symbols-rounded icon-sm">mail</span>
                    </div>
                    <input
                      type="email"
                      placeholder={t.login.emailPlaceholder}
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: "10px" }}>
                  <label>{t.login.passwordLabel}</label>
                  <div className="input-group">
                    <div className="country-code">
                      <span className="material-symbols-rounded icon-sm">lock</span>
                    </div>
                    <input
                      type="password"
                      placeholder={t.login.passwordPlaceholder}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: "10px" }}>
                  <label>{t.login.confirmPasswordLabel}</label>
                  <div className="input-group">
                    <div className="country-code">
                      <span className="material-symbols-rounded icon-sm">lock_reset</span>
                    </div>
                    <input
                      type="password"
                      placeholder={t.login.confirmPasswordPlaceholder}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="primary-btn"
                  disabled={loading}
                  style={{ marginTop: "18px" }}
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-rounded icon-sm animate-spin">autorenew</span>
                      {t.login.registering}
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-rounded icon-sm">person_add</span>
                      {t.login.registerBtn}
                    </>
                  )}
                </button>
              </form>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
