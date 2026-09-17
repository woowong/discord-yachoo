// ============================================================================
// Drosophila Connectome SNN: Real-Time Web Visualizer Engine
// ============================================================================

const DICE_CHARS = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const CATEGORIES = [
  "Aces", "Deuces", "Treys", "Fours", "Fives", "Sixes",
  "Choice", "FourOfAKind", "FullHouse", "SmallStraight", "LargeStraight", "Yacht"
];

// Canvas & Animation State
let brainCanvas, brainCtx;
let rasterCanvas, rasterCtx;
let neurons = [];
let connections = [];
let animSpeed = 1.0;
let isAutoPlaying = false;
let autoPlayTimer = null;
let currentTelemetry = null;
let playbackStep = 0;
let isPlayingTelemetry = false;
let aplWaveRadius = 0;
let aplWaveActive = false;

// 1. Initialize Connectome Topology (1,575 neurons)
function initConnectomeCoordinates() {
  neurons = [];
  connections = [];

  const W = 800;
  const H = 520;

  // 1.1 Projection Neurons (0..49) - Left Antennal Lobe Arc
  for (let i = 0; i < 50; i++) {
    const angle = ((i / 49) - 0.5) * 1.6;
    const r = 210;
    const cx = 110;
    const cy = 260;
    neurons.push({
      id: i,
      type: "pn",
      x: cx + Math.cos(angle) * r * 0.45 + (Math.random() - 0.5) * 12,
      y: cy + Math.sin(angle) * r + (Math.random() - 0.5) * 10,
      radius: 3.5,
      color: "#39ff14",
      active: 0.0,
    });
  }

  // 1.2 Kenyon Cells (50..1549) - 1,500 cells in 3 distinct lobe clusters
  for (let i = 0; i < 1500; i++) {
    let cx, cy, rx, ry;
    if (i < 500) {
      // Calyx / Main dendritic cup
      cx = 290; cy = 250; rx = 55; ry = 65;
    } else if (i < 1000) {
      // Vertical Lobe (alpha / alpha')
      cx = 380; cy = 160; rx = 40; ry = 70;
    } else {
      // Medial Lobe (beta / beta' / gamma)
      cx = 410; cy = 340; rx = 65; ry = 45;
    }

    const u = Math.random() + Math.random();
    const r = (u > 1 ? 2 - u : u);
    const theta = Math.random() * Math.PI * 2;
    
    neurons.push({
      id: 50 + i,
      type: "kc",
      x: cx + Math.cos(theta) * r * rx,
      y: cy + Math.sin(theta) * r * ry,
      radius: 1.6,
      color: "#ffd700",
      active: 0.0,
    });
  }

  // 1.3 APL Giant Inhibitory Core (1550) - Center
  neurons.push({
    id: 1550,
    type: "apl",
    x: 340,
    y: 260,
    radius: 9.0,
    color: "#ff007f",
    active: 0.0,
  });

  // 1.4 MBON Output Valves (1551..1574) - 24 neurons on Right Readout Tracks
  for (let i = 0; i < 24; i++) {
    const ySpacing = 380 / 23;
    const col = (i % 2 === 0) ? 670 : 710;
    neurons.push({
      id: 1551 + i,
      type: "mbon",
      x: col + (Math.random() - 0.5) * 8,
      y: 70 + i * ySpacing,
      radius: 4.5,
      color: "#ff3366",
      active: 0.0,
    });
  }

  // 1.5 Generate Faint Background Synaptic Tracks (~400 lines)
  for (let i = 0; i < 400; i++) {
    let p1, p2;
    if (i < 150) {
      // PN -> KC track
      p1 = neurons[Math.floor(Math.random() * 50)];
      p2 = neurons[50 + Math.floor(Math.random() * 1500)];
    } else if (i < 300) {
      // KC -> MBON track
      p1 = neurons[50 + Math.floor(Math.random() * 1500)];
      p2 = neurons[1551 + Math.floor(Math.random() * 24)];
    } else {
      // KC -> APL track
      p1 = neurons[50 + Math.floor(Math.random() * 1500)];
      p2 = neurons[1550];
    }
    connections.push({ p1, p2, alpha: 0.04 + Math.random() * 0.05 });
  }
}

