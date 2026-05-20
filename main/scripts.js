let notes = {};
let currentId = null;
let saveTimer = null;
let currentMode = 'edit'; // 'edit', 'split', 'preview'
let suggestionBox = null;
let suggestionIndex = -1;
let suggestionItems = [];
let drafts = {};
let musiclist = ['music/Untitled #6.mp3', 
                'music/Mitsuishi Kotono - Fall in Star.mp3',
                'music/Hidamari no Uta-Le Couple.mp3',
                'music/Duvet.mp3',
                'music/KOMM, SUSSER TOD.mp3',
                'music/Rain Of Cinderella.mp3',
                'music/For fruit basket.mp3',
                'music/Twilight.mp3',
                'music/Yume Nikki OST - Ponikos House.mp3',
                'music/Silent Hill 2 OST - Heavens Night.mp3'];
let musicQueue = [];
let playedSongs = new Set();
let currentAudio = null;
let isPlayingMusic = false;
let currentVolume = 0.1;
let interVolume 
let evaProgress = 0;
let evaTimeout = null;



function shuffleQueue() {
  // Create shuffled copy of unplayed songs
  const unplayed = musiclist.filter(song => !playedSongs.has(song));
  if (unplayed.length === 0) {
    // All songs played, reset
    playedSongs.clear();
    musicQueue = [...musiclist].sort(() => Math.random() - 0.5);
  } else {
    musicQueue = unplayed.sort(() => Math.random() - 0.5);
  }
}

function updateSaveIndicator() {
  const ind = document.getElementById('save-indicator');

  if (!currentId) return;

  if (drafts[currentId]) {
    ind.textContent = 'unsaved';
    ind.className = 'save-indicator';
  } else {
    ind.textContent = 'saved';
    ind.className = 'save-indicator saved';
  }
}


function setVolume(value) {
  currentVolume = value / 100;
  if (currentAudio) {
    currentAudio.volume = currentVolume;
  }
}

function syncSliders(value) {
  document.querySelectorAll('.volume-slider').forEach(slider => {
    slider.value = value;
  });
}

function playMusic() {
  // If already playing, skip to next song
  if (isPlayingMusic && currentAudio && !currentAudio.paused) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
  
  if (musicQueue.length === 0) {
    shuffleQueue();
  }
  const song = musicQueue.shift();
  const encodedPath = song.split('/').map(part => encodeURIComponent(part)).join('/');
  currentAudio = new Audio(encodedPath);
  currentAudio.volume = currentVolume;
  currentAudio.play();
  playedSongs.add(song);
  isPlayingMusic = true;
  
  // Auto-play next song when this one ends
  currentAudio.addEventListener('ended', () => {
    playMusic();
  });
}

function stop() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
  isPlayingMusic = false;
}

function createSuggestionBox() {
  if (suggestionBox) return;
  suggestionBox = document.createElement('div');
  suggestionBox.id = 'wiki-suggestions';
  document.body.appendChild(suggestionBox);
}

function hideSuggestions() {
  if (suggestionBox) suggestionBox.style.display = 'none';
  suggestionItems = [];
  suggestionIndex = -1;
}

const evaSequence = ['e', 'v', 'a'];

function getCaretCoords(textarea) {
  const mirror = document.createElement('div');
  const style = window.getComputedStyle(textarea);
  ['fontSize', 'fontFamily', 'fontWeight', 'lineHeight',
   'paddingTop', 'paddingLeft', 'paddingRight', 'paddingBottom',
   'borderTop', 'borderLeft', 'boxSizing', 'wordWrap', 'whiteSpace', 'overflowWrap'].forEach(p => {
    mirror.style[p] = style[p];
  });
  mirror.style.position = 'absolute';
  mirror.style.visibility = 'hidden';
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.wordBreak = 'break-word';
  mirror.style.width = textarea.offsetWidth + 'px';

  const before = textarea.value.slice(0, textarea.selectionStart);
  mirror.textContent = before;

  const caret = document.createElement('span');
  caret.textContent = '\u200b'; // zero-width space, just to get position
  mirror.appendChild(caret);

  document.body.appendChild(mirror);
  const taRect = textarea.getBoundingClientRect();
  const caretRect = caret.getBoundingClientRect();
  const mirrorRect = mirror.getBoundingClientRect();
  document.body.removeChild(mirror);

  const lineHeight = parseInt(style.lineHeight) || 20;

  return {
    top: taRect.top + window.scrollY + (caretRect.top - mirrorRect.top) - textarea.scrollTop + lineHeight,
    left: taRect.left + window.scrollX + (caretRect.left - mirrorRect.left),
  };
}

