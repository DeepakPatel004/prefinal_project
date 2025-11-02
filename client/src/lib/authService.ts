export async function signup(payload: {
  fullName: string;
  email?: string;
  mobileNumber?: string;
  password: string;
  villageName?: string;
  role?: string;
}) {
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function login(identifier: string, password: string) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

export function storeToken(token: string, remember = false) {
  if (remember) localStorage.setItem('auth_token', token);
  else sessionStorage.setItem('auth_token', token);
}

export function clearToken() {
  localStorage.removeItem('auth_token');
  sessionStorage.removeItem('auth_token');
}

export function getToken() {
  return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token') || null;
}
