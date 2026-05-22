const SHEET_NAME = "participantes";
const HEADERS = ["Data", "Nome", "Nome normalizado", "Prêmio", "Código", "Status"];
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
  const callback = sanitizeCallback_(event.parameter.callback);
  const name = String(event.parameter.name || "").trim();
  const result = spinForName_(name);

  return ContentService
    .createTextOutput(`${callback}(${JSON.stringify(result)});`)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function spinForName_(name) {
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
      if (values[row][2] === normalizedName) {
        return {
          ok: true,
          already: true,
          name: values[row][1],
          prize: values[row][3],
          code: values[row][4]
        };
      }
    }

    const prize = PRIZES[Math.floor(Math.random() * PRIZES.length)];
    const code = Utilities.getUuid().slice(0, 8).toUpperCase();
    sheet.appendRow([new Date(), name, normalizedName, prize, code, "completed"]);

    return { ok: true, already: false, name, prize, code };
  } catch (error) {
    return { ok: false, error: String(error.message || error) };
  } finally {
    lock.releaseLock();
  }
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function normalizeName_(name) {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function sanitizeCallback_(callback) {
  const value = String(callback || "callback");
  return /^[A-Za-z_$][0-9A-Za-z_$.]*$/.test(value) ? value : "callback";
}
