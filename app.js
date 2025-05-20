// public/app.js

let courseData = null;

// Load Chart.js dynamically
function loadChartJs(callback) {
  if (window.Chart) return callback();
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
  script.onload = callback;
  document.head.appendChild(script);
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Load local course data
    const courseRes = await fetch('data/colonial-country-club.json');
    courseData = await courseRes.json();

    // Fetch live leaderboard
    const apiRes = await fetch('https://statdata.pgatour.com/r/current/leaderboard-v2.json');
    const apiJson = await apiRes.json();
    const players = apiJson.leaderboard.players;

    // Populate player list
    const list = document.getElementById('players-list');
    list.innerHTML = '';
    players.forEach(player => {
      const btn = document.createElement('button');
      btn.textContent = `${player.player_bio.last_name}, ${player.player_bio.first_name}`;
      btn.className = 'bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded-full';
      btn.addEventListener('click', () => showPlayerShot(player));
      list.appendChild(btn);
    });
  } catch (err) {
    console.error('Initialization error:', err);
  }
});

function showPlayerShot(player) {
  // Hide any schedule placeholder
  document.getElementById('schedule-placeholder')?.classList.add('hidden');

  // Reveal result section
  const result = document.getElementById('result');
  result.classList.remove('hidden');

  // Extract live data
  const holeNum = player.current.hole || player.current_hole;
  const distance = player.current.distance_to_hole || player.distance_to_hole;

  // Lookup hole info
  const holeInfo = courseData.holes.find(h => h.number === holeNum) || {};

  // Populate summary fields
  document.getElementById('res-player').textContent = `${player.player_bio.first_name} ${player.player_bio.last_name}`;
  document.getElementById('res-hole').textContent = holeNum;
  document.getElementById('res-par').textContent = holeInfo.par || '--';
  document.getElementById('res-yardage').textContent = holeInfo.yardage || '--';
  document.getElementById('res-distance').textContent = distance;

  // Compute difficulty
  let difficulty = 'Unknown';
  if (holeInfo.yardage) {
    const ratio = distance / holeInfo.yardage;
    difficulty = ratio > 0.75 ? 'Hard' : ratio > 0.4 ? 'Medium' : 'Easy';
  }
  document.getElementById('res-difficulty').textContent = difficulty;

  // Update hole map image (assumes named images)
  const imgEl = document.getElementById('hole-image');
  imgEl.src = `images/colonial/hole${holeNum}.png`;
  imgEl.alt = `Hole ${holeNum} map`;

  // Populate club usage
  const clubTbody = document.getElementById('res-club-table');
  clubTbody.innerHTML = '';
  if (holeInfo.proStats?.clubs) {
    holeInfo.proStats.clubs.forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="px-2 py-1 text-sm">${c.club}</td>
        <td class="px-2 py-1 text-sm">${c.usage}%</td>
        <td class="px-2 py-1 text-sm">${c.avgProProx}</td>
      `;
      clubTbody.appendChild(tr);
    });
  } else {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="3" class="px-2 py-1 text-center text-gray-500">No club data available</td>';
    clubTbody.appendChild(tr);
  }

  // Load and render charts
  loadChartJs(() => {
    // Shot shape pie
    const shapeCtx = document.getElementById('shape-chart').getContext('2d');
    if (holeInfo.proStats?.shotShapes) {
      new Chart(shapeCtx, {
        type: 'pie',
        data: {
          labels: Object.keys(holeInfo.proStats.shotShapes),
          datasets: [{ data: Object.values(holeInfo.proStats.shotShapes) }]
        },
        options: { responsive: true }
      });
    } else {
      shapeCtx.canvas.parentNode.innerHTML = '<p class="text-gray-500 p-4">No shot shape data</p>';
    }

    // Dispersion bar or std dev
    const dispDiv = document.getElementById('dispersion-chart');
    dispDiv.innerHTML = '';
    if (Array.isArray(holeInfo.proStats?.dispersionData)) {
      const canvas = document.createElement('canvas');
      dispDiv.appendChild(canvas);
      const dispCtx = canvas.getContext('2d');
      new Chart(dispCtx, {
        type: 'bar',
        data: {
          labels: holeInfo.proStats.dispersionData.map(d => d.dist),
          datasets: [{ label: 'Count', data: holeInfo.proStats.dispersionData.map(d => d.count) }]
        },
        options: { responsive: true }
      });
    } else if (holeInfo.proStats?.dispersion != null) {
      dispDiv.textContent = `Std Dev: ${holeInfo.proStats.dispersion} yards`;
    } else {
      dispDiv.textContent = 'No dispersion data';
    }
  });
}
