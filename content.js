chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type !== "PASTE_SHEETS_ROW") return;

    const row = parseRow(msg.payload);
    if (!row) {
        alert("No se pudo interpretar la fila copiada.");
        return;
    }

    const montoNum = parseInt((row.monto || "0").toString().replace(/\D/g, ""), 10) || 0;
    const isConBarrera = (S(row.formaPago).trim().length > 0) || montoNum > 0;

    // ---- Campos base ----
    fillField(['input[name="rut"]', '#rut'], normalizeRut(row.rut));
    fillField(['input[name="nombre"]', '#nombre'], S(row.nombre).trim());
    fillField(['input[name="telefono"]', '#telefono'], onlyDigits(row.telefono));

    // ---- Fechas ----
    fillField(['input[name="desde"]', '#desde'], toIsoDate(row.checkin));
    fillField(['input[name="hasta"]', '#hasta'], toIsoDate(row.checkout));

    // ---- Observaciones ----
    fillField(['textarea[name="obs"]', '#obs'], buildObservations(row, isConBarrera));

    // ---- Clasificación automática ----
    handleClassification(normalizeTipoResidente(row.tipo));

    // ---- Checkboxes PA + Email/Push por fila ----
    handleAccessChecks(isConBarrera);

    // ---- Tipos de acceso (RUT/PATENTE) + copiar valores automáticamente ----
    ensureAccessTypes(row, isConBarrera);
    setTimeout(() => ensureAccessTypes(row, isConBarrera), 180);

    alert("Datos pegados correctamente. Revisa y guarda.");
});


// Helper: fuerza a string seguro
function S(v) {
    if (v === null || v === undefined) return "";
    return String(v);
}


// Parser robusto: separa TSV, pero tolera saltos de línea
function parseRow(text) {
    const raw = S(text).trim();
    if (!raw) return null;

    // Sheets suele copiar filas como TSV. Tomamos la primera línea no vacía.
    const firstLine = raw.split(/\r?\n/).find(l => l.trim().length > 0);
    if (!firstLine) return null;

    const cols = firstLine.split("\t").map(c => S(c).trim());

    // Debe tener al menos hasta TIPO DE RESIDENTE (12 = índice 11)
    if (cols.length < 12) return null;

    return {
        checkin: cols[0],
        checkout: cols[1],
        depto: cols[2],
        pulsera: cols[3],
        nombre: cols[4],
        rut: cols[5],
        telefono: cols[6],
        email: cols[7],
        patente: cols[8],
        formaPago: cols[9],
        monto: cols[10],
        tipo: cols[11],
        propietario: cols[12] || "",
        obs: cols[13] || ""
    };
}


function fillField(selectors, value) {
    for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) {
            el.value = value || "";
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
            el.dispatchEvent(new Event("blur", { bubbles: true })); // clave para datepickers
            return true;
        }
    }
    return false;
}


// Fecha flexible: acepta "DD/MM/YYYY", "DD-MM-YYYY", "DD/MM/YYYY hh:mm:ss", "YYYY-MM-DD", etc.
function toIsoDate(value) {
    const v = S(value).trim();
    if (!v) return "";

    // Extrae solo la parte de fecha si viene con hora
    const onlyDate = v.split(" ")[0].trim();

    // Caso ya ISO
    if (/^\d{4}-\d{2}-\d{2}$/.test(onlyDate)) return onlyDate;

    // DD/MM/YYYY o DD-MM-YYYY o DD/MM/YY
    const m = onlyDate.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2}|\d{4})$/);
    if (!m) return "";

    let dd = m[1].padStart(2, "0");
    let mm = m[2].padStart(2, "0");
    let yy = m[3];

    // Si viene 2 dígitos (25), asumimos 20xx
    if (yy.length === 2) yy = "20" + yy;

    return `${yy}-${mm}-${dd}`;
}


function normalizeRut(rut) {
    const v = S(rut).trim();
    if (!v) return "";
    // quita puntos, cambia "/" por "-" y deja mayúsculas por si viene K
    return v.replace(/\./g, "").replace("/", "-").toUpperCase();
}


function onlyDigits(v) {
    return S(v).replace(/\D/g, "");
}

function normalizeCompact(v) {
    return S(v).trim().replace(/\s+/g, " ");
}

/** normaliza patente
 * - Remueve espacios, guiones y cualquier símbolo
 * - Deja solo letras/números
 * - Convierte a mayúsculas
 */
function normalizePlate(v) {
    return S(v).toUpperCase().replace(/[^A-Z0-9]/g, "");
}


