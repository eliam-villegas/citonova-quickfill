const dot = document.getElementById("dot");
const statusText = document.getElementById("statusText");
const pasteBtn = document.getElementById("paste");

let isCitonovaDetected = false;

function setOk(text) {
    dot.className = "dot ok";
    statusText.textContent = text;
    pasteBtn.disabled = false;
    isCitonovaDetected = true;
}

function setBad(text) {
    dot.className = "dot bad";
    statusText.textContent = text;
    pasteBtn.disabled = true;
    isCitonovaDetected = false;
}

function setLoading(text) {
    dot.className = "dot";
    statusText.textContent = text;
    pasteBtn.disabled = true;
    isCitonovaDetected = false;
}

// Detectar pestaña activa al abrir
(async function detectTab() {
    setLoading("Verificando…");

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.url) {
        setBad("No se pudo detectar pestaña");
        return;
    }

    const url = tab.url;

    // No se puede usar en páginas especiales
    if (/^(chrome|edge|brave|opera):\/\//i.test(url) || url.startsWith("chrome-extension://")) {
        setBad("No estás en Citonova");
        return;
    }

    const isCitonova = url.includes("citonova.cl") || url.includes("citonova2.cl");

    if (isCitonova) setOk("Citonova detectado");
    else setBad("No estás en Citonova");
})();

// Enviar mensaje con wrapper (para capturar lastError)
function sendMessage(tabId, payload) {
    return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, payload, () => {
            const err = chrome.runtime.lastError;
            if (err) reject(new Error(err.message));
            else resolve();
        });
    });
}

pasteBtn.addEventListener("click", async () => {
    if (!isCitonovaDetected) return;

    try {
        const text = await navigator.clipboard.readText();
        if (!text) {
            alert("Portapapeles vacío.");
            return;
        }

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return;

        // Feedback mínimo
        setLoading("Pegando…");

        try {
            await sendMessage(tab.id, { type: "PASTE_SHEETS_ROW", payload: text });
            window.close();
            return;
        } catch (err) {
            const msg = err?.message || "";
            const isNoReceiver =
                msg.includes("Could not establish connection") ||
                msg.includes("Receiving end does not exist");

            if (!isNoReceiver) throw err;

            // Inyectar y reintentar (para PCs lentos / página recién cargada)
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ["content.js"]
            });

            // espera corta
            await new Promise(r => setTimeout(r, 120));

            await sendMessage(tab.id, { type: "PASTE_SHEETS_ROW", payload: text });
            window.close();
        }
    } catch (err) {
        console.error(err);
        alert("No se pudo pegar: " + (err?.message || "error desconocido"));

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.url && (tab.url.includes("citonova.cl") || tab.url.includes("citonova2.cl"))) {
            setOk("Citonova detectado");
        } else {
            setBad("No estás en Citonova");
        }
    }
});