function showSuggestions(query, textarea) {
  createSuggestionBox();

  const matches = Object.values(notes)
  .filter(n => n.id !== currentId && n.title && n.title.toLowerCase().includes(query.toLowerCase()))
  .sort((a, b) => {
    const aStarts = a.title.toLowerCase().startsWith(query.toLowerCase());
    const bStarts = b.title.toLowerCase().startsWith(query.toLowerCase());
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    return a.title.localeCompare(b.title);
  });


  if (!matches.length) { hideSuggestions(); return; }

  suggestionItems = matches;
  suggestionIndex = -1;

  const coords = getCaretCoords(textarea);
  suggestionBox.style.display = 'block';
  // Position below caret, offset slightly
  suggestionBox.style.top = (coords.top + 20) + 'px';
  suggestionBox.style.left = coords.left + 'px';

  suggestionBox.innerHTML = matches.map((n, i) => `
  <div class="suggestion-item" data-index="${i}">${highlightMatch(n.title, query)}</div>
`).join('');

  suggestionBox.querySelectorAll('.suggestion-item').forEach(el => {
    el.addEventListener('mousedown', e => {
      e.preventDefault();
      selectSuggestion(parseInt(el.dataset.index), textarea);
    });
    el.addEventListener('mouseenter', () => {
      setSuggestionHighlight(parseInt(el.dataset.index));
    });
  });
}

function highlightMatch(title, query) {
  if (!query) return title;
  const i = title.toLowerCase().indexOf(query.toLowerCase());
  if (i === -1) return title;
  return title.slice(0, i) +
    `<span class="suggestion-match">${title.slice(i, i + query.length)}</span>` +
    title.slice(i + query.length);
}

function setSuggestionHighlight(index) {
  suggestionIndex = index;
  suggestionBox.querySelectorAll('.suggestion-item').forEach((el, i) => {
    el.classList.toggle('active', i === index);
  });
}

function selectSuggestion(index, textarea) {
  const note = suggestionItems[index];
  if (!note) return;

  const val = textarea.value;
  const pos = textarea.selectionStart;

  // Find the `[[` before the cursor
  const before = val.slice(0, pos);
  const bracketPos = before.lastIndexOf('[[');
  if (bracketPos === -1) { hideSuggestions(); return; }

  const after = val.slice(pos);
  // Check if there's already a closing `]]`
  const hasClose = after.startsWith(']]');
  textarea.value =
    val.slice(0, bracketPos) +
    '[[' + note.title + ']]' +
    val.slice(pos + (hasClose ? 2 : 0));

  const newCursor = bracketPos + 2 + note.title.length + 2;
  textarea.selectionStart = textarea.selectionEnd = newCursor;
  textarea.focus();
  hideSuggestions();
  onEditorChange();
}

function getWikiQuery(textarea) {
  const val = textarea.value;
  const pos = textarea.selectionStart;
  const before = val.slice(0, pos);
  const match = before.match(/\[\[([^\]]*?)$/);
  return match ? match[1] : null;
}



async function loadNotesFromServer() {
  try {
    const response = await fetch('/api/notes');
    if (response.ok) {
      notes = await response.json();
    } else {
      notes = {};
    }
  } catch (error) {
    console.error('Failed to load notes from server:', error);
    notes = {};
  }
}

function cleanupUnnamedNote() {
  if (!currentId) return;
  const note = notes[currentId];
  if (note && !note.title.trim() && !note.content.trim()) {
    delete notes[currentId];
    saveToStorage();
    currentId = null;
    renderNoteList();
  }
}

async function saveNotesToServer() {
  try {
    const response = await fetch('/api/notes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notes),
    });
    if (!response.ok) {
      console.error('Failed to save notes to server');
    }
  } catch (error) {
    console.error('Error saving notes to server:', error);
  }
}

