import { useState, type FormEvent } from "react";
import { usePlayer } from "../state/playerStore";

export function AuthPanel() {
  const { profile, user, authError, dataError, saving, signIn, signUp, signOut, setDisplayName } = usePlayer();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayNameInput] = useState(profile?.display_name || "");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "signin") await signIn(email, password, displayName);
    else await signUp(email, password, displayName || "Neon player");
  }

  async function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (displayName.trim()) await setDisplayName(displayName);
  }

  if (user) {
    return (
      <section className="panel" aria-labelledby="player-title">
        <div className="panel-header">
          <div>
            <h2 id="player-title" className="panel-title">Player</h2>
            <p className="panel-note">Online save is active for this profile.</p>
          </div>
          <span className="chip chip-cyan">Live</span>
        </div>
        <form className="form-stack" onSubmit={handleProfileSave}>
          <div className="form-row">
            <label htmlFor="displayName">Display name</label>
            <input
              id="displayName"
              className="input"
              value={displayName}
              onChange={(event) => setDisplayNameInput(event.target.value)}
              maxLength={32}
            />
          </div>
          <div className="row-actions">
            <button className="button button-primary" type="submit" disabled={saving || !displayName.trim()}>
              Save name
            </button>
            <button className="button button-secondary" type="button" onClick={signOut} disabled={saving}>
              Sign out
            </button>
          </div>
        </form>
        {dataError ? <p className="error-state">{dataError}</p> : null}
      </section>
    );
  }

  return (
    <section className="panel" aria-labelledby="auth-title">
      <div className="panel-header">
        <div>
          <h2 id="auth-title" className="panel-title">Save progress</h2>
          <p className="panel-note">Play as guest now, or sign in to keep rewards and leaderboard scores.</p>
        </div>
      </div>
      <div className="tabs" role="tablist" aria-label="Account mode">
        <button className={`tab ${mode === "signin" ? "tab-active" : ""}`} type="button" onClick={() => setMode("signin")}>
          Sign in
        </button>
        <button className={`tab ${mode === "signup" ? "tab-active" : ""}`} type="button" onClick={() => setMode("signup")}>
          Sign up
        </button>
        <button className="tab" type="button" onClick={() => setDisplayNameInput("Neon player")}>
          Guest
        </button>
      </div>
      <form className="form-stack" onSubmit={handleSubmit}>
        {mode === "signup" ? (
          <div className="form-row">
            <label htmlFor="signupName">Display name</label>
            <input
              id="signupName"
              className="input"
              value={displayName}
              onChange={(event) => setDisplayNameInput(event.target.value)}
              maxLength={32}
              placeholder="Neon player"
            />
          </div>
        ) : null}
        <div className="form-row">
          <label htmlFor="email">Email</label>
            <input
              id="email"
              className="input"
              type="email"
              value={email}
              aria-label="Email"
              onChange={(event) => setEmail(event.target.value)}
            />
        </div>
        <div className="form-row">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            className="input"
            type="password"
            minLength={6}
            value={password}
            aria-label="Password"
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <p className="panel-note">Sign-in is handled securely by Supabase. If you have used another service from the same provider, the same account may work here.</p>
        <button className="button button-primary" type="submit" disabled={saving || !email || password.length < 6}>
          {mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>
      {authError ? <p className="error-state">{authError}</p> : null}
      {dataError ? <p className="error-state">{dataError}</p> : null}
    </section>
  );
}
