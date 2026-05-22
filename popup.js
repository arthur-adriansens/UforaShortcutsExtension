// popup.js

function renderShortcutList(config, id) {
    const list = document.getElementById(id);

    if (!list) return;
    list.innerHTML = "";

    if (!config) {
        list.innerHTML = "<li>No shortcut information available.</li>";
        return;
    }

    const items = (config || []).map((item) => ({ label: item.keys, description: item.action }));

    if (items.length === 0) {
        list.innerHTML = "<li>No shortcuts configured.</li>";
        return;
    }

    items.forEach((item) => {
        const li = document.createElement("li");
        li.innerHTML = `<strong>${item.label}:</strong> ${item.description}`;
        list.appendChild(li);
    });
}

async function loadShortcutsFromStorage() {
    if (!chrome?.storage?.local) {
        renderShortcutList(null);
        return;
    }

    const result = await chrome.storage.local.get("uforaShortcuts");
    if (chrome.runtime.lastError) {
        console.warn("Error reading shortcuts from storage:", chrome.runtime.lastError);
        renderShortcutList(null);
        return;
    }

    ["uiShortcuts", "videoShortcuts", "customShortcuts"].forEach((id) => {
        renderShortcutList(result.uforaShortcuts[id], id);
    });
}

// Handles any necessary initialization for the extension's popup.
document.addEventListener("DOMContentLoaded", () => {
    loadShortcutsFromStorage();
    console.log("Extension popup initialized.");
});
