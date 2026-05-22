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
const claimForm = document.querySelector("#claimForm");
const whatsappButton = document.querySelector("#whatsappButton");
const claimHint = document.querySelector("#claimHint");
const playerName = document.querySelector("#playerName");
const resultName = document.querySelector("#resultName");
const winnerText = document.querySelector("#winnerText");
const winnerBox = document.querySelector(".winner");
const confettiLayer = document.querySelector("#confettiLayer");

const whatsappNumber = "556784132037";
const resultStorageKey = "practica-roleta-exposul-2026-result";
const confettiColors = ["#51c2bd", "#f8c84b", "#ff755f", "#9bd84b", "#489de2", "#27323f"];

let rotation = 0;
let spinning = false;
let currentPrize = "";
let currentParticipantName = "";

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
  playerName.textContent = `${firstName(name)}, a roleta é sua.`;
  setClaimHint("Tudo pronto. Boa sorte!", "success");
  closeNameSheetPanel();
  window.setTimeout(() => spinWheel(), 180);
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

  spinning = true;
  spinButton.disabled = true;
  spinButton.textContent = "Girando...";
  currentPrize = "";
  winnerBox.classList.remove("is-hot");
  setClaimHint(`${firstName(currentParticipantName)}, segura essa emoção.`, "success");

  const winningIndex = pickPrizeIndex();
  const slice = 360 / prizes.length;
  const current = normalize(rotation);
  const target = normalize(360 - (winningIndex + 0.5) * slice);
  const extraTurns = 5 + Math.floor(Math.random() * 3);
  const delta = target >= current ? target - current : 360 - current + target;

  rotation += extraTurns * 360 + delta;
  canvas.style.transform = `rotate(${rotation}deg)`;

  window.setTimeout(() => {
    spinning = false;
    currentPrize = prizes[winningIndex].label;
    saveResult(currentParticipantName, currentPrize);
    showResult(currentParticipantName, currentPrize);
    launchConfetti(150);
  }, 5000);
}

function showResult(name, prize) {
  currentParticipantName = name;
  currentPrize = prize;
  resultName.textContent = firstName(name);
  winnerText.textContent = prize;
  winnerBox.classList.add("is-hot");
  whatsappButton.disabled = false;
  spinButton.textContent = "Giro realizado";
  spinButton.disabled = true;
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

function normalize(value) {
  return ((value % 360) + 360) % 360;
}

function firstName(name) {
  return name.trim().split(/\s+/)[0] || "participante";
}

function sendWhatsAppMessage(event) {
  event.preventDefault();

  if (!currentPrize) {
    return;
  }

  const message = `Olá! Meu nome é ${currentParticipantName} e ganhei o prêmio ${currentPrize} na Roleta Práctica do jantar da EXPOSUL 2026.`;
  const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

  window.open(url, "_blank", "noopener");
}

function getSavedResult() {
  try {
    return JSON.parse(localStorage.getItem(resultStorageKey));
  } catch {
    return null;
  }
}

function saveResult(name, prize) {
  localStorage.setItem(resultStorageKey, JSON.stringify({
    name,
    prize,
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
  showResult(result.name, result.prize);
}

function setClaimHint(message, tone = "") {
  claimHint.textContent = message;
  claimHint.classList.toggle("is-warning", tone === "warning");
  claimHint.classList.toggle("is-success", tone === "success");
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
