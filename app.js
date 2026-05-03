// ── Data ─────────────────────────────────────────────────
let entries = JSON.parse(localStorage.getItem('rg_entries') || '[]');

const DAYS   = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni',
                'Juli','Agustus','September','Oktober','November','Desember'];

// ── DOM ──────────────────────────────────────────────────
const audio        = document.getElementById('audio');
const textarea     = document.getElementById('journal-textarea');
const playIcon     = document.getElementById('play-icon');
const playingDot   = document.getElementById('playing-dot');
const progressFill = document.getElementById('progress-fill');
const timeDisp     = document.getElementById('time-disp');
const volPath      = document.getElementById('vol-path');

// ── Helpers ──────────────────────────────────────────────
function fmtDate(iso) {
  const d = new Date(iso);
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function fmtSec(s) {
  if (!s || isNaN(s)) return '–:––';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

function wc(t) { return t.trim() === '' ? 0 : t.trim().split(/\s+/).length; }

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Init ─────────────────────────────────────────────────
document.getElementById('current-date').textContent = fmtDate(new Date());

const draft = localStorage.getItem('rg_draft') || '';
textarea.value = draft;
document.getElementById('word-count').textContent = wc(draft) + ' kata';

textarea.addEventListener('input', () => {
  document.getElementById('word-count').textContent = wc(textarea.value) + ' kata';
  localStorage.setItem('rg_draft', textarea.value);
});

textarea.addEventListener('keydown', e => {
  if (e.ctrlKey && e.key === 'Enter') saveEntry();
});

audio.volume = 0.2;

// ── Navigation ───────────────────────────────────────────
function showWrite() {
  activate('btn-write');
  show('writing-section');
  hide('entries-section');
  hide('view-section');
  textarea.focus();
}

function showEntries() {
  activate('btn-entries');
  hide('writing-section');
  show('entries-section');
  hide('view-section');
  renderEntries();
}

function showView(id) {
  const e = entries.find(x => x.id === id);
  if (!e) return;
  hide('writing-section');
  hide('entries-section');
  show('view-section');
  document.getElementById('view-date-label').textContent = `${fmtDate(e.date)} · ${fmtTime(e.date)}`;
  document.getElementById('view-content').textContent = e.content;
}

function activate(btnId) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(btnId).classList.add('active');
}

function show(id) {
  const el = document.getElementById(id);
  el.classList.remove('hidden');
  el.style.animation = 'none';
  el.offsetHeight;
  el.style.animation = '';
}

function hide(id) { document.getElementById(id).classList.add('hidden'); }

// ── CRUD ─────────────────────────────────────────────────
function saveEntry() {
  const content = textarea.value.trim();
  if (!content) { showToast('tulisannya masih kosong...'); return; }

  entries.unshift({ id: Date.now(), date: new Date().toISOString(), content, wc: wc(content) });
  localStorage.setItem('rg_entries', JSON.stringify(entries));
  textarea.value = '';
  localStorage.removeItem('rg_draft');
  document.getElementById('word-count').textContent = '0 kata';
  showToast('tersimpan ✦');
}

function deleteEntry(e, id) {
  e.stopPropagation();
  if (!confirm('Yakin hapus entri ini?')) return;
  entries = entries.filter(x => x.id !== id);
  localStorage.setItem('rg_entries', JSON.stringify(entries));
  renderEntries();
  showToast('entri dihapus');
}

function renderEntries() {
  const list = document.getElementById('entries-list');
  if (entries.length === 0) {
    list.innerHTML = `<div class="empty-state"><p>belum ada entri. yuk mulai nulis.</p></div>`;
    return;
  }
  list.innerHTML = entries.map(en => `
    <div class="entry-card" onclick="showView(${en.id})">
      <div class="entry-card-top">
        <div class="entry-card-date">${fmtDate(en.date)} · ${fmtTime(en.date)}</div>
        <div class="entry-card-words">${en.wc} kata</div>
      </div>
      <div class="entry-card-preview">${esc(en.content)}</div>
      <div class="entry-card-footer">
        <button class="delete-btn" onclick="deleteEntry(event,${en.id})">hapus</button>
      </div>
    </div>
  `).join('');
}

// ── Toast ────────────────────────────────────────────────
let _tt;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(_tt);
  _tt = setTimeout(() => t.classList.remove('show'), 2400);
}

// ── Audio Player ─────────────────────────────────────────
let muted = false;

audio.addEventListener('timeupdate', () => {
  if (!audio.duration) return;
  progressFill.style.width = (audio.currentTime / audio.duration * 100) + '%';
  timeDisp.textContent = `${fmtSec(audio.currentTime)} / ${fmtSec(audio.duration)}`;
});

audio.addEventListener('play', () => {
  playIcon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
  playingDot.classList.add('on');
});

audio.addEventListener('pause', () => {
  playIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
  playingDot.classList.remove('on');
});

function togglePlay() {
  if (audio.paused) audio.play().catch(() => showToast('klik lagi untuk putar musik'));
  else audio.pause();
}

function seekAudio(e) {
  if (!audio.duration) return;
  const r = document.getElementById('progress-bar').getBoundingClientRect();
  audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration;
}

const VOL_ON  = 'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z';
const VOL_OFF = 'M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z';

function toggleMute() {
  muted = !muted;
  audio.muted = muted;
  volPath.setAttribute('d', muted ? VOL_OFF : VOL_ON);
  document.getElementById('mute-btn').style.color = muted ? 'var(--text-muted)' : '';
}
