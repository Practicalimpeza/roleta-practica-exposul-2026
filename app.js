const prizes = [
  { label: "Deseng. Cozinha", prize: "Desengordurante de Cozinha", color: "#51c2bd", text: "#0d3f43" },
  { label: "15% OFF compra", prize: "Desconto de 15% na próxima compra", color: "#f8c84b", text: "#2d2610" },
  { label: "Lavagem camisa", prize: "Lavagem de uma camisa", color: "#12737a", text: "#ffffff" },
  { label: "Lavagem jeans", prize: "Lavagem de uma calça jeans", color: "#ff755f", text: "#39140d" },
  { label: "50% OFF edredom", prize: "Desconto de 50% na lavagem de edredom", color: "#9bd84b", text: "#1f3314" },
  { label: "30% OFF tapete", prize: "Desconto de 30% na lavagem de tapete", color: "#489de2", text: "#ffffff" },
  { label: "Tenso 1L", prize: "Tenso 1L", color: "#27323f", text: "#ffffff" },
  { label: "Desincr. Porcel. 1L", prize: "Desincrustante Porcelanato 1L", color: "#eaf3ef", text: "#27323f" }
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
const participationRound = "teste-3";
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
let playfulDrag = null;
let playfulCoastFrame = 0;
let suppressNextOfficialClick = false;

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
    context.font = "900 27px Segoe UI, Arial, sans-serif";
    wrapCanvasText(prize.label.toUpperCase(), shouldFlip ? -radius + 44 : radius - 44, 10, 198, 29);
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
  guestName.setCustomValidity("");

  const savedResult = getSavedResult();

  if (savedResult) {
    restoreSavedResult();
    return;
  }

  const name = guestName.value.trim();

  if (!isValidFullName(name)) {
    guestName.setCustomValidity("Digite nome e sobrenome para a conferência.");
    nameForm.reportValidity();
    return;
  }

  currentParticipantName = name;
  playerName.textContent = `Boa sorte, ${firstName(name)}!`;
  setClaimHint(getRegistrationHint(), isBackendConfigured() || isLocalDemo() ? "success" : "warning");
  closeNameSheetPanel();
  window.setTimeout(() => startRegisteredSpin(name), 180);
}

function clearNameValidationError() {
  guestName.setCustomValidity("");
}

function spinWheel(event) {
  if (suppressNextOfficialClick) {
    event?.preventDefault();
    suppressNextOfficialClick = false;
    return;
  }

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
  setClaimHint("Conferindo sua participação.", "success");

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
      setClaimHint(getAlreadyHint(result.alreadyReason), "warning");
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
  canvas.style.transition = "";
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
    : "Mostre esta tela ou envie a mensagem para retirar seu prêmio com a equipe da Manfredi Imóveis.";
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
  const index = prizes.findIndex((prize) => (
    normalizeText(prize.prize || prize.label) === normalizedPrize
    || normalizeText(prize.label) === normalizedPrize
  ));
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

function isValidFullName(name) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => part.replace(/[^A-Za-zÀ-ÿ]/g, "").length >= 2);

  return parts.length >= 2 && name.trim().length >= 6;
}

function getAlreadyHint(reason = "") {
  if (reason === "device") {
    return "Já havia uma participação registrada com estes dados. Resultado carregado.";
  }

  return "Esta participação já tinha sido registrada. Resultado carregado.";
}

function sendWhatsAppMessage(event) {
  event.preventDefault();

  if (!currentPrize) {
    return;
  }

  const codeMessage = currentCode ? ` Código de conferência: ${currentCode}.` : "";
  const message = `Olá! Meu nome é ${currentParticipantName} e ganhei o prêmio ${currentPrize} na Roleta Práctica do estande da Manfredi Imóveis na EXPOSUL 2026.${codeMessage}`;
  const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

  window.open(url, "_blank", "noopener");
}

async function requestSpinResult(name) {
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
      prize: prizes[pickPrizeIndex()].prize,
      code: "TESTE"
    });
  }

  const deviceInfo = await getDeviceInfo();

  return requestJsonp(backendUrl, {
    name,
    round: participationRound,
    device: getDeviceFingerprint(deviceInfo),
    deviceInfo: JSON.stringify(deviceInfo)
  });
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

function getDeviceFingerprint(deviceInfo) {
  const source = [
    deviceInfo.userAgent,
    deviceInfo.uaBrands,
    deviceInfo.uaFullVersionList,
    deviceInfo.uaModel,
    deviceInfo.uaPlatform,
    deviceInfo.uaPlatformVersion,
    deviceInfo.uaArchitecture,
    deviceInfo.uaBitness,
    deviceInfo.platform,
    deviceInfo.vendor,
    deviceInfo.language,
    deviceInfo.languages,
    deviceInfo.timezone,
    deviceInfo.timezoneOffset,
    deviceInfo.screen,
    deviceInfo.viewport,
    deviceInfo.pixelRatio,
    deviceInfo.hardwareConcurrency,
    deviceInfo.deviceMemory,
    deviceInfo.maxTouchPoints,
    deviceInfo.connection
  ].join("|");

  return hashFingerprint(source);
}

