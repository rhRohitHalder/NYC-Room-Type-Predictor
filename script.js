/* ======================================================
   STAY SIGNAL — app logic
   Talks to the FastAPI backend's /predict endpoint.
====================================================== */

// Use the FastAPI server directly when the page is opened from a static host
// or from the local filesystem. Keep same-origin requests when already served
// by FastAPI so deployments do not need any extra config.
const API_BASE = (window.location.protocol === 'file:' || (['localhost', '127.0.0.1'].includes(window.location.hostname) && window.location.port !== '8000' && window.location.port !== ''))
  ? 'http://127.0.0.1:8000'
  : '';

const CLASS_META = {
  'Entire home/apt': { letter: 'E', color: '--green', className: 'entire' },
  'Private room':    { letter: 'P', color: '--amber', className: 'private' },
  'Shared room':     { letter: 'S', color: '--purple', className: 'shared' },
};

const CONFIDENCE_LABELS = [
  { min: 0.85, label: 'High confidence', state: 'high' },
  { min: 0.70, label: 'Moderate confidence', state: 'moderate' },
  { min: 0.00, label: 'Low confidence', state: 'low' },
];

/* ---------- dependent borough / neighbourhood selects ---------- */
const groupSelect = document.getElementById('neighbourhood_group');
const neighSelect  = document.getElementById('neighbourhood');
const latInput = document.getElementById('latitude');
const lonInput = document.getElementById('longitude');

function populateGroups(){
  const groups = Object.keys(NEIGH_DATA);
  groupSelect.innerHTML = groups.map(g => `<option value="${g}">${g}</option>`).join('');
}

function populateNeighbourhoods(group){
  const list = NEIGH_DATA[group] || [];
  neighSelect.innerHTML = list.map(n => `<option value="${n.name}" data-lat="${n.lat}" data-lon="${n.lon}">${n.name}</option>`).join('');
  applyCoordsFromSelection();
}

function applyCoordsFromSelection(){
  const opt = neighSelect.options[neighSelect.selectedIndex];
  if (!opt) return;
  latInput.value = opt.dataset.lat;
  lonInput.value = opt.dataset.lon;
}

groupSelect.addEventListener('change', () => populateNeighbourhoods(groupSelect.value));
neighSelect.addEventListener('change', applyCoordsFromSelection);

populateGroups();
populateNeighbourhoods(groupSelect.value);
// Default to a recognizable starting point: Manhattan / Chelsea if present
if (NEIGH_DATA['Manhattan']) {
  groupSelect.value = 'Manhattan';
  populateNeighbourhoods('Manhattan');
  const chelsea = [...neighSelect.options].find(o => o.value === 'Chelsea');
  if (chelsea) { neighSelect.value = 'Chelsea'; applyCoordsFromSelection(); }
}

/* ---------- split-flap departure board ---------- */
const boardSamples = [
  { hood: 'BEDFORD-STUYVESANT', type: 'Entire home/apt', conf: 91 },
  { hood: 'UPPER WEST SIDE',    type: 'Private room',    conf: 78 },
  { hood: 'ASTORIA',            type: 'Shared room',     conf: 64 },
  { hood: 'WILLIAMSBURG',       type: 'Entire home/apt', conf: 88 },
  { hood: 'HARLEM',             type: 'Private room',    conf: 83 },
];
const typeClass = { 'Entire home/apt': 'entire', 'Private room': 'private', 'Shared room': 'shared' };
const boardRows = document.getElementById('boardRows');

function renderBoard(){
  boardRows.innerHTML = boardSamples.map((s, i) => `
    <div class="board__row">
      <div class="board__cell"><span class="board__flap" style="animation-delay:${i * .08}s">${s.hood}</span></div>
      <div class="board__cell board__type board__type--${typeClass[s.type]}"><span class="board__flap" style="animation-delay:${i * .08 + .05}s">${s.type.toUpperCase()}</span></div>
      <div class="board__cell board__conf"><span class="board__flap" style="animation-delay:${i * .08 + .1}s">${s.conf}%</span></div>
    </div>
  `).join('');
}
renderBoard();
setInterval(() => {
  boardSamples.push(boardSamples.shift());
  renderBoard();
}, 4200);

/* ---------- scroll reveal ---------- */
const revealEls = document.querySelectorAll('.slide-up');
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting){
      e.target.style.animationPlayState = 'running';
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.15 });
revealEls.forEach(el => { el.style.animationPlayState = 'paused'; io.observe(el); });

/* ---------- ripple buttons ---------- */
document.querySelectorAll('.ripple').forEach(btn => {
  btn.addEventListener('click', function(e){
    const rect = this.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.6;
    const dot = document.createElement('span');
    dot.className = 'ripple-dot';
    dot.style.width = dot.style.height = size + 'px';
    dot.style.left = (e.clientX - rect.left - size / 2) + 'px';
    dot.style.top  = (e.clientY - rect.top  - size / 2) + 'px';
    this.appendChild(dot);
    setTimeout(() => dot.remove(), 650);
  });
});

/* ---------- API health check ---------- */
const apiDot = document.getElementById('apiDot');
const apiStatusText = document.getElementById('apiStatusText');

async function checkApi(){
  try{
    let res = await fetch(`${API_BASE}/health`).catch(() => null);
    if (!res || !res.ok) {
      res = await fetch(`${API_BASE}/`);
    }
    if (res && res.ok){
      apiDot.classList.add('ok');
      apiStatusText.textContent = 'API connected';
    } else throw new Error('bad status');
  }catch(err){
    apiDot.classList.add('bad');
    apiStatusText.textContent = 'API unreachable — check backend is running';
  }
}
checkApi();