// 2. Render Loop
function renderBrain() {
  if (!brainCtx) return;

  brainCtx.fillStyle = "rgba(6, 8, 14, 0.45)";
  brainCtx.fillRect(0, 0, brainCanvas.width, brainCanvas.height);

  // 2.1 Draw Synaptic Background Connections
  brainCtx.lineWidth = 0.6;
  for (const c of connections) {
    brainCtx.strokeStyle = `rgba(0, 240, 255, ${c.alpha})`;
    brainCtx.beginPath();
    brainCtx.moveTo(c.p1.x, c.p1.y);
    brainCtx.lineTo(c.p2.x, c.p2.y);
    brainCtx.stroke();
  }

  // 2.2 Draw APL Expanding Shockwave if Active
  if (aplWaveActive) {
    aplWaveRadius += 4.5 * animSpeed;
    const maxRadius = 180;
    const waveAlpha = Math.max(0, 1.0 - (aplWaveRadius / maxRadius));
    
    const apl = neurons[1550];
    brainCtx.save();
    brainCtx.strokeStyle = `rgba(255, 0, 127, ${waveAlpha * 0.7})`;
    brainCtx.lineWidth = 3.5;
    brainCtx.shadowColor = "#ff007f";
    brainCtx.shadowBlur = 15;
    brainCtx.beginPath();
    brainCtx.arc(apl.x, apl.y, aplWaveRadius, 0, Math.PI * 2);
    brainCtx.stroke();
    brainCtx.restore();

    if (aplWaveRadius >= maxRadius) {
      aplWaveActive = false;
    }
  }

  // 2.3 Draw Neurons
  for (const n of neurons) {
    // Decay activation
    n.active *= Math.pow(0.82, animSpeed);

    brainCtx.save();
    if (n.active > 0.05) {
      brainCtx.shadowColor = n.color;
      brainCtx.shadowBlur = 8 + n.active * 14;
    }

    let drawRadius = n.radius;
    let alpha = 0.35 + n.active * 0.65;

    if (n.type === "kc") {
      drawRadius = n.active > 0.3 ? 2.8 : 1.4;
      alpha = n.active > 0.1 ? 1.0 : 0.25;
    } else if (n.type === "apl") {
      drawRadius = n.active > 0.3 ? 12 : 8;
    } else if (n.type === "mbon" && n.active > 0.3) {
      drawRadius = 6.5;
    }

    brainCtx.fillStyle = n.color;
    brainCtx.globalAlpha = alpha;
    brainCtx.beginPath();
    brainCtx.arc(n.x, n.y, drawRadius, 0, Math.PI * 2);
    brainCtx.fill();
    brainCtx.restore();
  }

  requestAnimationFrame(renderBrain);
}

// 3. Playback 15ms Telemetry Spikes
function playTurnTelemetry(telemetry) {
  if (!telemetry || !telemetry.spikes_per_step) return;

  currentTelemetry = telemetry;
  playbackStep = 0;
  isPlayingTelemetry = true;

  const msInterval = 65 / animSpeed;

  function stepTimeline() {
    if (playbackStep >= telemetry.sim_steps) {
      isPlayingTelemetry = false;
      document.getElementById("overlayMs").innerText = `15 / 15 ms (Done)`;
      return;
    }

    const activeIndices = telemetry.spikes_per_step[playbackStep] || [];
    let activeKcs = 0;

    for (const idx of activeIndices) {
      if (idx < neurons.length) {
        neurons[idx].active = 1.0;
        if (neurons[idx].type === "kc") activeKcs++;
      }
    }

    // Check APL firing
    const isAplFired = (telemetry.apl_fired_steps || []).includes(playbackStep);
    const overlayApl = document.getElementById("overlayApl");
    if (isAplFired) {
      aplWaveActive = true;
      aplWaveRadius = 10;
      overlayApl.innerText = "억제파 방출 (Fired!)";
      overlayApl.className = "apl-active";
    } else {
      overlayApl.innerText = "대기";
      overlayApl.className = "apl-idle";
    }

    // Update overlay stats
    document.getElementById("overlayMs").innerText = `${playbackStep + 1} / ${telemetry.sim_steps} ms`;
    document.getElementById("overlayKcCount").innerText = `${activeKcs}`;

    // Render Spike Raster
    drawRaster(telemetry.spikes_per_step, playbackStep);

    playbackStep++;
    setTimeout(stepTimeline, msInterval);
  }

  stepTimeline();
}

