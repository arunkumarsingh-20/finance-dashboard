import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API = import.meta.env.VITE_API_BASE || "/api/v1";

async function apiFetch(url, options = {}, retries = 4, delay = 600) {
  const res = await fetch(url, options);
  if (res.status === 429 && retries > 0) {
    await new Promise(r => setTimeout(r, delay));
    return apiFetch(url, options, retries - 1, delay * 1.5);
  }
  return res;
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function formatAmount(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return n.toLocaleString("en-IN");
}

function LineChart({ data }) {
  if (!data?.length) return <div className="empty">No data</div>;

  const width = 520;
  const height = 180;
  const pad = 28;

  const maxVal = Math.max(
    ...data.map(d => Math.max(Number(d.income || 0), Number(d.expense || 0))),
    1
  );

  const xStep = (width - pad * 2) / (data.length - 1 || 1);
  const toY = v => height - pad - (v / maxVal) * (height - pad * 2);
  const toX = i => pad + i * xStep;

  const incomePoints = data.map((d, i) => `${toX(i)},${toY(Number(d.income || 0))}`).join(" ");
  const expensePoints = data.map((d, i) => `${toX(i)},${toY(Number(d.expense || 0))}`).join(" ");

  return (
    <svg className="chart" viewBox={`0 0 ${width} ${height}`}>
      {[0.25, 0.5, 0.75].map((t, idx) => {
        const y = toY(maxVal * t);
        return (
          <line
            key={idx}
            x1={pad}
            y1={y}
            x2={width - pad}
            y2={y}
            stroke="#1f2937"
            strokeDasharray="4 4"
          />
        );
      })}

      <polyline points={incomePoints} fill="none" stroke="#22c55e" strokeWidth="3" />
      <polyline points={expensePoints} fill="none" stroke="#ef4444" strokeWidth="3" />

      {data.map((d, i) => (
        <g key={`dot-${i}`}>
          <circle cx={toX(i)} cy={toY(Number(d.income || 0))} r="3" fill="#22c55e" />
          <circle cx={toX(i)} cy={toY(Number(d.expense || 0))} r="3" fill="#ef4444" />
        </g>
      ))}

      {data.map((d, i) => (
        <text
          key={`label-${i}`}
          x={toX(i)}
          y={height - 6}
          textAnchor="middle"
          fill="#9ca3af"
          fontSize="10"
        >
          {String(d.month || "").slice(5)}
        </text>
      ))}
    </svg>
  );
}

function BarChart({ data }) {
  if (!data?.length) return <div className="empty">No data</div>;
  const maxVal = Math.max(...data.map(d => Number(d.total || 0)), 1);
  return (
    <div className="bars">
      {data.map((d) => (
        <div className="bar-row" key={d.category}>
          <span>{d.category}</span>
          <div className="bar">
            <div className="bar-fill" style={{ width: `${(Number(d.total) / maxVal) * 100}%` }} />
          </div>
          <strong>{formatAmount(d.total)}</strong>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState(localStorage.getItem("tab") || "dashboard");
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");

  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("password123");

  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [categoryTotals, setCategoryTotals] = useState([]);

  const [users, setUsers] = useState([]);
  const [audits, setAudits] = useState([]);

  const [form, setForm] = useState({
    amount: 1000,
    type: "income",
    category: "Salary",
    date: "2026-04-01",
    notes: "Test entry"
  });

  const [filters, setFilters] = useState({ type: "", category: "", q: "" });

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "viewer",
    status: "active",
    password: ""
  });

  const [editingUserId, setEditingUserId] = useState(null);
  const [editUserForm, setEditUserForm] = useState({ name: "", role: "viewer", status: "active" });

  const authHeaders = useMemo(() => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }), [token]);

  useEffect(() => {
    localStorage.setItem("tab", tab);
  }, [tab]);

  useEffect(() => {
    localStorage.setItem("theme", theme);
    document.body.dataset.theme = theme;
  }, [theme]);

  function toggleTheme() {
    setTheme(prev => (prev === "dark" ? "light" : "dark"));
  }

  async function login() {
    const res = await apiFetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.token) {
      setToken(data.token);
      localStorage.setItem("token", data.token);
      setUser(data.user);
    } else {
      alert(data.error || "Login failed");
    }
  }

  async function fetchMe() {
    if (!token) return;
    const res = await apiFetch(`${API}/auth/me`, { headers: authHeaders });
    const data = await res.json();
    if (res.ok) setUser(data);
  }

  async function loadRecords() {
    const qs = new URLSearchParams();
    if (filters.type) qs.set("type", filters.type);
    if (filters.category) qs.set("category", filters.category);
    if (filters.q) qs.set("q", filters.q);

    const res = await apiFetch(`${API}/records?${qs.toString()}`, { headers: authHeaders });
    const data = await res.json();
    if (res.ok) setRecords(data.data || []);
  }

  async function loadSummary() {
    const res = await apiFetch(`${API}/summary`, { headers: authHeaders });
    const data = await res.json();
    if (res.ok) setSummary(data);
  }

  async function loadMonthly() {
    const res = await apiFetch(`${API}/summary/monthly`, { headers: authHeaders });
    const data = await res.json();
    if (res.ok) setMonthly(data || []);
  }

  async function loadCategoryTotals() {
    const res = await apiFetch(`${API}/summary/category`, { headers: authHeaders });
    const data = await res.json();
    if (res.ok) {
      const withTotal = (data || []).map(d => {
        const income = Number(d.income || 0);
        const expense = Number(d.expense || 0);
        return { ...d, income, expense, total: income + expense };
      });
      setCategoryTotals(withTotal);
    }
  }

  async function loadUsers() {
    const res = await apiFetch(`${API}/users`, { headers: authHeaders });
    const data = await res.json();
    if (res.ok) setUsers(data.data || data || []);
  }

  async function loadAudits() {
    const res = await apiFetch(`${API}/audit`, { headers: authHeaders });
    const data = await res.json();
    if (res.ok) setAudits(data || []);
  }

  async function createRecord() {
    const res = await apiFetch(`${API}/records`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(form)
    });
    const data = await res.json();
    if (data.id) {
      setRecords(prev => [data, ...prev]);
      loadSummary();
      loadMonthly();
      loadCategoryTotals();
      if (user?.role === "admin") loadAudits();
    } else {
      alert(data.error || "Create failed");
    }
  }

  async function deleteRecord(id) {
    const ok = confirm("Delete this record?");
    if (!ok) return;
    const res = await apiFetch(`${API}/records/${id}`, {
      method: "DELETE",
      headers: authHeaders
    });
    if (res.ok) {
      loadRecords();
      loadSummary();
      loadMonthly();
      loadCategoryTotals();
      if (user?.role === "admin") loadAudits();
    }
  }

  async function exportCSV() {
    const res = await apiFetch(`${API}/records/export/csv`, { headers: authHeaders });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Export failed");
      return;
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "records.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  async function createUser() {
    const res = await apiFetch(`${API}/users`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(newUser)
    });
    const data = await res.json();
    if (res.ok) {
      setNewUser({ name: "", email: "", role: "viewer", status: "active", password: "" });
      loadUsers();
    } else {
      alert(data.error || "User creation failed");
    }
  }

  function startEditUser(u) {
    setEditingUserId(u.id);
    setEditUserForm({ name: u.name, role: u.role, status: u.status });
  }

  async function saveUser(id) {
    const res = await apiFetch(`${API}/users/${id}`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify(editUserForm)
    });
    if (res.ok) {
      setEditingUserId(null);
      loadUsers();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Update failed");
    }
  }

  async function toggleUserStatus(u) {
    const nextStatus = u.status === "active" ? "inactive" : "active";
    const res = await apiFetch(`${API}/users/${u.id}`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ status: nextStatus })
    });
    if (res.ok) loadUsers();
  }

  function logout() {
    localStorage.removeItem("token");
    setToken("");
    setUser(null);
  }

  useEffect(() => {
    if (token) {
      fetchMe();
      loadSummary();
      loadRecords();
      loadMonthly();
      loadCategoryTotals();
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    if (tab === "users" && user?.role === "admin") loadUsers();
    if (tab === "audit" && user?.role === "admin") loadAudits();
    if (tab === "records") loadRecords();
  }, [tab]);

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">Finance Suite</div>
        <button className={tab === "dashboard" ? "active" : ""} onClick={() => setTab("dashboard")}>Dashboard</button>
        <button className={tab === "records" ? "active" : ""} onClick={() => setTab("records")}>Records</button>
        <button className={tab === "analytics" ? "active" : ""} onClick={() => setTab("analytics")}>Analytics</button>
        {user?.role === "admin" && (
          <>
            <button className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}>Users</button>
            <button className={tab === "audit" ? "active" : ""} onClick={() => setTab("audit")}>Audit</button>
          </>
        )}
      </aside>

      <main className="app">
        <header className="hero">
          <div className="hero__content">
            <div className="badge">Production Tester</div>
            <h1>Finance Dashboard</h1>
            <p>Full‑stack validation UI with analytics, audit logs, and editing.</p>
          </div>
          <div className="hero-actions">
            <button
              className={`theme-toggle ${theme === "light" ? "is-light" : "is-dark"}`}
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              <span className="theme-toggle__icon">
                {/* Moon */}
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M21 14.5A8.5 8.5 0 1 1 9.5 3a7 7 0 0 0 11.5 11.5Z" />
                </svg>
              </span>

              <span className="theme-toggle__label">
                {theme === "dark" ? "Dark" : "Light"}
              </span>

              <span className="theme-toggle__track">
                <span className="theme-toggle__thumb" />
              </span>

              <span className="theme-toggle__icon">
                {/* Sun */}
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="4.5" />
                  <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />
                </svg>
              </span>
            </button>

            {user && (
              <div className="user-card">
                <div>
                  <div className="user-name">{user?.name}</div>
                  <div className="user-role">{user?.role}</div>
                </div>
                <button className="btn ghost" onClick={logout}>Logout</button>
              </div>
            )}
          </div>
        </header>

        {!token ? (
          <section className="card login-card">
            <h2>Sign In</h2>
            <div className="form-grid">
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
              <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password" />
              <button className="btn primary" onClick={login}>Login</button>
            </div>
          </section>
        ) : (
          <>
            {tab === "dashboard" && (
              <>
                <section className="stats">
                  <div className="stat"><span>Total Income</span><strong>{formatAmount(summary?.totalIncome ?? 0)}</strong></div>
                  <div className="stat"><span>Total Expense</span><strong>{formatAmount(summary?.totalExpense ?? 0)}</strong></div>
                  <div className="stat"><span>Net Balance</span><strong>{formatAmount(summary?.netBalance ?? 0)}</strong></div>
                </section>

                <section className="grid">
                  <div className="card">
                    <h2>Create Record</h2>
                    <div className="form-grid">
                      <input type="number" min="0" step="1" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) || 0 })} />
                      <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                        <option value="income">Income</option>
                        <option value="expense">Expense</option>
                      </select>
                      <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Category" />
                      <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                      <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notes" />
                      <button className="btn primary" onClick={createRecord}>Create</button>
                    </div>
                  </div>

                  <div className="card">
                    <h2>Monthly Trend</h2>
                    <LineChart data={monthly} />
                    <div className="legend">
                      <span className="dot income" /> Income
                      <span className="dot expense" /> Expense
                    </div>
                  </div>
                </section>
              </>
            )}

            {tab === "records" && (
              <section className="card">
                <div className="card-header">
                  <h2>Records</h2>
                  <button className="btn primary" onClick={exportCSV}>Export CSV</button>
                </div>

                <div className="filters">
                  <input placeholder="Type" value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value })} />
                  <input placeholder="Category" value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })} />
                  <input placeholder="Search" value={filters.q} onChange={e => setFilters({ ...filters, q: e.target.value })} />
                  <button className="btn" onClick={loadRecords}>Apply</button>
                </div>

                <div className="records-table">
                  <div className="records-header">
                    <div>ID</div><div>Category</div><div>Type</div><div>Amount</div><div>Date</div><div className="align-right">Actions</div>
                  </div>
                  {records.map(r => (
                    <div className="records-row" key={r.id}>
                      <div className="mono">{r.id}</div>
                      <div className="record-category">{r.category}</div>
                      <div>
                        <span className={`pill ${r.type === "income" ? "pill-income" : "pill-expense"}`}>
                          {r.type}
                        </span>
                      </div>
                      <div className="record-amount">{formatAmount(r.amount)}</div>
                      <div>{formatDate(r.date)}</div>
                      <div className="records-actions">
                        <button className="btn danger" onClick={() => deleteRecord(r.id)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {tab === "analytics" && (
              <section className="card">
                <h2>Category Totals</h2>
                <BarChart data={categoryTotals} />
              </section>
            )}

            {tab === "users" && user?.role === "admin" && (
              <section className="card">
                <h2>Create User</h2>
                <div className="form-grid">
                  <input placeholder="Name" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
                  <input placeholder="Email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                  <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                    <option value="viewer">Viewer</option>
                    <option value="analyst">Analyst</option>
                    <option value="admin">Admin</option>
                  </select>
                  <select value={newUser.status} onChange={e => setNewUser({ ...newUser, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <input placeholder="Password" type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
                  <button className="btn primary" onClick={createUser}>Create User</button>
                </div>

                <h2 style={{ marginTop: "20px" }}>Users</h2>
                <div className="table">
                  <div className="row header users-row">
                    <div>ID</div><div>Name</div><div>Email</div><div>Role</div><div>Status</div><div>Actions</div>
                  </div>
                  {users.map(u => (
                    <div className="row users-row" key={u.id}>
                      <div>{u.id}</div>
                      <div>
                        {editingUserId === u.id ? (
                          <input value={editUserForm.name} onChange={e => setEditUserForm({ ...editUserForm, name: e.target.value })} />
                        ) : u.name}
                      </div>
                      <div>{u.email}</div>
                      <div>
                        {editingUserId === u.id ? (
                          <select value={editUserForm.role} onChange={e => setEditUserForm({ ...editUserForm, role: e.target.value })}>
                            <option value="viewer">Viewer</option>
                            <option value="analyst">Analyst</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : u.role}
                      </div>
                      <div>
                        {editingUserId === u.id ? (
                          <select value={editUserForm.status} onChange={e => setEditUserForm({ ...editUserForm, status: e.target.value })}>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        ) : u.status}
                      </div>
                      <div className="actions">
                        {editingUserId === u.id ? (
                          <>
                            <button className="btn primary" onClick={() => saveUser(u.id)}>Save</button>
                            <button className="btn ghost" onClick={() => setEditingUserId(null)}>Cancel</button>
                          </>
                        ) : (
                          <>
                            <button className="btn ghost" onClick={() => startEditUser(u)}>Edit</button>
                            <button className="btn danger" onClick={() => toggleUserStatus(u)}>
                              {u.status === "active" ? "Deactivate" : "Activate"}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {tab === "audit" && user?.role === "admin" && (
              <section className="card">
                <div className="card-header">
                  <h2>Audit Logs</h2>
                  <button className="btn primary" onClick={loadAudits}>Refresh</button>
                </div>
                <div className="table">
                  <div className="row header audit-row">
                    <div>ID</div><div>Action</div><div>Resource</div><div>User</div><div>Date</div>
                  </div>
                  {audits.map(a => (
                    <div className="row audit-row" key={a.id}>
                      <div>{a.id}</div>
                      <div>{a.action}</div>
                      <div>{a.resource}</div>
                      <div>{a.user_name || "System"}</div>
                      <div>{formatDate(a.record_date)}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