function generateId() {
  return 'N' + Date.now() + Math.random().toString(36).slice(2,6);
}

function getNoteList() {
  return Object.values(notes).sort((a,b) => (b.updated||0) - (a.updated||0));
}

function showAlert(message) {
  return new Promise(resolve => {
    document.getElementById('modal-message').textContent = message;
    document.getElementById('modal-buttons').innerHTML =
      `<button onclick="closeModal(true)">OK</button>`;
    document.getElementById('modal-overlay').classList.add('visible');
    window._modalResolve = resolve;
  });
}

function showConfirm(message) {
  return new Promise(resolve => {
    document.getElementById('modal-message').textContent = message;
    document.getElementById('modal-buttons').innerHTML =
      `<button onclick="closeModal(false)">Cancel</button>
       <button onclick="closeModal(true)">OK</button>`;
    document.getElementById('modal-overlay').classList.add('visible');
    window._modalResolve = resolve;
  });
}

function closeModal(result) {
  document.getElementById('modal-overlay').classList.remove('visible');
  window._modalResolve?.(result);
}

function renderNoteList(filter='') {
  const list = document.getElementById('note-list');

  const items = getNoteList().filter(n =>
    !filter ||
    n.title.toLowerCase().includes(filter.toLowerCase()) ||
    (n.content || '').toLowerCase().includes(filter.toLowerCase())
  );

  list.innerHTML = items.map(n => `
    <div class="note-item ${n.id===currentId?'active':''}" onclick="openNote('${n.id}')">
      <div class="note-item-title">
        ${n.title || 'untitled'}
        ${drafts[n.id] ? '<span class="unsaved-dot">*</span>' : ''}
      </div>
      <div class="note-item-meta">${formatDate(n.updated)}</div>
    </div>
  `).join('') || '<div class="empty-state">no notes yet</div>';
}

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString('en-GB', {day:'numeric',month:'short'});
}

function newNote() {
  cleanupUnnamedNote();
  const id = generateId();
  notes[id] = { id, title: '', content: '', created: Date.now(), updated: Date.now() };
  saveToStorage();
  openNote(id);
  setMode('edit');
  document.getElementById('note-title').focus();
}

function openNote(id) {
  const draft = drafts[id];
  setMode(draft ? 'edit' : 'preview');
  cleanupUnnamedNote();
  console.log('openNote called with id:', id);
  console.log('Available note IDs:', Object.keys(notes));
  if (!notes[id]) {
    console.error('Note not found:', id);
    alert('Note not found: ' + id);
    return;
  }
  currentId = id;
  const note = notes[id];
  
  document.getElementById('note-title').value = draft?.title || note.title || '';
  document.getElementById('editor').value = draft?.content || note.content || '';
  document.getElementById('topbar-title').textContent = draft?.title || note.title || 'untitled';

  scheduleSave();
  updateSaveIndicator();
  updateStats();
  updateLinks();
  updatePreview();
  renderNoteList(document.getElementById('search-input').value);
}

async function saveNote() {
  delete drafts[currentId];
  updateSaveIndicator();

  if (!currentId) return;
  const title = document.getElementById('note-title').value.trim();
  const editorContent = document.getElementById('editor').value;
  const note = notes[currentId];
  if (editorContent === note.content && document.getElementById('note-title').value === note.title) return;
  if (!title) {
    await showAlert('Add a title to this note');
    document.getElementById('note-title').focus();
    return;
  }


  const duplicate = Object.values(notes).find(n => n.id !== currentId && n.title === title);
  if (duplicate) {
    const ok = await showConfirm(`A note with the title "${duplicate.title}" already exists. Do you want to use the same title? (you can't link to it)`);
    if (!ok) {
      document.getElementById('note-title').focus();
      return;
    }
  }

  notes[currentId].title = title;
  notes[currentId].title = document.getElementById('note-title').value;
  notes[currentId].content = document.getElementById('editor').value;
  notes[currentId].updated = Date.now();
  saveToStorage();
  const ind = document.getElementById('save-indicator');
  ind.textContent = 'saved';
  ind.className = 'save-indicator saved';
  setTimeout(() => { ind.className = 'save-indicator'; }, 2000);
  renderNoteList(document.getElementById('search-input').value);
}

