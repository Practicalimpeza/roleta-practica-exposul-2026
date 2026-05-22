const prizes = [
  { label: "Kit Práctica", color: "#51c2bd", text: "#0d3f43" },
  { label: "Caneca térmica", color: "#f8c84b", text: "#2d2610" },
  { label: "Boné Práctica", color: "#12737a", text: "#ffffff" },
  { label: "Brinde surpresa", color: "#ff755f", text: "#39140d" },
  { label: "Vale-compras", color: "#9bd84b", text: "#1f3314" },
  { label: "Produto especial", color: "#489de2", text: "#ffffff" },
  { label: "Eco bag", color: "#27323f", text: "#ffffff" },
  { label: "Chaveiro Práctica", color: "#eaf3ef", text: "#27323f" }
];

const screens = {
  wheel: document.querySelector("#wheelScreen"),
  result: document.querySelector("#resultScreen")
};

const canvas = document.querySelector("#wheelCanvas");
const context = canvas.getContext("2d");
const nameForm = document.querySelector("#nameForm");
const nameSheet = document.querySelector("#nameSheet");
const closeNameSheet = document.querySelector("#closeNameSheet");
const guestName = document.querySelector("#guestName");
const spinButton = document.querySelector("#spinButton");
const tapChip = document.querySelector("#tapChip");
const claimForm = document.querySelector("#claimForm");
const whatsappButton = document.querySelector("#whatsappButton");
const claimHint = document.querySelector("#claimHint");
const playerName = document.querySelector("#playerName");
const resultName = document.querySelector("#resultName");
const resultCode = document.querySelector("#resultCode");
const resultNote = document.querySelector("#resultNote");
const winnerText = document.querySelector("#winnerText");
const winnerBox = document.querySelector(".winner");
const confettiLayer = document.querySelector("#confettiLayer");
const root = document.documentElement;

const backendUrl = window.PRACTICA_BACKEND_URL || "";
const whatsappNumber = "556784132037";
const participationRound = "oficial-1";
const resultStorageKey = `practica-roleta-exposul-2026-result-${participationRound}`;
const confettiColors = ["#51c2bd", "#f8c84b", "#ff755f", "#9bd84b", "#489de2", "#27323f"];
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

let rotation = 0;
let spinning = false;
let currentPrize = "";
let currentParticipantName = "";
let currentCode = "";
let ambientDragStart = null;
let ambientDragResetTimer = 0;

function drawWheel() {
  const size = canvas.width;
  const center = size / 2;
  const radius = center - 18;
  const arc = (Math.PI * 2) / prizes.length;

  context.clearRect(0, 0, size, size);

  prizes.forEach((prize, index) => {
    const start = -Math.PI / 2 + index * arc;
    const end = start + arc;

    context.beginPath();
    context.moveTo(center, center);
    context.arc(center, center, radius, start, end);
    context.closePath();
    context.fillStyle = prize.color;
    context.fill();

    const labelAngle = start + arc / 2;
    const labelDegrees = normalize((labelAngle * 180) / Math.PI);
    const shouldFlip = labelDegrees > 90 && labelDegrees < 270;

    context.save();
    context.translate(center, center);
    context.rotate(shouldFlip ? labelAngle + Math.PI : labelAngle);
    context.textAlign = shouldFlip ? "left" : "right";
    context.fillStyle = prize.text;
    context.font = "900 30px Segoe UI, Arial, sans-serif";
    wrapCanvasText(prize.label, shouldFlip ? -radius + 48 : radius - 48, 10, 180, 34);
    context.restore();
  });

  context.beginPath();
  context.arc(center, center, radius, 0, Math.PI * 2);
  context.lineWidth = 16;
  context.strokeStyle = "#ffffff";
  context.stroke();

  context.beginPath();
  context.arc(center, center, radius - 8, 0, Math.PI * 2);
  context.lineWidth = 2;
  context.strokeStyle = "rgba(29, 42, 54, 0.16)";
  context.stroke();
}

function wrapCanvasText(text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  const lines = [];
  let line = "";

  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word;
    const metrics = context.measureText(testLine);

    if (metrics.width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  });

  lines.push(line);

  const offset = ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((lineText, index) => {
    context.fillText(lineText, x, y - offset + index * lineHeight);
  });
}

