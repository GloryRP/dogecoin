/* ============================================================
   DOGECOIN HASHING DEMO — script.js
   Interactive blockchain demo logic using Web Crypto API
   ============================================================ */

'use strict';

// ───────────────────────────────────────────────
// 1. SHA-256 HASHING (via Web Crypto API)
// ───────────────────────────────────────────────

/**
 * Compute SHA-256 hash of a string and return hex string.
 * @param {string} message
 * @returns {Promise<string>} hex hash
 */
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray  = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ───────────────────────────────────────────────
// 2. STATE
// ───────────────────────────────────────────────

let storedHashValue = null;  // The "locked-in" block hash
let miningInterval  = null;  // Mining animation interval
let miningStartTime = null;
let miningNonce     = 0;
let isMining        = false;

// ───────────────────────────────────────────────
// 3. TRANSACTION HASH — Generate & Store
// ───────────────────────────────────────────────

async function generateAndStore() {
  const sender   = document.getElementById('sender').value.trim();
  const receiver = document.getElementById('receiver').value.trim();
  const amount   = document.getElementById('amount').value.trim();
  const nonce    = document.getElementById('nonce').value.trim();

  if (!sender || !receiver || !amount) {
    flashError('generateBtn', 'Please fill in all fields!');
    return;
  }

  const btn = document.getElementById('generateBtn');
  btn.textContent = '⏳ Hashing...';
  btn.disabled = true;

  const txData = buildTxString(sender, receiver, amount, nonce);
  const hash   = await sha256(txData);

  storedHashValue = hash;

  // Update stored hash display
  setHashBox('storedHash', hash, 'green');

  // Recompute current hash (same since nothing changed yet)
  setHashBox('currentHash', hash, 'green');

  // Show integrity result
  showIntegrityResult(true);

  // Update meta
  document.getElementById('metaTimestamp').textContent = new Date().toLocaleTimeString();
  document.getElementById('metaSize').textContent = `${txData.length} bytes`;

  btn.innerHTML = '<span class="btn-icon">✅</span> Hash Stored!';
  setTimeout(() => {
    btn.innerHTML = '<span class="btn-icon">⚡</span> Generate &amp; Store Hash';
    btn.disabled = false;
  }, 1800);
}

function buildTxString(sender, receiver, amount, nonce) {
  return `SENDER:${sender}|RECEIVER:${receiver}|AMOUNT:${amount}DOGE|NONCE:${nonce}|COIN:DOGECOIN`;
}

// ───────────────────────────────────────────────
// 4. LIVE CURRENT HASH (auto-update on input change)
// ───────────────────────────────────────────────

async function recomputeCurrentHash() {
  if (!storedHashValue) return;

  const sender   = document.getElementById('sender').value.trim();
  const receiver = document.getElementById('receiver').value.trim();
  const amount   = document.getElementById('amount').value.trim();
  const nonce    = document.getElementById('nonce').value.trim();

  const txData    = buildTxString(sender, receiver, amount, nonce);
  const newHash   = await sha256(txData);
  const isValid   = newHash === storedHashValue;

  setHashBox('currentHash', newHash, isValid ? 'green' : 'red');
  showIntegrityResult(isValid);
}

// Attach listeners to all transaction inputs
['sender', 'receiver', 'amount', 'nonce'].forEach(id => {
  document.getElementById(id).addEventListener('input', recomputeCurrentHash);
});

// ───────────────────────────────────────────────
// 5. HASH BOX HELPERS
// ───────────────────────────────────────────────

function setHashBox(elementId, hash, color) {
  const el = document.getElementById(elementId);
  el.innerHTML = '';
  el.classList.remove('changed');
  if (color === 'red') el.classList.add('changed');

  // Animate character-by-character
  let i = 0;
  const interval = setInterval(() => {
    el.textContent = hash.slice(0, i) + (i < hash.length ? '_' : '');
    i++;
    if (i > hash.length) clearInterval(interval);
  }, 12);
}

function showIntegrityResult(isValid) {
  const result = document.getElementById('integrityResult');
  result.classList.remove('hidden', 'valid', 'invalid');
  result.classList.add(isValid ? 'valid' : 'invalid');

  const icon = result.querySelector('.result-icon');
  const text = result.querySelector('.result-text');

  if (isValid) {
    icon.textContent = '✅';
    text.textContent = 'Block Verified — Hash Matches!';
  } else {
    icon.textContent = '❌';
    text.textContent = 'Block Tampered — Hash Changed!';
  }
}

// ───────────────────────────────────────────────
// 6. AVALANCHE EFFECT — Live Comparison
// ───────────────────────────────────────────────

async function updateAvalanche() {
  const origText  = document.getElementById('originalText').value;
  const modiText  = document.getElementById('modifiedText').value;

  const [origHash, modiHash] = await Promise.all([sha256(origText), sha256(modiText)]);

  // Update hash boxes
  animateHashText('originalAvalancheHash', origHash, false);
  animateHashText('modifiedAvalancheHash', modiHash, true);

  // Hash lengths (both always 64 for SHA-256)
  document.getElementById('originalHashLen').textContent = `${origHash.length} chars`;
  document.getElementById('modifiedHashLen').textContent = `${modiHash.length} chars`;

  // Similarity calculation (character-level)
  const similarity = computeHashSimilarity(origHash, modiHash);
  const pct        = (similarity * 100).toFixed(1);
  document.getElementById('similarityPct').textContent = `${pct}%`;
  document.getElementById('meterFill').style.width = `${pct}%`;

  // Character diff
  renderCharDiff(origText, modiText);
}