async function deleteNote() {
  if (!currentId) return;
  const ok = await showConfirm('delete this note?');
  if (!ok) return;
  delete notes[currentId];
  saveToStorage();
  currentId = null;
  document.getElementById('note-title').value = '';
  document.getElementById('editor').value = '';
  document.getElementById('topbar-title').textContent = 'untitled';
  updateStats();
  updateLinks();
  updatePreview();
  renderNoteList();
}

function saveToStorage() {
  saveNotesToServer();
}

function onEditorChange() {
  if (!currentId) return;

  drafts[currentId] = drafts[currentId] || {};
  drafts[currentId].content = document.getElementById('editor').value;

  updateSaveIndicator();
  updateStats();
  updateLinks();
  updatePreview();
  scheduleSave();
}

function onTitleChange() {

  drafts[currentId] = drafts[currentId] || {};
  drafts[currentId].title = document.getElementById('note-title').value;
  updateSaveIndicator();
  updatePreview();
  const title = document.getElementById('note-title').value;
  document.getElementById('topbar-title').textContent = title || 'untitled';

  scheduleSave();
}

function scheduleSave() {
  if (currentMode !== 'edit') return;
  if (!currentId) return;

  const note = notes[currentId];
  const editorContent = document.getElementById('editor').value;

  if (editorContent === note.content && document.getElementById('note-title').value === note.title) return;

  const ind = document.getElementById('save-indicator');
  ind.textContent = 'unsaved';
  ind.className = 'save-indicator';

  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNote, 4000);
}

function extractLinks(content) {
  return [...(content.matchAll(/\[\[([^\]]+)\]\]/g))].map(m => m[1].trim());
}

function updateLinks() {
  const content = document.getElementById('editor').value;
  const links = [...new Set(extractLinks(content))];
  const panel = document.getElementById('links-list');
  document.getElementById('link-count').textContent = links.length;

  if (!links.length) {
    panel.innerHTML = '<div class="empty-state">links to other notes will appear here as you write [[note name]]</div>';
    return;
  }

  panel.innerHTML = links.map(link => {
    const target = Object.values(notes).find(n => n.title === link);
    return `<div class="link-chip" onclick="${target ? `openNote('${target.id}')` : `createLinkedNote('${link}')`}">
      <div class="link-chip-dot"></div>
      <span>${link}${target ? '' : ' +'}</span>
    </div>`;
  }).join('');
}

function createLinkedNote(title) {
  const id = generateId();
  notes[id] = { id, title, content: '', created: Date.now(), updated: Date.now() };
  saveToStorage();
  openNote(id);
}

function updateStats() {
  const content = document.getElementById('editor').value;
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  document.getElementById('word-count').textContent = words;
  document.getElementById('char-count').textContent = content.length;
  
}

function updatePreview() {
  if (currentMode === 'edit') return;
  const content = document.getElementById('editor').value;
  const title = document.getElementById('note-title').value;
  
  // 1. Extract and protect math expressions
  const mathStore = [];
  let protected = content
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, m) => { mathStore.push({display: true, src: m}); return `%%MATH${mathStore.length-1}%%`; })
    .replace(/\$([^$\n]+)\$/g, (m, src) => {mathStore.push({ display: false, src });return `%%MATH${mathStore.length - 1}%%`;})
  // 2. Parse markdown normally
  let html = marked.parse(protected);

  html = html.replace(/<em>(.*?)<\/em>/g, '<u>$1</u>');

  html = html.replace(/(<code[\s\S]*?<\/code>)|\[\[([^\]]+)\]\]/g, (match, code, link) => {
    if (code) return code; // preserve code spans/blocks untouched
    const target = Object.values(notes).find(n => n.title === link);
    return `<span class="wiki-link" onclick="${target ? `openNote('${target.id}')` : ''}">${link}</span>`;
  });

  // 3. Replace placeholders with rendered KaTeX
  html = html.replace(/%%MATH(\d+)%%/g, (_, i) => {
    const {display, src} = mathStore[i];
    try {
      return katex.renderToString(src, { displayMode: display, throwOnError: false });
    } catch { return src; }
  });

  const pane = document.getElementById('preview-pane');
  pane.innerHTML = (title ? `<h1>${title}</h1>` : '') + html;
}