/* ---------- predict form ---------- */
const form = document.getElementById('predictForm');
const submitBtn = document.getElementById('submitBtn');
const errorMsg = document.getElementById('errorMsg');
const resultPlaceholder = document.getElementById('resultPlaceholder');
const resultContent = document.getElementById('resultContent');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.classList.remove('show');
  submitBtn.classList.add('is-loading');
  submitBtn.disabled = true;

  const payload = {
    latitude: parseFloat(latInput.value),
    longitude: parseFloat(lonInput.value),
    price: parseFloat(document.getElementById('price').value),
    minimum_nights: parseInt(document.getElementById('minimum_nights').value, 10),
    number_of_reviews: parseInt(document.getElementById('number_of_reviews').value, 10),
    reviews_per_month: parseFloat(document.getElementById('reviews_per_month').value),
    calculated_host_listings_count: parseInt(document.getElementById('calculated_host_listings_count').value, 10),
    availability_365: parseInt(document.getElementById('availability_365').value, 10),
    neighbourhood_group: groupSelect.value,
    neighbourhood: neighSelect.value,
  };

  try{
    const res = await fetch(`${API_BASE}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok){
      const detail = await res.text();
      throw new Error(`Request failed (${res.status}): ${detail}`);
    }

    const data = await res.json();
    renderResult(data);
    document.getElementById('result').scrollIntoView({ behavior: 'smooth', block: 'center' });

  }catch(err){
    errorMsg.textContent = err.message || 'Something went wrong reaching the API.';
    errorMsg.classList.add('show');
  }finally{
    submitBtn.classList.remove('is-loading');
    submitBtn.disabled = false;
  }
});

function renderResult(data){
  const label = data.Predicted_room_type;
  const probs = data.Probability; // array aligned to model.classes_ order
  const classOrder = ['Entire home/apt', 'Private room', 'Shared room'];
  const meta = CLASS_META[label] || CLASS_META['Entire home/apt'];

  resultPlaceholder.hidden = true;
  resultContent.hidden = false;

  const badge = document.getElementById('resultBadge');
  const letter = document.getElementById('resultLetter');
  const confidenceLevel = document.getElementById('resultConfidenceLevel');
  const confidenceText = document.getElementById('resultConfidenceText');
  const confidenceNote = document.getElementById('resultConfidenceNote');
  const confidenceWarning = document.getElementById('resultConfidenceWarning');
  const title = document.getElementById('resultTitle');
  const ringFill = document.getElementById('ringFill');
  const ringLabel = document.getElementById('ringLabel');
  const resultCard = document.getElementById('resultCard');

  const root = document.documentElement;
  const colorVar = getComputedStyle(root).getPropertyValue(meta.color).trim();

  badge.style.background = colorVar;
  badge.style.boxShadow = `0 0 0 6px ${colorVar}33`;
  letter.textContent = meta.letter;
  title.textContent = label;

  const topIndex = classOrder.indexOf(label);
  const topProb = probs[topIndex] !== undefined ? probs[topIndex] : Math.max(...probs);
  const pct = Math.round(topProb * 100);
  const confidence = getConfidenceMeta(topProb);
  const confidencePct = `${pct}%`;

  resultCard.dataset.confidence = confidence.state;
  confidenceLevel.textContent = confidence.label.toUpperCase();
  confidenceText.textContent = confidencePct;
  confidenceNote.textContent = `${confidence.label} (${confidencePct})`;
  confidenceWarning.hidden = topProb >= 0.70;
  confidenceWarning.textContent = topProb >= 0.70
    ? ''
    : `Low confidence: the top class is only ${confidencePct}. Treat this prediction as tentative.`;

  const circumference = 2 * Math.PI * 34;
  const confidenceColor = getConfidenceColor(confidence.state);
  ringFill.style.stroke = confidenceColor;
  requestAnimationFrame(() => {
    ringFill.style.strokeDashoffset = circumference - (circumference * (pct / 100));
  });
  animateNumber(ringLabel, pct);

  const probList = document.getElementById('probList');
  probList.innerHTML = classOrder.map((cls, i) => {
    const m = CLASS_META[cls];
    const v = probs[i] !== undefined ? probs[i] : 0;
    const p = Math.round(v * 100);
    const cVar = getComputedStyle(root).getPropertyValue(m.color).trim();
    return `
      <div class="prob-row">
        <span class="prob-row__label">${cls}</span>
        <span class="prob-row__track"><span class="prob-row__fill" style="background:${cVar}" data-target="${p}"></span></span>
        <span class="prob-row__val mono">${p}%</span>
      </div>`;
  }).join('');

  const fills = probList.querySelectorAll('.prob-row__fill');
  fills.forEach(el => {
    el.style.width = '0%';
  });
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fills.forEach(el => {
        el.style.width = el.dataset.target + '%';
      });
    });
  });
}

function getConfidenceMeta(value){
  return CONFIDENCE_LABELS.find(item => value >= item.min) || CONFIDENCE_LABELS[CONFIDENCE_LABELS.length - 1];
}

function getConfidenceColor(state){
  const root = document.documentElement;
  if (state === 'high') return getComputedStyle(root).getPropertyValue('--green').trim();
  if (state === 'low') return getComputedStyle(root).getPropertyValue('--red').trim();
  return getComputedStyle(root).getPropertyValue('--amber').trim();
}

function animateNumber(el, target){
  const start = 0;
  const dur = 900;
  const t0 = performance.now();
  function tick(t){
    const p = Math.min(1, (t - t0) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(start + (target - start) * eased) + '%';
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