// 4. Draw Millisecond Spike Raster Plot
function drawRaster(spikesPerStep, currentStep) {
  if (!rasterCtx) return;

  rasterCtx.fillStyle = "#030408";
  rasterCtx.fillRect(0, 0, rasterCanvas.width, rasterCanvas.height);

  const colWidth = rasterCanvas.width / 15;
  const numNeurons = 1575;

  // Grid lines
  rasterCtx.strokeStyle = "rgba(28, 39, 62, 0.4)";
  rasterCtx.lineWidth = 1;
  for (let s = 0; s < 15; s++) {
    rasterCtx.beginPath();
    rasterCtx.moveTo(s * colWidth, 0);
    rasterCtx.lineTo(s * colWidth, rasterCanvas.height);
    rasterCtx.stroke();
  }

  // Draw spikes up to currentStep
  for (let s = 0; s <= currentStep && s < spikesPerStep.length; s++) {
    const list = spikesPerStep[s] || [];
    for (const nIdx of list) {
      const x = s * colWidth + 2;
      const y = (nIdx / numNeurons) * rasterCanvas.height;

      if (nIdx < 50) {
        rasterCtx.fillStyle = "#39ff14"; // PN
      } else if (nIdx < 1550) {
        rasterCtx.fillStyle = "#ffd700"; // KC
      } else if (nIdx === 1550) {
        rasterCtx.fillStyle = "#ff007f"; // APL
      } else {
        rasterCtx.fillStyle = "#ff3366"; // MBON
      }

      rasterCtx.fillRect(x, y, colWidth - 4, 1.8);
    }
  }

  // Current step indicator bar
  rasterCtx.fillStyle = "rgba(0, 240, 255, 0.25)";
  rasterCtx.fillRect(currentStep * colWidth, 0, colWidth, rasterCanvas.height);
}

// 5. Update Game UI
function updateGameUI(data) {
  if (!data) return;

  // 5.1 Dice View
  const dice = data.dice || data.next_dice || data.prev_dice || data.current_dice || [1, 1, 1, 1, 1];
  const holds = data.holds || [false, false, false, false, false];
  const diceEls = document.querySelectorAll(".die");

  dice.forEach((val, idx) => {
    if (idx < diceEls.length) {
      const el = diceEls[idx];
      el.querySelector(".die-val").innerText = DICE_CHARS[val] || "⚀";
      const isHeld = holds[idx] || false;
      if (isHeld) {
        el.classList.add("held");
        el.querySelector(".die-hold").innerText = "HOLD";
      } else {
        el.classList.remove("held");
        el.querySelector(".die-hold").innerText = "";
      }
    }
  });

  // 5.2 Round & Roll Badges
  const roundNum = data.round || 1;
  const rollCount = data.roll_count || (data.action === "score" ? 3 : 1);
  document.getElementById("roundBadge").innerText = `Round ${roundNum} / 12`;
  document.getElementById("rollInfo").innerText = `Roll ${rollCount} of 3`;

  // 5.3 Action Card
  const actionCard = document.getElementById("actionCard");
  const actionType = document.getElementById("actionType");
  const actionDesc = document.getElementById("actionDesc");

  if (data.action === "roll") {
    actionType.innerText = "🎲 주사위 롤링 & 홀드 판단";
    const heldCount = (holds.filter(Boolean)).length;
    actionDesc.innerText = `초파리 SNN이 주사위 ${heldCount}개를 홀드하고 나머지 주사위를 굴렸습니다.`;
  } else if (data.action === "score" || data.action === "lock_and_score") {
    actionType.innerText = `🎯 족보 선택: ${data.category} (+${data.points}점!)`;
    actionDesc.innerText = `초파리 MBON 보상 뉴런이 [${data.category}] 족보를 선택하여 ${data.points}점을 획득했습니다.`;
  } else if (data.finished) {
    actionType.innerText = `🏆 게임 종료! 최종 점수: ${data.total_score}점`;
    actionDesc.innerText = `12라운드가 모두 완료되었습니다. [새 게임] 버튼으로 다시 시작할 수 있습니다.`;
  }

  // 5.4 Total Score & Upper Bonus
  const total = data.total_score || 0;
  document.getElementById("totalScore").innerText = `${total} pts`;

  const upperSum = data.upper_sum || 0;
  const upperBonus = data.upper_bonus || 0;
  const bonusPct = Math.min(100, Math.round((upperSum / 63) * 100));
  document.getElementById("upperSumText").innerText = `${upperSum} / 63 pts (+${upperBonus})`;
  document.getElementById("upperProgress").style.width = `${bonusPct}%`;

  // 5.5 Scoreboard Table
  const board = data.score_board || {};
  renderScoreTable(board);
}

function renderScoreTable(board) {
  const tbody = document.getElementById("scoreTbody");
  tbody.innerHTML = "";

  for (let i = 0; i < 6; i++) {
    const cat1 = CATEGORIES[i];
    const cat2 = CATEGORIES[i + 6];

    const pts1 = board[cat1];
    const pts2 = board[cat2];

    const row = document.createElement("tr");

    const td1Name = `<td class="cat-name">${cat1}</td>`;
    const td1Pts = pts1 !== undefined
      ? `<td class="cat-pts ${pts1 === 0 ? 'zero' : 'scored'}">${pts1}</td>`
      : `<td class="cat-pts">-</td>`;

    const td2Name = `<td class="cat-name">${cat2}</td>`;
    const td2Pts = pts2 !== undefined
      ? `<td class="cat-pts ${pts2 === 0 ? 'zero' : 'scored'}">${pts2}</td>`
      : `<td class="cat-pts">-</td>`;

    row.innerHTML = `${td1Name}${td1Pts}${td2Name}${td2Pts}`;
    tbody.appendChild(row);
  }
}