function setMode(mode) {
  console.trace('setMode:', mode);
  currentMode = mode;
  const editorPane = document.getElementById('editor-pane');
  const previewPane = document.getElementById('preview-pane');
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('mode-' + mode).classList.add('active');

  document.querySelector('.editor-toolbar').classList.toggle('toolbar-disabled', mode === 'preview');

  if (mode === 'edit') {
    editorPane.style.display = 'flex';
    editorPane.classList.add('full');
    previewPane.style.display = 'none';
    previewPane.classList.remove('visible');
  } else if (mode === 'split') {
    editorPane.style.display = 'flex';
    editorPane.classList.remove('full');
    previewPane.style.display = 'block';
    previewPane.classList.add('visible');
    updatePreview();
  } else {
    editorPane.style.display = 'none';
    previewPane.style.display = 'block';
    previewPane.classList.add('visible');
    updatePreview();
  }
}

function wrap(before, after) {
  const ta = document.getElementById('editor');
  const start = ta.selectionStart, end = ta.selectionEnd;
  const sel = ta.value.slice(start, end);
  const replacement = before + (sel || 'text') + after;
  ta.value = ta.value.slice(0, start) + replacement + ta.value.slice(end);
  ta.selectionStart = start + before.length;
  ta.selectionEnd = start + before.length + (sel || 'text').length;
  ta.focus();
  onEditorChange();
}

function insertLine(prefix) {
  const ta = document.getElementById('editor');
  const start = ta.selectionStart;
  const lineStart = ta.value.lastIndexOf('\n', start - 1) + 1;
  ta.value = ta.value.slice(0, lineStart) + prefix + ta.value.slice(lineStart);
  ta.selectionStart = ta.selectionEnd = lineStart + prefix.length;
  ta.focus();
  onEditorChange();
}

function insertUnderline() {
  wrap('__', '__');
}

function insertCodeBlock() {
  const ta = document.getElementById('editor');
  const start = ta.selectionStart;
  const block = '\n```\n\n```\n';
  ta.value = ta.value.slice(0, start) + block + ta.value.slice(start);
  ta.selectionStart = ta.selectionEnd = start + 5;
  ta.focus();
  onEditorChange();
}

function lineThrough() {
  const ta = document.getElementById('editor');
  const start = ta.selectionStart, end = ta.selectionEnd;
  const sel = ta.value.slice(start, end);
  const replacement = '~' + (sel || 'text') + '~';
  ta.value = ta.value.slice(0, start) + replacement + ta.value.slice(end);
  ta.selectionStart = start + 1;
  ta.selectionEnd = start + 1 + (sel || 'text').length;
  ta.focus();
  onEditorChange();
}

