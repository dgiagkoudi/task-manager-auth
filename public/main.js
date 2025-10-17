async function apiFetch(url, options = {}, retry = true) {
  const token = localStorage.getItem("token");
  const headers = options.headers || {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  headers["Content-Type"] = headers["Content-Type"] || "application/json";
  options.headers = headers;
  options.credentials = "include";

  const res = await fetch(url, options);
  if (res.status === 401 && retry) {
    const refreshRes = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
    if (refreshRes.ok) {
      const data = await refreshRes.json();
      localStorage.setItem("token", data.token);
      return apiFetch(url, options, false);
    } else {
      logout();
      throw new Error("Authentication required");
    }
  }
  return res;
}

function showPage(pageId) {
  document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");

  if (pageId === "tasksPage") {
    document.body.className = "tasks-bg";
    loadTasks();
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (user) document.getElementById("tasksHeading").textContent = `${user.username}'s tasks`;
  } else {
    document.body.className = "auth-bg";
  }
}

function clearErrors() {
  document.getElementById("loginErrorMessage").textContent = "";
  document.getElementById("registerErrorMessage").textContent = "";
  document.getElementById("taskErrorMessage").textContent = "";
}

// auth
async function register(e) {
  e.preventDefault();
  clearErrors();
  const username = document.getElementById("registerUsername").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value.trim();

  if (!username || !email || !password) {
    document.getElementById("registerErrorMessage").textContent = "Όλα τα πεδία απαιτούνται";
    return;
  }

  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, email, password }),
    });
    const data = await res.json();
    if (res.ok) {
      alert("Εγγραφή επιτυχής! Κάνε login.");
      showPage("loginPage");
    } else {
      document.getElementById("registerErrorMessage").textContent = data.error || "Σφάλμα";
    }
  } catch (err) {
    console.error(err);
    document.getElementById("registerErrorMessage").textContent = "Σφάλμα δικτύου";
  }
}

async function login(e) {
  e.preventDefault();
  clearErrors();
  const identifier = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  if (!identifier || !password) {
    document.getElementById("loginErrorMessage").textContent = "Όλα τα πεδία απαιτούνται";
    return;
  }

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ identifier, password }),
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      showPage("tasksPage");
    } else {
      document.getElementById("loginErrorMessage").textContent = data.error || "Σφάλμα";
    }
  } catch (err) {
    console.error(err);
    document.getElementById("loginErrorMessage").textContent = "Σφάλμα δικτύου";
  }
}

async function forgotPassword(e) {
  e.preventDefault();
  const email = document.getElementById("forgotEmail").value.trim();
  if (!email) return;

  try {
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = await res.json();

    if (res.ok) {
      alert("Στάλθηκε σύνδεσμος επαναφοράς στο email σας.");
      showPage("loginPage");
    } else {
      document.getElementById("forgotErrorMessage").textContent = data.error || "Σφάλμα";
    }
  } catch (err) {
    console.error(err);
    document.getElementById("forgotErrorMessage").textContent = "Σφάλμα δικτύου";
  }
}

async function resetPassword(e) {
  e.preventDefault();
  clearErrors();
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const newPassword = document.getElementById("newPassword").value.trim();

  if (!token || !newPassword) {
    return document.getElementById("resetErrorMessage").textContent = "Λείπουν δεδομένα";
  }

  try {
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword })
    });
    const data = await res.json();

    if (res.ok) {
      alert("Ο κωδικός άλλαξε επιτυχώς!");
      showPage("loginPage");
    } else {
      document.getElementById("resetErrorMessage").textContent = data.error || "Σφάλμα";
    }
  } catch (err) {
    console.error(err);
    document.getElementById("resetErrorMessage").textContent = "Σφάλμα δικτύου";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("forgotForm").addEventListener("submit", forgotPassword);
  document.getElementById("resetForm").addEventListener("submit", resetPassword);
});

async function logout() {
  try { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); } catch(err){}
  finally {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    showPage("loginPage");
  }
}

// tasks
async function loadTasks() {
  const taskList = document.getElementById("taskList");
  taskList.innerHTML = "<li>Φόρτωση...</li>";
  clearErrors();
  try {
    const res = await apiFetch("/api/tasks", { method: "GET" });
    if (!res.ok) {
      const err = await res.json();
      document.getElementById("taskErrorMessage").textContent = err.error || "Σφάλμα";
      taskList.innerHTML = "";
      return;
    }
    const tasks = await res.json();
    taskList.innerHTML = "";

    tasks.forEach(task => {
      const li = document.createElement("li");
      if (task.done) li.classList.add("done");

      const span = document.createElement("span");
      span.textContent = task.title;

      const toggleBtn = document.createElement("button");
      toggleBtn.innerHTML = task.done ? "↩" : "✔";
      toggleBtn.classList.add("btn", "toggle");
      toggleBtn.onclick = () => toggleTask(task);

      const deleteBtn = document.createElement("button");
      deleteBtn.innerHTML = "🗑️";
      deleteBtn.classList.add("btn", "delete");
      deleteBtn.onclick = () => deleteTask(task.id);

      li.appendChild(span);
      li.appendChild(toggleBtn);
      li.appendChild(deleteBtn);
      taskList.appendChild(li);
    });

    if(tasks.length === 0) taskList.innerHTML = "<li>Δεν υπάρχουν εργασίες</li>";

  } catch (err) {
    console.error(err);
    document.getElementById("taskErrorMessage").textContent = "Σφάλμα δικτύου";
    taskList.innerHTML = "";
  }
}

async function addTask(e) {
  e.preventDefault();
  clearErrors();
  const title = document.getElementById("taskTitle").value.trim();
  if (!title) {
    document.getElementById("taskErrorMessage").textContent = "Ο τίτλος της εργασίας απαιτείται";
    return;
  }

  try {
    const res = await apiFetch("/api/tasks", { method: "POST", body: JSON.stringify({ title }) });
    if (!res.ok) {
      const data = await res.json();
      document.getElementById("taskErrorMessage").textContent = data.error || "Σφάλμα";
      return;
    }
    document.getElementById("taskTitle").value = "";
    loadTasks();
  } catch (err) {
    console.error(err);
    document.getElementById("taskErrorMessage").textContent = "Σφάλμα δικτύου";
  }
}

async function toggleTask(task) {
  try {
    await apiFetch(`/api/tasks/${task.id}`, { method: "PUT", body: JSON.stringify({ title: task.title, done: !task.done }) });
    loadTasks();
  } catch (err) {
    console.error(err);
  }
}

async function deleteTask(id) {
  try {
    await apiFetch(`/api/tasks/${id}`, { method: "DELETE" });
    loadTasks();
  } catch (err) {
    console.error(err);
  }
}

function filterTasks(mode) {
  const lis = Array.from(document.querySelectorAll("#taskList li"));
  lis.forEach(li => li.style.display = "");
  if (mode === "done") lis.forEach(li => { if(!li.classList.contains("done")) li.style.display = "none"; });
  if (mode === "pending") lis.forEach(li => { if(li.classList.contains("done")) li.style.display = "none"; });
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("registerForm").addEventListener("submit", register);
  document.getElementById("loginForm").addEventListener("submit", login);
  document.getElementById("addTaskBtn").addEventListener("click", addTask);
  document.getElementById("logout-btn").addEventListener("click", logout);

  const token = localStorage.getItem("token");
  const user = localStorage.getItem("user");
  if(token && user) showPage("tasksPage");
  else showPage("loginPage");
});
