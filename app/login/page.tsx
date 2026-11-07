export default function LoginPage() {
  return <main style={{ maxWidth: 420, margin: '15vh auto', padding: 24 }}>
    <h1>ArthAI team sign in</h1>
    <form method="post" action="/api/auth/login" style={{ display: 'grid', gap: 16, marginTop: 24 }}>
      <label htmlFor="password">Team password</label>
      <input id="password" name="password" type="password" autoComplete="current-password" required maxLength={200} />
      <button type="submit">Sign in</button>
    </form>
    <p>Prospects can open their private report using the link in their email.</p>
  </main>;
}