//  not really needed, but i like it
function triggerEva() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed; inset: 0; background: #0e0e0e; 
        z-index: 9999; display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        font-family: var(--font-mono); color: rgb(215, 106, 16);
    `;
    overlay.innerHTML = `
    <div style="font-size:12px; opacity:0.7; margin-bottom:32px; letter-spacing:0.2em">NERV CENTRAL DOGMA</div>
    <div id="eva-lines" style="display:flex; flex-direction:column; gap:16px; align-items:center"></div>
    <div style="font-size:11px; opacity:0.5; margin-top:48px">第3新東京市</div>

    <!-- bottom left -->
    <div style="position:absolute; bottom:10px; right:24px; display:flex; flex-direction:column; gap:6px; align item:flex-end; text-align:right;">
        <div style="font-size:10px; opacity:0.4; letter-spacing:0.15em">MAGI: MELCHIOR ONLINE</div>
        <div style="font-size:10px; opacity:0.4; letter-spacing:0.15em">MAGI: BALTHASAR ONLINE</div>
        <div style="font-size:10px; opacity:0.4; letter-spacing:0.15em">MAGI: CASPAR ONLINE</div>
    </div>

    <!-- bottom right -->
    <div style="position:absolute; top:24px; left:10px; display:flex; flex-direction:column; gap:8px; align-items:flex-start; text-align:left;">
        <div style="font-size:15px; color:#af1c28; letter-spacing:0.15em; opacity:0.9; animation: blink 1s step-start infinite;">A.T. FIELD EXPANDING</div>
        <div style="font-size:15px; letter-spacing:0.1em;">SYNC RATE: <span id="sync-level">0</span>%</div>
        <div style="font-size:15px; letter-spacing:0.1em;">NEURAL LINK: ACTIVE</div>
        <div style="font-size:15px; color:#af1c28; letter-spacing:0.1em;">PILOT CONDITION: UNKNOWN</div>
        <div style="font-size:15px; letter-spacing:0.1em;">EXTERNAL POWER: CONNECTED</div>
        <div style="font-size:15px; letter-spacing:0.1em;">CORE TEMPERATURE: NORMAL</div>
        <div style="font-size:15px; letter-spacing:0.1em;">SOUL BOUNDARY: STABLE</div>
        <div style="font-size:15px; color:#af1c28; letter-spacing:0.1em;">RADIATION LEVEL: 60%</div>
        <div style="font-size:15px; letter-spacing:0.1em;">LIMB RESTRAINTS: RELEASED</div>
        <div style="font-size:15px; letter-spacing:0.1em;">RESTRAINT STATUS: PARTIAL RELEASE</div>
        <div style="font-size:15px; letter-spacing:0.1em;">MOTOR CONTROL: AUTONOMOUS RESPONSE</div>
        <div style="font-size:15px; letter-spacing:0.1em;">ENTRY PLUG: LOCKED</div>
        <div style="font-size:15px; letter-spacing:0.1em;">PLAN SAFETY: 54%</div>
        <div style="font-size:15px; letter-spacing:0.1em;">ANGEL MASS: 27.99999%</div>
        <div style="font-size:15px; color:#afa81c; letter-spacing:0.1em;">USER ID: ***</div>
    </div>
