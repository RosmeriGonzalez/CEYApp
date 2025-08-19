const students = [
    'Estudiante 1',
    'Estudiante 2',
    'Estudiante 3',
    'Estudiante 4',
    'Estudiante 5',
    'Estudiante 6',
    'Estudiante 7',
    'Estudiante 8',
    'Estudiante 9',
    'Estudiante 10'
];

const ADMIN_USER = 'CEYAdmin';
const ADMIN_PASS = 'CEYAdmin2025';
const ALT_USER = 'Alternativo';
const ALT_PASS = 'Alternativo2025';
const DEFAULT_PASS = '1234';

let currentUser = '';
let currentRole = '';

function loadVotes() {
    return JSON.parse(localStorage.getItem('votes') || '{}');
}
function saveVotes(v) {
    localStorage.setItem('votes', JSON.stringify(v));
}
function loadVotedUsers() {
    return JSON.parse(localStorage.getItem('votedUsers') || '{}');
}
function saveVotedUsers(v) {
    localStorage.setItem('votedUsers', JSON.stringify(v));
}

function renderCandidates() {
    const container = document.getElementById('candidates-container');
    container.innerHTML = '';
    students.forEach((name, idx) => {
        const col = document.createElement('div');
        col.className = 'col-12 col-md-6 col-lg-4 mb-3';
        col.innerHTML = `
        <div class="card candidate-card h-100">
            <div class="card-body">
                <div class="form-check">
                    <input class="form-check-input" type="radio" name="candidate" id="cand${idx}" value="${name}">
                    <label class="form-check-label" for="cand${idx}">
                        <i class="fa fa-user-graduate"></i> ${name}
                    </label>
                </div>
            </div>
        </div>`;
        container.appendChild(col);
    });
}

function updateResults() {
    const tbody = document.getElementById('results-body');
    if (!tbody) return;
    const votes = loadVotes();
    tbody.innerHTML = '';
    students.forEach(name => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${name}</td><td>${votes[name] || 0}</td>`;
        tbody.appendChild(tr);
    });
}

function exportResults() {
    const votes = loadVotes();
    let csv = 'Estudiante,Votos\n';
    students.forEach(s => {
        csv += `${s},${votes[s] || 0}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resultados.csv';
    a.click();
    URL.revokeObjectURL(url);
}

function resetResults() {
    if (confirm('¿Seguro que deseas reiniciar las votaciones?')) {
        localStorage.removeItem('votes');
        localStorage.removeItem('votedUsers');
        updateResults();
        alert('Votaciones reiniciadas');
    }
}

// Login handling
document.getElementById('login-form').addEventListener('submit', e => {
    e.preventDefault();
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();
    const error = document.getElementById('login-error');
    error.textContent = '';

    if (user === ADMIN_USER && pass === ADMIN_PASS) {
        currentRole = 'admin';
    } else if (user === ALT_USER && pass === ALT_PASS) {
        currentRole = 'alternate';
    } else if (user.includes('@') && pass === DEFAULT_PASS) {
        currentRole = 'user';
    } else {
        error.textContent = 'Credenciales inválidas';
        return;
    }
    currentUser = user;

    document.getElementById('login-section').classList.add('d-none');
    document.getElementById('voting-section').classList.remove('d-none');
    if (currentRole === 'admin') {
        document.getElementById('admin-section').classList.remove('d-none');
        updateResults();
    }

    renderCandidates();

    if (currentRole !== 'alternate') {
        const votedUsers = loadVotedUsers();
        if (votedUsers[currentUser]) {
            document.getElementById('vote-message').textContent = 'Ya has votado.';
            document.getElementById('submit-vote').disabled = true;
        }
    }
});

// Vote handling
document.getElementById('submit-vote').addEventListener('click', () => {
    const selected = document.querySelector('input[name="candidate"]:checked');
    const msg = document.getElementById('vote-message');
    msg.textContent = '';
    if (!selected) {
        msg.textContent = 'Selecciona un candidato.';
        msg.className = 'text-danger';
        return;
    }

    if (currentRole !== 'alternate') {
        const votedUsers = loadVotedUsers();
        if (votedUsers[currentUser]) {
            msg.textContent = 'Ya has votado.';
            msg.className = 'text-danger';
            return;
        }
    }

    const votes = loadVotes();
    votes[selected.value] = (votes[selected.value] || 0) + 1;
    saveVotes(votes);

    if (currentRole !== 'alternate') {
        const votedUsers = loadVotedUsers();
        votedUsers[currentUser] = selected.value;
        saveVotedUsers(votedUsers);
        document.getElementById('submit-vote').disabled = true;
    }

    msg.textContent = '¡Gracias por tu voto!';
    msg.className = 'text-success';
    updateResults();
});

// Sync results across tabs/devices when storage changes
window.addEventListener('storage', updateResults);

const exportBtn = document.getElementById('export-results');
if (exportBtn) {
    exportBtn.addEventListener('click', exportResults);
}
const resetBtn = document.getElementById('reset-results');
if (resetBtn) {
    resetBtn.addEventListener('click', resetResults);
}