function computeHashSimilarity(h1, h2) {
  let same = 0;
  const len = Math.min(h1.length, h2.length);
  for (let i = 0; i < len; i++) if (h1[i] === h2[i]) same++;
  return same / Math.max(h1.length, h2.length);
}

function renderCharDiff(s1, s2) {
  const box = document.getElementById('charDiffContent');
  if (s1 === s2) {
    box.textContent = 'Texts are identical — hashes match!';
    return;
  }

  let diffHTML = '';
  const maxLen = Math.max(s1.length, s2.length);
  let diffCount = 0;

  for (let i = 0; i < maxLen; i++) {
    const c1 = s1[i] ?? '';
    const c2 = s2[i] ?? '';
    if (c1 !== c2) {
      diffCount++;
      if (c1) diffHTML += `<span class="char-del">${escapeHTML(c1)}</span>`;
      if (c2) diffHTML += `<span class="char-add">${escapeHTML(c2)}</span>`;
    }
  }

  box.innerHTML = `${diffCount} character(s) differ: ${diffHTML}`;
}

function escapeHTML(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/ /g, '&nbsp;');
}

function animateHashText(elementId, hash, isRed) {
  const el = document.getElementById(elementId);
  el.classList.remove('changed');
  if (isRed) el.classList.add('changed');
  el.innerHTML = '';

  let i = 0;
  const interval = setInterval(() => {
    el.textContent = hash.slice(0, i) + (i < hash.length ? '█' : '');
    i++;
    if (i > hash.length) clearInterval(interval);
  }, 8);
}

// Attach listeners for avalanche section
document.getElementById('originalText').addEventListener('input', updateAvalanche);
document.getElementById('modifiedText').addEventListener('input', updateAvalanche);

// Initialize avalanche on load
window.addEventListener('DOMContentLoaded', () => {
  updateAvalanche();
});

// ───────────────────────────────────────────────
// 7. MINING SIMULATOR
// ───────────────────────────────────────────────

let difficulty = 2;

function updateDifficulty(val) {
  difficulty = parseInt(val);
  const display = document.getElementById('difficultyDisplay');
  display.textContent = `${val} zero${val > 1 ? 's' : ''}`;
  document.getElementById('targetPreview').textContent = '0'.repeat(difficulty) + '...';
}

// Initialize difficulty display
updateDifficulty(2);

async function startMining() {
  if (isMining) return;

  const data     = document.getElementById('mineData').value.trim() || 'GenesisBlock';
  const target   = '0'.repeat(difficulty);

  isMining        = true;
  miningNonce     = 0;
  miningStartTime = Date.now();

  document.getElementById('mineBtn').classList.add('hidden');
  document.getElementById('stopBtn').classList.remove('hidden');
  document.getElementById('miningResult').classList.add('hidden');

  let hashesPerSecond = 0;
  let lastCount       = 0;
  let lastTime        = Date.now();

  // Batch-mine in async chunks to not block UI
  const mine = async () => {
    if (!isMining) return;

    const batchSize = 50;
    for (let i = 0; i < batchSize && isMining; i++) {
      const input = `${data}:${miningNonce}`;
      const hash  = await sha256(input);

      miningNonce++;

      // Update live hash display every 10 hashes
      if (miningNonce % 10 === 0) {
        const liveEl = document.getElementById('miningLiveHash');
        liveEl.innerHTML = '';
        liveEl.textContent = hash;
        liveEl.classList.remove('changed');
        if (!hash.startsWith(target)) liveEl.classList.add('changed');
      }

      // Update stats
      const now     = Date.now();
      const elapsed = (now - miningStartTime) / 1000;
      document.getElementById('noncesTried').textContent = miningNonce.toLocaleString();
      document.getElementById('timeElapsed').textContent = `${elapsed.toFixed(2)}s`;

      if (now - lastTime >= 500) {
        hashesPerSecond = Math.round((miningNonce - lastCount) / ((now - lastTime) / 1000));
        lastCount       = miningNonce;
        lastTime        = now;
        document.getElementById('hashRate').textContent = `${hashesPerSecond.toLocaleString()}/s`;
      }

      if (hash.startsWith(target)) {
        miningSuccess(hash, miningNonce - 1);
        return;
      }
    }

    // Schedule next batch
    requestAnimationFrame(mine);
  };

  requestAnimationFrame(mine);
}

function miningSuccess(hash, nonce) {
  stopMining();
  const resultEl = document.getElementById('miningResult');
  resultEl.classList.remove('hidden');
  document.getElementById('foundNonce').textContent = nonce.toLocaleString();
  setHashBox('foundHash', hash, 'green');

  const liveEl = document.getElementById('miningLiveHash');
  liveEl.classList.remove('changed');
  liveEl.textContent = hash;

  // Celebration flash
  document.getElementById('mining-section').style.boxShadow = '0 0 60px rgba(34, 214, 138, 0.3)';
  setTimeout(() => { document.getElementById('mining-section').style.boxShadow = ''; }, 2000);
}

function stopMining() {
  isMining = false;
  document.getElementById('mineBtn').classList.remove('hidden');
  document.getElementById('stopBtn').classList.add('hidden');
}

// ───────────────────────────────────────────────
// 8. UTILITY — Flash error on button
// ───────────────────────────────────────────────

function flashError(btnId, msg) {
  const btn = document.getElementById(btnId);
  const orig = btn.innerHTML;
  btn.innerHTML = `⚠️ ${msg}`;
  btn.style.background = 'linear-gradient(135deg, #ff5f6d, #ff8a65)';
  setTimeout(() => {
    btn.innerHTML = orig;
    btn.style.background = '';
  }, 2000);
}
