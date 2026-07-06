const DEFAULT_PLAYERS = [
  "Scott","David","Dino","Finn","James","Noah","Oliver","Riley","Alex","Ben","Dan W",
  "Felix","Jack","Jake","Jamie","Joel","Kyle","Layton","Lloyd","Matthew","Mick","Paul",
  "Tom","Josh","Louie","Ivo","Mason","Morgan","Owain","Tommy","Ryan","Camron","Tylor",
  "Ben T","Sam","Dan G"
];

let currentUser = null;
let players = [];
let settings = {
  title: "Matchday Manager V4",
  logo: "⚽",
  theme: "dark"
};

const $ = (id) => document.getElementById(id);

function showMessage(id, text) {
  const el = $(id);
  if (el) el.textContent = text;
}

async function init() {
  bindEvents();

  const { data } = await supabaseClient.auth.getSession();
  if (data.session?.user) {
    currentUser = data.session.user;
    await showApp();
  }
}

function bindEvents() {
  $("loginBtn").addEventListener("click", login);
  $("signupBtn").addEventListener("click", signup);
  $("logoutBtn").addEventListener("click", logout);
  $("addPlayerBtn").addEventListener("click", addPlayer);
  $("searchPlayers").addEventListener("input", renderPlayers);
  $("saveSettingsBtn").addEventListener("click", saveSettings);
  $("toggleThemeBtn").addEventListener("click", toggleTheme);
  $("reloadBtn").addEventListener("click", reloadCloudData);

  document.querySelectorAll(".nav[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => showPage(btn.dataset.page));
  });
}

async function signup() {
  showMessage("authMessage", "Creating account...");
  const email = $("email").value.trim();
  const password = $("password").value;

  const { error } = await supabaseClient.auth.signUp({ email, password });

  if (error) {
    showMessage("authMessage", error.message);
    return;
  }

  showMessage("authMessage", "Account created. Check your email if Supabase asks for confirmation, then log in.");
}

async function login() {
  showMessage("authMessage", "Logging in...");
  const email = $("email").value.trim();
  const password = $("password").value;

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    showMessage("authMessage", error.message);
    return;
  }

  currentUser = data.user;
  await showApp();
}

async function logout() {
  await supabaseClient.auth.signOut();
  currentUser = null;
  location.reload();
}

async function showApp() {
  $("authScreen").classList.add("hidden");
  $("appScreen").classList.remove("hidden");
  $("userEmail").textContent = currentUser.email || "";
  await reloadCloudData();
}

async function reloadCloudData() {
  showMessage("settingsMessage", "Loading cloud data...");
  await loadSettings();
  await loadPlayers();

  if (players.length === 0) {
    await seedDefaultPlayers();
    await loadPlayers();
  }

  render();
  showMessage("settingsMessage", "Cloud data loaded.");
}

async function loadPlayers() {
  const { data, error } = await supabaseClient
    .from("players")
    .select("id,name,rating,active,available,paid")
    .order("name", { ascending: true });

  if (error) {
    console.error(error);
    alert("Could not load players: " + error.message);
    players = [];
    return;
  }

  players = data || [];
}

async function seedDefaultPlayers() {
  const rows = DEFAULT_PLAYERS.map((name) => ({
    name,
    rating: 3,
    active: true,
    available: false,
    paid: false
  }));

  const { error } = await supabaseClient.from("players").insert(rows);

  if (error) {
    console.error(error);
    alert("Could not create default players: " + error.message);
  }
}

async function addPlayer() {
  const name = $("newPlayerName").value.trim();
  const rating = Number($("newPlayerRating").value);

  if (!name) return;

  const { error } = await supabaseClient.from("players").insert({
    name,
    rating,
    active: true,
    available: false,
    paid: false
  });

  if (error) {
    alert("Could not add player: " + error.message);
    return;
  }

  $("newPlayerName").value = "";
  await loadPlayers();
  render();
}