`;
    document.body.appendChild(overlay);
    const style = document.createElement('style');
    style.textContent = `@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`;
    document.head.appendChild(style);

    // sync rate counter
    const syncEl = overlay.querySelector('#sync-level');
    let sync = 0;
    const syncInterval = setInterval(() => {
        sync = Math.min(sync + Math.floor(Math.random() * 1 + 0.9), 400);
        syncEl.textContent = sync;
        if (sync >= 387) clearInterval(syncInterval);
    }, 150);
    overlay.addEventListener('keydown', () => overlay.remove());

    const messages = [
          'ANGEL DETECTED',
          'PATTERN: BLUE',
          'EMERGENCY CONDITION DECLARED',

          'ALL PERSONNEL TO BATTLE STATIONS',

          'EVANGELION UNIT-01 LAUNCH PREPARATION',

          'PRIMARY POWER CONNECTED',

          'UMBRELLA DEPLOYMENT CONFIRMED',

          'EVANGELION UNIT-01 LAUNCHED',
          'EVANGELION UNIT-01 IS UNSTABLE',
          'EVANGELION UNIT-01 LOST CONTROL'
    ];

    const container = overlay.querySelector('#eva-lines');

    function typeLine(text, callback) {
        const line = document.createElement('div');
        line.style.cssText = `font-size:18px; letter-spacing:0.2em;`;
        container.appendChild(line);

        let i = 0;
        const interval = setInterval(() => {
            line.textContent += text[i++];
            if (i >= text.length) {
                clearInterval(interval);
                if (callback) setTimeout(callback, 1000);
            }
        }, 50);
    }

    function typeAll(index) {
        if (index >= messages.length) {
          setTimeout(() => {
              typeLine('CONTROL AUTHORITY LOST');
          }, 1500);

          setTimeout(() => overlay.remove(), 3500);

          return;
      }
        typeLine(messages[index], () => typeAll(index + 1));
    }

    typeAll(0);
}

function insertWikiLink() {
  marked.setOptions({ gfm: true });
  const ta = document.getElementById('editor');
  const start = ta.selectionStart;
  const sel = ta.value.slice(start, ta.selectionEnd) || 'note name';
  const replacement = '[[' + sel + ']]';
  ta.value = ta.value.slice(0, start) + replacement + ta.value.slice(ta.selectionEnd);
  ta.selectionStart = start + 2;
  ta.selectionEnd = start + 2 + sel.length;
  ta.focus();
  onEditorChange();
}

function filterNotes() {
  renderNoteList(document.getElementById('search-input').value);
}

function openGraph() {
    document.getElementById('graph-overlay').classList.add('visible');
    setTimeout(() => initGraph(), 50); // let display:flex render first
}

function closeGraph() {
    document.getElementById('graph-overlay').classList.remove('visible');
}

// Listen for messages from the graph window
window.addEventListener('message', (event) => {
  console.log('Received message:', event.data);
  if (event.data.type === 'openNote' && event.data.noteId) {
    console.log('Opening note:', event.data.noteId);
    openNote(event.data.noteId);
  }
});

// Listen for localStorage changes (fallback for graph window communication)
window.addEventListener('storage', (event) => {
  if (event.key === 'openNote' && event.newValue) {
    console.log('Opening note from localStorage:', event.newValue);
    openNote(event.newValue);
    // Clear the storage after opening
    localStorage.removeItem('openNote');
  }
});



document.addEventListener('keydown', e => {
    if (e.key.toLowerCase() === evaSequence[evaProgress]) {
        evaProgress++;
        clearTimeout(evaTimeout);
        // reset if they pause too long
        evaTimeout = setTimeout(() => evaProgress = 0, 1000);
        
        if (evaProgress === evaSequence.length) {
            evaProgress = 0;
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                triggerEva();
            }
        }
    } else if (!['Control', 'Meta', 'Shift', 'Alt'].includes(e.key)) {
        evaProgress = 0;
    }
});

document.addEventListener('DOMContentLoaded', () => {
  const ta = document.getElementById('editor');
  if (!ta) return;

  ta.addEventListener('input', () => {
    const query = getWikiQuery(ta);
    if (query !== null) {
      showSuggestions(query, ta);
    } else {
      hideSuggestions();
    }
  });

  ta.addEventListener('keydown', e => {
    if (!suggestionItems.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSuggestionHighlight((suggestionIndex + 1) % suggestionItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSuggestionHighlight((suggestionIndex - 1 + suggestionItems.length) % suggestionItems.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (suggestionIndex >= 0) {
        e.preventDefault();
        selectSuggestion(suggestionIndex, ta);
      }
    } else if (e.key === 'Escape') {
      hideSuggestions();
    }
  });

  ta.addEventListener('blur', () => {
    setTimeout(hideSuggestions, 150);
  });
});

document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveNote();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
  e.preventDefault();
  const modes = ['edit', 'split', 'preview'];
  const next = modes[(modes.indexOf(currentMode) + 1) % modes.length];
  setMode(next);
} if (e.key === 'Escape') {
  hideSuggestions();
} if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
  e.preventDefault();
  playMusic();
} if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
  e.preventDefault();
  stop();
}});

async function initializeApp() {
  setMode('preview');
  console.trace('initializeApp called');
  await loadNotesFromServer();
  if (!Object.keys(notes).length) {
    const id = generateId();
    notes[id] = {
      id,
      title: 'Welcome',
      content: "## Getting started\n\nThis is your knowledge graph notes editor.\n\nLink notes together using `[[note name]]` syntax — just like Obsidian.\n\n- Write in **markdown**\n- Link with `[[double brackets]]`\n- Switch to *split* or *preview* mode to render\n\n> Linked notes appear in the panel on the right. Click a link to navigate, or create the note if it doesn\'t exist yet.\n\n```python\n# your notes become graph nodes\n# [[links]] become edges\n``` \n press ctrl/cmd + g for fun, ctrl/cmd + h to stop it.\n\nHappy noting!",
      created: Date.now(),
      updated: Date.now()
    };
    saveToStorage();
    openNote(id);
  } else {
    const params = new URLSearchParams(window.location.search);
    const noteId = params.get('note');
    if (noteId && notes[noteId]) {
      openNote(noteId);
    } else {
      const first = getNoteList()[0];
      if (first) openNote(first.id);
    }
  }

  renderNoteList(); 
}

initializeApp();