function openNameSheet() {
  vibrate(16);
  nameSheet.hidden = false;
  nameSheet.classList.add("is-open");
  nameSheet.setAttribute("aria-hidden", "false");
  window.setTimeout(() => guestName.focus(), 260);
}

function closeNameSheetPanel() {
  nameSheet.classList.remove("is-open");
  nameSheet.setAttribute("aria-hidden", "true");
  window.setTimeout(() => {
    if (!nameSheet.classList.contains("is-open")) {
      nameSheet.hidden = true;
    }
  }, 240);
}

function beginParticipation(event) {
  event.preventDefault();

  const savedResult = getSavedResult();

  if (savedResult) {
    restoreSavedResult();
    return;
  }

  const name = guestName.value.trim();

  if (!name) {
    nameForm.reportValidity();
    return;
  }

  currentParticipantName = name;
  playerName.textContent = `Boa sorte, ${firstName(name)}!`;
  setClaimHint(getRegistrationHint(), isBackendConfigured() || isLocalDemo() ? "success" : "warning");
  closeNameSheetPanel();
  window.setTimeout(() => startRegisteredSpin(name), 180);
}

function spinWheel() {
  if (spinning) {
    return;
  }

  if (getSavedResult()) {
    restoreSavedResult();
    return;
  }

  if (!currentParticipantName) {
    openNameSheet();
    return;
  }

  startRegisteredSpin(currentParticipantName);
}

async function startRegisteredSpin(name) {
  if (spinning) {
    return;
  }

  if (getSavedResult()) {
    restoreSavedResult();
    return;
  }

  spinning = true;
  vibrate([24, 28, 24]);
  spinButton.disabled = true;
  spinButton.classList.add("is-spinning");
  tapChip.textContent = "Registrando...";
  currentPrize = "";
  currentCode = "";
  winnerBox.classList.remove("is-hot");
  setClaimHint("Conferindo se este nome já participou.", "success");

  try {
    const result = await requestSpinResult(name);

    if (!result.ok || !result.prize) {
      throw new Error(result.error || "Não foi possível registrar.");
    }

    currentParticipantName = result.name || name;
    currentPrize = result.prize;
    currentCode = result.code || "";
    saveResult(currentParticipantName, currentPrize, currentCode);

    if (result.already) {
      finishWheelBusy("Giro realizado");
      setClaimHint("Este nome já tinha participado. Resultado carregado.", "warning");
      showResult(currentParticipantName, currentPrize, {
        already: true,
        code: currentCode
      });
      return;
    }

    tapChip.textContent = "Girando...";
    setClaimHint(`${firstName(currentParticipantName)}, segura essa emoção.`, "success");
    animateWheelToPrize(currentPrize, () => {
      finishWheelBusy("Giro realizado");
      showResult(currentParticipantName, currentPrize, {
        already: false,
        code: currentCode
      });
      launchConfetti(150);
    });
  } catch (error) {
    spinning = false;
    spinButton.disabled = false;
    spinButton.classList.remove("is-spinning");
    tapChip.textContent = "Toque na roleta";
    setClaimHint("Não conseguimos registrar agora. Confira a internet e tente novamente.", "warning");
    console.warn(error);
  }
}

function animateWheelToPrize(prizeLabel, onComplete) {
  const winningIndex = findPrizeIndex(prizeLabel);

  const slice = 360 / prizes.length;
  const current = normalize(rotation);
  const target = normalize(360 - (winningIndex + 0.5) * slice);
  const extraTurns = 5 + Math.floor(Math.random() * 3);
  const delta = target >= current ? target - current : 360 - current + target;

  rotation += extraTurns * 360 + delta;
  canvas.style.transform = `rotate(${rotation}deg)`;

  window.setTimeout(() => {
    onComplete();
  }, 5000);
}

function finishWheelBusy(label) {
  spinning = false;
  spinButton.classList.remove("is-spinning");
  tapChip.textContent = label;
  spinButton.disabled = true;
}