async function updatePlayer(id, patch) {
  const { error } = await supabaseClient.from("players").update(patch).eq("id", id);

  if (error) {
    alert("Could not update player: " + error.message);
    return;
  }

  const player = players.find((p) => p.id === id);
  if (player) Object.assign(player, patch);
  render();
}

async function deletePlayer(id) {
  const player = players.find((p) => p.id === id);
  if (!confirm(`Delete ${player?.name || "this player"}?`)) return;

  const { error } = await supabaseClient.from("players").delete().eq("id", id);

  if (error) {
    alert("Could not delete player: " + error.message);
    return;
  }

  await loadPlayers();
  render();
}

async function loadSettings() {
  const { data, error } = await supabaseClient
    .from("app_settings")
    .select("id,title,logo,theme")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(error);
    return;
  }

  if (data) {
    settings = {
      title: data.title || "Matchday Manager V4",
      logo: data.logo || "⚽",
      theme: data.theme || "dark",
      id: data.id
    };
    return;
  }

  const { data: inserted, error: insertError } = await supabaseClient
    .from("app_settings")
    .insert({
      title: settings.title,
      logo: settings.logo,
      theme: settings.theme
    })
    .select()
    .single();

  if (!insertError && inserted) settings.id = inserted.id;
}

async function saveSettings() {
  settings.title = $("settingTitle").value.trim() || "Matchday Manager V4";
  settings.logo = $("settingLogo").value.trim() || "⚽";

  await saveSettingsToCloud();
  render();
  showMessage("settingsMessage", "Settings saved to cloud.");
}

async function toggleTheme() {
  settings.theme = settings.theme === "dark" ? "light" : "dark";
  await saveSettingsToCloud();
  render();
}

async function saveSettingsToCloud() {
  if (settings.id) {
    const { error } = await supabaseClient
      .from("app_settings")
      .update({
        title: settings.title,
        logo: settings.logo,
        theme: settings.theme
      })
      .eq("id", settings.id);

    if (error) alert("Could not save settings: " + error.message);
    return;
  }

  const { data, error } = await supabaseClient
    .from("app_settings")
    .insert({
      title: settings.title,
      logo: settings.logo,
      theme: settings.theme
    })
    .select()
    .single();

  if (error) alert("Could not save settings: " + error.message);
  else settings.id = data.id;
}

function showPage(pageId) {
  document.querySelectorAll(".page").forEach((page) => page.classList.remove("active"));
  document.querySelectorAll(".nav[data-page]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.page === pageId);
  });

  $(pageId).classList.add("active");
}

function render() {
  document.body.classList.toggle("light", settings.theme === "light");

  $("appTitle").textContent = settings.title;
  $("titleA").textContent = settings.title;
  $("logoBox").textContent = settings.logo;

  $("settingTitle").value = settings.title;
  $("settingLogo").value = settings.logo;

  $("playerCount").textContent = players.length;
  renderPlayers();
}

function renderPlayers() {
  const query = $("searchPlayers").value.toLowerCase().trim();
  const filtered = players.filter((p) => p.name.toLowerCase().includes(query));

  $("playersGrid").innerHTML = filtered.map((player) => `
    <div class="player-card">
      <h3>${escapeHtml(player.name)}</h3>
      <p>
        <span class="badge">Rating ${player.rating}</span>
        <span class="badge">${player.active ? "Active" : "Inactive"}</span>
      </p>

      <label>Rating</label>
      <select onchange="updatePlayer('${player.id}', { rating: Number(this.value) })">
        ${[1,2,3,4,5].map((r) => `<option value="${r}" ${player.rating === r ? "selected" : ""}>${r}</option>`).join("")}
      </select>

      <div class="button-row">
        <button onclick="updatePlayer('${player.id}', { active: ${!player.active} })">
          ${player.active ? "Deactivate" : "Activate"}
        </button>
        <button class="danger" onclick="deletePlayer('${player.id}')">Delete</button>
      </div>
    </div>
  `).join("");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

init();