async function getDeviceInfo() {
  const userAgent = navigator.userAgent || "";
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const userAgentData = await getUserAgentData();

  return {
    userAgent,
    uaBrands: userAgentData.brands || "",
    uaFullVersionList: userAgentData.fullVersionList || "",
    uaMobile: userAgentData.mobile || "",
    uaModel: userAgentData.model || "",
    uaPlatform: userAgentData.platform || "",
    uaPlatformVersion: userAgentData.platformVersion || "",
    uaArchitecture: userAgentData.architecture || "",
    uaBitness: userAgentData.bitness || "",
    uaWow64: userAgentData.wow64 || "",
    browser: getBrowserName(userAgent),
    system: getSystemName(userAgent),
    platform: navigator.platform || "",
    vendor: navigator.vendor || "",
    language: navigator.language || "",
    languages: Array.isArray(navigator.languages) ? navigator.languages.join(",") : "",
    timezone,
    timezoneOffset: new Date().getTimezoneOffset(),
    screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    pixelRatio: window.devicePixelRatio || 1,
    hardwareConcurrency: navigator.hardwareConcurrency || "",
    deviceMemory: navigator.deviceMemory || "",
    maxTouchPoints: navigator.maxTouchPoints || 0,
    connection: connection
      ? [connection.effectiveType, connection.type, connection.downlink].filter(Boolean).join("/")
      : ""
  };
}

async function getUserAgentData() {
  const userAgentData = navigator.userAgentData;

  if (!userAgentData) {
    return {};
  }

  const brands = Array.isArray(userAgentData.brands)
    ? userAgentData.brands.map((brand) => `${brand.brand} ${brand.version}`).join(",")
    : "";

  try {
    const highEntropy = await userAgentData.getHighEntropyValues([
      "architecture",
      "bitness",
      "fullVersionList",
      "model",
      "platform",
      "platformVersion",
      "wow64"
    ]);

    return {
      brands,
      mobile: userAgentData.mobile,
      architecture: highEntropy.architecture || "",
      bitness: highEntropy.bitness || "",
      fullVersionList: Array.isArray(highEntropy.fullVersionList)
        ? highEntropy.fullVersionList.map((brand) => `${brand.brand} ${brand.version}`).join(",")
        : "",
      model: highEntropy.model || "",
      platform: highEntropy.platform || userAgentData.platform || "",
      platformVersion: highEntropy.platformVersion || "",
      wow64: highEntropy.wow64 || ""
    };
  } catch (error) {
    return {
      brands,
      mobile: userAgentData.mobile,
      platform: userAgentData.platform || ""
    };
  }
}

