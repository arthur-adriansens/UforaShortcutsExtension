// popup.js

// Preference popup
// toont preferenties, zoals Alt: hold of toggle, auto login aan/uit, ...

const defaultShortcutSettings = {
    altMode: "hold",
    autoLogin: true,
};
let currentShortcutSettings = { ...defaultShortcutSettings };

// Renders a list of shortcuts for a given group (UI, video or custom) into the specified element.
function renderShortcutsByGroup(config, groupName, elementId) {
    const list = document.getElementById(elementId);
    if (!list) return;
    list.innerHTML = "";

    if (!config || Object.keys(config).length === 0) {
        list.innerHTML = "<li>No shortcuts configured.</li>";
        return;
    }

    const filtered = Object.entries(config)
        .filter(([_, item]) => item.group === groupName)
        .map(([key, item]) => ({ label: key, description: item.action }));

    if (filtered.length === 0) {
        list.innerHTML = "<li>No shortcuts in this group.</li>";
        return;
    }

    filtered.forEach((item) => {
        const li = document.createElement("li");
        li.innerHTML = `<strong>${item.label}:</strong> ${item.description}`;
        list.appendChild(li);
    });
}

function renderCustomShortcuts(courseShortcuts, elementId) {
    const list = document.getElementById(elementId);
    if (!list) return;
    list.innerHTML = "";

    if (!courseShortcuts || Object.keys(courseShortcuts).length === 0) {
        list.innerHTML = "<li>No custom shortcuts set.</li>";
        return;
    }

    Object.entries(courseShortcuts).forEach(([courseId, key]) => {
        const li = document.createElement("li");
        li.innerHTML = `<strong>${key}:</strong> Course ${courseId}`;
        list.appendChild(li);
    });
}

function renderSettings(settings) {
    const altMode = document.getElementById("altMode");
    const autoLogin = document.getElementById("autoLogin");
    if (!altMode || !autoLogin) return;

    altMode.value = settings.altMode;
    autoLogin.checked = settings.autoLogin;
}

async function saveShortcutSettings(settings) {
    currentShortcutSettings = { ...currentShortcutSettings, ...settings };
    if (!chrome?.storage?.local) return;
    try {
        await chrome.storage.local.set({ shortcutSettings: currentShortcutSettings });
    } catch (err) {
        console.warn("Could not save shortcut settings:", err);
    }
}

const panel = document.getElementById("settingsPanel");
const main = document.querySelector("main");

function toggleSettingsPanel() {
    if (!panel) return;

    let visible = panel.style.display === "none";
    panel.style.display = visible ? "block" : "none";
    main.style.display = visible ? "none" : "block";
}

async function loadShortcutsFromStorage() {
    if (!chrome?.storage?.local) {
        renderShortcutsByGroup({}, "uiShortcuts", "uiShortcuts");
        renderShortcutsByGroup({}, "videoShortcuts", "videoShortcuts");
        renderCustomShortcuts({}, "customShortcuts");
        return;
    }

    try {
        const result = await chrome.storage.local.get(["shortcutConfig", "courseShortcuts", "shortcutSettings"]);
        const config = result.shortcutConfig || {};
        const courseShortcuts = result.courseShortcuts || {};
        currentShortcutSettings = result.shortcutSettings || defaultShortcutSettings;

        renderShortcutsByGroup(config, "uiShortcuts", "uiShortcuts");
        renderShortcutsByGroup(config, "videoShortcuts", "videoShortcuts");
        renderCustomShortcuts(courseShortcuts, "customShortcuts");
        renderSettings(currentShortcutSettings);
    } catch (err) {
        console.warn("Error reading shortcuts from storage:", err);
        renderShortcutsByGroup({}, "uiShortcuts", "uiShortcuts");
        renderShortcutsByGroup({}, "videoShortcuts", "videoShortcuts");
        renderCustomShortcuts({}, "customShortcuts");
    }
}

// Handles any necessary initialization for the extension's popup.
document.addEventListener("DOMContentLoaded", () => {
    loadShortcutsFromStorage();

    // Event listeners for settings changes
    document.getElementById("settingsToggle")?.addEventListener("click", toggleSettingsPanel);
    document.getElementById("altMode")?.addEventListener("change", (event) => {
        saveShortcutSettings({ altMode: event.target.value });
    });
    document.getElementById("autoLogin")?.addEventListener("change", (event) => {
        saveShortcutSettings({ autoLogin: event.target.checked });
    });

    console.log("Extension popup initialized.");
});
