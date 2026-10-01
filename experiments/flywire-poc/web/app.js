// ============================================================================
// Drosophila 3D Connectome SNN: Real-Time WebGL Visualizer Engine
// ============================================================================

const DICE_CHARS = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const CATEGORIES = [
  "Aces", "Deuces", "Treys", "Fours", "Fives", "Sixes",
  "Choice", "FourOfAKind", "FullHouse", "SmallStraight", "LargeStraight", "Yacht"
];

// Three.js State
let scene, camera, renderer, controls;
let pointCloud, pointGeometry, pointColors, baseColors;
let pulseGroup;
let isThreeReady = false;
let autoRotateActive = true;

// 2D Raster & Fallback State
let rasterCanvas, rasterCtx;
let animSpeed = 1.0;
let isAutoPlaying = false;
let autoPlayTimer = null;
let currentTelemetry = null;
let playbackStep = 0;
let isPlayingTelemetry = false;

// Color Palette for Regions
const REGION_COLORS = {
  "pn_left": [0.22, 1.0, 0.08],       // Neon Green
  "pn_right": [0.22, 1.0, 0.08],
  "kc_left_calyx": [0.0, 0.94, 1.0],   // Cyan
  "kc_right_calyx": [0.0, 0.94, 1.0],
  "kc_left_vertical": [1.0, 0.84, 0.0],// Gold
  "kc_right_vertical": [1.0, 0.84, 0.0],
  "kc_left_medial": [1.0, 0.50, 0.0],  // Warm Orange
  "kc_right_medial": [1.0, 0.50, 0.0],
  "cx_pb": [0.72, 0.35, 1.0],          // Electric Purple
  "cx_eb": [0.85, 0.40, 1.0],
  "apl_left": [1.0, 0.0, 0.5],         // Hot Pink / Magenta
  "apl_right": [1.0, 0.0, 0.5],
  "mbon_left": [1.0, 0.15, 0.38],      // Ruby Red
  "mbon_right": [1.0, 0.15, 0.38],
  "default": [0.8, 0.8, 0.8]
};

// 1. Initialize Three.js 3D Viewport
function initThreeScene(container) {
  if (typeof THREE === "undefined") {
    console.warn("Three.js not loaded, using fallback.");
    return false;
  }

  const width = container.clientWidth || 800;
  const height = container.clientHeight || 520;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06080e);
  scene.fog = new THREE.FogExp2(0x06080e, 0.0012);

  camera = new THREE.PerspectiveCamera(45, width / height, 1, 3000);
  camera.position.set(0, 80, 440);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  if (typeof THREE.OrbitControls !== "undefined") {
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 75, 0);
    controls.autoRotate = autoRotateActive;
    controls.autoRotateSpeed = 1.0;
    controls.maxDistance = 1200;
    controls.minDistance = 60;
  }

  // Lighting
  const ambientLight = new THREE.AmbientLight(0x222233);
  scene.add(ambientLight);

  // Pulse Container
  pulseGroup = new THREE.Group();
  scene.add(pulseGroup);

  window.addEventListener("resize", onWindowResize);
  isThreeReady = true;
  return true;
}