// 6. Network & API Handlers
async function fetchStatus() {
  try {
    const res = await fetch("/api/status");
    if (res.ok) {
      const data = await res.json();
      if (data.model_name) {
        document.getElementById("badgeModel").innerText = data.model_name;
      }
      updateGameUI(data);
    }
  } catch (err) {
    console.warn("Status fetch failed:", err);
  }
}

async function stepTurn() {
  try {
    const res = await fetch("/api/step", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      updateGameUI(data);
      if (data.telemetry) {
        playTurnTelemetry(data.telemetry);
      }
      if (data.finished && isAutoPlaying) {
        toggleAutoPlay();
      }
    }
  } catch (err) {
    console.error("Step failed:", err);
  }
}

async function resetGame() {
  try {
    const res = await fetch("/api/reset", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      updateGameUI(data);
      if (rasterCtx) rasterCtx.clearRect(0, 0, rasterCanvas.width, rasterCanvas.height);
      document.getElementById("overlayMs").innerText = "0 / 15 ms";
      document.getElementById("overlayKcCount").innerText = "0";
      document.getElementById("overlayApl").innerText = "대기";
    }
  } catch (err) {
    console.error("Reset failed:", err);
  }
}

function toggleAutoPlay() {
  const btnAuto = document.getElementById("btnAuto");
  isAutoPlaying = !isAutoPlaying;

  if (isAutoPlaying) {
    btnAuto.classList.add("active");
    btnAuto.innerText = "⏸ 정지 (Pause)";
    autoPlayTimer = setInterval(() => {
      if (!isPlayingTelemetry) {
        stepTurn();
      }
    }, 1100 / animSpeed);
  } else {
    btnAuto.classList.remove("active");
    btnAuto.innerText = "⚡ 자동 플레이 (Auto)";
    if (autoPlayTimer) clearInterval(autoPlayTimer);
    autoPlayTimer = null;
  }
}

// 7. Connect SSE Stream
function connectSSE() {
  const statusDot = document.getElementById("statusDot");
  const statusText = document.getElementById("statusText");

  try {
    const evtSource = new EventSource("/events");

    evtSource.onopen = () => {
      statusDot.className = "dot-online";
      statusText.innerText = "Live SSE Connected";
    };

    evtSource.addEventListener("step", (e) => {
      const record = JSON.parse(e.data);
      updateGameUI(record);
      if (record.telemetry) {
        playTurnTelemetry(record.telemetry);
      }
    });

    evtSource.addEventListener("reset", (e) => {
      const status = JSON.parse(e.data);
      updateGameUI(status);
    });

    evtSource.addEventListener("discord_turn", (e) => {
      const turnData = JSON.parse(e.data);
      updateGameUI(turnData);
      if (turnData.telemetry) {
        playTurnTelemetry(turnData.telemetry);
      }
    });

    evtSource.onerror = () => {
      statusDot.className = "dot-connecting";
      statusText.innerText = "Reconnecting...";
    };
  } catch (e) {
    console.warn("SSE unsupported or failed, fallback to manual control.");
  }
}

// 8. Bootstrap
window.addEventListener("DOMContentLoaded", () => {
  brainCanvas = document.getElementById("brainCanvas");
  brainCtx = brainCanvas.getContext("2d");

  rasterCanvas = document.getElementById("rasterCanvas");
  rasterCtx = rasterCanvas.getContext("2d");

  // Speed selector
  const speedSelect = document.getElementById("speedSelect");
  speedSelect.addEventListener("change", (e) => {
    animSpeed = parseFloat(e.target.value);
    if (isAutoPlaying) {
      toggleAutoPlay();
      toggleAutoPlay();
    }
  });

  // Buttons
  document.getElementById("btnStep").addEventListener("click", stepTurn);
  document.getElementById("btnAuto").addEventListener("click", toggleAutoPlay);
  document.getElementById("btnReset").addEventListener("click", resetGame);
  document.getElementById("btnResetView").addEventListener("click", () => {
    initConnectomeCoordinates();
  });

  // Initialize Canvas & SSE
  initConnectomeCoordinates();
  renderBrain();
  connectSSE();
  fetchStatus();
});
