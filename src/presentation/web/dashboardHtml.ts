export const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>야추 다이스 - 전당 및 대시보드</title>
  <!-- Google Fonts Inter -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <!-- Chart.js CDN -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root {
      --bg-color: #0b0c15;
      --panel-bg: rgba(20, 22, 39, 0.55);
      --panel-border: rgba(255, 255, 255, 0.07);
      --text-main: #f1f3f9;
      --text-muted: #94a3b8;
      --accent-primary: #5865F2; /* Discord Blue */
      --accent-success: #10b981; /* Emerald Green */
      --accent-danger: #f43f5e; /* Rose Red */
      --accent-warning: #f59e0b; /* Amber Orange */
      --glow-primary: rgba(88, 101, 242, 0.25);
      --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg-color);
      color: var(--text-main);
      font-family: var(--font-sans);
      min-height: 100vh;
      overflow-x: hidden;
      background-image: 
        radial-gradient(circle at 10% 20%, rgba(88, 101, 242, 0.1) 0%, transparent 40%),
        radial-gradient(circle at 90% 80%, rgba(16, 185, 129, 0.08) 0%, transparent 45%);
      background-attachment: fixed;
    }

    header {
      backdrop-filter: blur(12px);
      background: rgba(11, 12, 21, 0.7);
      border-bottom: 1px solid var(--panel-border);
      position: sticky;
      top: 0;
      z-index: 100;
      padding: 1.2rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .logo-container {
      display: flex;
      align-items: center;
      gap: 0.8rem;
    }

    .logo-icon {
      font-size: 2rem;
      animation: dice-rotate 4s infinite ease-in-out;
    }

    @keyframes dice-rotate {
      0%, 100% { transform: rotate(0deg); }
      33% { transform: rotate(12deg) scale(1.1); }
      66% { transform: rotate(-12deg) scale(0.95); }
    }

    .logo-text {
      font-size: 1.4rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      background: linear-gradient(135deg, #fff 30%, var(--accent-primary) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .nav-tabs {
      display: flex;
      gap: 0.5rem;
      background: rgba(255, 255, 255, 0.04);
      padding: 0.25rem;
      border-radius: 8px;
      border: 1px solid var(--panel-border);
    }

    .tab-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 0.6rem 1.2rem;
      font-weight: 600;
      font-size: 0.9rem;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .tab-btn:hover {
      color: var(--text-main);
    }

    .tab-btn.active {
      background: var(--accent-primary);
      color: #fff;
      box-shadow: 0 4px 12px var(--glow-primary);
    }

    main {
      max-width: 1200px;
      margin: 2.5rem auto;
      padding: 0 1.5rem;
    }

    .tab-content {
      display: none;
      animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .tab-content.active {
      display: block;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Glass Card */
    .glass-card {
      background: var(--panel-bg);
      border: 1px solid var(--panel-border);
      border-radius: 12px;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      padding: 1.2rem;
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.25);
      margin-bottom: 1.2rem;
    }

    h2 {
      font-size: 1.6rem;
      font-weight: 700;
      margin-bottom: 1.5rem;
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    /* Profile Search Section */
    .search-bar {
      display: flex;
      gap: 0.8rem;
      margin-bottom: 2rem;
    }

    .search-input {
      flex: 1;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--panel-border);
      padding: 0.8rem 1.2rem;
      border-radius: 10px;
      color: var(--text-main);
      font-family: inherit;
      font-size: 1rem;
      transition: all 0.3s ease;
    }

    .search-input:focus {
      outline: none;
      border-color: var(--accent-primary);
      box-shadow: 0 0 0 3px var(--glow-primary);
      background: rgba(255, 255, 255, 0.08);
    }

    .search-btn {
      background: var(--accent-primary);
      border: none;
      color: #fff;
      padding: 0 1.5rem;
      font-weight: 600;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .search-btn:hover {
      filter: brightness(1.1);
      box-shadow: 0 4px 12px var(--glow-primary);
    }

    /* Profile Grid layout */
    .profile-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }

    @media (min-width: 768px) {
      .profile-grid {
        grid-template-columns: 1fr 2fr;
      }
    }

    .stats-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--panel-border);
      border-radius: 12px;
      padding: 1.5rem;
      transition: transform 0.2s ease;
    }

    .stats-card:hover {
      transform: translateY(-2px);
    }

    .stats-title {
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 0.8rem;
    }

    .stats-value {
      font-size: 2.2rem;
      font-weight: 800;
      line-height: 1;
    }

    .stats-value-elo {
      color: #60a5fa;
      text-shadow: 0 0 12px rgba(96, 165, 250, 0.3);
    }

    .stats-list {
      margin-top: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    .stats-item {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px dashed rgba(255, 255, 255, 0.05);
      padding-bottom: 0.4rem;
    }

    .streak-container {
      display: flex;
      gap: 0.4rem;
      flex-wrap: wrap;
      margin-top: 0.5rem;
    }

    .streak-badge {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      font-weight: 700;
    }

    .streak-w { background-color: var(--accent-success); color: #fff; }
    .streak-l { background-color: var(--accent-danger); color: #fff; }
    .streak-d { background-color: var(--accent-warning); color: #000; }

    /* Recent Matches Table */
    .table-container {
      overflow-x: auto;
      margin-top: 1rem;
      border-radius: 10px;
      border: 1px solid var(--panel-border);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.85rem;
    }

    th, td {
      padding: 0.5rem 0.8rem;
    }

    th {
      background: rgba(255, 255, 255, 0.04);
      color: var(--text-muted);
      font-weight: 600;
      border-bottom: 1px solid var(--panel-border);
    }

    tr:not(:last-child) {
      border-bottom: 1px solid var(--panel-border);
    }

    tr:hover td {
      background: rgba(255, 255, 255, 0.01);
    }

    /* Legend List Cards */
    .legend-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }

    @media (min-width: 992px) {
      .legend-grid {
        grid-template-columns: 1fr 1fr;
      }
    }

    .legend-card {
      background: var(--panel-bg);
      border: 1px solid var(--panel-border);
      border-radius: 16px;
      padding: 1.5rem;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
    }

    .legend-card:hover {
      transform: translateY(-4px);
      border-color: var(--accent-primary);
      box-shadow: 0 12px 24px rgba(88, 101, 242, 0.15);
    }

    .legend-badge {
      display: inline-block;
      padding: 0.3rem 0.6rem;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 700;
      margin-bottom: 1rem;
    }

    .badge-yacht { background: rgba(16, 185, 129, 0.15); color: var(--accent-success); border: 1px solid rgba(16, 185, 129, 0.3); }
    .badge-comeback { background: rgba(88, 101, 242, 0.15); color: #818cf8; border: 1px solid rgba(88, 101, 242, 0.3); }
    .badge-streak { background: rgba(245, 158, 11, 0.15); color: var(--accent-warning); border: 1px solid rgba(245, 158, 11, 0.3); }
    .badge-fail { background: rgba(244, 63, 94, 0.15); color: var(--accent-danger); border: 1px solid rgba(244, 63, 94, 0.3); }

    .legend-title {
      font-size: 1.15rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }

    .legend-desc {
      color: var(--text-muted);
      font-size: 0.9rem;
      line-height: 1.5;
      margin-bottom: 1.2rem;
      flex: 1;
    }

    .legend-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.85rem;
      color: var(--text-muted);
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      padding-top: 0.8rem;
    }

    /* Modal Styling */
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1000;
      align-items: center;
      justify-content: center;
    }

    .modal-overlay {
      position: absolute;
      width: 100%;
      height: 100%;
      background: rgba(5, 5, 8, 0.85);
      backdrop-filter: blur(8px);
    }

    .modal-content {
      position: relative;
      background: #12131e;
      border: 1px solid var(--panel-border);
      border-radius: 20px;
      width: 90%;
      max-width: 900px;
      max-height: 85vh;
      overflow-y: auto;
      z-index: 1001;
      padding: 2rem;
      box-shadow: 0 20px 50px rgba(0,0,0,0.6);
      animation: modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes modalSlideUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .close-btn {
      position: absolute;
      top: 1.2rem;
      right: 1.2rem;
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 1.8rem;
      cursor: pointer;
      transition: color 0.2s ease;
    }

    .close-btn:hover {
      color: #fff;
    }

    .modal-header-title {
      font-size: 1.4rem;
      font-weight: 800;
      margin-bottom: 0.5rem;
    }

    .loader {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 3rem 0;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(255, 255, 255, 0.05);
      border-top-color: var(--accent-primary);
      border-radius: 50%;
      animation: spin 1s infinite linear;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .empty-message {
      text-align: center;
      color: var(--text-muted);
      padding: 3rem 0;
      font-size: 1rem;
    }

    /* Player Directory Chips */
    .player-chip {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--panel-border);
      color: var(--text-main);
      padding: 0.4rem 0.8rem;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      transition: all 0.2s ease;
    }

    .player-chip:hover {
      background: rgba(88, 101, 242, 0.15);
      border-color: var(--accent-primary);
      transform: translateY(-1px);
    }

    .player-chip .elo-badge {
      background: rgba(96, 165, 250, 0.15);
      color: #60a5fa;
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 700;
    }

    /* Tag Filters in Legend Matches */
    .filter-container {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1.2rem;
    }

    .filter-btn {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--panel-border);
      color: var(--text-muted);
      padding: 0.4rem 0.8rem;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .filter-btn:hover {
      color: var(--text-main);
      background: rgba(255, 255, 255, 0.06);
    }

    .filter-btn.active {
      background: var(--accent-primary);
      color: #fff;
      border-color: var(--accent-primary);
    }

    .link-nickname {
      color: #60a5fa;
      cursor: pointer;
      text-decoration: underline;
      transition: color 0.2s ease;
    }

    .link-nickname:hover {
      color: #93c5fd;
    }
  </style>
</head>
<body>
  <header>
    <div class="logo-container">
      <span class="logo-icon">🎲</span>
      <span class="logo-text">야추 다이스 전당</span>
    </div>
    <nav class="nav-tabs">
      <button class="tab-btn active" onclick="switchTab('profile-tab')">🏆 프로필 & 통계</button>
      <button class="tab-btn" onclick="switchTab('legend-tab')">🎬 레전드 경기</button>
    </nav>
  </header>

  <main>
    <!-- TAB 1: Profile & Stats -->
    <div id="profile-tab" class="tab-content active">
      <div class="glass-card">
        <h2>👤 플레이어 검색 및 전적</h2>
        <div class="search-bar">
          <input type="text" id="player-id-input" class="search-input" placeholder="디스코드 User ID를 입력하세요... (예: 123456789012345678)">
          <button class="search-btn" onclick="searchProfile()">조회</button>
        </div>

        <div id="player-directory-container" style="margin-top: 1rem; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 1rem;">
          <h4 style="margin: 0 0 0.5rem 0; font-size: 0.85rem; color: var(--text-muted);">👥 등록된 플레이어 목록 (클릭하여 조회)</h4>
          <div id="player-directory-list" style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
            <span style="color: var(--text-muted); font-size: 0.8rem;">불러오는 중...</span>
          </div>
        </div>

        <div id="profile-result" style="display: none;">
          <!-- JS will populate player data here -->
        </div>

        <div id="profile-loading" class="loader" style="display: none;">
          <div class="spinner"></div>
        </div>

        <div id="profile-placeholder" class="empty-message">
          플레이어 ID를 입력하고 조회해 전적 카드를 확인해보세요!
        </div>
      </div>
    </div>

    <!-- TAB 2: Legend Matches -->
    <div id="legend-tab" class="tab-content">
      <div class="glass-card">
        <h2>🎬 명예의 전당 - 레전드 경기 모음</h2>
        <p style="color: var(--text-muted); margin-bottom: 1.2rem;">
          막판 대역전승, 야추(Yacht) 완성, 기가막힌 연속 0점 뇌절 등 유별난 기록을 남긴 소중한 명경기 리스트입니다.
        </p>

        <div class="filter-container">
          <button id="filter-btn-all" class="filter-btn active" onclick="filterLegend('all')">전체</button>
          <button id="filter-btn-yacht" class="filter-btn" onclick="filterLegend('yacht')">🎲 야추 완성</button>
          <button id="filter-btn-comeback" class="filter-btn" onclick="filterLegend('comeback')">⚡ 극적 역전승</button>
          <button id="filter-btn-streak" class="filter-btn" onclick="filterLegend('streak')">🔥 연속 고득점</button>
          <button id="filter-btn-fail" class="filter-btn" onclick="filterLegend('fail')">🧠 연속 뇌절</button>
        </div>

        <div id="legend-loading" class="loader">
          <div class="spinner"></div>
        </div>

        <div id="legend-list" class="legend-grid" style="display: none;">
          <!-- JS will populate cards here -->
        </div>
      </div>
    </div>
  </main>

  <!-- Modal for Turn-by-Turn Replays -->
  <div id="replay-modal" class="modal">
    <div class="modal-overlay" onclick="closeReplayModal()"></div>
    <div class="modal-content">
      <button class="close-btn" onclick="closeReplayModal()">&times;</button>
      <div class="modal-header-title" id="modal-match-title">경기 정보 복기</div>
      <p id="modal-match-meta" style="color: var(--text-muted); margin-bottom: 1.5rem;"></p>
      
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th style="width: 80px;">턴</th>
              <th>플레이어</th>
              <th>기록 카테고리</th>
              <th>주사위 기록</th>
              <th>획득 점수</th>
              <th>누적 점수</th>
              <th style="width: 120px;">점수 격차 (Δ)</th>
            </tr>
          </thead>
          <tbody id="modal-turns-tbody">
            <!-- JS will populate turns here -->
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <script>
    // Load player directory
    async function loadPlayerDirectory() {
      const container = document.getElementById('player-directory-list');
      try {
        const response = await fetch('/web/api/players');
        if (!response.ok) throw new Error();
        const players = await response.json();
        if (players.length === 0) {
          container.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem;">등록된 플레이어가 없습니다.</span>';
          return;
        }
        container.innerHTML = players.map(p => \`
          <button class="player-chip" onclick="document.getElementById('player-id-input').value='\${p.id}'; searchProfile('\${p.id}')">
            👤 \${p.name} <span class="elo-badge">\${p.elo}</span>
          </button>
        \`).join('');
      } catch (err) {
        container.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem;">플레이어 목록을 불러오지 못했습니다.</span>';
      }
    }

    // Tab switching
    function switchTab(tabId) {
      document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

      document.getElementById(tabId).classList.add('active');
      
      // Find matching button
      const index = tabId === 'profile-tab' ? 0 : 1;
      document.querySelectorAll('.tab-btn')[index].classList.add('active');

      if (tabId === 'legend-tab') {
        loadLegendMatches();
      }
    }

    // Load URL params (e.g., ?player=123)
    window.addEventListener('DOMContentLoaded', () => {
      loadPlayerDirectory();
      const urlParams = new URLSearchParams(window.location.search);
      const playerParam = urlParams.get('player');
      if (playerParam) {
        document.getElementById('player-id-input').value = playerParam;
        searchProfile(playerParam);
      }
    });

    async function searchProfile(idOverride) {
      const idInput = idOverride || document.getElementById('player-id-input').value.trim();
      if (!idInput) {
        alert('조회할 플레이어 ID를 입력해 주세요!');
        return;
      }

      const resultDiv = document.getElementById('profile-result');
      const loaderDiv = document.getElementById('profile-loading');
      const placeholderDiv = document.getElementById('profile-placeholder');

      resultDiv.style.display = 'none';
      placeholderDiv.style.display = 'none';
      loaderDiv.style.display = 'flex';

      try {
        const response = await fetch(\`/web/api/profile/\${idInput}\`);
        if (!response.ok) {
          throw new Error('조회 실패');
        }
        const data = await response.json();
        
        loaderDiv.style.display = 'none';
        
        if (!data || !data.stats) {
          placeholderDiv.innerHTML = '해당 플레이어의 전적 정보를 찾을 수 없습니다. 게임을 한 판 더 플레이해보세요!';
          placeholderDiv.style.display = 'block';
          return;
        }

        resultDiv.style.display = 'block';
        
        const stats = data.stats;
        const recent = data.recent || [];
        const avgSolo = data.avgSoloScore || 0;
        const avgMulti = data.avgMultiScore || 0;

        // Render Profile Card
        let recentStreakHtml = '';
        if (recent.length > 0) {
          const multi = recent.filter(m => m.mode === 'multi');
          if (multi.length > 0) {
            recentStreakHtml = multi.map(m => {
              if (m.winnerId === idInput) return '<div class="streak-badge streak-w">W</div>';
              if (m.winnerId === null) return '<div class="streak-badge streak-d">D</div>';
              return '<div class="streak-badge streak-l">L</div>';
            }).join('');
          } else {
            recentStreakHtml = '<span style="color: var(--text-muted)">멀티 매치 전적 없음</span>';
          }
        } else {
          recentStreakHtml = '<span style="color: var(--text-muted)">최근 전적 없음</span>';
        }

        let matchesTableHtml = '';
        if (recent.length > 0) {
          matchesTableHtml = recent.map(m => {
            const dateStr = new Date(m.playedAt).toLocaleDateString('ko-KR', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
            const modeLabel = m.mode === 'single' ? '🕹️ 싱글' : '⚔️ 매치';
            
            let resultLabel = '-';
            let resultColor = 'var(--text-main)';
            if (m.mode === 'multi') {
              if (m.winnerId === idInput) {
                resultLabel = m.surrenderedId ? '승리 (KO)' : '승리';
                resultColor = 'var(--accent-success)';
              } else if (m.winnerId === null) {
                resultLabel = '무승부';
                resultColor = 'var(--accent-warning)';
              } else {
                resultLabel = m.surrenderedId ? '기권패 (KO)' : '패배';
                resultColor = 'var(--accent-danger)';
              }
            } else {
              resultLabel = m.surrenderedId ? '기권패 (KO)' : '완료';
              if (m.surrenderedId) resultColor = 'var(--accent-danger)';
            }

            const scoreText = m.mode === 'single' 
              ? \`\${m.player1Score}점\` 
              : \`\${m.player1Score} : \${m.player2Score || 0}\`;

            let opponentHtml = '-';
            if (m.mode === 'multi') {
              const oppId = m.player1Id === idInput ? m.player2Id : m.player1Id;
              if (oppId) {
                let oppName = oppId.slice(-6);
                if (m.historyJson) {
                  try {
                    const turns = JSON.parse(m.historyJson);
                    const oppIndex = m.player1Id === idInput ? 1 : 0;
                    const oppTurn = turns.find(t => t.playerIndex === oppIndex);
                    if (oppTurn && oppTurn.playerName) oppName = oppTurn.playerName;
                  } catch(e) {}
                }
                opponentHtml = \`<span class="link-nickname" onclick="switchTab('profile-tab'); document.getElementById('player-id-input').value='\${oppId}'; searchProfile('\${oppId}')" style="font-size:0.85rem;">\${oppName}</span>\`;
              }
            }

            return \`
              <tr>
                <td>\${dateStr}</td>
                <td>\${modeLabel}</td>
                <td style="font-weight: 700; color: \${resultColor}">\${resultLabel}</td>
                <td>\${opponentHtml}</td>
                <td>\${scoreText}</td>
                <td>
                  \${m.historyJson ? \`<button onclick="openReplay('\${m.id}')" style="background: rgba(88,101,242,0.15); border: 1px solid rgba(88,101,242,0.3); color: #a5b4fc; padding: 0.3rem 0.6rem; border-radius: 5px; cursor:pointer;">턴 복기</button>\` : '-'}
                </td>
              </tr>
            \`;
          }).join('');
        } else {
          matchesTableHtml = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">경기 기록이 없습니다.</td></tr>';
        }

        resultDiv.innerHTML = \`
          <div class="profile-grid">
            <div style="display: flex; flex-direction: column; gap: 1rem;">
              <div class="stats-card">
                <div class="stats-title">레이팅 점수</div>
                <div class="stats-value stats-value-elo">\${stats.elo} ELO</div>
              </div>
              <div class="stats-card">
                <div class="stats-title">⚔️ 매칭 전적</div>
                <div class="stats-value">\${stats.multiWins}승 \${stats.multiLosses}패</div>
                <div class="stats-list">
                  <div class="stats-item"><span>무승부</span><span>\${stats.multiDraws}</span></div>
                  <div class="stats-item"><span>최고 점수</span><span>\${stats.multiHighestScore}점</span></div>
                  <div class="stats-item"><span>평균 점수</span><span>\${avgMulti}점</span></div>
                </div>
                <div style="margin-top: 1rem;">
                  <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.3rem;">최근 10경기 흐름</div>
                  <div class="streak-container">
                    \${recentStreakHtml}
                  </div>
                </div>
              </div>
              <div class="stats-card">
                <div class="stats-title">🎮 싱글 모드</div>
                <div class="stats-value">\${stats.soloPlayCount}회 플레이</div>
                <div class="stats-list">
                  <div class="stats-item"><span>최고 점수</span><span>\${stats.soloHighestScore}점</span></div>
                  <div class="stats-item"><span>평균 점수</span><span>\${avgSolo}점</span></div>
                </div>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 1rem; flex: 1;">
              <div class="stats-card" id="elo-chart-card" style="display: none;">
                <div class="stats-title">📈 ELO 변동 추이</div>
                <div style="position: relative; height: 220px; width: 100%;">
                  <canvas id="elo-chart"></canvas>
                </div>
              </div>

              <div class="stats-card" style="display: flex; flex-direction: column; flex: 1;">
                <div class="stats-title">최근 경기 이력</div>
                <div class="table-container" style="flex: 1;">
                  <table>
                    <thead>
                      <tr>
                        <th>일시</th>
                        <th>모드</th>
                        <th>결과</th>
                        <th>상대</th>
                        <th>스코어</th>
                        <th>보기</th>
                      </tr>
                    </thead>
                    <tbody>
                      \${matchesTableHtml}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        \`;

        // Render ELO history chart if multi matches with ELO exist
        const eloHistory = [];
        const chronoMatches = [...recent].reverse();
        chronoMatches.forEach(m => {
          if (m.mode === 'multi') {
            const eloVal = m.player1Id === idInput ? m.player1EloAfter : m.player2EloAfter;
            if (eloVal !== null && eloVal !== undefined) {
              eloHistory.push({
                date: new Date(m.playedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
                elo: eloVal
              });
            }
          }
        });

        if (eloHistory.length > 0) {
          document.getElementById('elo-chart-card').style.display = 'block';
          setTimeout(() => {
            renderEloChart(eloHistory);
          }, 0);
        } else {
          document.getElementById('elo-chart-card').style.display = 'none';
        }

      } catch (e) {
        loaderDiv.style.display = 'none';
        placeholderDiv.innerHTML = '전적 데이터를 가져오는 데 실패했습니다.';
        placeholderDiv.style.display = 'block';
      }
    }

    let eloChartInstance = null;
    function renderEloChart(history) {
      const ctx = document.getElementById('elo-chart').getContext('2d');
      if (eloChartInstance) {
        eloChartInstance.destroy();
      }
      
      eloChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: history.map(h => h.date),
          datasets: [{
            label: 'ELO',
            data: history.map(h => h.elo),
            borderColor: '#60a5fa',
            backgroundColor: 'rgba(96, 165, 250, 0.1)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#60a5fa',
            pointHoverRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#12131e',
              titleColor: '#94a3b8',
              bodyColor: '#f1f3f9',
              borderColor: 'rgba(255,255,255,0.08)',
              borderWidth: 1,
              displayColors: false
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: '#94a3b8', font: { family: 'Inter' } }
            },
            y: {
              grid: { color: 'rgba(255, 255, 255, 0.05)' },
              ticks: { color: '#94a3b8', font: { family: 'Inter' } }
            }
          }
        }
      });
    }

    // Replay Game Log Modal
    async function openReplay(matchId) {
      const modal = document.getElementById('replay-modal');
      const tbody = document.getElementById('modal-turns-tbody');
      const title = document.getElementById('modal-match-title');
      const meta = document.getElementById('modal-match-meta');

      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;"><div class="spinner" style="margin: 2rem auto;"></div></td></tr>';
      modal.style.display = 'flex';

      try {
        const detailResp = await fetch(\`/web/api/profile/match/\${matchId}\`);
        if (!detailResp.ok) throw new Error();
        const matchData = await detailResp.json();
        
        const match = matchData.match;
        title.innerText = \`경기 복기: [\${match.id}]\`;
        meta.innerText = \`일시: \${new Date(match.playedAt).toLocaleString('ko-KR')} | 모드: \${match.mode === 'single' ? '🕹️ 싱글' : '⚔️ 매치'} | 최종 결과: \${match.player1Score} 대 \${match.player2Score || 0}\`;

        const turns = JSON.parse(match.historyJson);
        turns.sort((a,b) => a.turnNumber - b.turnNumber || a.playerIndex - b.playerIndex);

        const playerScores = {};
        tbody.innerHTML = turns.map(t => {
          const rolls = t.rolls || [];
          const lastRoll = rolls[rolls.length - 1] || [];
          const diceStr = lastRoll.length > 0 ? \`[ \${lastRoll.join(', ')} ]\` : '-';

          const pId = t.playerIndex === 0 ? match.player1Id : match.player2Id;

          // Track cumulative score
          if (playerScores[t.playerIndex] === undefined) {
            playerScores[t.playerIndex] = 0;
          }
          playerScores[t.playerIndex] += t.score;
          const cumulativeScore = playerScores[t.playerIndex];

          const linkHtml = pId 
            ? \`<span class="link-nickname" onclick="closeReplayModal(); switchTab('profile-tab'); document.getElementById('player-id-input').value='\${pId}'; searchProfile('\${pId}')">\${t.playerName}</span>\`
            : \`<span>\${t.playerName}</span>\`;

          // Score conditional formatting
          let scoreStyle = 'color: var(--accent-success); font-weight: 700;';
          if (t.score === 0) {
            scoreStyle = 'color: var(--accent-danger); font-weight: 800; text-shadow: 0 0 8px rgba(244, 63, 94, 0.3);';
          } else if (t.score < 15) {
            scoreStyle = 'color: #a7f3d0; font-weight: 500;';
          } else if (t.score < 30) {
            scoreStyle = 'color: #34d399; font-weight: 700;';
          } else if (t.score < 50) {
            scoreStyle = 'color: #059669; font-weight: 800; text-shadow: 0 0 10px rgba(52, 211, 153, 0.4);';
          } else {
            // Yacht or extremely high score (50+)
            scoreStyle = 'color: var(--accent-warning); font-weight: 900; text-shadow: 0 0 12px rgba(245, 158, 11, 0.6);';
          }

          const dotColor = t.playerIndex === 0 ? 'var(--accent-primary)' : 'var(--accent-success)';
          const dotHtml = match.mode === 'multi' 
            ? \`<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:\${dotColor}; margin-right:6px; flex-shrink:0;"></span>\`
            : '';

          const rowBg = match.mode === 'multi'
            ? (t.playerIndex === 0 ? 'background: rgba(88, 101, 242, 0.04);' : 'background: rgba(16, 185, 129, 0.03);')
            : '';

          const oppIndex = t.playerIndex === 0 ? 1 : 0;
          const oppScore = playerScores[oppIndex] || 0;
          const diff = cumulativeScore - oppScore;
          let diffHtml = '-';
          if (match.mode === 'multi') {
            if (diff > 0) {
              diffHtml = \`<span style="color: #60a5fa; font-weight:700;">+\${diff} (우세)</span>\`;
            } else if (diff < 0) {
              diffHtml = \`<span style="color: #f87171; font-weight:700;">\${diff} (열세)</span>\`;
            } else {
              diffHtml = \`<span style="color: var(--text-muted); font-weight:600;">동점</span>\`;
            }
          }

          return \`
            <tr style="\${rowBg}">
              <td>\${t.turnNumber} R</td>
              <td style="font-weight:600; display:flex; align-items:center;">\${dotHtml}\${linkHtml}</td>
              <td><code style="background: rgba(255,255,255,0.06); padding: 0.2rem 0.4rem; border-radius: 4px;">\${t.category}</code></td>
              <td style="font-family: monospace; letter-spacing: 0.05em; color: var(--text-muted);">\${diceStr}</td>
              <td style="\${scoreStyle}">+\${t.score}점</td>
              <td style="font-weight:700; color: var(--text-main);">\${cumulativeScore}점</td>
            </tr>
          \`;
        }).join('');
      } catch (e) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--accent-danger);">경기 로그 로드 실패</td></tr>';
      }
    }

    function closeReplayModal() {
      document.getElementById('replay-modal').style.display = 'none';
    }

    // Load legend matches tab
    let legendLoaded = false;
    async function loadLegendMatches() {
      if (legendLoaded) return;
      const listDiv = document.getElementById('legend-list');
      const loaderDiv = document.getElementById('legend-loading');

      listDiv.style.display = 'none';
      loaderDiv.style.display = 'flex';

      try {
        const response = await fetch('/web/api/legend');
        const results = await response.json();

        loaderDiv.style.display = 'none';
        
        if (!results || results.length === 0) {
          listDiv.innerHTML = '<div class="empty-message" style="grid-column: 1/-1">아직 등록된 레전드 명경기가 없습니다.</div>';
          listDiv.style.display = 'grid';
          return;
        }

        listDiv.style.display = 'grid';
        listDiv.innerHTML = results.map(res => {
          const match = res.match;
          const tags = res.tags || [];
          
          const badgeHtml = tags.map(tag => {
            return \`<span class="legend-badge badge-\${tag.type}">\${tag.label}</span>\`;
          }).join(' ');

          const dateStr = new Date(match.playedAt).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });

          return \`
            <div class="legend-card" data-tags="\${tags.map(t => t.type).join(',')}" onclick="openReplay('\${match.id}')">
              <div>
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                  <div>\${badgeHtml}</div>
                  <span style="font-size:0.75rem; background:rgba(255,255,255,0.05); padding:0.2rem 0.5rem; border-radius:10px; font-family:monospace; color:var(--text-muted);">ID: \${match.id}</span>
                </div>
                <div class="legend-title">\${match.mode === 'single' ? '🕹️ 싱글 모드' : '⚔️ 멀티 매치'} 레전드</div>
                <div class="legend-desc">
                  \${tags.length > 0 ? tags[0].description : '흥미로운 양상을 기록한 전설적인 매치'}
                </div>
              </div>
              <div class="legend-meta">
                <span>최종 스코어: <strong>\${match.player1Score}</strong> 대 <strong>\${match.player2Score || 0}</strong></span>
                <span>\${dateStr}</span>
              </div>
            </div>
          \`;
        }).join('');

        legendLoaded = true;
      } catch (e) {
        loaderDiv.style.display = 'none';
        listDiv.innerHTML = '<div class="empty-message" style="grid-column: 1/-1; color: var(--accent-danger);">레전드 경기를 가져오는 데 실패했습니다.</div>';
        listDiv.style.display = 'grid';
      }
    }

    function filterLegend(tagType) {
      document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
      const activeBtn = document.getElementById(\`filter-btn-\${tagType}\`);
      if (activeBtn) activeBtn.classList.add('active');

      const cards = document.querySelectorAll('.legend-card');
      cards.forEach(card => {
        const cardTagsStr = card.getAttribute('data-tags') || '';
        const cardTags = cardTagsStr.split(',');
        if (tagType === 'all' || cardTags.includes(tagType)) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    }
  </script>
</body>
</html>`;
