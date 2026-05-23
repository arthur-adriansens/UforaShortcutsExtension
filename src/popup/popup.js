// popup.js

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

async function loadShortcutsFromStorage() {
    if (!chrome?.storage?.local) {
        renderShortcutsByGroup({}, "uiShortcuts", "uiShortcuts");
        renderShortcutsByGroup({}, "videoShortcuts", "videoShortcuts");
        renderCustomShortcuts({}, "customShortcuts");
        return;
    }

    try {
        const result = await chrome.storage.local.get(["shortcutConfig", "courseShortcuts"]);
        const config = result.shortcutConfig || {};
        const courseShortcuts = result.courseShortcuts || {};

        renderShortcutsByGroup(config, "uiShortcuts", "uiShortcuts");
        renderShortcutsByGroup(config, "videoShortcuts", "videoShortcuts");
        renderCustomShortcuts(courseShortcuts, "customShortcuts");
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
    console.log("Extension popup initialized.");
});