function showResult(name, prize, options = {}) {
  vibrate([34, 26, 60]);
  currentParticipantName = name;
  currentPrize = prize;
  currentCode = options.code || currentCode;
  resultName.textContent = firstName(name);
  winnerText.textContent = prize;
  resultCode.hidden = !currentCode;
  resultCode.textContent = currentCode ? `Código de conferência: ${currentCode}` : "";
  resultNote.textContent = options.already
    ? "Este nome já tinha um resultado registrado. Mostre esta tela para a equipe."
    : "Mostre esta tela ou envie a mensagem para retirar seu prêmio.";
  winnerBox.classList.add("is-hot");
  whatsappButton.disabled = false;
  showScreen("result");
}

function showScreen(screenName) {
  Object.entries(screens).forEach(([name, element]) => {
    element.classList.toggle("is-active", name === screenName);
  });
}

function pickPrizeIndex() {
  return Math.floor(Math.random() * prizes.length);
}

function findPrizeIndex(prizeLabel) {
  const normalizedPrize = normalizeText(prizeLabel);
  const index = prizes.findIndex((prize) => normalizeText(prize.label) === normalizedPrize);
  return index >= 0 ? index : pickPrizeIndex();
}

function normalize(value) {
  return ((value % 360) + 360) % 360;
}

