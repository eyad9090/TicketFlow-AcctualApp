/* global API_BASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY */

// -----------------------------
// Simple auth (Supabase)
// -----------------------------
let accessToken = null;

function $(id) {
  return document.getElementById(id);
}

const els = {
  authCard: $("authCard"),
  appCard: $("appCard"),
  authEmail: $("authEmail"),
  authPassword: $("authPassword"),
  authBtn: $("authBtn"),
  authToggle: $("authToggle"),
  logoutBtn: $("logoutBtn"),
  authMessage: $("authMessage"),

  form: $("employeeForm"),
  id: $("employeeId"),
  name: $("name"),
  position: $("position"),
  department: $("department"),
  salary: $("salary"),
  submitBtn: $("submitBtn"),
  cancelBtn: $("cancelBtn"),
  tbody: $("employeesTbody"),
  search: $("search"),
  message: $("message"),
  apiBase: $("apiBase"),
};

els.apiBase.textContent = API_BASE_URL;

function showAuthMessage(text, type = "info") {
  els.authMessage.hidden = false;
  els.authMessage.textContent = text;
  els.authMessage.className = `message ${type}`;
}

function hideAuthMessage() {
  els.authMessage.hidden = true;
}

function showMessage(text, type = "info") {
  els.message.hidden = false;
  els.message.textContent = text;
  els.message.className = `message ${type}`;
  setTimeout(() => (els.message.hidden = true), 3500);
}

function normalize(str) {
  return (str || "").toLowerCase().trim();
}

async function supabaseRequest(path, body) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error_description || json?.msg || JSON.stringify(json);
    throw new Error(msg || `Auth failed (${res.status})`);
  }
  return json;
}

async function signIn(email, password) {
  return supabaseRequest("/auth/v1/token?grant_type=password", { email, password });
}

async function signUp(email, password) {
  return supabaseRequest("/auth/v1/signup", { email, password });
}

function setSession(token) {
  accessToken = token;
  if (token) {
    localStorage.setItem("tf_access_token", token);
  } else {
    localStorage.removeItem("tf_access_token");
  }
}

function loadSession() {
  accessToken = localStorage.getItem("tf_access_token");
}

function showApp() {
  els.authCard.hidden = true;
  els.appCard.hidden = false;
}

function showAuth() {
  els.authCard.hidden = false;
  els.appCard.hidden = true;
}

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed (${res.status})`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function renderEmployees(employees) {
  const q = normalize(els.search.value);
  const filtered = q ? employees.filter((e) => normalize(e.name).includes(q)) : employees;

  els.tbody.innerHTML = "";
  for (const e of filtered) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${e.id ?? ""}</td>
      <td>${e.name ?? ""}</td>
      <td>${e.position ?? ""}</td>
      <td>${e.department ?? ""}</td>
      <td>${e.salary ?? ""}</td>
      <td>${formatDate(e.createdAt)}</td>
      <td class="cell-actions"></td>
    `;

    const actionsTd = tr.querySelector(".cell-actions");

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.className = "secondary";
    editBtn.onclick = () => startEdit(e);

    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete";
    delBtn.className = "danger";
    delBtn.onclick = async () => {
      if (!confirm(`Delete employee ${e.name}?`)) return;
      await api(`/employees/${e.id}`, { method: "DELETE" });
      showMessage("Deleted", "success");
      await refresh();
    };

    actionsTd.appendChild(editBtn);
    actionsTd.appendChild(delBtn);

    els.tbody.appendChild(tr);
  }
}

function resetForm() {
  els.id.value = "";
  els.form.reset();
  els.cancelBtn.hidden = true;
  els.submitBtn.textContent = "Save";
}

function startEdit(e) {
  els.id.value = e.id;
  els.name.value = e.name ?? "";
  els.position.value = e.position ?? "";
  els.department.value = e.department ?? "";
  els.salary.value = e.salary ?? "";
  els.cancelBtn.hidden = false;
  els.submitBtn.textContent = "Update";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

let cache = [];

async function refresh() {
  cache = await api("/employees");
  renderEmployees(cache);
}

els.search.addEventListener("input", () => renderEmployees(cache));

els.cancelBtn.addEventListener("click", () => {
  resetForm();
});

els.form.addEventListener("submit", async (ev) => {
  ev.preventDefault();

  const payload = {
    name: els.name.value.trim(),
    position: els.position.value.trim(),
    department: els.department.value.trim(),
    salary: Number(els.salary.value),
  };

  try {
    if (els.id.value) {
      await api(`/employees/${els.id.value}`, { method: "PUT", body: JSON.stringify(payload) });
      showMessage("Updated", "success");
    } else {
      await api(`/employees`, { method: "POST", body: JSON.stringify(payload) });
      showMessage("Created", "success");
    }

    resetForm();
    await refresh();
  } catch (err) {
    showMessage(err.message || String(err), "error");
  }
});

// -----------------------------
// Auth UI wiring
// -----------------------------
let mode = "signin"; // or signup

function setMode(next) {
  mode = next;
  els.authBtn.textContent = mode === "signin" ? "Sign in" : "Sign up";
  els.authToggle.textContent = mode === "signin" ? "Create account" : "I already have an account";
  hideAuthMessage();
}

els.authToggle.addEventListener("click", () => {
  setMode(mode === "signin" ? "signup" : "signin");
});

els.logoutBtn.addEventListener("click", () => {
  setSession(null);
  showAuth();
});

els.authBtn.addEventListener("click", async () => {
  const email = els.authEmail.value.trim();
  const password = els.authPassword.value;
  if (!email || !password) {
    showAuthMessage("Enter email and password", "error");
    return;
  }

  els.authBtn.disabled = true;
  try {
    if (mode === "signin") {
      const json = await signIn(email, password);
      setSession(json.access_token);
      showApp();
      await refresh();
    } else {
      const json = await signUp(email, password);
      // If email confirmation is ON, user must confirm before sign-in works.
      // We'll still try to sign in immediately in case confirmation is OFF.
      try {
        const signInJson = await signIn(email, password);
        setSession(signInJson.access_token);
        showApp();
        await refresh();
      } catch {
        showAuthMessage("Account created. Please check your email to confirm, then sign in.", "success");
        setMode("signin");
      }
    }
  } catch (err) {
    showAuthMessage(err.message || String(err), "error");
  } finally {
    els.authBtn.disabled = false;
  }
});

// Boot
loadSession();
setMode("signin");

if (accessToken) {
  showApp();
  refresh().catch((err) => showMessage(`Failed to load employees: ${err.message}`, "error"));
} else {
  showAuth();
}
