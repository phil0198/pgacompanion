// public/app.js

let courseData = null;

// Load Chart.js dynamically if needed
function loadChartJs(callback) {
  if (window.Chart) return callback();
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
  script.onload = callback;
  document.head.appendChild(script);
}

// Initialize once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Fetch course data (ensure this path matches your JSON location)
  fetch('/data/colonial-country-club.json')
    .then(res => res.json())
    .then(json => {
      courseData = json;
    })
    .catch(err => console.error('Error loading course data:', err));

  // Form submission handler
  const form = document.getElementById('lookup-form');
  form.addEventListener('submit', handleLookup);

  // Map click handler: assumes SVG holes have data-hole attributes
  const mapContainer = document.getElementById('course-map');
  mapContainer.addEventListener('click', e => {
    const hole = e.target.dataset && e.target.dataset.hole;
    if (hole) {
      document.getElementById('hole-number').value = hole;
      document.getElementById('distance').focus();
    }
  });
});

function handleLookup(event) {
  event.preventDefault();
  if (!courseData) {
    alert('Course data not loaded. Please try again later.');
    return;
  }

  const holeNum = parseInt(document.getElementById('hole-number').value, 10);
  const distance = parseInt(document.getElementById('distance').value, 10);
  const lie = document.getElementById('lie-type').value;

  const holeInfo = courseData.holes.find(h => h.number === holeNum);
  if (!holeInfo) {
    alert('Invalid hole number.');
    return;
  }

  // Compute shot difficulty
  const ratio = distance / holeInfo.yardage;
  let difficulty;
  if (lie === 'bunker' || ratio > 0.75) {
    difficulty = 'Hard';
  } else if (ratio > 0.4 || lie === 'rough') {
    difficulty = 'Medium';
  } else {
    difficulty = 'Easy';
  }

  // Populate summary panel
  document.getElementById('res-hole').textContent = holeNum;
  document.getElementById('res-par').textContent = holeInfo.par;
  document.getElementById('res-yardage').textContent = holeInfo.yardage;
  document.getElementById('res-lie').textContent = lie.charAt(0).toUpperCase() + lie.slice(1);
  document.getElementById('res-distance').textContent = distance;
  document.getElementById('res-difficulty').textContent = difficulty;

  // Populate club usage table
  const clubTable = document.getElementById('res-club-table');
  clubTable.innerHTML = '';
  if (holeInfo.proStats && holeInfo.proStats.clubs) {
    holeInfo.proStats.clubs.forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="px-2 py-1 text-sm">${c.club}</td>
        <td class="px-2 py-1 text-sm">${c.usage}%</td>
        <td class="px-2 py-1 text-sm">${c.avgProProx} yds</td>
      `;
      clubTable.appendChild(tr);
    });
  } else {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="3" class="px-2 py-1 text-sm text-gray-500">No pro club data available.</td>`;
    clubTable.appendChild(tr);
  }

  // Render shot shape distribution chart
  loadChartJs(() => {
    const shapeCtx = document.getElementById('shape-chart').getContext('2d');
    if (holeInfo.proStats && holeInfo.proStats.shotShapes) {
      new Chart(shapeCtx, {
        type: 'pie',
        data: {
          labels: Object.keys(holeInfo.proStats.shotShapes),
          datasets: [{
            data: Object.values(holeInfo.proStats.shotShapes)
          }]
        },
        options: { responsive: true }
      });
    } else {
      shapeCtx.canvas.parentNode.innerHTML = '<p class="text-gray-500">No shot shape data available.</p>';
    }

    // Render dispersion chart or display std dev
    const dispDiv = document.getElementById('dispersion-chart');
    dispDiv.innerHTML = '';
    if (holeInfo.proStats && Array.isArray(holeInfo.proStats.dispersionData)) {
      const dispCanvas = document.createElement('canvas');
      dispDiv.appendChild(dispCanvas);
      const dispCtx = dispCanvas.getContext('2d');
      new Chart(dispCtx, {
        type: 'bar',
        data: {
          labels: holeInfo.proStats.dispersionData.map(d => d.distance),
          datasets: [{ label: 'Count', data: holeInfo.proStats.dispersionData.map(d => d.count) }]
        },
        options: { responsive: true }
      });
    } else if (holeInfo.proStats && holeInfo.proStats.dispersion != null) {
      dispDiv.textContent = `Std Dev: ${holeInfo.proStats.dispersion} yds`;
    } else {
      dispDiv.textContent = 'No dispersion data available.';
    }
  });

  // Show results
  document.getElementById('result').classList.remove('hidden');
}