function onWindowResize() {
  const container = document.getElementById("threeContainer");
  if (!container || !renderer || !camera) return;
  const width = container.clientWidth;
  const height = container.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

// 2. Fetch Topology and Build 3D Point Cloud
async function load3DConnectome() {
  try {
    const res = await fetch("/api/topology");
    const topo = await res.json();
    
    if (!topo.coordinates_3d || topo.coordinates_3d.length === 0) {
      console.log("No 3D coordinates in topology, generating synthetic bilateral layout...");
      buildSyntheticBilateralCloud(1575);
      return;
    }

    buildPointCloud(topo.coordinates_3d, topo.regions || []);
  } catch (err) {
    console.error("Failed to load topology:", err);
    buildSyntheticBilateralCloud(1575);
  }
}

function buildPointCloud(coords, regions) {
  if (pointCloud) scene.remove(pointCloud);

  const numNeurons = coords.length;
  const positions = new Float32Array(numNeurons * 3);
  pointColors = new Float32Array(numNeurons * 3);
  baseColors = new Float32Array(numNeurons * 3);
  const sizes = new Float32Array(numNeurons);

  for (let i = 0; i < numNeurons; i++) {
    positions[i * 3] = coords[i][0];
    positions[i * 3 + 1] = coords[i][1];
    positions[i * 3 + 2] = coords[i][2];

    const reg = regions[i] || "default";
    const col = REGION_COLORS[reg] || REGION_COLORS["default"];

    // Base resting color with subtle glow
    baseColors[i * 3] = col[0] * 0.45;
    baseColors[i * 3 + 1] = col[1] * 0.45;
    baseColors[i * 3 + 2] = col[2] * 0.45;

    pointColors[i * 3] = baseColors[i * 3];
    pointColors[i * 3 + 1] = baseColors[i * 3 + 1];
    pointColors[i * 3 + 2] = baseColors[i * 3 + 2];

    if (reg.startsWith("apl")) {
      sizes[i] = 12.0;
    } else if (reg.startsWith("pn") || reg.startsWith("mbon")) {
      sizes[i] = 5.0;
    } else if (reg.startsWith("cx")) {
      sizes[i] = 4.0;
    } else {
      sizes[i] = 2.4;
    }
  }

  pointGeometry = new THREE.BufferGeometry();
  pointGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  pointGeometry.setAttribute("color", new THREE.BufferAttribute(pointColors, 3));

  // Circular glow particle texture
  const sprite = createParticleTexture();

  const pointMaterial = new THREE.PointsMaterial({
    size: 3.5,
    vertexColors: true,
    map: sprite,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  pointCloud = new THREE.Points(pointGeometry, pointMaterial);
  scene.add(pointCloud);

  // Add subtle synaptic grid lines between regions
  buildSynapticBackgroundLines(coords, regions);
}

function createParticleTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");

  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1.0)");
  gradient.addColorStop(0.25, "rgba(255, 255, 255, 0.85)");
  gradient.addColorStop(0.6, "rgba(255, 255, 255, 0.25)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

function buildSynapticBackgroundLines(coords, regions) {
  const linePositions = [];
  const lineColors = [];
  const n = coords.length;

  // Sample representative connections (~600 lines) for structural depth
  const sampleCount = Math.min(800, n);
  for (let i = 0; i < sampleCount; i++) {
    const idx1 = Math.floor(Math.random() * n);
    const idx2 = (idx1 + Math.floor(Math.random() * 500) + 1) % n;

    linePositions.push(coords[idx1][0], coords[idx1][1], coords[idx1][2]);
    linePositions.push(coords[idx2][0], coords[idx2][1], coords[idx2][2]);

    lineColors.push(0.0, 0.4, 0.8);
    lineColors.push(0.0, 0.4, 0.8);
  }

  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
  lineGeo.setAttribute("color", new THREE.Float32BufferAttribute(lineColors, 3));

  const lineMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.08,
    blending: THREE.AdditiveBlending
  });

  const lines = new THREE.LineSegments(lineGeo, lineMat);
  scene.add(lines);
}

function buildSyntheticBilateralCloud(count) {
  const coords = [];
  const regions = [];
  for (let i = 0; i < count; i++) {
    const side = (i % 2 === 0) ? -1 : 1;
    const x = side * (80 + Math.random() * 70);
    const y = 40 + Math.random() * 120;
    const z = (Math.random() - 0.5) * 80;
    coords.push([x, y, z]);
    regions.push(i < 50 ? "pn_left" : (i > count - 25 ? "mbon_left" : "kc_left_calyx"));
  }
  buildPointCloud(coords, regions);
}

// 3. Animation and Spiking Render Loop
function animateThree() {
  requestAnimationFrame(animateThree);

  if (controls) controls.update();

  // Smooth decay of firing spikes back to base colors
  if (pointGeometry && pointColors && baseColors) {
    let needsUpdate = false;
    const len = pointColors.length;
    for (let i = 0; i < len; i++) {
      const diff = pointColors[i] - baseColors[i];
      if (Math.abs(diff) > 0.01) {
        pointColors[i] -= diff * 0.16;
        needsUpdate = true;
      }
    }
    if (needsUpdate) {
      pointGeometry.attributes.color.needsUpdate = true;
    }
  }

  // Update dynamic laser pulses
  if (pulseGroup && pulseGroup.children.length > 0) {
    for (let i = pulseGroup.children.length - 1; i >= 0; i--) {
      const pulse = pulseGroup.children[i];
      pulse.position.add(pulse.velocity);
      pulse.material.opacity -= 0.04;
      if (pulse.material.opacity <= 0) {
        pulseGroup.remove(pulse);
      }
    }
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

// 4. Trigger Spikes in 3D Point Cloud
function igniteSpikes3D(neuronIndices) {
  if (!pointGeometry || !pointColors) return;

  for (const idx of neuronIndices) {
    if (idx * 3 + 2 < pointColors.length) {
      // White-hot neon flash
      pointColors[idx * 3] = 1.0;
      pointColors[idx * 3 + 1] = 1.0;
      pointColors[idx * 3 + 2] = 1.0;
    }
  }
  pointGeometry.attributes.color.needsUpdate = true;
}

function spawnLaserPulse(fromCoord, toCoord, colorHex = 0x00f0ff) {
  if (!pulseGroup) return;
  const geom = new THREE.SphereGeometry(2.0, 6, 6);
  const mat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(fromCoord[0], fromCoord[1], fromCoord[2]);

  const dir = new THREE.Vector3(toCoord[0] - fromCoord[0], toCoord[1] - fromCoord[1], toCoord[2] - fromCoord[2]);
  mesh.velocity = dir.normalize().multiplyScalar(12.0);
  pulseGroup.add(mesh);
}

// 5. Telemetry Playback
function playTurnTelemetry(telemetry) {
  currentTelemetry = telemetry;
  playbackStep = 0;
  isPlayingTelemetry = true;

  const msDisplay = document.getElementById("overlayMs");
  const kcCountDisplay = document.getElementById("overlayKcCount");
  const aplDisplay = document.getElementById("overlayApl");

  if (rasterCtx && rasterCanvas) {
    rasterCtx.clearRect(0, 0, rasterCanvas.width, rasterCanvas.height);
  }

  const stepInterval = Math.max(16, Math.floor(45 / animSpeed));

  function stepSim() {
    if (playbackStep >= telemetry.sim_steps) {
      isPlayingTelemetry = false;
      return;
    }

    const spikes = telemetry.spikes_per_step[playbackStep] || [];
    igniteSpikes3D(spikes);

    // Overlay stats
    msDisplay.innerText = `${playbackStep + 1} / ${telemetry.sim_steps} ms`;
    kcCountDisplay.innerText = spikes.length;

    const aplFired = telemetry.apl_fired_steps && telemetry.apl_fired_steps.includes(playbackStep);
    if (aplFired) {
      aplDisplay.innerText = "억제 활성화 (FEEDBACK)";
      aplDisplay.className = "apl-active";
    } else {
      aplDisplay.innerText = "안정 (STABLE)";
      aplDisplay.className = "apl-idle";
    }

    // Raster plot
    drawRasterSlice(playbackStep, telemetry.sim_steps, spikes);

    playbackStep++;
    setTimeout(stepSim, stepInterval);
  }

  stepSim();
}

function drawRasterSlice(step, totalSteps, activeIndices) {
  if (!rasterCtx || !rasterCanvas) return;

  const w = rasterCanvas.width;
  const h = rasterCanvas.height;
  const colW = w / totalSteps;
  const x = step * colW;

  rasterCtx.fillStyle = "rgba(0, 240, 255, 0.08)";
  rasterCtx.fillRect(x, 0, colW, h);

  const totalN = (pointColors ? pointColors.length / 3 : 1575) || 1575;

  for (const idx of activeIndices) {
    const y = (idx / totalN) * h;
    rasterCtx.fillStyle = "#ffffff";
    rasterCtx.fillRect(x + 1, y, Math.max(1.5, colW - 1), 2);
  }
}

// 6. Game Dashboard & SSE Sync
function updateGameUI(status) {
  if (!status) return;

  // Header badges
  if (status.model_name) {
    const badgeModel = document.getElementById("badgeModel");
    if (badgeModel) badgeModel.innerText = status.model_name;
  }
  if (status.round !== undefined) {
    const roundBadge = document.getElementById("roundBadge");
    if (roundBadge) roundBadge.innerText = `Round ${Math.min(12, status.round)} / 12`;
  }

  // Roll info text
  const rollInfo = document.getElementById("rollInfo");
  if (rollInfo) {
    if (status.finished) {
      rollInfo.innerText = "게임 종료 (12라운드 완주)";
    } else if (status.roll_count !== undefined) {
      rollInfo.innerText = `Roll ${status.roll_count} of 3`;
    }
  }

  // Scoreboard
  if (status.score_board) {
    const tbody = document.getElementById("scoreTbody");
    if (tbody) {
      tbody.innerHTML = "";
      for (let i = 0; i < 6; i++) {
        const cat1 = CATEGORIES[i];
        const val1 = status.score_board[cat1];
        const cat2 = CATEGORIES[i + 6];
        const val2 = status.score_board[cat2];

        const formatCell = (cat, val) => {
          if (val === null || val === undefined) {
            return `<td class="cat-name">${cat}</td><td class="cat-pts">-</td>`;
          }
          const isRecentlyScored = status.category === cat;
          const cls = val === 0 ? "cat-pts zero" : "cat-pts scored";
          const highlightStyle = isRecentlyScored
            ? "style='background: rgba(0,240,255,0.18); color: #00f0ff; font-weight: bold; border-radius: 4px;'"
            : "";
          return `<td class="cat-name" ${highlightStyle}>${cat}</td><td class="${cls}" ${highlightStyle}>${val}</td>`;
        };

        const tr = document.createElement("tr");
        tr.innerHTML = `${formatCell(cat1, val1)}${formatCell(cat2, val2)}`;
        tbody.appendChild(tr);
      }
    }
  }

  // Upper section bonus
  if (status.upper_sum !== undefined) {
    const pct = Math.min(100, (status.upper_sum / 63) * 100);
    const prog = document.getElementById("upperProgress");
    const sumText = document.getElementById("upperSumText");
    if (prog) prog.style.width = `${pct}%`;
    if (sumText) sumText.innerText = `${status.upper_sum} / 63 pts (+${status.upper_bonus || 0})`;
  }

  // Total score
  if (status.total_score !== undefined) {
    const totalEl = document.getElementById("totalScore");
    if (totalEl) totalEl.innerText = `${status.total_score} pts`;
  }

  // Dice row & Hold badges
  const dice = status.current_dice || status.next_dice || status.dice;
  if (dice && Array.isArray(dice)) {
    const diceRow = document.getElementById("diceRow");
    if (diceRow) {
      diceRow.innerHTML = "";
      const holds = status.holds || [];
      dice.forEach((val, idx) => {
        const die = document.createElement("div");
        die.className = "die";
        die.dataset.idx = idx;
        const isHeld = Boolean(holds[idx]);
        if (isHeld) {
          die.classList.add("held");
        }
        die.innerHTML = `<span class="die-val">${DICE_CHARS[val] || val}</span><span class="die-hold">${isHeld ? "HOLD" : ""}</span>`;
        diceRow.appendChild(die);
      });
    }
  }

  // Action Announcement
  const actionType = document.getElementById("actionType");
  const actionDesc = document.getElementById("actionDesc");

  if (actionType && actionDesc) {
    const act = typeof status.action === "string" ? status.action : (status.action ? status.action.type : "");
    if (status.finished || act === "finished") {
      actionType.innerText = "🏁 게임 종료 (Game Over)";
      actionType.className = "action-type highlight-cat";
      actionDesc.innerText = `최종 점수: ${status.total_score || 0} pts 달성! 새 게임(Reset)을 누르면 다시 시작합니다.`;
    } else if (act === "roll" || act === "hold") {
      const holds = status.holds || (status.action && status.action.decision) || [];
      const heldSlots = holds.map((h, i) => h ? `#${i + 1}` : "").filter(Boolean);
      actionType.innerText = `🎲 주사위 고정 및 재굴림 (Roll #${status.roll_count || 1})`;
      actionType.className = "action-type";
      actionDesc.innerText = heldSlots.length > 0
        ? `초파리 선택 고정 슬롯: [${heldSlots.join(", ")}] | 나머지 슬롯 재굴림`
        : `고정 없음: 주사위 5개 전체 재굴림`;
    } else if (act === "score") {
      const cat = status.category || (status.action && status.action.decision) || "";
      const pts = status.points !== undefined ? status.points : (status.action && status.action.points) || 0;
      actionType.innerText = `📋 점수 등록 (Category Decision): ${cat}`;
      actionType.className = "action-type highlight-cat";
      actionDesc.innerText = `[${cat}] 슬롯에 +${pts} pts 획득! (현재 총점: ${status.total_score || 0} pts)`;
    } else if (act === "lock_and_score") {
      const cat = status.category || (status.action && status.action.decision) || "";
      const pts = status.points !== undefined ? status.points : (status.action && status.action.points) || 0;
      actionType.innerText = `🔒 전체 고정 후 즉시 점수 등록: ${cat}`;
      actionType.className = "action-type highlight-cat";
      actionDesc.innerText = `모든 주사위를 만족하여 3회차 전 즉시 등록! +${pts} pts 획득 (현재 총점: ${status.total_score || 0} pts)`;
    }
  }
}

// 7. Actions: Step, Reset, Auto-play
async function stepTurn() {
  const btnStep = document.getElementById("btnStep");
  btnStep.disabled = true;
  try {
    const res = await fetch("/api/step", { method: "POST" });
    const record = await res.json();
    updateGameUI(record);
    if (record.telemetry) {
      playTurnTelemetry(record.telemetry);
    }
    if (record.finished && isAutoPlaying) {
      toggleAutoPlay();
    }
  } catch (e) {
    console.error("Step failed:", e);
  } finally {
    btnStep.disabled = false;
  }
}

async function resetGame() {
  try {
    const res = await fetch("/api/reset", { method: "POST" });
    const status = await res.json();
    updateGameUI(status);
  } catch (e) {
    console.error("Reset failed:", e);
  }
}

function toggleAutoPlay() {
  const btnAuto = document.getElementById("btnAuto");
  isAutoPlaying = !isAutoPlaying;

  if (isAutoPlaying) {
    btnAuto.classList.add("active");
    btnAuto.innerText = "⏸ 자동 플레이 중지";
    const speedMs = Math.max(200, Math.floor(900 / animSpeed));
    autoPlayTimer = setInterval(stepTurn, speedMs);
  } else {
    btnAuto.classList.remove("active");
    btnAuto.innerText = "⚡ 자동 플레이 (Auto)";
    if (autoPlayTimer) clearInterval(autoPlayTimer);
    autoPlayTimer = null;
  }
}

// 8. Connect SSE Stream
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

    evtSource.onerror = () => {
      statusDot.className = "dot-connecting";
      statusText.innerText = "Reconnecting...";
    };
  } catch (e) {
    console.warn("SSE failed, fallback to manual polling.");
  }
}

// 9. Bootstrap
window.addEventListener("DOMContentLoaded", () => {
  rasterCanvas = document.getElementById("rasterCanvas");
  if (rasterCanvas) rasterCtx = rasterCanvas.getContext("2d");

  const threeContainer = document.getElementById("threeContainer");
  if (threeContainer) {
    initThreeScene(threeContainer);
    load3DConnectome();
    animateThree();
  }

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

  const btnAutoRotate = document.getElementById("btnAutoRotate");
  if (btnAutoRotate) {
    btnAutoRotate.addEventListener("click", () => {
      autoRotateActive = !autoRotateActive;
      if (controls) controls.autoRotate = autoRotateActive;
      btnAutoRotate.innerText = autoRotateActive ? "🔄 3D 자전: ON" : "⏸ 3D 자전: OFF";
      btnAutoRotate.classList.toggle("active", autoRotateActive);
    });
  }

  document.getElementById("btnResetView").addEventListener("click", () => {
    if (camera && controls) {
      camera.position.set(0, 80, 440);
      controls.target.set(0, 75, 0);
      controls.update();
    }
  });

  connectSSE();
  fetch("/api/status").then(r => r.json()).then(updateGameUI).catch(() => {});
});
