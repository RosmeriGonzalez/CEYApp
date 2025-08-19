// js/app.js

(() => {
  const CFG = window.CEYAPP_CONFIG;
  const LS_KEYS = {
    students: `students_${CFG.version}`,   // [nombres]
    votes:    `votes_${CFG.version}`,      // { nombre: count }
    ballots:  `ballots_${CFG.version}`,    // { email: { votedAt, selection: nombre } }
    session:  `session_${CFG.version}`     // { id, role } (id=usuario o correo)
  };

  // ---------- Utilidad LocalStorage ----------
  const getLS = (k, fb) => {
    try { return JSON.parse(localStorage.getItem(k)) ?? fb; }
    catch { return fb; }
  };
  const setLS = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const rmLS  = (k) => localStorage.removeItem(k);

  // ---------- Estado ----------
  let toastInstance = null;

  // ---------- DOM ----------
  const el = (id) => document.getElementById(id);
  const loginSection = el("login-section");
  const votingSection = el("voting-section");
  const adminSection  = el("admin-section");
  const sessionPill   = el("session-pill");
  const btnLogout     = el("btn-logout");
  const studentsContainer = el("students-container");
  const resultsBody   = el("results-body");
  const totalVotos    = el("total-votos");
  const voteAlert     = el("vote-alert");
  const myVoteBox     = el("my-vote");
  const myVoteBody    = el("my-vote-body");

  // Admin gestione
  const formAddStudent = el("form-add-student");
  const newStudentInput = el("new-student");
  const studentsAdminList = el("students-admin-list");

  // ---------- Helpers UI ----------
  const showToast = (message, type = "primary") => {
    const toastEl = el("app-toast");
    const bodyEl = el("toast-body");
    bodyEl.textContent = message;
    toastEl.className = `toast align-items-center text-bg-${type} border-0`;
    toastInstance ??= new bootstrap.Toast(toastEl, { delay: 2200 });
    toastInstance.show();
  };

  const showAlert = (containerId, message, type = "danger") => {
    const container = el(containerId);
    container.innerHTML = `
      <div class="alert alert-${type} d-flex align-items-center py-2" role="alert">
        <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'} me-2"></i>
        <div>${message}</div>
      </div>`;
  };
  const clearAlert = (containerId) => el(containerId).innerHTML = "";

  // ---------- Datos ----------
  const getStudents = () => getLS(LS_KEYS.students, null) ?? (() => {
    setLS(LS_KEYS.students, CFG.defaultStudents);
    return CFG.defaultStudents.slice();
  })();
  const setStudents = (arr) => setLS(LS_KEYS.students, arr);

  const getVotes  = () => getLS(LS_KEYS.votes, {});
  const setVotes  = (obj) => setLS(LS_KEYS.votes, obj);

  const getBallots = () => getLS(LS_KEYS.ballots, {});
  const setBallots = (obj) => setLS(LS_KEYS.ballots, obj);

  const getSession = () => getLS(LS_KEYS.session, null);
  const setSession = (s) => setLS(LS_KEYS.session, s);

  const clearAllData = () => {
    rmLS(LS_KEYS.votes);
    rmLS(LS_KEYS.ballots);
  };

  // ---------- Render votación ----------
  const renderStudentsForVoting = () => {
    const students = getStudents();
    studentsContainer.innerHTML = "";
    students.forEach((name, idx) => {
      const col = document.createElement("div");
      col.className = "col-12 col-sm-6 col-lg-4";
      col.innerHTML = `
        <div class="card student-card shadow-sm h-100">
          <div class="card-body d-flex gap-3 align-items-center">
            <div class="form-check m-0">
              <input class="form-check-input" type="radio" name="student" id="stu_${idx}" value="${name}">
            </div>
            <label for="stu_${idx}" class="form-check-label fs-6 fw-semibold flex-grow-1">
              <i class="fa-solid fa-user-graduate me-2 text-primary"></i>${name}
            </label>
          </div>
        </div>
      `;
      studentsContainer.appendChild(col);
    });
  };

  // ---------- Render resultados (Admin) ----------
  const renderAdminResults = () => {
    const session = getSession();
    if (!session || session.role !== "admin") return;

    const students = getStudents();
    const votes = getVotes();
    const total = Object.values(votes).reduce((a, b) => a + b, 0);
    totalVotos.textContent = `Total votos: ${total}`;

    resultsBody.innerHTML = "";
    students.forEach(st => {
      const count = votes[st] || 0;
      const pct = total ? Math.round((count / total) * 100) : 0;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${st}</td>
        <td class="text-end">${count}</td>
        <td style="width:45%">
          <div class="progress" role="progressbar" aria-label="${st}" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
            <div class="progress-bar" style="width:${pct}%">${pct}%</div>
          </div>
        </td>
      `;
      resultsBody.appendChild(tr);
    });

    // También refrescar listado admin de estudiantes
    renderAdminStudentList();
  };

  // ---------- Render listado admin estudiantes ----------
  const renderAdminStudentList = () => {
    const students = getStudents();
    studentsAdminList.innerHTML = "";
    students.forEach((name, idx) => {
      const item = document.createElement("div");
      item.className = "list-group-item d-flex align-items-center justify-content-between";
      item.innerHTML = `
        <span>${idx + 1}. ${name}</span>
        <div class="btn-group">
          <button class="btn btn-sm btn-outline-danger" data-action="del" data-index="${idx}">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      `;
      studentsAdminList.appendChild(item);
    });
  };

  // ---------- Voto del usuario ----------
  const hydrateMyVote = (userId) => {
    const session = getSession();
    if (!session) return;

    // Alternativo puede votar múltiples veces, no bloqueamos
    if (session.role === "alt") {
      myVoteBox.classList.add("d-none");
      return;
    }

    const ballots = getBallots();
    const record = ballots[userId];
    const alreadyVoted = !!record;

    const submitBtn = el("submit-vote");
    submitBtn.disabled = alreadyVoted;

    if (!alreadyVoted) {
      myVoteBox.classList.add("d-none");
      return;
    }

    // Mostrar la selección
    myVoteBox.classList.remove("d-none");
    myVoteBody.innerHTML = "";
    const item = document.createElement("div");
    item.className = "list-group-item d-flex justify-content-between align-items-center";
    item.innerHTML = `<span><strong>Seleccionaste:</strong> ${record.selection}</span>
                      <span class="badge text-bg-success">Registrado</span>`;
    myVoteBody.appendChild(item);

    // Marcar radio visualmente
    const input = document.querySelector(`input[name="student"][value="${CSS.escape(record.selection)}"]`);
    if (input) input.checked = true;

    showAlert("vote-alert", "Ya registraste tu voto. Gracias por participar.", "success");
  };

  // ---------- UI sesión ----------
  const setUIForSession = (session) => {
    if (!session) {
      // sin sesión
      loginSection.classList.remove("d-none");
      votingSection.classList.add("d-none");
      adminSection.classList.add("d-none");
      sessionPill.classList.add("d-none");
      btnLogout.classList.add("d-none");
      return;
    }
    // con sesión
    loginSection.classList.add("d-none");
    votingSection.classList.remove("d-none");
    sessionPill.textContent = `${session.id} (${session.role})`;
    sessionPill.classList.remove("d-none");
    btnLogout.classList.remove("d-none");

    renderStudentsForVoting();
    hydrateMyVote(session.id);

    if (session.role === "admin") {
      adminSection.classList.remove("d-none");
      renderAdminResults();
    } else {
      adminSection.classList.add("d-none");
    }
  };

  const logout = () => {
    rmLS(LS_KEYS.session);
    setUIForSession(null);
    showToast("Sesión cerrada", "secondary");
  };

  // ---------- Validaciones ----------
  const validateLoginForm = () => {
    const form = document.getElementById("login-form");
    form.classList.add("was-validated");
    return form.checkValidity();
  };

  // ---------- Login ----------
  document.getElementById("login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    clearAlert("login-alert");

    if (!validateLoginForm()) {
      showAlert("login-alert", "Revisa los campos.", "danger");
      return;
    }

    const user = document.getElementById("username").value.trim();
    const pass = document.getElementById("password").value.trim();
    const userLower = user.toLowerCase();

    // Admin exacto (no es correo)
    if (user === CFG.adminUser && pass === CFG.adminPass) {
      const session = { id: user, role: "admin" };
      setSession(session);
      showToast("Bienvenido, administrador.", "primary");
      setUIForSession(session);
      return;
    }

    // Alternativo exacto
    if (user === CFG.altUser && pass === CFG.altPass) {
      const session = { id: user, role: "alt" }; // puede votar múltiples veces
      setSession(session);
      showToast("Modo alternativo: votos múltiples habilitados.", "primary");
      setUIForSession(session);
      return;
    }

    // Usuario normal: debe parecer correo y pass ∈ {1,2,3,4}
    const isEmail = user.includes("@") && userLower.indexOf("@") > 0 && userLower.split("@")[1].includes(".");
    const validPass = CFG.normalPasswords.includes(pass);
    if (isEmail && validPass) {
      const session = { id: userLower, role: "user" };
      setSession(session);
      showToast("Acceso concedido. ¡Listo para votar!", "success");
      setUIForSession(session);
      return;
    }

    showAlert("login-alert", "Credenciales inválidas.", "danger");
  });

  // ---------- Votar ----------
  el("submit-vote").addEventListener("click", () => {
    clearAlert("vote-alert");
    const session = getSession();
    if (!session) {
      showAlert("vote-alert", "Debes iniciar sesión.", "danger");
      return;
    }

    const selected = document.querySelector('input[name="student"]:checked');
    if (!selected) {
      showAlert("vote-alert", "Selecciona un estudiante.", "danger");
      return;
    }

    const chosen = selected.value;
    const votes = getVotes();
    const ballots = getBallots();

    // Si no es alternativo, evitar doble voto por usuario
    if (session.role !== "alt" && ballots[session.id]) {
      showAlert("vote-alert", "Ya has votado anteriormente.", "danger");
      el("submit-vote").disabled = true;
      return;
    }

    // Registrar voto
    votes[chosen] = (votes[chosen] || 0) + 1;
    setVotes(votes);

    // Si no es alternativo, guardar boleta por usuario
    if (session.role !== "alt") {
      ballots[session.id] = { votedAt: new Date().toISOString(), selection: chosen };
      setBallots(ballots);
      el("submit-vote").disabled = true;
    }

    // Feedback
    showAlert("vote-alert", "¡Voto registrado con éxito!", "success");
    hydrateMyVote(session.id);
    renderAdminResults(); // por si hay admin en otra pestaña
  });

  // ---------- Admin: export, backup, reset ----------
  el("export-results").addEventListener("click", () => {
    const students = getStudents();
    const votes = getVotes();
    let csv = "estudiante,votos\n";
    students.forEach(s => {
      csv += `${s},${votes[s] || 0}\n`;
    });
    downloadBlob(csv, "text/csv;charset=utf-8;", "resultados.csv");
    showToast("Resultados exportados.", "secondary");
  });

  el("download-backup").addEventListener("click", () => {
    const data = {
      version: CFG.version,
      students: getStudents(),
      votes: getVotes(),
      ballots: getBallots()
    };
    downloadBlob(JSON.stringify(data, null, 2), "application/json", "respaldo_ceyapp.json");
    showToast("Respaldo descargado.", "secondary");
  });

  el("reset-results").addEventListener("click", () => {
    const session = getSession();
    if (!session || session.role !== "admin") return;
    const ok = confirm("¿Seguro que deseas reiniciar votos y boletas? (No borra la lista de estudiantes)");
    if (!ok) return;
    clearAllData();
    renderAdminResults();
    hydrateMyVote(session?.id);
    showToast("Votaciones reiniciadas.", "danger");
  });

  const downloadBlob = (content, mime, filename) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  // ---------- Admin: agregar/eliminar estudiantes ----------
  formAddStudent.addEventListener("submit", (e) => {
    e.preventDefault();
    const session = getSession();
    if (!session || session.role !== "admin") return;

    const name = newStudentInput.value.trim();
    if (!name) return;

    const students = getStudents();
    if (students.length >= 10) {
      showToast("Límite recomendado de 10 estudiantes alcanzado.", "warning");
    }
    if (students.includes(name)) {
      showToast("Ese estudiante ya está en la lista.", "warning");
      return;
    }

    students.push(name);
    setStudents(students);
    newStudentInput.value = "";
    renderStudentsForVoting();
    renderAdminResults();
    showToast("Estudiante agregado.", "success");
  });

  studentsAdminList.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action='del']");
    if (!btn) return;
    const session = getSession();
    if (!session || session.role !== "admin") return;

    const idx = Number(btn.dataset.index);
    const students = getStudents();
    const removed = students.splice(idx, 1);
    setStudents(students);

    // Al eliminar un estudiante, NO borramos votos previos (quedan en resultados si existieran claves sueltas)
    // Si deseas limpiarlos, descomenta:
    // const votes = getVotes();
    // delete votes[removed[0]];
    // setVotes(votes);

    renderStudentsForVoting();
    renderAdminResults();
    showToast("Estudiante eliminado.", "secondary");
  });

  // ---------- Logout ----------
  btnLogout.addEventListener("click", logout);

  // ---------- Sincronización entre pestañas ----------
  window.addEventListener("storage", (ev) => {
    if ([LS_KEYS.votes, LS_KEYS.ballots, LS_KEYS.students].includes(ev.key)) {
      renderAdminResults();
      renderStudentsForVoting();
    }
  });

  // ---------- Carga inicial ----------
  document.addEventListener("DOMContentLoaded", () => {
    // inicializa lista si no existe
    if (!localStorage.getItem(LS_KEYS.students)) {
      setStudents(CFG.defaultStudents);
    }
    const session = getSession();
    setUIForSession(session);
  });
})();