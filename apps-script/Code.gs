const SHEET_NAME = "participantes";
const DEFAULT_ROUND = "oficial-1";
const HEADERS = ["Data", "Rodada", "Nome", "Nome normalizado", "Dispositivo", "Prêmio", "Código", "Status"];
const PRIZES = [
  "Kit Práctica",
  "Caneca térmica",
  "Boné Práctica",
  "Brinde surpresa",
  "Vale-compras",
  "Produto especial",
  "Eco bag",
  "Chaveiro Práctica"
];

function doGet(event) {
  const params = event && event.parameter ? event.parameter : {};
  const callback = sanitizeCallback_(params.callback);
  const name = String(params.name || "").trim();
  const round = sanitizeRound_(params.round || DEFAULT_ROUND);
  const device = sanitizeDevice_(params.device);
  const result = spinForName_(name, round, device);

  return ContentService
    .createTextOutput(`${callback}(${JSON.stringify(result)});`)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function spinForName_(name, round, device) {
  if (!name) {
    return { ok: false, error: "name_required" };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const sheet = getSheet_();
    const normalizedName = normalizeName_(name);
    const values = sheet.getDataRange().getValues();

    for (let row = 1; row < values.length; row += 1) {
      const rowRound = String(values[row][1] || DEFAULT_ROUND);
      const rowNormalizedName = String(values[row][3] || "");
      const rowDevice = String(values[row][4] || "");

      if (rowRound !== round) {
        continue;
      }

      if (rowNormalizedName === normalizedName) {
        return buildExistingResult_(values[row], "name");
      }

      if (device && rowDevice && rowDevice === device) {
        return buildExistingResult_(values[row], "device");
      }
    }

    const prize = PRIZES[Math.floor(Math.random() * PRIZES.length)];
    const code = Utilities.getUuid().slice(0, 8).toUpperCase();
    sheet.appendRow([new Date(), round, name, normalizedName, device, prize, code, "completed"]);

    return { ok: true, already: false, name, prize, code };
  } catch (error) {
    return { ok: false, error: String(error.message || error) };
  } finally {
    lock.releaseLock();
  }
}

function buildExistingResult_(row, reason) {
  return {
    ok: true,
    already: true,
    alreadyReason: reason,
    name: row[2],
    prize: row[5],
    code: row[6]
  };
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  ensureHeaders_(sheet);
  return sheet;
}

function ensureHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    return;
  }

  const currentHeaders = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const matches = HEADERS.every((header, index) => currentHeaders[index] === header);

  if (!matches && sheet.getLastRow() <= 1) {
    sheet.clear();
    sheet.appendRow(HEADERS);
  } else if (!matches) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }

  sheet.setFrozenRows(1);
}

function normalizeName_(name) {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function sanitizeRound_(round) {
  return String(round || DEFAULT_ROUND)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 32) || DEFAULT_ROUND;
}

function sanitizeDevice_(device) {
  return String(device || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 32);
}

function sanitizeCallback_(callback) {
  const value = String(callback || "callback");
  return /^[A-Za-z_$][0-9A-Za-z_$.]*$/.test(value) ? value : "callback";
}