function getBrowserName(userAgent) {
  if (/Edg\//.test(userAgent)) return "Edge";
  if (/SamsungBrowser\//.test(userAgent)) return "Samsung Internet";
  if (/CriOS\//.test(userAgent)) return "Chrome iOS";
  if (/FxiOS\//.test(userAgent)) return "Firefox iOS";
  if (/Chrome\//.test(userAgent)) return "Chrome";
  if (/Safari\//.test(userAgent)) return "Safari";
  if (/Firefox\//.test(userAgent)) return "Firefox";
  return "Outro";
}

function getSystemName(userAgent) {
  if (/Android/.test(userAgent)) return "Android";
  if (/iPhone|iPad|iPod/.test(userAgent)) return "iOS";
  if (/Windows/.test(userAgent)) return "Windows";
  if (/Mac OS X/.test(userAgent)) return "macOS";
  if (/Linux/.test(userAgent)) return "Linux";
  return "Outro";
}

function hashFingerprint(value) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36).toUpperCase();
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
  setClaimHint("Esta participação já tem um giro registrado.", "warning");
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

function startPlayfulWheelDrag(event) {
  if (spinning || spinButton.disabled || nameSheet.classList.contains("is-open")) {
    return;
  }

  if (event.pointerType === "mouse" && event.button !== 0) {
    return;
  }

  window.cancelAnimationFrame(playfulCoastFrame);
  playfulCoastFrame = 0;

  playfulDrag = {
    pointerId: event.pointerId,
    lastAngle: getWheelPointerData(event).angle,
    lastX: event.clientX,
    lastY: event.clientY,
    lastTime: performance.now(),
    moved: false,
    velocity: 0
  };

  spinButton.classList.add("is-play-dragging");
  spinButton.setPointerCapture?.(event.pointerId);
}

function movePlayfulWheelDrag(event) {
  if (!playfulDrag || playfulDrag.pointerId !== event.pointerId || spinning) {
    return;
  }

  const pointer = getWheelPointerData(event);
  const now = performance.now();
  const movementX = event.clientX - playfulDrag.lastX;
  const movementY = event.clientY - playfulDrag.lastY;
  const angleDelta = getShortestAngleDelta(playfulDrag.lastAngle, pointer.angle);
  const followDelta = getFingerFollowDelta(pointer, movementX, movementY, angleDelta);
  const launchDelta = getReleaseImpulseDelta(pointer, movementX, movementY, angleDelta);
  const elapsed = Math.max(now - playfulDrag.lastTime, 16);

  if (Math.abs(movementX) + Math.abs(movementY) > 3) {
    playfulDrag.moved = true;
  }

  playfulDrag.velocity = (launchDelta / elapsed) * 16.67;
  playfulDrag.lastAngle = pointer.angle;
  playfulDrag.lastX = event.clientX;
  playfulDrag.lastY = event.clientY;
  playfulDrag.lastTime = now;
  rotation += followDelta;
  renderPlayfulRotation();
  event.preventDefault();
}

function endPlayfulWheelDrag(event) {
  if (!playfulDrag || playfulDrag.pointerId !== event.pointerId) {
    return;
  }

  const shouldSuppressClick = playfulDrag.moved;
  const velocity = playfulDrag.velocity;

  spinButton.releasePointerCapture?.(event.pointerId);
  spinButton.classList.remove("is-play-dragging");
  playfulDrag = null;

  if (shouldSuppressClick) {
    suppressNextOfficialClick = true;
    window.setTimeout(() => {
      suppressNextOfficialClick = false;
    }, 350);
    coastPlayfulWheel(velocity);
  }
}

function cancelPlayfulWheelDrag(event) {
  if (playfulDrag && playfulDrag.pointerId === event.pointerId) {
    spinButton.releasePointerCapture?.(event.pointerId);
    spinButton.classList.remove("is-play-dragging");
    playfulDrag = null;
  }
}

function getWheelPointerData(event) {
  const rect = spinButton.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const angle = (Math.atan2(event.clientY - centerY, event.clientX - centerX) * 180) / Math.PI;

  return {
    angle,
    centerX,
    centerY,
    radius: rect.width / 2,
    x: event.clientX,
    y: event.clientY,
    distanceFromCenter: Math.hypot(event.clientX - centerX, event.clientY - centerY)
  };
}

function getShortestAngleDelta(from, to) {
  return ((to - from + 540) % 360) - 180;
}

function getFingerFollowDelta(pointer, movementX, movementY, angleDelta) {
  const intent = getWheelGestureIntent(pointer, movementX, movementY, angleDelta);
  const fallbackDegrees = intent.movementDistance * intent.sign * 0.22;
  const dominantGesture = Math.abs(intent.tangentialDegrees) > Math.abs(fallbackDegrees)
    ? intent.tangentialDegrees
    : fallbackDegrees;

  return dominantGesture + angleDelta * 0.05;
}

function getReleaseImpulseDelta(pointer, movementX, movementY, angleDelta) {
  const intent = getWheelGestureIntent(pointer, movementX, movementY, angleDelta);
  const tangentialImpulse = intent.tangentialDegrees * 1.45;
  const swipeImpulse = intent.swipePixels * 0.78;
  const fallbackImpulse = intent.movementDistance * intent.sign * 0.55;

  return [tangentialImpulse, swipeImpulse, fallbackImpulse].reduce((best, value) => (
    Math.abs(value) > Math.abs(best) ? value : best
  ), 0);
}

function getWheelGestureIntent(pointer, movementX, movementY, angleDelta) {
  const angleRadians = (pointer.angle * Math.PI) / 180;
  const movementDistance = Math.hypot(movementX, movementY);
  const tangentialPixels = -Math.sin(angleRadians) * movementX + Math.cos(angleRadians) * movementY;
  const tangentialDegrees = (tangentialPixels / Math.max(pointer.radius, 1)) * (180 / Math.PI);
  const horizontalDirection = pointer.y <= pointer.centerY ? 1 : -1;
  const verticalDirection = pointer.x >= pointer.centerX ? 1 : -1;
  const swipePixels = movementX * horizontalDirection + movementY * verticalDirection;

  return {
    movementDistance,
    swipePixels,
    tangentialDegrees,
    sign: Math.sign(swipePixels) || Math.sign(tangentialPixels) || Math.sign(angleDelta) || 1
  };
}

function renderPlayfulRotation() {
  canvas.style.transition = "none";
  canvas.style.transform = `rotate(${rotation}deg)`;
}

function coastPlayfulWheel(initialVelocity) {
  let velocity = clamp(initialVelocity * 1.15, -36, 36);

  if (Math.abs(velocity) > 0 && Math.abs(velocity) < 2.8) {
    velocity = Math.sign(velocity) * 2.8;
  }

  function tick() {
    if (spinning || Math.abs(velocity) < 0.035) {
      canvas.style.transition = "";
      return;
    }

    rotation += velocity;
    renderPlayfulRotation();
    velocity *= 0.976;
    playfulCoastFrame = window.requestAnimationFrame(tick);
  }

  tick();
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
guestName.addEventListener("input", clearNameValidationError);
spinButton.addEventListener("click", spinWheel);
spinButton.addEventListener("pointerdown", startPlayfulWheelDrag);
spinButton.addEventListener("pointermove", movePlayfulWheelDrag);
spinButton.addEventListener("pointerup", endPlayfulWheelDrag);
spinButton.addEventListener("pointercancel", cancelPlayfulWheelDrag);
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
