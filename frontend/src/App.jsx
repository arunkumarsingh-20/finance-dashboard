import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API = "/api/v1";

async function apiFetch(url, options = {}, retries = 5, delay = 800) {
  const res = await fetch(url, options);
  if (res.status === 429 && retries > 0) {
    await new Promise(r => setTimeout(r, delay));
    return apiFetch(url, options, retries - 1, delay * 1.5);
  }
  return res;
}

function LineChart({ data }) {
  if (!data?.length) return <div className="empty">No data</div>;
  const width = 520;
  const height = 160;
  const pad = 20;

  const maxVal = Math.max(
    ...data.map(d => Math.max(d.income || 0, d.expense || 0)),
    1
  );

  const xStep = (width - pad * 2) / (data.length - 1 || 1);

  const toY = v => height - pad - (v / maxVal) * (height - pad * 2);
  const toX = i => pad + i * xStep;

  const incomePoints = data.map((d, i) => `${toX(i)},${toY(d.income || 0)}`).join(" ");
  const expensePoints = data.map((d, i) => `${toX(i)},${toY(d.expense || 0)}`).join(" ");

  return (
    <svg className="chart" viewBox={`0 0 ${width} ${height}`}>
      <polyline points={incomePoints} fill="none" stroke="#22c55e" strokeWidth="3" />
      <polyline points={expensePoints} fill="none" stroke="#ef4444" strokeWidth="3" />
    </svg>
  );
}

function BarChart({ data }) {
  if (!data?.length) return <div className="empty">No data</div>;
  const maxVal = Math.max(...data.map(d => (d.total || 0)), 1);
  return (
    <div className="bars">
      {data.map((d) => (
        <div className="bar-row" key={d.category}>
          <span>{d.category}</span>
          <div className="bar">
            <div className="bar-fill" style={{ width: `${(d.total / maxVal) * 100}%` }} />
          </div>
          <strong>{d.total}</strong>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("dashboard");

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

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ amount: 0, type: "income", category: "", date: "", notes: "" });

  const authHeaders = useMemo(() => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }), [token]);

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
      const withTotal = (data || []).map(d => ({ ...d, total: (d.income || 0) + (d.expense || 0) }));
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
      loadRecords();
      loadSummary();
      if (user?.role === "admin") loadAudits();
    } else {
      alert(data.error || "Create failed");
    }
  }

  async function saveEdit(id) {
    const res = await apiFetch(`${API}/records/${id}`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify(editForm)
    });
    const data = await res.json();
    if (res.ok) {
      setEditingId(null);
      loadRecords();
      loadSummary();
      if (user?.role === "admin") loadAudits();
    } else {
      alert(data.error || "Update failed");
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
      if (user?.role === "admin") loadAudits();
    }
  }

  function startEdit(r) {
    setEditingId(r.id);
    setEditForm({
      amount: r.amount,
      type: r.type,
      category: r.category,
      date: r.date,
      notes: r.notes || ""
    });
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
          {user && (
            <div className="user-card">
              <div>
                <div className="user-name">{user?.name}</div>
                <div className="user-role">{user?.role}</div>
              </div>
              <button className="btn ghost" onClick={logout}>Logout</button>
            </div>
          )}
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
                  <div className="stat">
                    <span>Total Income</span>
                    <strong>{summary?.totalIncome ?? "--"}</strong>
                  </div>
                  <div className="stat">
                    <span>Total Expense</span>
                    <strong>{summary?.totalExpense ?? "--"}</strong>
                  </div>
                  <div className="stat">
                    <span>Net Balance</span>
                    <strong>{summary?.netBalance ?? "--"}</strong>
                  </div>
                </section>

                <section className="grid">
                  <div className="card">
                    <h2>Create Record</h2>
                    <div className="form-grid">
                      <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} />
                      <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                        <option value="income">Income</option>
                        <option value="expense">Expense</option>
                      </select>
                      <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Category" />
                      <input
                        type="date"
                        value={form.date}
                        onChange={e => setForm({ ...form, date: e.target.value })}
                      />
                      <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notes" />
                      <button className="btn primary" onClick={createRecord}>Create</button>
                    </div>
                  </div>

                  <div className="card">
                    <h2>Monthly Trend</h2>
                    <LineChart data={monthly} />
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
                  <input placeholder="Type (income/expense)" value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value })} />
                  <input placeholder="Category" value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })} />
                  <input placeholder="Search" value={filters.q} onChange={e => setFilters({ ...filters, q: e.target.value })} />
                  <button className="btn" onClick={loadRecords}>Apply</button>
                </div>

                <div className="table">
                  <div className="row header">
                    <div>ID</div><div>Amount</div><div>Type</div><div>Category</div><div>Date</div><div>Actions</div>
                  </div>
                  {records.map(r => (
                    <div className="row" key={r.id}>
                      <div>{r.id}</div>
                      <div>
                        {editingId === r.id ? (
                          <input value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: Number(e.target.value) })} />
                        ) : r.amount}
                      </div>
                      <div>
                        {editingId === r.id ? (
                          <select value={editForm.type} onChange={e => setEditForm({ ...editForm, type: e.target.value })}>
                            <option value="income">Income</option>
                            <option value="expense">Expense</option>
                          </select>
                        ) : r.type}
                      </div>
                      <div>
                        {editingId === r.id ? (
                          <input value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })} />
                        ) : r.category}
                      </div>
                      <div>
                        {editingId === r.id ? (
                          <input
                            type="date"
                            value={editForm.date}
                            onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                          />

                        ) : r.date}
                      </div>
                      <div className="actions">
                        {editingId === r.id ? (
                          <>
                            <button className="btn primary" onClick={() => saveEdit(r.id)}>Save</button>
                            <button className="btn ghost" onClick={() => setEditingId(null)}>Cancel</button>
                          </>
                        ) : (
                          <>
                            <button className="btn ghost" onClick={() => startEdit(r)}>Edit</button>
                            <button className="btn danger" onClick={() => deleteRecord(r.id)}>Delete</button>
                          </>
                        )}
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

            {tab === "users" && (
              <section className="card">
                <h2>Users</h2>
                <div className="table">
                  <div className="row header users-row">
                    <div>ID</div><div>Name</div><div>Email</div><div>Role</div><div>Status</div>
                  </div>
                  {users.map(u => (
                    <div className="row users-row" key={u.id}>
                      <div>{u.id}</div>
                      <div>{u.name}</div>
                      <div>{u.email}</div>
                      <div>{u.role}</div>
                      <div>{u.status}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {tab === "audit" && (
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
                      <div>{a.record_date || "-"}</div>
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
