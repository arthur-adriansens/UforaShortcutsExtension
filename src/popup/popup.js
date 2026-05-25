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
        li.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>';
        li.innerHTML += `<strong>${key}:</strong> Course `;

        if (courseId.includes(".")) {
            // courseId is a link
            const a = document.createElement("a");
            a.href = courseId;
            a.textContent = courseId.replace("https://", "");
            li.appendChild(a);
        } else {
            li.innerHTML += `${courseId}`;
        }

        li.onclick = (e) => {
            if (!e.target?.closest("svg")) return;

            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const tab = tabs?.[0];
                if (!tab?.id || !tab?.url?.startsWith("https://ufora.ugent.be")) return;

                chrome.tabs.sendMessage(tab.id, { type: "shortcut_edit", key, courseId }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.log("Could not send message to content script:", chrome.runtime.lastError.message);
                    }
                });
            });
        };

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
