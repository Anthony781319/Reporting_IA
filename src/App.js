@import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --color-bg: #ffffff;
  --color-bg-secondary: #f5f4f0;
  --color-border: rgba(0,0,0,0.1);
  --color-text: #1a1a1a;
  --color-text-muted: #5F5E5A;
  --purple: #534AB7;
  --purple-light: #EEEDFE;
  --purple-dark: #3C3489;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #1a1a1a;
    --color-bg-secondary: #242424;
    --color-border: rgba(255,255,255,0.1);
    --color-text: #f0eeea;
    --color-text-muted: #B4B2A9;
  }
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--color-bg);
  color: var(--color-text);
  -webkit-font-smoothing: antialiased;
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
}

.app { display: flex; flex-direction: column; min-height: 100vh; }

.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 0.5px solid var(--color-border);
  position: sticky;
  top: 0;
  background: var(--color-bg);
  z-index: 10;
}

.nav-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 500;
  color: var(--color-text);
}

.nav-title .ti { font-size: 20px; color: var(--purple); }

.nav-avatar {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: var(--purple-light);
  color: var(--purple-dark);
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 500;
}

.tabs {
  display: flex;
  border-bottom: 0.5px solid var(--color-border);
  position: sticky;
  top: 49px;
  background: var(--color-bg);
  z-index: 9;
}

.tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  font-size: 10px;
  color: var(--color-text-muted);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: color 0.15s;
}

.tab .ti { font-size: 18px; }
.tab span { font-size: 10px; }

.tab.active {
  color: var(--purple);
  border-bottom: 2px solid var(--purple);
  font-weight: 500;
}

.content { flex: 1; padding-bottom: 24px; }

input[type="number"],
input[type="text"],
input[type="email"],
select {
  background: var(--color-bg-secondary);
  border: 0.5px solid var(--color-border);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 14px;
  color: var(--color-text);
  outline: none;
  -webkit-appearance: none;
}

input:focus, select:focus {
  border-color: var(--purple);
  box-shadow: 0 0 0 3px rgba(83,74,183,0.15);
}

button { font-family: inherit; }