function normalizeText(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function firstName(name) {
  return name.trim().split(/\s+/)[0] || "participante";
}

function sendWhatsAppMessage(event) {
  event.preventDefault();

  if (!currentPrize) {
    return;
  }

  const codeMessage = currentCode ? ` Código de conferência: ${currentCode}.` : "";
  const message = `Olá! Meu nome é ${currentParticipantName} e ganhei o prêmio ${currentPrize} na Roleta Práctica do jantar da EXPOSUL 2026.${codeMessage}`;
  const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

  window.open(url, "_blank", "noopener");
}

function requestSpinResult(name) {
  if (!isBackendConfigured()) {
    if (!isLocalDemo()) {
      return Promise.resolve({
        ok: false,
        error: "backend_not_configured"
      });
    }

    return Promise.resolve({
      ok: true,
      already: false,
      name,
      prize: prizes[pickPrizeIndex()].label,
      code: "TESTE"
    });
  }

  return requestJsonp(backendUrl, { name });
}

function requestJsonp(url, params = {}) {
  const callbackName = `practicaRoleta_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const requestUrl = new URL(url);

  Object.entries(params).forEach(([key, value]) => {
    requestUrl.searchParams.set(key, value);
  });
  requestUrl.searchParams.set("callback", callbackName);

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Tempo esgotado ao falar com o backend."));
    }, 12000);

    function cleanup() {
      window.clearTimeout(timeout);
      script.remove();
      delete window[callbackName];
    }

    window[callbackName] = (payload) => {
      cleanup();
      resolve(payload);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Falha ao carregar o backend."));
    };

    script.src = requestUrl.toString();
    document.body.appendChild(script);
  });
}

function isBackendConfigured() {
  return Boolean(backendUrl.trim());
}

function isLocalDemo() {
  return ["localhost", "127.0.0.1", ""].includes(window.location.hostname);
}

function vibrate(pattern) {
  if ("vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

function getRegistrationHint() {
  if (isBackendConfigured()) {
    return "Vamos registrar sua participação.";
  }

  if (isLocalDemo()) {
    return "Modo teste: backend ainda não configurado.";
  }

  return "Backend ainda não configurado para registrar o sorteio.";
}

function getSavedResult() {
  try {
    return JSON.parse(localStorage.getItem(resultStorageKey));
  } catch {
    return null;
  }
}

function saveResult(name, prize, code = "") {
  localStorage.setItem(resultStorageKey, JSON.stringify({
    name,
    prize,
    code,
    date: new Date().toISOString()
  }));
}

function restoreSavedResult() {
  const result = getSavedResult();

  if (!result?.name || !result?.prize) {
    return;
  }

  guestName.value = result.name;
  setClaimHint("Este celular já registrou um giro.", "warning");
  showResult(result.name, result.prize, {
    already: true,
    code: result.code || ""
  });
}

function setClaimHint(message, tone = "") {
  claimHint.textContent = message;
  claimHint.classList.toggle("is-warning", tone === "warning");
  claimHint.classList.toggle("is-success", tone === "success");
}

function handleAmbientPointerDown(event) {
  if (reducedMotionQuery.matches || nameSheet.classList.contains("is-open")) {
    return;
  }

  if (event.target instanceof Element && event.target.closest("input, textarea, select, .sheet-card")) {
    return;
  }

  ambientDragStart = {
    x: event.clientX,
    y: event.clientY
  };
  window.clearTimeout(ambientDragResetTimer);
  document.body.classList.add("is-dragging");
}

function handleAmbientPointerMove(event) {
  if (!ambientDragStart || reducedMotionQuery.matches) {
    return;
  }

  setAmbientDrag(event.clientX - ambientDragStart.x, event.clientY - ambientDragStart.y);
}

function handleAmbientPointerEnd() {
  if (!ambientDragStart) {
    return;
  }

  ambientDragStart = null;
  document.body.classList.remove("is-dragging");
  window.clearTimeout(ambientDragResetTimer);
  ambientDragResetTimer = window.setTimeout(() => setAmbientDrag(0, 0), 120);
}

function setAmbientDrag(deltaX, deltaY) {
  const x = clamp(deltaX, -72, 72);
  const y = clamp(deltaY, -44, 44);
  const intensity = Math.min(Math.hypot(x, y) / 84, 1);
  const softX = x * 0.16;
  const softY = y * 0.12;
  const mediumX = x * 0.3;
  const mediumY = y * 0.22;
  const strongX = x * 0.48;
  const strongY = y * 0.34;

  setPixelVar("--drag-soft-x", softX);
  setPixelVar("--drag-soft-y", softY);
  setPixelVar("--drag-soft-neg-x", -softX);
  setPixelVar("--drag-soft-neg-y", -softY);
  setPixelVar("--drag-medium-x", mediumX);
  setPixelVar("--drag-medium-y", mediumY);
  setPixelVar("--drag-medium-neg-x", -mediumX);
  setPixelVar("--drag-medium-neg-y", -mediumY);
  setPixelVar("--drag-strong-x", strongX);
  setPixelVar("--drag-strong-y", strongY);
  setPixelVar("--drag-strong-neg-x", -strongX);
  setPixelVar("--drag-strong-neg-y", -strongY);
  root.style.setProperty("--drag-tilt", `${(x * 0.08).toFixed(2)}deg`);
  root.style.setProperty("--drag-scale", (1 + intensity * 0.018).toFixed(3));
}

function setPixelVar(name, value) {
  root.style.setProperty(name, `${value.toFixed(2)}px`);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function launchConfetti(pieces = 120) {
  confettiLayer.innerHTML = "";

  for (let index = 0; index < pieces; index += 1) {
    const piece = document.createElement("span");
    const start = `${Math.random() * 100}vw`;
    const end = `${Math.random() * 100 - 50}vw`;
    const duration = `${2.7 + Math.random() * 1.9}s`;

    piece.className = "confetti";
    piece.style.left = "0";
    piece.style.background = confettiColors[index % confettiColors.length];
    piece.style.setProperty("--start", start);
    piece.style.setProperty("--end", end);
    piece.style.setProperty("--duration", duration);
    piece.style.animationDelay = `${Math.random() * 0.35}s`;
    confettiLayer.appendChild(piece);
  }

  window.setTimeout(() => {
    confettiLayer.innerHTML = "";
  }, 5400);
}

drawWheel();
restoreSavedResult();

nameForm.addEventListener("submit", beginParticipation);
spinButton.addEventListener("click", spinWheel);
claimForm.addEventListener("submit", sendWhatsAppMessage);
closeNameSheet.addEventListener("click", closeNameSheetPanel);
nameSheet.addEventListener("click", (event) => {
  if (event.target === nameSheet) {
    closeNameSheetPanel();
  }
});
document.addEventListener("pointerdown", handleAmbientPointerDown);
document.addEventListener("pointermove", handleAmbientPointerMove);
document.addEventListener("pointerup", handleAmbientPointerEnd);
document.addEventListener("pointercancel", handleAmbientPointerEnd);
window.addEventListener("blur", handleAmbientPointerEnd);
