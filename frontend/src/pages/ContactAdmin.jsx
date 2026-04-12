import { useState } from "react";
import { Link } from "react-router-dom";
import "../styles/auth.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function ContactAdmin({ isDark, onToggleTheme }) {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError("Please fill in all required fields (Name, Email, Message).");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(form.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send message.");
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <button
        className="theme-toggle"
        onClick={onToggleTheme}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDark ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 2V4M12 20V22M4.22 4.22L5.64 5.64M18.36 18.36L19.78 19.78M2 12H4M20 12H22M4.22 19.78L5.64 18.36M18.36 5.64L19.78 4.22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <div className="auth-container">
        <div className="auth-card" style={{ maxWidth: 520 }}>
          <div className="auth-header">
            <div className="logo-badge">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 className="auth-title">Contact Administrator</h1>
            <p className="auth-subtitle">
              Have an issue or question? Send a message and the admin will get back to you.
            </p>
          </div>

          {success ? (
            <div style={{ padding: "1rem 0", textAlign: "center" }}>
              <div style={{ background: "rgba(34,197,94,0.1)", color: "var(--success, #22c55e)", padding: "1.2rem", borderRadius: "0.5rem", fontSize: "1rem", border: "1px solid rgba(34,197,94,0.2)", marginBottom: "1.5rem" }}>
                ✅ Your message has been sent! The administrator will review it shortly.
              </div>
              <Link to="/login" className="auth-submit" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="name">Full Name <span style={{ color: "var(--danger, #ef4444)" }}>*</span></label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    className="form-input"
                    placeholder="Your name"
                    value={form.name}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="email">Email Address <span style={{ color: "var(--danger, #ef4444)" }}>*</span></label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    className="form-input"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="subject">Subject <span style={{ color: "var(--text-muted, #94a3b8)", fontWeight: 400, fontSize: "0.8rem" }}>(optional)</span></label>
                <input
                  id="subject"
                  name="subject"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Account issue, Access problem…"
                  value={form.subject}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="message">Message <span style={{ color: "var(--danger, #ef4444)" }}>*</span></label>
                <textarea
                  id="message"
                  name="message"
                  className="form-input"
                  placeholder="Describe your issue or question in detail…"
                  value={form.message}
                  onChange={handleChange}
                  disabled={loading}
                  rows={5}
                  style={{ resize: "vertical", fontFamily: "inherit" }}
                />
              </div>

              {error && (
                <div className="error-message">
                  <span>⚠️ {error}</span>
                </div>
              )}

              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? (
                  <><span className="spinner"></span><span>Sending…</span></>
                ) : "Send Message"}
              </button>
            </form>
          )}

          {!success && (
            <div className="auth-footer">
              <Link to="/login" className="footer-link">Back to Sign In</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ContactAdmin;
