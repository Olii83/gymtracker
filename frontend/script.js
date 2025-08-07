
const app = document.getElementById("app");
const API_URL = "http://localhost:5000/api";

const showPage = (content) => {
    app.innerHTML = content;
};

const apiFetch = async (url, options = {}) => {
    const token = localStorage.getItem("token");
    if (token) {
        options.headers = {
            ...options.headers,
            "Authorization": `Bearer ${token}`
        };
    }
    const response = await fetch(`${API_URL}${url}`, options);
    if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
    }
    return response.json();
};

const updateNav = () => {
    const token = localStorage.getItem("token");
    const isLoggedIn = !!token;

    document.getElementById("login-link").classList.toggle("hidden", isLoggedIn);
    document.getElementById("register-link").classList.toggle("hidden", isLoggedIn);
    document.getElementById("dashboard-link").classList.toggle("hidden", !isLoggedIn);
    document.getElementById("history-link").classList.toggle("hidden", !isLoggedIn);
    document.getElementById("pr-link").classList.toggle("hidden", !isLoggedIn);
    document.getElementById("profile-link").classList.toggle("hidden", !isLoggedIn);
    document.getElementById("logout-link").classList.toggle("hidden", !isLoggedIn);
};

const logout = () => {
    localStorage.removeItem("token");
    updateNav();
    showLogin();
};

const showLogin = () => {
    const content = `
        <div class="card">
            <h2>Anmelden</h2>
            <form id="login-form">
                <div class="form-group">
                    <label for="login-email">E-Mail</label>
                    <input type="email" id="login-email" required>
                </div>
                <div class="form-group">
                    <label for="login-password">Passwort</label>
                    <input type="password" id="login-password" required>
                </div>
                <button type="submit">Anmelden</button>
                <p class="error-message" id="login-error"></p>
                <p><a href="#" id="forgot-password-link">Passwort vergessen?</a></p>
            </form>
        </div>
    `;
    showPage(content);
    document.getElementById("login-form").addEventListener("submit", handleLogin);
    document.getElementById("forgot-password-link").addEventListener("click", showForgotPassword);
};

const showRegister = () => {
    const content = `
        <div class="card">
            <h2>Registrieren</h2>
            <form id="register-form">
                <div class="form-group">
                    <label for="reg-username">Benutzername</label>
                    <input type="text" id="reg-username" required>
                </div>
                <div class="form-group">
                    <label for="reg-email">E-Mail</label>
                    <input type="email" id="reg-email" required>
                </div>
                <div class="form-group">
                    <label for="reg-password">Passwort</label>
                    <input type="password" id="reg-password" required>
                </div>
                <button type="submit">Registrieren</button>
                <p class="error-message" id="register-error"></p>
            </form>
        </div>
    `;
    showPage(content);
    document.getElementById("register-form").addEventListener("submit", handleRegister);
};

const showDashboard = async () => {
    const content = `
        <div class="card">
            <h2>Willkommen im Gym Tracker!</h2>
            <p>Starte ein neues Workout, indem du auf den Button klickst.</p>
            <button id="start-workout-btn">Neues Workout starten</button>
        </div>
        <div class="card">
            <h2>Deine letzten Workouts</h2>
            <ul id="recent-workouts-list"></ul>
        </div>
    `;
    showPage(content);
    document.getElementById("start-workout-btn").addEventListener("click", showWorkoutPage);
    
    try {
        const workouts = await apiFetch("/workouts");
        const list = document.getElementById("recent-workouts-list");
        list.innerHTML = workouts.slice(0, 5).map(w => `<li>${w.date} - <a href="#" data-id="${w.id}" class="workout-detail-link">Details ansehen</a></li>`).join("");
        document.querySelectorAll(".workout-detail-link").forEach(link => {
            link.addEventListener("click", (e) => {
                e.preventDefault();
                showWorkoutDetails(e.target.dataset.id);
            });
        });
    } catch (error) {
        console.error(error);
        alert("Fehler beim Laden der Workouts.");
    }
};

const showProfile = () => {
    const content = `
        <div class="card">
            <h2>Profil bearbeiten</h2>
            <form id="profile-form">
                <div class="form-group">
                    <label for="profile-username">Benutzername</label>
                    <input type="text" id="profile-username" required>
                </div>
                <div class="form-group">
                    <label for="profile-email">E-Mail</label>
                    <input type="email" id="profile-email" required>
                </div>
                <div class="form-group">
                    <label for="profile-password">Neues Passwort</label>
                    <input type="password" id="profile-password">
                    <small>Lasse das Feld leer, um das Passwort nicht zu ändern.</small>
                </div>
                <button type="submit">Speichern</button>
                <p class="error-message" id="profile-error"></p>
                <p class="success-message" id="profile-success"></p>
            </form>
        </div>
    `;
    showPage(content);
    document.getElementById("profile-form").addEventListener("submit", handleProfileUpdate);
};

const handleLogin = async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    const errorEl = document.getElementById("login-error");

    try {
        const data = await apiFetch("/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        localStorage.setItem("token", data.token);
        updateNav();
        showDashboard();
    } catch (error) {
        errorEl.textContent = "Falsche E-Mail oder falsches Passwort.";
    }
};

const handleRegister = async (e) => {
    e.preventDefault();
    const username = document.getElementById("reg-username").value;
    const email = document.getElementById("reg-email").value;
    const password = document.getElementById("reg-password").value;
    const errorEl = document.getElementById("register-error");

    try {
        await apiFetch("/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password })
        });
        showLogin();
        alert("Registrierung erfolgreich! Bitte melden Sie sich an.");
    } catch (error) {
        errorEl.textContent = "Registrierung fehlgeschlagen. Versuchen Sie es erneut.";
    }
};

const handleProfileUpdate = async (e) => {
    e.preventDefault();
    const username = document.getElementById("profile-username").value;
    const email = document.getElementById("profile-email").value;
    const password = document.getElementById("profile-password").value;
    const errorEl = document.getElementById("profile-error");
    const successEl = document.getElementById("profile-success");

    const body = { username, email };
    if (password) body.password = password;

    try {
        await apiFetch("/users/me", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        successEl.textContent = "Profil erfolgreich aktualisiert!";
        errorEl.textContent = "";
    } catch (error) {
        errorEl.textContent = "Fehler beim Aktualisieren des Profils.";
        successEl.textContent = "";
    }
};

const showWorkoutPage = () => {
    alert("Die Workout-Seite ist noch nicht implementiert.");
};

const showWorkoutDetails = (id) => {
    alert(`Details für Workout ID: ${id} anzeigen.`);
};

const showForgotPassword = () => {
    alert("Die Seite zum Zurücksetzen des Passworts ist noch nicht implementiert.");
};

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("login-link").addEventListener("click", (e) => { e.preventDefault(); showLogin(); });
    document.getElementById("register-link").addEventListener("click", (e) => { e.preventDefault(); showRegister(); });
    document.getElementById("dashboard-link").addEventListener("click", (e) => { e.preventDefault(); showDashboard(); });
    document.getElementById("logout-link").addEventListener("click", (e) => { e.preventDefault(); logout(); });
    document.getElementById("profile-link").addEventListener("click", (e) => { e.preventDefault(); showProfile(); });
    document.getElementById("logo").addEventListener("click", (e) => { e.preventDefault(); localStorage.getItem("token") ? showDashboard() : showLogin(); });

    updateNav();
    if (localStorage.getItem("token")) {
        showDashboard();
    } else {
        showLogin();
    }
});