// Observación final solicitada: "SIN/CON BARRERA PATENTE XYZ123 <TIPO CELDA> (CORREDORA) 514-1"
function buildObservations(row, isConBarrera) {
    const barreraTxt = isConBarrera ? "CON BARRERA" : "SIN BARRERA";

    const patenteNorm = normalizePlate(row.patente);
    const patente = patenteNorm ? `PATENTE ${patenteNorm}` : "";

    // ✅ HOTFIX: tipo tal cual viene en la celda (solo trim)
    const tipoObs = S(row.tipo).trim();

    const corredor = S(row.propietario).trim() ? `(${S(row.propietario).trim()})` : "";
    const depto = row.depto ? normalizeCompact(row.depto) : "";

    return [barreraTxt, patente, tipoObs, corredor, depto]
        .filter(Boolean)
        .join(" ");
}


/** normaliza “tipo residente” a lo que espera Citonova (solo para clasificación)
 * - arriendo / arrienda / arrend... => ARRENDATARIO
 * - visita / invitado => OTRO
 * - propietario => PROPIETARIO
 */
function normalizeTipoResidente(tipoRaw) {
    const t = S(tipoRaw)
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .trim();

    if (!t) return "";

    if (
        t.includes("ARREND") ||
        t.includes("ARRIEND") ||
        t.includes("ARRIENDO") ||
        t === "ARRIENDO" ||
        t === "ARRIENDO TEMPORAL"
    ) return "ARRENDATARIO";

    if (t.includes("PROPIET")) return "PROPIETARIO";

    // ✅ Invitado/Visita => OTRO (como dijiste que existe la opción OTRO)
    if (t.includes("VISIT") || t.includes("INVIT")) return "OTRO";

    return t;
}


// Clasificación automática (compara texto normalizado)
function handleClassification(tipoRaw) {
    const sel = document.querySelector('#clasificacion');
    if (!sel || !tipoRaw) return;

    const normalize = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
    const target = normalize(tipoRaw);

    for (const opt of sel.options) {
        if (!opt.value) continue;
        if (normalize(opt.text) === target) {
            sel.value = opt.value;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
            return;
        }
    }
}


// Checkboxes PA + notificación + email en la misma fila
function handleAccessChecks(isConBarrera) {
    const accessInputs = Array.from(document.querySelectorAll('input[name="pa[]"]'));

    const rowStates = {
        0: true,
        1: isConBarrera,
        2: true
    };

    accessInputs.forEach((inputPa, index) => {
        if (!rowStates.hasOwnProperty(index)) return;

        const shouldCheck = rowStates[index];

        const tr = inputPa.closest('tr');
        if (tr) {
            const allRowCheckboxes = tr.querySelectorAll('input[type="checkbox"]');
            allRowCheckboxes.forEach(cb => setCheckboxState(cb, shouldCheck));
        }
    });
}


function setCheckboxState(el, checked) {
    if (!el) return;

    if (el.checked === checked) return;

    const label = el.closest("label");
    if (label) label.click();
    else el.click();

    if (el.checked !== checked) {
        el.checked = checked;
        el.dispatchEvent(new Event("change", { bubbles: true }));
    }
}


/* ===========================
   Tipos de acceso
   =========================== */

function ensureAccessTypes(row, isConBarrera) {
    const rutVal = normalizeRut(row.rut);
    const patVal = normalizePlate(row.patente);

    const needRut = rutVal.length > 0;
    const needPat = isConBarrera && patVal.length > 0;

    if (needRut) addAccessTypeIfMissing("1");
    if (needPat) addAccessTypeIfMissing("2");

    if (needRut) fillAccessCodeByType("1", rutVal);
    if (needPat) fillAccessCodeByType("2", patVal);
}

function addAccessTypeIfMissing(typeValue) {
    if (hasAccessType(typeValue)) return;

    const select = document.querySelector("#accesos");
    if (!select) {
        console.warn("No se encontró select #accesos");
        return;
    }

    select.value = typeValue;

    if (typeof window.addAcceso === "function") {
        window.addAcceso(select);
    } else {
        select.dispatchEvent(new Event("change", { bubbles: true }));
    }
}

function hasAccessType(typeValue) {
    return !!document.querySelector(`.mis-accesos input[name="acceso[]"][value="${typeValue}"]`);
}

function fillAccessCodeByType(typeValue, codeValue) {
    const blocks = Array.from(document.querySelectorAll(".mis-accesos .row"));

    for (const block of blocks) {
        const hidden = block.querySelector(`input[name="acceso[]"][value="${typeValue}"]`);
        if (!hidden) continue;

        const input = block.querySelector(`input[name="codigo[]"]`);
        if (!input) continue;

        input.value = codeValue || "";
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        input.dispatchEvent(new Event("blur", { bubbles: true }));
        return true;
    }

    return false;
}

// Opcional: remover patente cuando SIN BARRERA
function removeAccessTypeIfExists(typeValue) {
    const blocks = Array.from(document.querySelectorAll(".mis-accesos .row"));
    for (const block of blocks) {
        const hidden = block.querySelector(`input[name="acceso[]"][value="${typeValue}"]`);
        if (!hidden) continue;

        const btn = block.querySelector(`button[onclick*="eliminarAcceso"]`);
        if (btn) btn.click();
    }
}
