// ===================================================
// STORAGE HELPERS
// ===================================================
function loadLS(key, def) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch(e){ return def; }
}
function saveLS(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
    return true;
  } catch(e) {
    console.error("Storage error:", e);
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      alert("⚠️ ¡Espacio de almacenamiento lleno! La imagen elegida es demasiado grande o has guardado demasiados datos en el navegador. Por favor, reduce la resolución de tus imágenes o borra partidas guardadas antiguas.");
    }
    return false;
  }
}

function compressImage(base64Str, maxWidth, maxHeight, quality, callback) {
  if (!base64Str) return callback(null);
  const img = new Image();
  img.src = base64Str;
  img.onload = () => {
    let width = img.width;
    let height = img.height;
    if (width > height) {
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
    } else {
      if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
      }
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    const compressed = canvas.toDataURL('image/jpeg', quality);
    callback(compressed);
  };
  img.onerror = () => {
    callback(base64Str);
  };
}

// ===================================================
// DATA (localStorage-backed)
// ===================================================
let saves = loadLS('crq_saves', []);
let manuals = loadLS('crq_manuals', []);
let activeManualId = loadLS('crq_active_manual_id',null);
let manualAdaptation = loadLS('crq_manual_adaptation',null);
let users      = loadLS('crq_users', [{ id:'dm0', username:'DM', email:'dm@latorredelmago.local', password:'admin', role:'dm' }]);
let characters = loadLS('crq_chars', [
  {
    id:1, name:'Aelindra', race:'Elfa', class:'Hechicera',
    hp:12, maxHp:24, online:true, portrait:null,
    attributes:{str:8,dex:14,con:12,int:10,wis:13,cha:18},
    skills:{Arcano:4, 'Persuasión':6, Sigilo:2, 'Averiguar Intenciones':3},
    inventory:[
      {name:'Báculo de Cristal',qty:1,equipped:true,icon:'🪄'},
      {name:'Poción de Curación',qty:2,equipped:false,icon:'🧪'}
    ],
    gold:145,
    spells:{slots:[4,2,0],usedSlots:[1,0,0],prepared:[
      {name:'Proyectil Mágico',level:1,icon:'💫'},
      {name:'Escudo',level:1,icon:'🛡️'},
      {name:'Rayo Abrasador',level:2,icon:'⚡'}
    ]},
    color:'#a855f7', initials:'AE', type:'player', initiative:12, userId:null
  },
  {
    id:2, name:'Torgrim', race:'Enano', class:'Guerrero',
    hp:35, maxHp:35, online:true, portrait:null,
    attributes:{str:17,dex:12,con:16,int:8,wis:10,cha:9},
    skills:{Atletismo:5,'Intimidación':1,Supervivencia:2},
    inventory:[
      {name:'Hacha de Batalla',qty:1,equipped:true,icon:'🪓'},
      {name:'Escudo Reforzado',qty:1,equipped:true,icon:'🛡️'}
    ],
    gold:55, spells:null,
    color:'#f59e0b', initials:'TO', type:'player', initiative:5, userId:null
  }
]);
let enemies = loadLS('crq_enemies', [
  {id:'e1',name:'Liche Señor',hp:120,maxHp:135,type:'enemy',initiative:18,color:'#ef4444',initials:'LS'},
  {id:'e2',name:'Esqueleto',hp:13,maxHp:13,type:'enemy',initiative:10,color:'#64748b',initials:'ES'}
]);
let npcs = loadLS('crq_npcs', []);

const defaultMapThumb = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect width='64' height='64' fill='%23000'/><text x='32' y='36' fill='%23888' font-size='22' font-family='sans-serif' font-weight='bold' text-anchor='middle'>M</text></svg>";
let maps = loadLS('crq_maps', [
  {id:1,name:'Claro en el bosque',author:'Mapas Nivel20',thumb:'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=100&q=80',image:'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=1200&q=80',bg:'#000',rooms:[]},
  {id:4,name:'Cripta en ruinas',author:'Predeterminado',thumb:defaultMapThumb,image:'',bg:'#000',rooms:[{x:100,y:100,w:250,h:250},{x:350,y:175,w:100,h:100},{x:450,y:50,w:300,h:350}]}
]);
let scenes = loadLS('crq_scenes', []);
const defaultStructureCatalog = [
  {id:'door',icon:'🚪',name:'Puerta'},{id:'chest',icon:'📦',name:'Cofre'},
  {id:'barrel',icon:'🛢️',name:'Barril'},{id:'tree',icon:'🌳',name:'Árbol'},
  {id:'rock',icon:'🪨',name:'Roca'},{id:'campfire',icon:'🔥',name:'Fogata'},
  {id:'ruin',icon:'🏚️',name:'Ruina'},{id:'column',icon:'🏛️',name:'Columna'},
  {id:'tent',icon:'⛺',name:'Tienda'},{id:'logs',icon:'🪵',name:'Troncos'},
  {id:'chair',icon:'🪑',name:'Silla'},{id:'bed',icon:'🛏️',name:'Cama'},
  {id:'sarcophagus',icon:'⚰️',name:'Sarcófago'},{id:'statue',icon:'🗿',name:'Estatua'},
  {id:'altar',icon:'🕯️',name:'Altar'},{id:'castle',icon:'🏰',name:'Castillo'},
  {id:'house',icon:'🏠',name:'Casa'},{id:'shrine',icon:'⛪',name:'Santuario'},
  {id:'fountain',icon:'⛲',name:'Fuente'},{id:'bridge',icon:'🌉',name:'Puente'},
  {id:'wagon',icon:'🛒',name:'Carreta'},{id:'boat',icon:'🛶',name:'Bote'},
  {id:'banner',icon:'🚩',name:'Estandarte'},{id:'forge',icon:'⚒️',name:'Forja'},
  {id:'armory',icon:'⚔️',name:'Armería'},{id:'shield',icon:'🛡️',name:'Escudo'},
  {id:'tomb',icon:'🪦',name:'Tumba'},{id:'bones',icon:'🦴',name:'Restos'},
  {id:'skull',icon:'💀',name:'Calavera'},{id:'chains',icon:'⛓️',name:'Cadenas'},
  {id:'trap',icon:'🪤',name:'Trampa'},{id:'web',icon:'🕸️',name:'Telaraña'},
  {id:'mushroom',icon:'🍄',name:'Hongo gigante'},{id:'crystal',icon:'🔮',name:'Cristal arcano'},
  {id:'portal',icon:'🌀',name:'Portal mágico'},{id:'spellbook',icon:'📖',name:'Libro arcano'},
  {id:'dragon',icon:'🐉',name:'Guarida de dragón'},{id:'horse',icon:'🐎',name:'Caballo'},
  {id:'tavern',icon:'🍺',name:'Taberna'}
];
const structureCatalogVersion = 2;
let structureCatalog = loadLS('crq_structure_catalog', null);
if(!Array.isArray(structureCatalog)) {
  structureCatalog = defaultStructureCatalog.map(sticker=>({...sticker}));
} else if(loadLS('crq_structure_catalog_version',1) < structureCatalogVersion) {
  defaultStructureCatalog.forEach(sticker=>{
    if(!structureCatalog.some(existing=>existing.id===sticker.id)) structureCatalog.push({...sticker});
  });
}
if(structureCatalog.length===0) structureCatalog=defaultStructureCatalog.map(sticker=>({...sticker}));
saveLS('crq_structure_catalog',structureCatalog);
saveLS('crq_structure_catalog_version',structureCatalogVersion);
let customMusicTracks = [];
let customMusicAudio = null;
let externalMusicAudio = null;
let externalYoutubeSyncTimer = null;
let customWeatherTracks = [];
let customWeatherAudio = null;

let combatants = getInitiativeCombatants();
const MAX_PLAYER_CHARACTERS = 2;

let initialMapId = loadLS('crq_active_map_id', 4);
if (!maps.some(m => m.id === initialMapId) && maps.length > 0) {
  initialMapId = maps[0].id;
}

const state = {
  activePage:'mapa', activeCharId: loadLS('crq_active_char_id', 1),
  currentTurnIndex:0, round:1, mapTool:'move', activeMapId: initialMapId,
  currentUser: loadLS('crq_session', null), pendingExternalMusicUrl:null, quickCombatActorId:null
};

const attrNames = {str:'FUE',dex:'DES',con:'CON',int:'INT',wis:'SAB',cha:'CAR'};

const imageCache = {};
const structureImageCache = {};

function getCombatantById(id) {
  const cid = typeof id === 'string' && !isNaN(id) ? parseInt(id) : id;
  return characters.find(c => c.id === cid) || enemies.find(e => e.id === cid) || npcs.find(n => n.id === cid);
}

function getEditableCombatantById(id) {
  return getCombatantById(id);
}

function saveCombatantSheet(c) {
  if(!c) return;
  if(c.type === 'enemy' || enemies.some(enemy => String(enemy.id) === String(c.id))) saveEnemies();
  else if(c.type === 'npc' || npcs.some(npc => String(npc.id) === String(c.id))) saveNpcs();
  else saveChars();
}

function ensureCombatLoadout(c) {
  if(!c) return c;
  if(!Array.isArray(c.attacks)) c.attacks = [];
  if(!Array.isArray(c.inventory)) c.inventory = [];
  c.copper = Math.max(0, parseInt(c.copper) || 0);
  c.silver = Math.max(0, parseInt(c.silver) || 0);
  c.gold = Math.max(0, parseInt(c.gold) || 0);
  if(c.type === 'enemy' && !c.spells) c.spells = {slots:[3,2,0,0,0,0,0,0,0],usedSlots:[0,0,0,0,0,0,0,0,0],prepared:[]};
  return c;
}

function normalizeNpcRecord(npc) {
  if(!npc || typeof npc !== 'object') return npc;
  npc.name = npc.name || 'NPC';
  npc.type = 'npc';
  npc.hp = Math.max(1, parseInt(npc.hp) || 10);
  npc.maxHp = Math.max(1, parseInt(npc.maxHp) || npc.hp);
  npc.initiative = parseInt(npc.initiative) || 0;
  npc.color = npc.color || '#38bdf8';
  npc.initials = npc.initials || initials(npc.name);
  npc.ac = Math.max(0, parseInt(npc.ac) || 10);
  npc.role = npc.role || 'NPC';
  npc.attributes = {str:10,dex:10,con:10,int:10,wis:10,cha:10,...(npc.attributes||{})};
  return npc;
}

function getInitiativeCombatants() {
  npcs.forEach(normalizeNpcRecord);
  return [...characters, ...enemies, ...npcs].sort((a,b)=>(b.initiative||0)-(a.initiative||0));
}

// ===================================================
// UTILS
// ===================================================
function getHpColor(hp, maxHp) {
  const r = hp/maxHp;
  if(r > 0.5) return '#10b981';
  if(r > 0.25) return '#f59e0b';
  return '#ef4444';
}
function calcMod(v)  { return Math.floor((v-10)/2); }
function fmtMod(m)   { return m>=0 ? `+${m}` : `${m}`; }
function initials(n) { return n.substring(0,2).toUpperCase(); }
function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[char]);
}
function randColor() {
  return ['#a855f7','#f59e0b','#ec4899','#3b82f6','#10b981','#f97316'][Math.floor(Math.random()*6)];
}
function getActiveChar() { return getCharacterById(state.activeCharId); }
function getCharacterById(id) { return characters.find(c => String(c.id) === String(id)); }
function canEditCharacter(c) {
  return !!c && (isDM() || (state.currentUser && c.userId === state.currentUser.id));
}
function getOwnedCharacters() {
  return state.currentUser ? characters.filter(c => c.userId === state.currentUser.id) : [];
}
function getVisibleCharactersForCurrentUser() {
  return isDM() ? characters : getOwnedCharacters();
}
function updateCharacterCreateButton() {
  const btn=document.getElementById('btnAddChar');
  if(!btn) return;
  btn.style.display = (isDM() || getOwnedCharacters().length < MAX_PLAYER_CHARACTERS) ? '' : 'none';
}
function encodeInline(value) {
  return encodeURIComponent(String(value ?? ''));
}
function normalizeTokenColor(color, fallback='#a855f7') {
  return /^#[0-9a-f]{6}$/i.test(String(color || '').trim()) ? String(color).trim() : fallback;
}
function updateCharColorPreview() {
  const input=document.getElementById('newCharColor');
  const preview=document.getElementById('newCharColorPreview');
  if(preview) {
    const color=normalizeTokenColor(input?.value);
    preview.style.background=color;
    preview.style.color=color;
  }
}
function getModalCharacter(modalId) {
  const modal = document.getElementById(modalId);
  return getEditableCombatantById(modal?.dataset.charId) || getActiveChar();
}
function restorePlayerActiveCharacter() {
  if (isDM() || !state.currentUser) return;
  const active = getActiveChar();
  if (active && active.userId === state.currentUser.id) return;
  const owned = getOwnedCharacters()[0];
  if (owned) {
    state.activeCharId = owned.id;
    saveLS('crq_active_char_id', owned.id);
  } else {
    state.activeCharId = null;
    saveLS('crq_active_char_id', null);
  }
}
function saveChars() {
  saveLS('crq_chars', characters);
  if (typeof multiplayer !== 'undefined' && multiplayer.isActive()) {
    multiplayer.broadcast({ type: 'characters_update', characters });
  }
}
function saveEnemies() {
  saveLS('crq_enemies', enemies);
  if (typeof multiplayer !== 'undefined' && multiplayer.isActive()) {
    multiplayer.broadcast({ type: 'enemies_update', enemies });
  }
}
function saveNpcs() {
  saveLS('crq_npcs', npcs);
  if (typeof multiplayer !== 'undefined' && multiplayer.isActive()) {
    multiplayer.broadcast({ type: 'npcs_update', npcs });
  }
}
function saveMaps() {
  saveLS('crq_maps', maps);
}
function saveScenes() {
  saveLS('crq_scenes', scenes);
}
function saveUsers() { saveLS('crq_users', users); }
function isDM() { return state.currentUser && state.currentUser.role === 'dm'; }

// ===================================================
// AUTH
// ===================================================
function switchAuthTab(tab) {
  document.getElementById('tabLogin').classList.toggle('active', tab==='login');
  document.getElementById('tabRegister').classList.toggle('active', tab==='register');
  document.getElementById('panelLogin').style.display   = tab==='login' ? '' : 'none';
  document.getElementById('panelRegister').style.display = tab==='register' ? '' : 'none';
  document.getElementById('loginError').textContent = '';
  document.getElementById('regError').textContent = '';
}
function normalizeEmail(value) {
  return String(value||'').trim().toLowerCase();
}
function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}
function isValidGmailAddress(value) {
  const email = normalizeEmail(value);
  if(!/^[a-z0-9][a-z0-9.]{4,28}[a-z0-9]@gmail\.com$/.test(email)) return false;
  const local = email.split('@')[0];
  if(local.includes('..')) return false;
  const compact = local.replace(/\./g,'');
  const blocked = ['test','teste','prueba','fake','falso','correo','email','gmail','usuario','user','admin','asdf','qwerty','aaaaaa','123456'];
  return !blocked.includes(compact);
}
function isLikelyRealUsername(value) {
  const compact = String(value||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/gi,'');
  if(compact.length < 3) return false;
  return !/^(test|teste|prueba|fake|falso|usuario|user|admin|asdf|qwerty|anonimo|anonymous|aaa+|xxx+)$/.test(compact);
}
function getSelectedAuthRole(selectId) {
  const role = document.getElementById(selectId)?.value;
  return role === 'dm' ? 'dm' : 'player';
}
function doLogin() {
  const email = normalizeEmail(document.getElementById('loginEmail').value);
  const p = document.getElementById('loginPass').value;
  const selectedRole = getSelectedAuthRole('loginRole');
  if(!isValidEmail(email)) { document.getElementById('loginError').textContent = 'Ingresa un correo electrónico válido.'; return; }
  const found = users.find(x => normalizeEmail(x.email)===email && x.password===p);
  if(!found) { document.getElementById('loginError').textContent = 'Correo electrónico o contraseña incorrectos.'; return; }
  state.currentUser = {...found, role:selectedRole};
  saveLS('crq_session', state.currentUser);
  showGameSelection();
}
function doRegister() {
  const u   = document.getElementById('regUser').value.trim();
  const email = normalizeEmail(document.getElementById('regEmail').value);
  const p   = document.getElementById('regPass').value;
  const r   = document.getElementById('regRole').value;
  if(!u || !email || !p) { document.getElementById('regError').textContent = 'Por favor completa todos los campos.'; return; }
  if(!isLikelyRealUsername(u)) { document.getElementById('regError').textContent = 'Ingresa un nombre de usuario real. Evita nombres como test, fake o usuario.'; return; }
  if(!isValidGmailAddress(email)) { document.getElementById('regError').textContent = 'Ingresa una cuenta Gmail real con formato usuario@gmail.com.'; return; }
  if(p.length < 6) { document.getElementById('regError').textContent = 'La contraseña debe tener al menos 6 caracteres.'; return; }
  if(users.find(x => normalizeEmail(x.email)===email)) {
    document.getElementById('regError').textContent = 'Ese correo electrónico ya está registrado.'; return;
  }
  const legacyUser=users.find(x => x.username.toLowerCase()===u.toLowerCase() && !x.email);
  if(legacyUser && legacyUser.password===p) {
    legacyUser.email=email;
    legacyUser.role=r;
    saveUsers();
    state.currentUser=legacyUser;
    saveLS('crq_session',legacyUser);
    showGameSelection();
    return;
  }
  if(users.find(x => x.username.toLowerCase()===u.toLowerCase())) {
    document.getElementById('regError').textContent = 'Ese nombre de usuario ya existe.'; return;
  }
  const newUser = { id:'u'+Date.now(), username:u, email, password:p, role:r };
  users.push(newUser);
  saveUsers();
  state.currentUser = newUser;
  saveLS('crq_session', newUser);
  showGameSelection();
}
function doLogout() {
  stopExternalMusic();
  stopCustomMusic();
  SoundEngine.music('none');
  SoundEngine.weather('none');
  state.currentUser = null;
  saveLS('crq_session', null);
  document.getElementById('authScreen').classList.remove('hidden');
  document.getElementById('gameSelectionScreen').classList.add('hidden');
  document.getElementById('mainApp').style.display = 'none';
  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPass').value = '';
  document.getElementById('loginError').textContent = '';
  if (typeof multiplayer !== 'undefined' && multiplayer.peer) {
    multiplayer.peer.destroy();
    multiplayer.peer = null;
  }
}
function launchApp() {
  document.getElementById('authScreen').classList.add('hidden');
  const app = document.getElementById('mainApp');
  app.style.display = 'flex';
  // update badge
  document.getElementById('userBadgeName').textContent = state.currentUser.username;
  refreshAppVolumeUI();
  const dot = document.getElementById('userRoleDot');
  dot.className = 'role-dot ' + state.currentUser.role;
  // DM-only buttons visibility
  const isAdmin = isDM();
  app.classList.toggle('dm-user', isAdmin);
  app.classList.toggle('player-user', !isAdmin);
  const recursosTab = document.querySelector('#tabRecursos .tab-label');
  if(recursosTab) recursosTab.textContent = isAdmin ? 'Recursos' : 'Ficha de personaje';
  const charHeader = document.querySelector('.char-selector-header span');
  if(charHeader) charHeader.textContent = isAdmin ? 'Personajes' : 'Mi ficha';
  restorePlayerActiveCharacter();
  updateCharacterCreateButton();
  document.getElementById('btnAddItem').style.display = 'none';
  document.getElementById('btnAddSpell').style.display = 'none';
  document.getElementById('btnAddAttack').style.display = 'none';
  document.getElementById('portrait-upload-btn-wrap') && (document.getElementById('portrait-upload-btn-wrap').style.display = isAdmin ? '' : 'none');
  // Ocultar pestañas exclusivas del DM; Mapa es visible para todos
  document.querySelectorAll('#mainNavTabs button').forEach(b => {
    if(b.dataset.page === 'partida' || b.dataset.page === 'manual') {
      b.style.display = isAdmin ? '' : 'none';
    }
  });
  // Ocultar controles exclusivos del DM en el mapa
  ['toolMaps','toolScenes','toolWeather','toolStructures','toolFog','toolFogReveal','toolFogHide','toolFogCoverAll','toolFogRevealAll','toolFogReset','toolWalls','toolWallRemove','toolMusic','tbDivDM','dmInitControls','dmMapShortcuts','mapInitiativePanel','playerAdminTools','quickToolPlayers','sideToolFog','sideToolFogPeek','sideToolExploredFog','quickToolFog','quickToolFogReveal','quickToolFogHide','quickToolFogCoverAll','quickToolFogRevealAll','quickToolFogReset','quickToolWall','quickToolWallRemove'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = isAdmin ? '' : 'none';
  });
  const playerAdminTools=document.getElementById('playerAdminTools');
  if(playerAdminTools) playerAdminTools.style.display = isAdmin && multiplayer.isHost() ? '' : 'none';
  if (!isAdmin) {
    const weatherPanel = document.getElementById('weatherPanel');
    if (weatherPanel) weatherPanel.style.display = 'none';
    const weatherTool = document.getElementById('toolWeather');
    if (weatherTool) weatherTool.classList.remove('active');
    ['structuresPanel','musicPanel'].forEach(id => {
      const panel=document.getElementById(id);
      if(panel) panel.style.display='none';
    });
    togglePlayerKickPanel(false);
    ['toolScenes','toolStructures','toolFog','toolFogReveal','toolFogHide','toolFogCoverAll','toolFogRevealAll','toolFogReset','toolWalls','toolWallRemove','toolMusic','sideToolFog','sideToolFogPeek','sideToolExploredFog','quickToolFog','quickToolFogReveal','quickToolFogHide','quickToolFogCoverAll','quickToolFogRevealAll','quickToolFogReset','quickToolWall','quickToolWallRemove'].forEach(id => document.getElementById(id)?.classList.remove('active'));
    if(['structure','structure-remove','wall','wall-remove','fog-reveal','fog-hide'].includes(state.mapTool)) state.mapTool = 'move';
  }
  if(!isAdmin) {
    // Los jugadores empiezan en el mapa
    switchPage('mapa');
    document.querySelectorAll('#mainNavTabs button').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-page="mapa"]').classList.add('active');
  }
  relocateMapControlsBelowDice();
  setupNavTabs();
  initMap();
  renderAll();
  if(manualAdaptation) applyManualAdaptationProfile(manualAdaptation);
  updateChatSenders();
  updateSessionDockForRole();
}

function relocateMapControlsBelowDice() {
  const mapWrap=document.querySelector('#page-mapa .map-wrap');
  const toolbar=document.querySelector('#page-mapa .map-toolbar');
  const quickTools=document.querySelector('#page-mapa .map-quick-tools');
  if(!mapWrap) return;
  if(toolbar && toolbar.parentElement !== mapWrap) mapWrap.appendChild(toolbar);
  if(quickTools && quickTools.parentElement !== mapWrap) mapWrap.appendChild(quickTools);
}

let activeSessionTab = 'log';
function toggleSessionDock(forceOpen) {
  const panel = document.getElementById('mapSessionPanel');
  const toggle = document.getElementById('mapSessionToggle');
  if(!panel) return;
  const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : panel.style.display === 'none';
  panel.style.display = shouldOpen ? 'flex' : 'none';
  if(toggle) {
    toggle.classList.toggle('open', shouldOpen);
    toggle.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
  }
  if(shouldOpen) updateSessionDockForRole();
}
function setSessionTab(tab) {
  if(tab === 'initiative' && !isDM()) tab = 'log';
  activeSessionTab = tab === 'initiative' ? 'initiative' : 'log';
  const logActive = activeSessionTab === 'log';
  document.getElementById('sessionTabLog')?.classList.toggle('active', logActive);
  document.getElementById('sessionTabInitiative')?.classList.toggle('active', !logActive);
  document.getElementById('sessionContentLog')?.classList.toggle('active', logActive);
  document.getElementById('sessionContentInitiative')?.classList.toggle('active', !logActive);
  if(logActive) {
    const box = document.getElementById('chatBox');
    if(box) box.scrollTop = box.scrollHeight;
  } else {
    renderInitiative();
  }
}
function updateSessionDockForRole() {
  const initTab = document.getElementById('sessionTabInitiative');
  if(initTab) initTab.style.display = isDM() ? '' : 'none';
  if(!isDM() && activeSessionTab === 'initiative') activeSessionTab = 'log';
  setSessionTab(activeSessionTab);
}

// ===================================================
// NAVIGATION
// ===================================================
function switchPage(pg) {
  state.activePage = pg;
  const app=document.getElementById('mainApp');
  app?.classList.toggle('resources-view', pg==='recursos');
  app?.classList.toggle('inventory-view', pg==='inventario');
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  if(pg==='recursos') {
    document.getElementById('page-personaje')?.classList.add('active');
    if(isDM()) {
      document.getElementById('page-enemigos')?.classList.add('active');
      document.getElementById('page-npc')?.classList.add('active');
    }
  } else if(pg==='inventario') {
    document.getElementById('page-inventario')?.classList.add('active');
    document.getElementById('page-hechizos')?.classList.add('active');
    document.getElementById('page-ataque')?.classList.add('active');
  } else {
    document.getElementById(`page-${pg}`)?.classList.add('active');
  }
  renderPageContent(pg);
  updateNavAccessibility();
  if(pg==='mapa') setTimeout(()=>{ resizeCanvas(); drawMap(); }, 50);
}
function updateNavAccessibility() {
  const nav=document.getElementById('mainNavTabs');
  if(nav) nav.setAttribute('role','tablist');
  document.querySelectorAll('#mainNavTabs button').forEach(btn => {
    const selected = btn.dataset.page === state.activePage;
    btn.setAttribute('role','tab');
    btn.setAttribute('aria-selected', selected ? 'true' : 'false');
    btn.setAttribute('tabindex', '0');
    const pageId = btn.dataset.page === 'recursos' ? 'page-personaje' : `page-${btn.dataset.page}`;
    btn.setAttribute('aria-controls', pageId);
    btn.classList.toggle('active', selected);
  });
  document.querySelectorAll('.page').forEach(page => {
    page.setAttribute('aria-hidden', page.classList.contains('active') ? 'false' : 'true');
  });
}
let navTabsReady = false;
function setupNavTabs() {
  if(navTabsReady) return;
  navTabsReady = true;
  document.querySelectorAll('#mainNavTabs button').forEach(btn => {
    btn.addEventListener('click', () => {
      switchPage(btn.dataset.page);
    });
  });
  updateNavAccessibility();
}
function renderAll() {
  updateChatSenders();
  renderInitiative();
  renderCharListSidebar();
  renderPersonajePage();
  renderInventarioPage();
  renderHechizosPage();
  renderAtaquePage();
  renderQuickCombatPanel();
  renderEnemiesPage();
  renderNpcPage();
  renderManualsPage();
  renderSavesList();
}
function renderPageContent(pg) {
  if(pg==='recursos') { renderCharListSidebar(); renderPersonajePage(); renderEnemiesPage(); renderNpcPage(); }
  else if(pg==='personaje') { renderCharListSidebar(); renderPersonajePage(); }
  else if(pg==='inventario') { renderInventarioPage(); renderHechizosPage(); renderAtaquePage(); }
  else if(pg==='hechizos') renderHechizosPage();
  else if(pg==='ataque') renderAtaquePage();
  else if(pg==='enemigos') renderEnemiesPage();
  else if(pg==='npc') renderNpcPage();
  else if(pg==='manual') renderManualsPage();
  else if(pg==='partida') { renderSavesList(); renderInvitePanel(); }
  else if(pg==='mapa') renderQuickCombatPanel();
}

// ===================================================
// MAP QUICK COMBAT PANEL
// ===================================================
function getQuickCombatCharacter() {
  if(isDM() && mapState?.selectedTokenId) {
    const token = getMapTokenByTokenId(mapState.selectedTokenId);
    const selected = token && getCombatantById(token.id);
    if(selected && selected.type === 'enemy') return ensureCombatLoadout(selected);
  }
  if(isDM() && state.quickCombatActorId) {
    const selected = getCombatantById(state.quickCombatActorId);
    if(selected && selected.type === 'enemy') return ensureCombatLoadout(selected);
  }
  const active = getActiveChar();
  if(active && (isDM() || canEditCharacter(active))) return ensureCombatLoadout(active);
  if(!isDM()) return getOwnedCharacters()[0] || null;
  return ensureCombatLoadout(characters[0] || enemies[0] || null);
}

function openQuickCombatForActor(actorId) {
  if(!isDM()) return;
  const actor = getCombatantById(actorId);
  if(!actor || actor.type !== 'enemy') return;
  ensureCombatLoadout(actor);
  state.quickCombatActorId = actor.id;
  toggleQuickCombatPanel(true);
  renderEnemiesPage();
}

function getQuickCombatAttackActions(c) {
  if(!c) return [];
  return Array.isArray(c.attacks)
    ? c.attacks.map(atk => ({
        name: atk.name || 'Ataque',
        icon: atk.icon || '⚔️',
        type: atk.type || 'Ataque',
        damage: atk.damage || '',
        source: 'Ataque'
      }))
    : [];
}

function toggleQuickCombatPanel(force) {
  const panel = document.getElementById('quickCombatPanel');
  const toggle = document.getElementById('quickCombatToggle');
  if(!panel) return;
  const open = typeof force === 'boolean' ? force : panel.style.display === 'none';
  panel.style.display = open ? 'flex' : 'none';
  toggle?.classList.toggle('active', open);
  if(open) renderQuickCombatPanel();
}

function renderQuickCombatPanel() {
  const panel = document.getElementById('quickCombatPanel');
  if(!panel) return;
  const c = getQuickCombatCharacter();
  ensureCombatLoadout(c);
  const canEdit = canEditCharacter(c);
  if(!c) {
    panel.innerHTML = `
      <div class="quick-combat-header">
        <div><div class="quick-combat-title">Combate rapido</div><div class="quick-combat-subtitle">Crea un personaje para usar ataques y hechizos desde el mapa.</div></div>
        <button class="quick-combat-close" onclick="toggleQuickCombatPanel(false)">×</button>
      </div>
      <div class="quick-combat-body"><div class="quick-combat-empty">No hay personaje activo.</div></div>`;
    return;
  }

  const attacks = getQuickCombatAttackActions(c);
  const spells = Array.isArray(c.spells?.prepared) ? c.spells.prepared : [];
  const actorKind = c.type === 'enemy' ? 'Enemigo del DM' : 'Personaje';
  panel.innerHTML = `
    <div class="quick-combat-header">
      <div>
        <div class="quick-combat-title">Combate rapido</div>
        <div class="quick-combat-subtitle">${escapeHTML(c.name)} · ${actorKind} · ataques y hechizos sin salir del mapa</div>
      </div>
      <button class="quick-combat-close" onclick="toggleQuickCombatPanel(false)">×</button>
    </div>
    <div class="quick-combat-body">
      <div class="quick-combat-actions">
        ${canEdit ? '<button id="quickCombatAddAttack" type="button">+ Ataque</button>' : ''}
        ${canEdit ? '<button id="quickCombatAddSpell" type="button">+ Hechizo</button>' : ''}
        ${c.type === 'enemy' ? '<button id="quickCombatOpenInventory" type="button">Ver solapa enemiga</button>' : '<button id="quickCombatOpenInventory" type="button">Abrir inventario</button>'}
      </div>
      <section>
        <div class="quick-combat-section-title">Ataques agregados</div>
        <div class="quick-combat-list" id="quickCombatAttacks">
          ${attacks.length ? attacks.map((atk, idx) => `
            <div class="quick-combat-row">
              <div class="quick-combat-icon">${escapeHTML(atk.icon)}</div>
              <div>
                <div class="quick-combat-name">${escapeHTML(atk.name)}</div>
                <div class="quick-combat-meta">${escapeHTML(atk.type)}${atk.damage ? ` · Daño ${escapeHTML(atk.damage)}` : ''}</div>
              </div>
              <button class="quick-combat-use" type="button" data-quick-attack="${idx}">Atacar</button>
            </div>`).join('') : '<div class="quick-combat-empty">Sin ataques agregados. Usa + Ataque para crear acciones de combate.</div>'}
        </div>
      </section>
      <section>
        <div class="quick-combat-section-title">Hechizos preparados</div>
        <div class="quick-combat-list" id="quickCombatSpells">
          ${spells.length ? spells.map((sp, idx) => `
            <div class="quick-combat-row">
              <div class="quick-combat-icon">${escapeHTML(sp.icon || '✨')}</div>
              <div>
                <div class="quick-combat-name">${escapeHTML(sp.name || 'Conjuro')}</div>
                <div class="quick-combat-meta">Nivel ${Number.isFinite(Number(sp.level)) ? Number(sp.level) : 0}${sp.damage ? ` · Daño ${escapeHTML(sp.damage)}` : ''}</div>
              </div>
              <button class="quick-combat-use spell" type="button" data-quick-spell="${idx}">Lanzar</button>
            </div>`).join('') : '<div class="quick-combat-empty">Sin hechizos preparados para este personaje.</div>'}
        </div>
      </section>
    </div>`;

  panel.querySelector('#quickCombatAddAttack')?.addEventListener('click', () => openAddAttackModal(c.id));
  panel.querySelector('#quickCombatAddSpell')?.addEventListener('click', () => openAddSpellModal(c.id));
  panel.querySelector('#quickCombatOpenInventory')?.addEventListener('click', () => {
    if(c.type === 'enemy') {
      openEnemyLoadout(c.id, 'inventory');
      document.querySelectorAll('#mainNavTabs button').forEach(b => b.classList.toggle('active', b.dataset.page === 'recursos'));
      switchPage('recursos');
      document.getElementById('page-enemigos')?.scrollIntoView({behavior:'smooth',block:'start'});
      return;
    }
    document.querySelectorAll('#mainNavTabs button').forEach(b => b.classList.toggle('active', b.dataset.page === 'inventario'));
    switchPage('inventario');
  });
  panel.querySelectorAll('[data-quick-attack]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = attacks[parseInt(btn.dataset.quickAttack, 10)];
      if(action) executeAttack(c.name, action.name, action.icon, action.damage || '');
    });
  });
  panel.querySelectorAll('[data-quick-spell]').forEach(btn => {
    btn.addEventListener('click', () => {
      const spell = spells[parseInt(btn.dataset.quickSpell, 10)];
      if(spell) castSpell(c.name, spell.name || 'Conjuro', spell.icon || '✨', spell.damage || '');
    });
  });
}

// ===================================================
// ENEMIES PAGE
// ===================================================
let enemyEditingId=null;
let enemyLoadoutState={id:null,tab:'attacks'};
function renderEnemiesPage() {
  const grid=document.getElementById('enemyLibraryGrid');
  if(!grid) return;
  if(!isDM()) {
    grid.innerHTML='<div class="enemy-empty">La biblioteca de enemigos solo está disponible para el Dungeon Master.</div>';
    return;
  }
  if(enemies.length===0) {
    grid.innerHTML='<div class="enemy-empty">Todavía no hay enemigos. Crea una criatura o importa una carpeta de imágenes.</div>';
    return;
  }
  grid.innerHTML=enemies.map(enemy=>{
    ensureCombatLoadout(enemy);
    const tokenCount=mapState.tokens.filter(token=>String(token.id)===String(enemy.id)).length;
    const onMap=tokenCount>0;
    const safeId=encodeInline(enemy.id);
    const isLoadoutOpen=String(enemyLoadoutState.id)===String(enemy.id);
    const attr={str:10,dex:10,con:10,int:10,wis:10,cha:10,...(enemy.attributes||{})};
    const statBoxes=Object.entries({FUE:attr.str,DES:attr.dex,CON:attr.con,INT:attr.int,SAB:attr.wis,CAR:attr.cha})
      .map(([label,value])=>`<div class="enemy-card-stat">${label}<strong>${value}</strong></div>`).join('');
    const portrait=enemy.portrait
      ? `<img src="${enemy.portrait}" alt="${escapeHTML(enemy.name)}">`
      : `<div class="enemy-card-initials" style="color:${enemy.color};">${escapeHTML(enemy.initials||initials(enemy.name))}</div>`;
    return `<article class="enemy-card">
      <div class="enemy-card-image">${portrait}</div>
      <div class="enemy-card-body">
        <div class="enemy-card-title">${escapeHTML(enemy.name)}</div>
        <div class="enemy-card-meta">❤️ ${enemy.hp} / ${enemy.maxHp} · 🛡 CA ${enemy.ac??12} · 🎲 Iniciativa ${enemy.initiative||0} · 🧩 ${tokenCount} tokens · ⭐ ${enemy.xp??0} PX</div>
        <div class="enemy-card-stats">${statBoxes}</div>
        <div class="enemy-card-actions">
          <button class="enemy-token-btn ${onMap?'on-map':''}" onclick="toggleEnemyMapToken('${enemy.id}')">${onMap?`✕ Quitar uno (${tokenCount})`:'＋ Poner token'}</button>
          <button class="enemy-duplicate-btn" onclick="duplicateEnemyToken('${enemy.id}')" title="Duplicar token">Duplicar</button>
          <button class="enemy-edit-btn" onclick="editEnemy('${enemy.id}')" title="Editar ficha">✎</button>
          <button class="enemy-delete-btn" onclick="deleteEnemy('${enemy.id}')" title="Eliminar enemigo">✕</button>
        </div>
        <div class="enemy-loadout-actions">
          <button onclick="openQuickCombatForActor(decodeURIComponent('${safeId}'))">Combate rápido</button>
          <button class="${isLoadoutOpen?'active':''}" onclick="openEnemyLoadout('${safeId}','attacks')">Ataques</button>
          <button class="${isLoadoutOpen?'active':''}" onclick="openEnemyLoadout('${safeId}','spells')">Hechizos</button>
          <button class="${isLoadoutOpen?'active':''}" onclick="openEnemyLoadout('${safeId}','inventory')">Inventario</button>
        </div>
        ${isLoadoutOpen ? renderEnemyLoadoutPanel(enemy) : ''}
      </div>
    </article>`;
  }).join('');
}

function openEnemyLoadout(enemyIdEncoded, tab='attacks') {
  if(!isDM()) return;
  const enemyId=decodeURIComponent(String(enemyIdEncoded));
  const enemy=enemies.find(item=>String(item.id)===String(enemyId));
  if(!enemy) return;
  ensureCombatLoadout(enemy);
  enemyLoadoutState={id:enemy.id,tab:['attacks','spells','inventory'].includes(tab)?tab:'attacks'};
  state.quickCombatActorId=enemy.id;
  renderEnemiesPage();
}

function renderEnemyLoadoutPanel(enemy) {
  ensureCombatLoadout(enemy);
  const safeId=encodeInline(enemy.id);
  const active=enemyLoadoutState.tab || 'attacks';
  const tabs=`<div class="enemy-loadout-tabs">
    <button class="${active==='attacks'?'active':''}" onclick="openEnemyLoadout('${safeId}','attacks')">Ataques</button>
    <button class="${active==='spells'?'active':''}" onclick="openEnemyLoadout('${safeId}','spells')">Hechizos</button>
    <button class="${active==='inventory'?'active':''}" onclick="openEnemyLoadout('${safeId}','inventory')">Inventario</button>
  </div>`;
  let body='';
  if(active==='spells') {
    const spells=Array.isArray(enemy.spells?.prepared) ? enemy.spells.prepared : [];
    body=`<div class="enemy-loadout-toolbar"><span>Grimorio de ${escapeHTML(enemy.name)}</span><button onclick="openAddSpellModal(decodeURIComponent('${safeId}'))">+ Hechizo</button></div>
      <div class="enemy-loadout-list">
        ${spells.length ? spells.map((sp,idx)=>`<div class="enemy-loadout-row">
          <span class="enemy-loadout-icon">${escapeHTML(sp.icon||'✨')}</span>
          <div><strong>${escapeHTML(sp.name||'Conjuro')}</strong><small>Nivel ${Number.isFinite(Number(sp.level)) ? Number(sp.level) : 0}${sp.damage ? ` · Daño ${escapeHTML(sp.damage)}` : ''}</small></div>
          <button onclick="castEnemyLoadoutSpell('${safeId}',${idx})">Lanzar</button>
          <button class="danger" onclick="removeSpell('${safeId}',${idx})">×</button>
        </div>`).join('') : '<div class="enemy-loadout-empty">Este enemigo todavía no tiene hechizos.</div>'}
      </div>`;
  } else if(active==='inventory') {
    const items=Array.isArray(enemy.inventory) ? enemy.inventory : [];
    body=`<div class="enemy-loadout-toolbar"><span>Inventario de ${escapeHTML(enemy.name)}</span><button onclick="openAddItemModal(decodeURIComponent('${safeId}'))">+ Objeto</button></div>
      <div class="enemy-loadout-list">
        ${items.length ? items.map((item,idx)=>`<div class="enemy-loadout-row">
          <span class="enemy-loadout-icon">${escapeHTML(item.icon||'🎒')}</span>
          <div><strong>${escapeHTML(item.name||'Objeto')}</strong><small>Cantidad ${parseInt(item.qty)||1} · ${getInventoryItemBadge(item)}</small></div>
          <button class="danger" onclick="removeItem('${safeId}',${idx})">×</button>
        </div>`).join('') : '<div class="enemy-loadout-empty">Este enemigo todavía no tiene objetos.</div>'}
      </div>`;
  } else {
    const attacks=Array.isArray(enemy.attacks) ? enemy.attacks : [];
    body=`<div class="enemy-loadout-toolbar"><span>Ataques de ${escapeHTML(enemy.name)}</span><button onclick="openAddAttackModal(decodeURIComponent('${safeId}'))">+ Ataque</button></div>
      <div class="enemy-loadout-list">
        ${attacks.length ? attacks.map((atk,idx)=>`<div class="enemy-loadout-row">
          <span class="enemy-loadout-icon">${escapeHTML(atk.icon||'⚔️')}</span>
          <div><strong>${escapeHTML(atk.name||'Ataque')}</strong><small>${escapeHTML(atk.type||'Ataque')}${atk.damage ? ` · Daño ${escapeHTML(atk.damage)}` : ''}</small></div>
          <button onclick="executeEnemyLoadoutAttack('${safeId}',${idx})">Atacar</button>
          <button class="danger" onclick="removeAttack('${safeId}',${idx})">×</button>
        </div>`).join('') : '<div class="enemy-loadout-empty">Este enemigo todavía no tiene ataques.</div>'}
      </div>`;
  }
  return `<div class="enemy-loadout-panel">${tabs}${body}</div>`;
}

function getEnemyByEncodedId(enemyIdEncoded) {
  const enemyId=decodeURIComponent(String(enemyIdEncoded));
  return enemies.find(item=>String(item.id)===String(enemyId));
}

function executeEnemyLoadoutAttack(enemyIdEncoded, idx) {
  if(!isDM()) return;
  const enemy=getEnemyByEncodedId(enemyIdEncoded);
  const attack=enemy?.attacks?.[idx];
  if(!enemy || !attack) return;
  executeAttack(enemy.name, attack.name || 'Ataque', attack.icon || '⚔️', attack.damage || '');
}

function castEnemyLoadoutSpell(enemyIdEncoded, idx) {
  if(!isDM()) return;
  const enemy=getEnemyByEncodedId(enemyIdEncoded);
  const spell=enemy?.spells?.prepared?.[idx];
  if(!enemy || !spell) return;
  castSpell(enemy.name, spell.name || 'Conjuro', spell.icon || '✨', spell.damage || '');
}
function createEnemyRecord(name,hp,initiative,portrait=null,details={}) {
  const enemy={
    id:'enemy_'+Date.now()+'_'+Math.random().toString(36).slice(2,8),
    name:name||'Enemigo', hp, maxHp:hp, type:'enemy', initiative,
    color:randColor(), initials:initials(name||'Enemigo'), online:true, portrait,
    ac:details.ac??12, xp:details.xp??0,
    attributes:details.attributes||{str:10,dex:10,con:10,int:10,wis:10,cha:10},
    inventory:[], copper:0, silver:0, gold:0, attacks:[], spells:{slots:[3,2,0,0,0,0,0,0,0],usedSlots:[0,0,0,0,0,0,0,0,0],prepared:[]}
  };
  enemies.push(enemy);
  combatants=getInitiativeCombatants();
  saveEnemies();
  renderEnemiesPage();
  renderInitiative();
  return enemy;
}
function getEnemyFormDetails() {
  return {
    ac:Math.max(0,parseInt(document.getElementById('newEnemyAc').value)||0),
    xp:Math.max(0,parseInt(document.getElementById('newEnemyXp').value)||0),
    attributes:{
      str:parseInt(document.getElementById('newEnemyStr').value)||10,
      dex:parseInt(document.getElementById('newEnemyDex').value)||10,
      con:parseInt(document.getElementById('newEnemyCon').value)||10,
      int:parseInt(document.getElementById('newEnemyInt').value)||10,
      wis:parseInt(document.getElementById('newEnemyWis').value)||10,
      cha:parseInt(document.getElementById('newEnemyCha').value)||10
    }
  };
}
function resetEnemyForm() {
  enemyEditingId=null;
  document.getElementById('newEnemyName').value='';
  document.getElementById('newEnemyHp').value='20';
  document.getElementById('newEnemyAc').value='12';
  document.getElementById('newEnemyInit').value='10';
  document.getElementById('newEnemyXp').value='100';
  ['Str','Dex','Con','Int','Wis','Cha'].forEach(stat=>{ document.getElementById(`newEnemy${stat}`).value='10'; });
  document.getElementById('newEnemyImage').value='';
  document.getElementById('enemySaveButton').textContent='＋ Crear enemigo';
  document.getElementById('enemyCancelEditButton').style.display='none';
}
function editEnemy(enemyId) {
  if(!isDM()) return;
  const enemy=enemies.find(item=>item.id===enemyId);
  if(!enemy) return;
  const attr={str:10,dex:10,con:10,int:10,wis:10,cha:10,...(enemy.attributes||{})};
  enemyEditingId=enemyId;
  document.getElementById('newEnemyName').value=enemy.name;
  document.getElementById('newEnemyHp').value=enemy.maxHp||enemy.hp||20;
  document.getElementById('newEnemyAc').value=enemy.ac??12;
  document.getElementById('newEnemyInit').value=enemy.initiative||0;
  document.getElementById('newEnemyXp').value=enemy.xp??0;
  Object.entries({Str:attr.str,Dex:attr.dex,Con:attr.con,Int:attr.int,Wis:attr.wis,Cha:attr.cha})
    .forEach(([stat,value])=>{ document.getElementById(`newEnemy${stat}`).value=value; });
  document.getElementById('enemySaveButton').textContent='✓ Guardar ficha';
  document.getElementById('enemyCancelEditButton').style.display='';
  document.querySelector('.enemy-create-panel')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function addEnemyFromForm() {
  if(!isDM()) return;
  const name=document.getElementById('newEnemyName').value.trim()||'Enemigo';
  const hp=Math.max(1,parseInt(document.getElementById('newEnemyHp').value)||20);
  const initiative=parseInt(document.getElementById('newEnemyInit').value)||0;
  const details=getEnemyFormDetails();
  const file=document.getElementById('newEnemyImage').files?.[0];
  const finish=portrait=>{
    const enemy=enemies.find(item=>item.id===enemyEditingId);
    if(enemy) {
      enemy.name=name; enemy.hp=hp; enemy.maxHp=hp; enemy.initiative=initiative;
      enemy.ac=details.ac; enemy.xp=details.xp; enemy.attributes=details.attributes;
      enemy.initials=initials(name);
      if(portrait) {
        enemy.portrait=portrait;
        delete imageCache[enemy.id];
      }
      combatants=getInitiativeCombatants();
      saveEnemies();
      renderEnemiesPage();
      renderInitiative();
      drawMap();
    } else {
      createEnemyRecord(name,hp,initiative,portrait,details);
    }
    resetEnemyForm();
  };
  if(!file) return finish(null);
  const reader=new FileReader();
  reader.onload=e=>compressImage(e.target.result,420,420,0.78,finish);
  reader.readAsDataURL(file);
}
function importEnemyFiles(event) {
  if(!isDM()) return;
  const files=[...(event.target.files||[])].filter(file=>file.type.startsWith('image/'));
  files.forEach(file=>{
    const reader=new FileReader();
    reader.onload=e=>compressImage(e.target.result,420,420,0.78,portrait=>{
      const name=file.name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ').trim()||'Enemigo';
      createEnemyRecord(name,20,10,portrait,{ac:12,xp:100,attributes:{str:10,dex:10,con:10,int:10,wis:10,cha:10}});
    });
    reader.readAsDataURL(file);
  });
  event.target.value='';
}
function toggleEnemyMapToken(enemyId) {
  if(!isDM()) return;
  toggleMapToken(enemyId);
  renderEnemiesPage();
}
function duplicateEnemyToken(enemyId) {
  if(!isDM()) return;
  addMapTokenForCombatant(enemyId, { duplicate: true });
}
function deleteEnemy(enemyId) {
  if(!isDM()) return;
  const enemy=enemies.find(item=>item.id===enemyId);
  if(!enemy||!confirm(`¿Eliminar a ${enemy.name} de la biblioteca y de los mapas?`)) return;
  enemies=enemies.filter(item=>item.id!==enemyId);
  mapState.tokens=mapState.tokens.filter(token=>token.id!==enemyId);
  maps.forEach(map=>{ map.tokens=(map.tokens||[]).filter(token=>token.id!==enemyId); });
  delete imageCache[enemyId];
  combatants=getInitiativeCombatants();
  saveEnemies();
  saveMaps();
  renderEnemiesPage();
  renderInitiative();
  drawMap();
  if(typeof multiplayer!=='undefined' && multiplayer.isActive()) {
    multiplayer.broadcast({type:'tokens_update',tokens:mapState.tokens});
  }
}

// ===================================================
// NPC PAGE
// ===================================================
let npcEditingId=null;
function renderNpcPage() {
  const grid=document.getElementById('npcLibraryGrid');
  if(!grid) return;
  if(!isDM()) {
    grid.innerHTML='<div class="enemy-empty">La biblioteca de NPC solo está disponible para el Dungeon Master.</div>';
    return;
  }
  if(npcs.length===0) {
    grid.innerHTML='<div class="enemy-empty">Todavía no hay NPC. Crea uno o importa una carpeta de imágenes.</div>';
    return;
  }
  grid.innerHTML=npcs.map(npc=>{
    const tokenCount=mapState.tokens.filter(token=>String(token.id)===String(npc.id)).length;
    const onMap=tokenCount>0;
    const attr={str:10,dex:10,con:10,int:10,wis:10,cha:10,...(npc.attributes||{})};
    const statBoxes=Object.entries({FUE:attr.str,DES:attr.dex,CON:attr.con,INT:attr.int,SAB:attr.wis,CAR:attr.cha})
      .map(([label,value])=>`<div class="enemy-card-stat">${label}<strong>${value}</strong></div>`).join('');
    const portrait=npc.portrait
      ? `<img src="${npc.portrait}" alt="${escapeHTML(npc.name)}">`
      : `<div class="enemy-card-initials" style="color:${npc.color};">${escapeHTML(npc.initials||initials(npc.name))}</div>`;
    return `<article class="enemy-card npc-card">
      <div class="enemy-card-image">${portrait}</div>
      <div class="enemy-card-body">
        <div class="enemy-card-title">${escapeHTML(npc.name)}</div>
        <div class="enemy-card-meta">❤ ${npc.hp} / ${npc.maxHp} · CA ${npc.ac??10} · Iniciativa ${npc.initiative||0} · ${escapeHTML(npc.role||'NPC')} · ${tokenCount} tokens</div>
        <div class="enemy-card-stats">${statBoxes}</div>
        <div class="enemy-card-actions">
          <button class="enemy-token-btn ${onMap?'on-map':''}" onclick="toggleNpcMapToken('${npc.id}')">${onMap?`✕ Quitar uno (${tokenCount})`:'＋ Poner token'}</button>
          <button class="enemy-duplicate-btn" onclick="duplicateNpcToken('${npc.id}')" title="Duplicar token">Duplicar</button>
          <button class="enemy-edit-btn" onclick="editNpc('${npc.id}')" title="Editar ficha">✎</button>
          <button class="enemy-delete-btn" onclick="deleteNpc('${npc.id}')" title="Eliminar NPC">✕</button>
        </div>
      </div>
    </article>`;
  }).join('');
}
function createNpcRecord(name,hp,initiative,portrait=null,details={}) {
  const npc={
    id:'npc_'+Date.now()+'_'+Math.random().toString(36).slice(2,8),
    name:name||'NPC', hp, maxHp:hp, type:'npc', initiative,
    color:details.color||'#38bdf8', initials:initials(name||'NPC'), online:true, portrait,
    ac:details.ac??10, role:details.role||'NPC',
    attributes:details.attributes||{str:10,dex:10,con:10,int:10,wis:10,cha:10}
  };
  npcs.push(npc);
  rebuildCombatantsByInitiative();
  saveNpcs();
  renderNpcPage();
  renderInitiative();
  return npc;
}
function getNpcFormDetails() {
  return {
    ac:Math.max(0,parseInt(document.getElementById('newNpcAc').value)||0),
    role:document.getElementById('newNpcRole').value.trim()||'NPC',
    attributes:{
      str:parseInt(document.getElementById('newNpcStr').value)||10,
      dex:parseInt(document.getElementById('newNpcDex').value)||10,
      con:parseInt(document.getElementById('newNpcCon').value)||10,
      int:parseInt(document.getElementById('newNpcInt').value)||10,
      wis:parseInt(document.getElementById('newNpcWis').value)||10,
      cha:parseInt(document.getElementById('newNpcCha').value)||10
    }
  };
}
function resetNpcForm() {
  npcEditingId=null;
  document.getElementById('newNpcName').value='';
  document.getElementById('newNpcHp').value='10';
  document.getElementById('newNpcAc').value='10';
  document.getElementById('newNpcInit').value='0';
  document.getElementById('newNpcRole').value='';
  ['Str','Dex','Con','Int','Wis','Cha'].forEach(stat=>{ document.getElementById(`newNpc${stat}`).value='10'; });
  document.getElementById('newNpcImage').value='';
  document.getElementById('npcSaveButton').textContent='＋ Crear NPC';
  document.getElementById('npcCancelEditButton').style.display='none';
}
function editNpc(npcId) {
  if(!isDM()) return;
  const npc=npcs.find(item=>item.id===npcId);
  if(!npc) return;
  const attr={str:10,dex:10,con:10,int:10,wis:10,cha:10,...(npc.attributes||{})};
  npcEditingId=npcId;
  document.getElementById('newNpcName').value=npc.name;
  document.getElementById('newNpcHp').value=npc.maxHp||npc.hp||10;
  document.getElementById('newNpcAc').value=npc.ac??10;
  document.getElementById('newNpcInit').value=npc.initiative||0;
  document.getElementById('newNpcRole').value=npc.role||'';
  Object.entries({Str:attr.str,Dex:attr.dex,Con:attr.con,Int:attr.int,Wis:attr.wis,Cha:attr.cha})
    .forEach(([stat,value])=>{ document.getElementById(`newNpc${stat}`).value=value; });
  document.getElementById('npcSaveButton').textContent='✓ Guardar NPC';
  document.getElementById('npcCancelEditButton').style.display='';
  document.querySelector('.npc-create-panel')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function addNpcFromForm() {
  if(!isDM()) return;
  const name=document.getElementById('newNpcName').value.trim()||'NPC';
  const hp=Math.max(1,parseInt(document.getElementById('newNpcHp').value)||10);
  const initiative=parseInt(document.getElementById('newNpcInit').value)||0;
  const details=getNpcFormDetails();
  const file=document.getElementById('newNpcImage').files?.[0];
  const finish=portrait=>{
    const npc=npcs.find(item=>item.id===npcEditingId);
    if(npc) {
      npc.name=name; npc.hp=hp; npc.maxHp=hp; npc.initiative=initiative;
      npc.ac=details.ac; npc.role=details.role; npc.attributes=details.attributes;
      npc.initials=initials(name);
      if(portrait) {
        npc.portrait=portrait;
        delete imageCache[npc.id];
      }
      rebuildCombatantsByInitiative();
      saveNpcs();
      renderNpcPage();
      renderInitiative();
      drawMap();
    } else {
      createNpcRecord(name,hp,initiative,portrait,details);
    }
    resetNpcForm();
  };
  if(!file) return finish(null);
  const reader=new FileReader();
  reader.onload=e=>compressImage(e.target.result,420,420,0.78,finish);
  reader.readAsDataURL(file);
}
function importNpcFiles(event) {
  if(!isDM()) return;
  const files=[...(event.target.files||[])].filter(file=>file.type.startsWith('image/'));
  files.forEach(file=>{
    const reader=new FileReader();
    reader.onload=e=>compressImage(e.target.result,420,420,0.78,portrait=>{
      const name=file.name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ').trim()||'NPC';
      createNpcRecord(name,10,0,portrait,{ac:10,role:'NPC',attributes:{str:10,dex:10,con:10,int:10,wis:10,cha:10}});
    });
    reader.readAsDataURL(file);
  });
  event.target.value='';
}
function toggleNpcMapToken(npcId) {
  if(!isDM()) return;
  toggleMapToken(npcId);
  renderNpcPage();
}
function duplicateNpcToken(npcId) {
  if(!isDM()) return;
  addMapTokenForCombatant(npcId, { duplicate: true });
  renderNpcPage();
}
function deleteNpc(npcId) {
  if(!isDM()) return;
  const npc=npcs.find(item=>item.id===npcId);
  if(!npc||!confirm(`¿Eliminar a ${npc.name} de la biblioteca y de los mapas?`)) return;
  npcs=npcs.filter(item=>item.id!==npcId);
  mapState.tokens=mapState.tokens.filter(token=>token.id!==npcId);
  maps.forEach(map=>{ map.tokens=(map.tokens||[]).filter(token=>token.id!==npcId); });
  delete imageCache[npcId];
  rebuildCombatantsByInitiative();
  saveNpcs();
  saveMaps();
  renderNpcPage();
  renderInitiative();
  drawMap();
  if(typeof multiplayer!=='undefined' && multiplayer.isActive()) {
    multiplayer.broadcast({type:'tokens_update',tokens:mapState.tokens});
  }
}

// ===================================================
// PERSONAJE PAGE
// ===================================================
function renderCharListSidebar() {
  const el = document.getElementById('charListPersonaje');
  el.innerHTML = '';
  restorePlayerActiveCharacter();
  const list = getVisibleCharactersForCurrentUser();
  updateCharacterCreateButton();
  list.forEach(c => {
    const pct = Math.max(0,Math.min(100,(c.hp/c.maxHp)*100));
    const isActive = c.id === state.activeCharId ? 'active':'';
    el.insertAdjacentHTML('beforeend', `
      <div class="char-item ${isActive}" onclick="selectChar(${c.id})">
        <div class="char-avatar" style="border-color:${c.color};background:${c.color}22;">${c.portrait?`<img src="${c.portrait}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`:c.initials}</div>
        <div class="char-info">
          <div class="char-name">${c.name}</div>
          <div class="char-sub">Nivel ${Math.max(1, parseInt(c.level) || 1)} · ${c.race} · ${c.class}</div>
          <div class="hp-bar-container"><div class="hp-bar" style="width:${pct}%;background:${getHpColor(c.hp,c.maxHp)};"></div></div>
        </div>
        <div class="online-dot ${c.online?'online':'offline'}"></div>
      </div>`);
  });
  // show create prompt if player has no char
  if(!isDM() && list.length === 0) {
    showCreateCharPrompt();
  }
}

function showCreateCharPrompt() {
  const charDetail = document.querySelector('.char-detail');
  if(!charDetail) return;
  const title = isDM() ? 'No hay personajes en la mesa' : '¡Tu aventura comienza aquí!';
  const text = isDM()
    ? 'Crea personajes para la campaña o espera a que los jugadores creen los suyos.'
    : 'Aún no tienes un personaje en esta campaña. Crea tu ficha de aventurero para poder equiparte, lanzar hechizos y tomar parte en la batalla.';
  charDetail.innerHTML = `
    <div class="create-char-prompt" style="grid-column:1/-1;">
      <div class="gem-big">⚔️</div>
      <h2>${title}</h2>
      <p>${text}</p>
      <button class="btn-create-char" onclick="openCharModal()">✨ Crear Personaje</button>
    </div>`;
}

function selectChar(id) {
  const selected = getCharacterById(id);
  if (!selected) return;
  if (!isDM() && state.currentUser && selected.userId !== state.currentUser.id) return;
  state.activeCharId = id;
  saveLS('crq_active_char_id', id);

  renderCharListSidebar();
  restoreCharDetail();
  renderPersonajePage();
  renderInventarioPage();
  renderHechizosPage();
  renderAtaquePage();
  renderQuickCombatPanel();
}

function restoreCharDetail() {
  // Reset only the detail area, preserving the character selector on the left.
  const charDetail = document.querySelector('#page-personaje .char-detail');
  if(!charDetail) return;
  if(!charDetail.querySelector('.char-portrait-area')) {
    charDetail.innerHTML = `
      <div class="char-portrait-area" id="portraitArea">
        <input type="file" id="portraitFileInput" accept="image/*" onchange="onPortraitChange(event)">
        <button class="portrait-upload-btn" onclick="document.getElementById('portraitFileInput').click()">📷 Cambiar</button>
        <button class="portrait-token-btn" id="portraitMapTokenBtn" onclick="toggleActiveCharacterMapToken()">📍 Poner token</button>
        <div id="portraitContent" style="width:100%;height:100%;position:relative;display:flex;flex-direction:column;overflow:hidden;"></div>
        <div class="portrait-name-bar">
          <h1 id="portraitName">–</h1>
          <p id="portraitSub">–</p>
          <div class="portrait-hp-row">
            <button class="portrait-hp-btn" onclick="modifyHP(-1)">−</button>
            <div class="portrait-hp-bar"><div class="portrait-hp-fill" id="portraitHpFill"></div></div>
            <div class="portrait-hp-text" id="portraitHpText">0 / 0</div>
            <button class="portrait-hp-btn" onclick="modifyHP(1)">+</button>
          </div>
          <div class="portrait-hp-adjust">
            <input id="hpChangeAmount" type="number" min="1" value="1" title="Cantidad de vida">
            <button onclick="modifyHP(-1)">Restar vida</button>
            <button onclick="modifyHP(1)">Sumar vida</button>
          </div>
        </div>
      </div>
      <div class="char-stats-panel">
        <div class="stats-inner">
          <div class="character-sheet-actions" id="characterSheetActions"></div>
          <div class="section-title">Atributos</div>
          <div class="attr-grid" id="pgAttrGrid"></div>
          <div class="section-title">Visión y niebla</div>
          <div id="pgVisionSettings"></div>
          <div class="section-title">Habilidades</div>
          <div id="pgSkillList"></div>
        </div>
      </div>`;
  }
}

const characterVisionDefaults = {
  clearsFog:true,
  hiddenInFog:false,
  radiusSquares:6,
  angle:360,
  team:'characters'
};
const characterVisionTeams = {
  characters:'Personajes',
  party:'Grupo aventurero',
  scouts:'Exploradores',
  none:'Sin equipo'
};
const characterVisionRadiusOptions = [0,3,6,9,12,18];
const characterVisionAngleOptions = [360,180,120,90,60];

function normalizeCharacterVision(c) {
  if(!c) return {...characterVisionDefaults};
  const current = c.vision && typeof c.vision === 'object' ? c.vision : {};
  const vision = {...characterVisionDefaults,...current};
  vision.clearsFog = vision.clearsFog !== false;
  vision.hiddenInFog = vision.hiddenInFog === true;
  const parsedRadius = parseInt(vision.radiusSquares);
  const parsedAngle = parseInt(vision.angle);
  vision.radiusSquares = Number.isFinite(parsedRadius) ? Math.max(0, parsedRadius) : characterVisionDefaults.radiusSquares;
  vision.angle = Number.isFinite(parsedAngle) ? Math.max(15, Math.min(360, parsedAngle)) : characterVisionDefaults.angle;
  if(!characterVisionTeams[vision.team]) vision.team = characterVisionDefaults.team;
  c.vision = vision;
  return vision;
}

function formatVisionRadiusLabel(squares) {
  const feet = squares * 5;
  const meters = Math.round(feet * 0.3048);
  return squares === 0 ? 'Sin visión' : `${squares} casillas (${feet} pies / ${meters} m)`;
}

function renderCharacterVisionSettings(c) {
  const el = document.getElementById('pgVisionSettings');
  if(!el) return;
  const vision = normalizeCharacterVision(c);
  const canEdit = canEditCharacter(c);
  const disabled = canEdit ? '' : 'disabled';
  const charId = encodeInline(c.id);
  const radiusOptions = characterVisionRadiusOptions.map(value =>
    `<option value="${value}" ${vision.radiusSquares===value?'selected':''}>${formatVisionRadiusLabel(value)}</option>`
  ).join('');
  const angleOptions = characterVisionAngleOptions.map(value =>
    `<option value="${value}" ${vision.angle===value?'selected':''}>${value===360?'Completo (360°)':`${value}°`}</option>`
  ).join('');
  const teamOptions = Object.entries(characterVisionTeams).map(([value,label]) =>
    `<option value="${value}" ${vision.team===value?'selected':''}>${escapeHTML(label)}</option>`
  ).join('');
  el.innerHTML = `
    <div class="character-vision-card">
      <label class="character-vision-check">
        <input type="checkbox" ${vision.clearsFog?'checked':''} ${disabled}
          onchange="updateCharacterVision('${charId}','clearsFog',this.checked)">
        <span>Despeja niebla de guerra</span>
      </label>
      <label class="character-vision-check">
        <input type="checkbox" ${vision.hiddenInFog?'checked':''} ${disabled}
          onchange="updateCharacterVision('${charId}','hiddenInFog',this.checked)">
        <span>Ocultar en la niebla</span>
      </label>
      <div class="character-vision-field">
        <label>Radio de visión</label>
        <select ${disabled} onchange="updateCharacterVision('${charId}','radiusSquares',this.value)">${radiusOptions}</select>
      </div>
      <div class="character-vision-field">
        <label>Ángulo de visión</label>
        <select ${disabled} onchange="updateCharacterVision('${charId}','angle',this.value)">${angleOptions}</select>
      </div>
      <div class="character-vision-field character-vision-team">
        <label>Equipo</label>
        <select ${disabled} onchange="updateCharacterVision('${charId}','team',this.value)">${teamOptions}</select>
      </div>
      <p>Cada participante solo podrá ver el radio de visión de los personajes en los equipos a los que tenga acceso.</p>
    </div>`;
}

function updateCharacterVision(charIdEncoded, field, value) {
  const c = getCharacterById(decodeURIComponent(String(charIdEncoded)));
  if(!canEditCharacter(c)) return;
  const vision = normalizeCharacterVision(c);
  if(field === 'clearsFog' || field === 'hiddenInFog') vision[field] = value === true || value === 'true';
  else if(field === 'radiusSquares') vision.radiusSquares = Math.max(0, parseInt(value) || 0);
  else if(field === 'angle') vision.angle = Math.max(15, Math.min(360, parseInt(value) || 360));
  else if(field === 'team' && characterVisionTeams[value]) vision.team = value;
  c.vision = vision;
  saveChars();
  renderCharacterVisionSettings(c);
  if(typeof drawMap === 'function') drawMap();
}

function renderPersonajePage() {
  const c = getActiveChar();
  if(!c || (!isDM() && !canEditCharacter(c))) {
    showCreateCharPrompt();
    return;
  }
  const pc = document.getElementById('portraitContent');
  if(!pc) return;
  pc.innerHTML = c.portrait
    ? `<img src="${c.portrait}" class="char-portrait-img" alt="Portrait">`
    : `<div class="char-portrait-placeholder"><div class="big-initials" style="color:${c.color}">${c.initials}</div><div class="placeholder-name">${c.name}</div></div>`;
  c.level = Math.max(1, parseInt(c.level) || 1);
  document.getElementById('portraitName').textContent = c.name;
  document.getElementById('portraitSub').textContent  = `Nivel ${c.level} · ${c.race} · ${c.class}`;
  const actionsEl = document.getElementById('characterSheetActions');
  if(actionsEl) {
    const canEditSheet = canEditCharacter(c);
    actionsEl.innerHTML = canEditSheet ? `
      <div class="character-level-pill">Nivel <strong>${c.level}</strong></div>
      <button class="btn-sheet-action level-up" onclick="levelUpCharacter(${c.id})">⬆ Subir nivel</button>
      <button class="btn-sheet-action" onclick="openCharModal(${c.id})">✎ Editar ficha</button>
      <button class="btn-sheet-action danger" onclick="deleteCharacter('${encodeInline(c.id)}')">✕ Borrar</button>
    ` : '';
  }
  const hpPct = Math.max(0,Math.min(100,(c.hp/c.maxHp)*100));
  document.getElementById('portraitHpFill').style.width      = hpPct+'%';
  document.getElementById('portraitHpFill').style.background = getHpColor(c.hp,c.maxHp);
  document.getElementById('portraitHpText').textContent      = `${c.hp} / ${c.maxHp}`;
  updatePortraitMapTokenButton();
  const agEl = document.getElementById('pgAttrGrid');
  if(agEl) agEl.innerHTML = Object.entries(c.attributes).map(([k,v])=>`
    <div class="attr-box"><div class="attr-name">${attrNames[k]}</div><div class="attr-score">${v}</div><div class="attr-mod">${fmtMod(calcMod(v))}</div></div>`).join('');
  renderCharacterVisionSettings(c);
  const slEl = document.getElementById('pgSkillList');
  if(slEl) {
    if(!c.skills || typeof c.skills !== 'object') c.skills = {};
    const canEdit = canEditCharacter(c);
    const skillRows = Object.entries(c.skills).map(([name,val]) => {
      const safeChar = encodeInline(c.name);
      const safeSkill = encodeInline(name);
      const mod = parseInt(val) || 0;
      return `
        <div class="skill-item">
          <div class="skill-item-main" onclick="rollSkill(decodeURIComponent('${safeChar}'),decodeURIComponent('${safeSkill}'),${mod})">
            <span class="skill-name">${escapeHTML(name)}</span><span class="skill-mod">${fmtMod(mod)}</span>
          </div>
          ${canEdit ? `<div class="skill-actions"><button class="skill-remove-btn" onclick="removeSkillFromCharacter('${encodeInline(c.id)}','${safeSkill}')" title="Quitar habilidad">×</button></div>` : ''}
        </div>`;
    }).join('');
    slEl.innerHTML = `
      ${canEdit ? `
        <div class="skill-editor-box">
          <div class="skill-editor-fields">
            <input id="activeSkillName" type="text" placeholder="Nueva habilidad">
            <input id="activeSkillMod" type="number" value="0" title="Modificador">
            <button class="btn-secondary" onclick="addSkillToActiveCharacter()">＋ Agregar</button>
          </div>
        </div>` : ''}
      ${skillRows || '<div class="empty-skill-msg">Sin habilidades todavía.</div>'}`;
  }
}

function addSkillToActiveCharacter() {
  const c = getActiveChar();
  if(!canEditCharacter(c)) return;
  const nameInput = document.getElementById('activeSkillName');
  const modInput = document.getElementById('activeSkillMod');
  const name = nameInput?.value.trim();
  if(!name) return;
  const mod = parseInt(modInput?.value);
  if(!c.skills || typeof c.skills !== 'object') c.skills = {};
  c.skills[name] = Number.isFinite(mod) ? mod : 0;
  saveChars();
  if(nameInput) nameInput.value = '';
  if(modInput) modInput.value = '0';
  renderPersonajePage();
}

function removeSkillFromCharacter(charId, skillNameEncoded) {
  const c = getCharacterById(decodeURIComponent(charId));
  const skillName = decodeURIComponent(skillNameEncoded);
  if(!canEditCharacter(c) || !c.skills) return;
  delete c.skills[skillName];
  saveChars();
  renderPersonajePage();
}

function deleteCharacter(charIdEncoded) {
  const charId = decodeURIComponent(String(charIdEncoded));
  const c = getCharacterById(charId);
  if(!canEditCharacter(c)) return;
  if(!confirm(`¿Borrar a ${c.name}? Se quitará su ficha y sus tokens del tablero.`)) return;
  characters = characters.filter(ch => String(ch.id) !== String(c.id));
  mapState.tokens = mapState.tokens.filter(token => String(token.id) !== String(c.id));
  maps.forEach(map => {
    map.tokens = (map.tokens || []).filter(token => String(token.id) !== String(c.id));
  });
  delete imageCache[c.id];
  saveChars();
  saveMaps();
  combatants = getInitiativeCombatants();
  const visible = getVisibleCharactersForCurrentUser();
  state.activeCharId = visible[0]?.id || null;
  saveLS('crq_active_char_id', state.activeCharId);
  updateChatSenders();
  updateCharacterCreateButton();
  renderInitiative();
  renderCharListSidebar();
  restoreCharDetail();
  renderPersonajePage();
  renderInventarioPage();
  renderHechizosPage();
  renderAtaquePage();
  renderQuickCombatPanel();
  drawMap();
  broadcastMapTokens();
  addChatMessage('sys','',`Ficha borrada: <b>${escapeHTML(c.name)}</b>.`);
}

function onPortraitChange(e) {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const c = getActiveChar();
    if(c) {
      compressImage(ev.target.result, 400, 400, 0.75, (compressedImg) => {
        c.portrait = compressedImg;
        delete imageCache[c.id];
        saveChars();
        renderPersonajePage();
        renderInventarioPage();
        renderHechizosPage();
        renderCharListSidebar();
        if(typeof drawMap === 'function') drawMap();
      });
    }
  };
  reader.readAsDataURL(file);
}

function modifyHP(amount) {
  const c = getActiveChar();
  if(!canEditCharacter(c)) return;
  const input = document.getElementById('hpChangeAmount');
  const changeAmount = Math.max(1, parseInt(input?.value) || 1);
  const delta = amount > 0 ? changeAmount : -changeAmount;
  c.hp = Math.max(0,Math.min(c.maxHp,c.hp+delta));
  saveChars();
  renderPersonajePage();
  renderCharListSidebar();
  renderInitiative();
}

// ===================================================
// INVENTARIO PAGE
// ===================================================
const inventoryCategories = {
  weapon: { label:'Armas', icon:'⚔️', empty:'Sin armas registradas.' },
  armor: { label:'Armaduras', icon:'🛡️', empty:'Sin armaduras registradas.' },
  bag: { label:'Mochila', icon:'🎒', empty:'Sin objetos en la mochila.' }
};

function inferInventoryCategory(item) {
  if(item?.slot && inventoryCategories[item.slot]) return item.slot;
  if(item?.category && item.category !== 'bag' && inventoryCategories[item.category]) return item.category;
  const text = `${item?.name || ''} ${item?.icon || ''}`.toLowerCase();
  if(/armadura|casco|yelmo|cota|placa|cuero|toga|botas|guante|grebas|coraza|escudo/.test(text) || /[🛡🥋🪖]/.test(text)) return 'armor';
  if(/espada|sable|daga|hacha|maza|martillo|arco|ballesta|lanza|bast[oó]n|varita|arma|flecha/.test(text) || /[⚔🗡🪓🏹🔨🔱🪄]/.test(text)) return 'weapon';
  return 'bag';
}

function getInventoryItemSlot(item) {
  const slot = item?.slot || (item?.category && item.category !== 'bag' ? item.category : null) || inferInventoryCategory(item);
  return inventoryCategories[slot] ? slot : 'bag';
}

function getInventoryDisplayCategory(item) {
  const slot = getInventoryItemSlot(item);
  return item?.equipped && (slot === 'weapon' || slot === 'armor') ? slot : 'bag';
}

function getInventoryItemBadge(item) {
  const slot = getInventoryItemSlot(item);
  if(item?.equipped && slot === 'weapon') return 'Arma equipada';
  if(item?.equipped && slot === 'armor') return 'Armadura equipada';
  if(slot === 'weapon') return 'Arma en mochila';
  if(slot === 'armor') return 'Armadura en mochila';
  return 'Mochila';
}

function renderInventarioPage() {
  const c = getActiveChar();
  if(!c || (!isDM() && !canEditCharacter(c))) {
    document.getElementById('btnAddItem').style.display = 'none';
    document.getElementById('pgInventoryList').innerHTML = !isDM()
      ? '<div style="text-align:center;padding:40px 20px;color:var(--text-dim);font-style:italic;">Crea tu personaje para gestionar su inventario.</div>'
      : '';
    return;
  }
  const canEdit = canEditCharacter(c);
  const addItemBtn = document.getElementById('btnAddItem');
  if (addItemBtn) {
    addItemBtn.style.display = canEdit ? '' : 'none';
    addItemBtn.onclick = () => openAddItemModal(c.id);
  }
  if (!Array.isArray(c.inventory)) c.inventory = [];
  c.gold = Math.max(0, parseInt(c.gold) || 0);
  const ic = document.getElementById('invPortraitContent');
  if(ic) ic.innerHTML = c.portrait
    ? `<img src="${c.portrait}" class="inv-portrait-img">`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:10rem;font-weight:900;color:${c.color};opacity:0.2;font-family:var(--font-title);">${c.initials}</div>`;
  const nn = document.getElementById('invPortraitName'); if(nn) nn.textContent = c.name;
  const ns = document.getElementById('invPortraitSub');  if(ns) ns.textContent = `Nivel ${Math.max(1, parseInt(c.level) || 1)} · ${c.race} · ${c.class}`;
  const ca = document.getElementById('invCopperAmt');    if(ca) ca.textContent = c.copper;
  const sa = document.getElementById('invSilverAmt');    if(sa) sa.textContent = c.silver;
  const ga = document.getElementById('invGoldAmt');      if(ga) ga.textContent = c.gold;
  ['Copper','Silver','Gold'].forEach(kind => {
    const controls = document.getElementById(`inv${kind}Controls`);
    if(controls) controls.style.display = canEdit ? 'grid' : 'none';
  });
  const list = document.getElementById('pgInventoryList');
  if(!list) return;
  const grouped = { weapon:[], armor:[], bag:[] };
  let normalizedInventory = false;
  c.inventory.forEach((item, idx) => {
    const slot = getInventoryItemSlot(item);
    const category = getInventoryDisplayCategory(item);
    if(item.slot !== slot || item.category !== category) {
      item.slot = slot;
      item.category = category;
      normalizedInventory = true;
    }
    grouped[category].push({ item, idx, slot });
  });
  list.innerHTML = Object.entries(inventoryCategories).map(([categoryKey, category]) => {
    const entries = grouped[categoryKey];
    const body = entries.length ? entries.map(({item, idx, slot}) => `
      <div class="inv-item-card ${item.equipped?'equipped':''}">
        <div class="inv-item-icon">${item.icon||category.icon}</div>
        <div class="inv-item-info">
          <div class="inv-item-name">${escapeHTML(item.name)}</div>
          <div class="inv-item-qty">Cantidad: ${item.qty}</div>
        </div>
        <div class="inv-item-actions">
          <span class="inv-item-badge ${item.equipped?'badge-equipped':'badge-bag'}">${getInventoryItemBadge(item)}</span>
          ${canEdit && categoryKey === 'bag' && (slot === 'weapon' || slot === 'armor') ? `<button class="btn-secondary" style="padding:5px 9px;font-size:0.72rem;" onclick="equipInventoryItem(${c.id},${idx})">Equipar</button>` : ''}
          ${canEdit && categoryKey !== 'bag' ? `<button class="btn-secondary" style="padding:5px 9px;font-size:0.72rem;" onclick="storeInventoryItem(${c.id},${idx})">Guardar</button>` : ''}
          ${canEdit ? `<button class="btn-remove-item" onclick="removeItem(${c.id},${idx})" title="Eliminar">✕</button>` : ''}
        </div>
      </div>`).join('') : `<div class="inventory-empty-category">${category.empty}</div>`;
    return `
      <section class="inventory-category-section category-${categoryKey}">
        <div class="inventory-category-title"><span>${category.icon}</span>${category.label}</div>
        ${body}
      </section>`;
  }).join('');
  if(normalizedInventory) saveLS('crq_chars', characters);
}

function changeCharacterCurrency(currency, direction) {
  const c = getActiveChar();
  if(!canEditCharacter(c)) return;
  const currencyKey = ['copper','silver','gold'].includes(currency) ? currency : 'gold';
  const input = document.getElementById(`${currencyKey}ChangeAmount`);
  const amount = Math.max(1, parseInt(input?.value) || 1);
  c[currencyKey] = Math.max(0, (parseInt(c[currencyKey]) || 0) + (direction > 0 ? amount : -amount));
  saveChars();
  renderInventarioPage();
  renderQuickCombatPanel();
}
function changeCharacterGold(direction) {
  changeCharacterCurrency('gold', direction);
}

function removeItem(charId, idx) {
  const c = getEditableCombatantById(decodeURIComponent(String(charId)));
  if(!canEditCharacter(c)||!c.inventory) return;
  c.inventory.splice(idx,1);
  saveCombatantSheet(c);
  renderInventarioPage();
  renderEnemiesPage();
  renderQuickCombatPanel();
}
function toggleItemEquipped(charId, idx) {
  const c = getEditableCombatantById(decodeURIComponent(String(charId)));
  if(!canEditCharacter(c)||!c.inventory?.[idx]) return;
  if(c.inventory[idx].equipped) storeInventoryItem(charId, idx);
  else equipInventoryItem(charId, idx);
}

function equipInventoryItem(charId, idx) {
  const c = getEditableCombatantById(decodeURIComponent(String(charId)));
  if(!canEditCharacter(c)||!c.inventory?.[idx]) return;
  const item = c.inventory[idx];
  const slot = getInventoryItemSlot(item);
  if(slot !== 'weapon' && slot !== 'armor') return;
  item.slot = slot;
  item.category = slot;
  item.equipped = true;
  saveCombatantSheet(c);
  renderInventarioPage();
  renderEnemiesPage();
  renderQuickCombatPanel();
}

function storeInventoryItem(charId, idx) {
  const c = getEditableCombatantById(decodeURIComponent(String(charId)));
  if(!canEditCharacter(c)||!c.inventory?.[idx]) return;
  const item = c.inventory[idx];
  item.slot = getInventoryItemSlot(item);
  item.category = 'bag';
  item.equipped = false;
  saveCombatantSheet(c);
  renderInventarioPage();
  renderEnemiesPage();
  renderQuickCombatPanel();
}

// ===================================================
// HECHIZOS PAGE
// ===================================================
function renderHechizosPage() {
  const c = getActiveChar();
  if(!c || (!isDM() && !canEditCharacter(c))) {
    document.getElementById('btnAddSpell').style.display = 'none';
    document.getElementById('pgSpellList').innerHTML = !isDM()
      ? '<div class="no-spells-msg">Crea tu personaje para agregar sus hechizos.</div>'
      : '';
    return;
  }
  const canEdit = canEditCharacter(c);
  const addSpellBtn = document.getElementById('btnAddSpell');
  if (addSpellBtn) {
    addSpellBtn.style.display = canEdit ? '' : 'none';
    addSpellBtn.onclick = () => openAddSpellModal(c.id);
  }
  const sc = document.getElementById('spellPortraitContent');
  if(sc) sc.innerHTML = c.portrait
    ? `<img src="${c.portrait}" class="spell-portrait-img">`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:8rem;font-weight:900;color:${c.color};opacity:0.15;font-family:var(--font-title);">${c.initials}</div>`;
  const spn = document.getElementById('spellPortraitName'); if(spn) spn.textContent = c.name;
  const sps = document.getElementById('spellPortraitSub');  if(sps) sps.textContent = `Nivel ${Math.max(1, parseInt(c.level) || 1)} · ${c.race} · ${c.class}`;
  const sbo = document.getElementById('spellbookOwner');    if(sbo) sbo.textContent = `Conjuros de ${c.name}`;

  const slotEl = document.getElementById('spellSlotDisplay');
  if(slotEl) {
    slotEl.innerHTML = '';
    if(c.spells) {
      c.spells.slots.forEach((total,li) => {
        if(total===0) return;
        const used = c.spells.usedSlots[li];
        for(let i=0;i<total;i++) {
          const avail = i<(total-used)?'available':'used';
          slotEl.insertAdjacentHTML('beforeend',`<div class="slot-pip ${avail}" onclick="toggleSlot(${c.id},${li},${i},${total-used})" title="Nivel ${li+1}"></div>`);
        }
      });
    } else {
      slotEl.innerHTML = `<span style="color:rgba(168,85,247,0.4);font-size:0.82rem;font-style:italic;">Sin magia</span>`;
    }
  }

  const spellEl = document.getElementById('pgSpellList');
  if(!spellEl) return;
  if(!c.spells) {
    spellEl.innerHTML = `<div class="no-spells-msg">🗡️ Este personaje no practica la magia arcana.<br>Su fuerza reside en el acero y la voluntad.</div>`;
    return;
  }
  const byLevel = {};
  c.spells.prepared.forEach(sp => {
    if(!byLevel[sp.level]) byLevel[sp.level]=[];
    byLevel[sp.level].push(sp);
  });
  spellEl.innerHTML = '';
  Object.entries(byLevel).sort(([a],[b])=>a-b).forEach(([lvl,spells]) => {
    spellEl.insertAdjacentHTML('beforeend',`<div class="spellbook-section-title">Nivel ${lvl}</div>`);
    spells.forEach((sp,idx) => {
      const globalIdx = c.spells.prepared.indexOf(sp);
      spellEl.insertAdjacentHTML('beforeend',`
        <div class="spell-entry">
          <div class="spell-entry-left">
            <span class="spell-icon">${sp.icon||'✨'}</span>
            <div>
              <div class="spell-entry-name">${sp.name}</div>
              <span class="spell-level-badge">Nivel ${sp.level}</span>
              ${sp.damage ? `<span class="attack-damage-badge">Daño ${escapeHTML(sp.damage)}</span>` : ''}
            </div>
          </div>
          <div class="spell-entry-actions">
            <button class="cast-btn" onclick="castSpell('${c.name}','${sp.name}','${sp.icon||'✨'}','${sp.damage||''}')">⚡ Lanzar</button>
            ${canEdit ? `<button class="btn-remove-spell" onclick="removeSpell(${c.id},${globalIdx})" title="Eliminar">✕</button>` : ''}
          </div>
        </div>`);
    });
  });
}

function toggleSlot(charId,levelIndex,clickedIndex,availableCount) {
  const c = getEditableCombatantById(decodeURIComponent(String(charId)));
  if(!canEditCharacter(c)||!c.spells) return;
  if(clickedIndex<availableCount) c.spells.usedSlots[levelIndex]++;
  else c.spells.usedSlots[levelIndex]--;
  saveCombatantSheet(c);
  renderHechizosPage();
  renderEnemiesPage();
  renderQuickCombatPanel();
}
function formatDamageRoll(damage) {
  if(!damage) return '';
  const match = String(damage).trim().match(/(\d+)d(\d+)([+-]\d+)?/i);
  if(match) {
    const num = parseInt(match[1]);
    const sides = parseInt(match[2]);
    const bonus = parseInt(match[3] || 0);
    let total = bonus;
    const rolls = [];
    for(let i = 0; i < num; i++) {
      const r = Math.floor(Math.random() * sides) + 1;
      rolls.push(r);
      total += r;
    }
    return ` → <b style="color:#fbbf24;">${total} daño</b> <span style="color:rgba(255,255,255,0.4);font-size:0.78rem;">[${rolls.join('+')}${bonus ? (bonus>=0?'+':'')+bonus : ''}]</span>`;
  }
  return ` → <b style="color:#fbbf24;">${escapeHTML(damage)}</b>`;
}
function castSpell(charName, spellName, spellIcon, damage='') {
  const icon = spellIcon || '✨';
  const dmgRoll = formatDamageRoll(damage);
  const safeData = { charName:escapeHTML(charName), spellName:escapeHTML(spellName), spellIcon:escapeHTML(icon) };
  addChatMessage('player', safeData.charName, `Conjura: <b>${safeData.spellName}</b>${dmgRoll} 🎇`);
  SoundEngine.spell(icon);
  if (typeof multiplayer !== 'undefined' && multiplayer.isActive()) {
    multiplayer.broadcast({ type: 'spell_cast', charName, spellName, spellIcon:icon, spellDamage:damage, dmgRoll });
  }
}
function removeSpell(charId,idx) {
  const c = getEditableCombatantById(decodeURIComponent(String(charId)));
  if(!canEditCharacter(c)||!c.spells) return;
  c.spells.prepared.splice(idx,1);
  saveCombatantSheet(c);
  renderHechizosPage();
  renderEnemiesPage();
  renderQuickCombatPanel();
}

// ===================================================
// ATAQUE PAGE
// ===================================================

const attackStickers = {
  "Filos & Espadas": ["🗡️","⚔️","🔪","🪒","🪓"],
  "Hachas & Mazas": ["🪓","🔨","⛏️","🪵","🦴"],
  "Lanzas & Picas": ["🔱","🪝","🦯","📍","⚜️"],
  "Arcos & Proyectiles": ["🏹","🎯","🪃","🪶","💘"],
  "Escudos & Defensa": ["🛡️","🪖","🥋","🦺","⛨"],
  "Armas Mágicas": ["🪄","🔮","✨","⚡","💥","🌟","🔥","❄️","🌀","☄️","🌊","🌋","🌌"],
  "Combate Brutal": ["👊","💪","🦷","🩸","💀","☠️","👿","🤜","🦶","🐾"],
  "Armas Especiales": ["⛓️","🪤","🔫","🧨","🪝","⚙️","🧿","🪬"]
};

const attackSuggestions = {
  'espada': '🗡️', 'sable': '🗡️', 'florete': '🗡️', 'estoque': '🗡️', 'gladius': '🗡️', 'bastarda': '⚔️',
  'mandoble': '⚔️', 'espadón': '⚔️', 'claymore': '⚔️', 'katana': '🗡️', 'cimitarra': '🗡️',
  'hacha': '🪓', 'hachazo': '🪓', 'segur': '🪓', 'hachuela': '🪓',
  'maza': '🔨', 'mazo': '🔨', 'martillo': '🔨', 'garrote': '🔨', 'manopla': '🔨', 'flail': '⛓️',
  'cadena': '⛓️', 'flagelo': '⛓️',
  'lanza': '🔱', 'pica': '🔱', 'alabarda': '🔱', 'tridente': '🔱', 'partesana': '🔱',
  'arco': '🏹', 'flecha': '🏹', 'ballesta': '🎯', 'dardo': '🎯', 'virote': '🎯',
  'cuchillo': '🔪', 'daga': '🗡️', 'guadaña': '🪝', 'honda': '🎯', 'jabalina': '🔱',
  'escudo': '🛡️', 'rodela': '🛡️', 'broquel': '🛡️',
  'puño': '👊', 'patada': '🦶', 'golpe': '👊', 'puñetazo': '👊', 'codazo': '🤜', 'garra': '🐾', 'mordida': '🦷',
  'varita': '🪄', 'bastón': '🪄', 'báculo': '🪄',
  'fuego': '🔥', 'rayo': '⚡', 'hielo': '❄️', 'explosion': '💥', 'meteoro': '☄️',
  'muerte': '💀', 'veneno': '🩸', 'oscuridad': '☠️', 'pistola': '🔫', 'trampa': '🪤'
};

/* ---- Attack sound map ---- */
function playAttackSound(icon, type) {
  // Delegate to SoundEngine based on icon first, then type
  const weaponIcons = {
    '🗡️':'weapon','⚔️':'weapon','🪓':'weapon','🔨':'weapon','🔱':'weapon','🔪':'weapon','🪒':'weapon','🪝':'weapon',
    '🏹':'projectile','🎯':'projectile','🪃':'projectile','🪶':'projectile','💘':'projectile',
    '⛓️':'chain','👊':'unarmed','💪':'unarmed','🤜':'unarmed','🦶':'unarmed','🐾':'unarmed','🦷':'unarmed',
    '🛡️':'shield','⛨':'shield','🪄':'magic_weapon','🔮':'magic_weapon','🧿':'magic_weapon','🪬':'magic_weapon',
    '🔥':'spell_fire','⚡':'spell_lightning','❄️':'spell_ice',
    '💥':'spell_explosion','☄️':'spell_comet','🌀':'spell_wind',
    '💀':'spell_death','🩸':'spell_blood','☠️':'spell_death',
    '🌋':'spell_volcano','🌟':'spell_holy','🌊':'spell_water','🌌':'spell_void',
    '🔫':'spell_explosion','🧨':'spell_explosion',
  };
  const cat = weaponIcons[icon];
  if (!cat) { SoundEngine.item(icon); return; }
  if (cat.startsWith('spell_')) {
    const spellIcon = {
      spell_fire:'🔥', spell_lightning:'⚡', spell_ice:'❄️',
      spell_explosion:'💥', spell_comet:'☄️', spell_wind:'🌀',
      spell_death:'💀', spell_blood:'🩸', spell_volcano:'🌋', spell_holy:'🌟',
      spell_water:'🌊', spell_void:'🌌'
    }[cat];
    SoundEngine.spell(spellIcon || '✨');
  } else if (cat === 'projectile') {
    SoundEngine.item('🏹');
  } else if (cat === 'chain') {
    SoundEngine.item('⛓️');
  } else if (cat === 'shield') {
    SoundEngine.item('🛡️');
  } else if (cat === 'magic_weapon') {
    SoundEngine.item('🪄');
  } else if (cat === 'unarmed') {
    SoundEngine.item('👊');
  } else {
    SoundEngine.item(icon);
  }
}

function renderAttackStickers() {
  const container = document.getElementById('attackStickerPicker');
  if(!container) return;
  container.innerHTML = '';
  Object.entries(attackStickers).forEach(([cat, list]) => {
    container.insertAdjacentHTML('beforeend', `<div class="sticker-category-title">${cat}</div>`);
    list.forEach(emoji => {
      const btn = document.createElement('button');
      btn.className = 'sticker-btn';
      btn.textContent = emoji;
      btn.onclick = () => {
        document.getElementById('newAttackIcon').value = emoji;
        container.querySelectorAll('.sticker-btn').forEach(b => b.classList.remove('highlighted'));
        btn.classList.add('highlighted');
        playAttackSound(emoji, document.getElementById('newAttackType').value);
      };
      container.appendChild(btn);
    });
  });
}

function suggestAttackSticker() {
  const raw = (document.getElementById('newAttackName').value || '').toLowerCase();
  const picker = document.getElementById('attackStickerPicker');
  if (!picker) return;
  let matched = null;
  for (const [kw, emoji] of Object.entries(attackSuggestions)) {
    if (raw.includes(kw)) { matched = emoji; break; }
  }
  if (matched) {
    document.getElementById('newAttackIcon').value = matched;
    picker.querySelectorAll('.sticker-btn').forEach(b => {
      b.classList.toggle('highlighted', b.textContent === matched);
    });
  }
}

function renderAtaquePage() {
  const c = getActiveChar();
  if (!c || (!isDM() && !canEditCharacter(c))) {
    document.getElementById('btnAddAttack').style.display = 'none';
    document.getElementById('pgAttackList').innerHTML = !isDM()
      ? '<div class="no-attacks-msg">Crea tu personaje para agregar sus ataques.</div>'
      : '';
    return;
  }

  // Portrait
  const pc = document.getElementById('ataquePortraitContent');
  if (pc) pc.innerHTML = c.portrait
    ? `<img src="${c.portrait}" class="ataque-portrait-img">`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:8rem;font-weight:900;color:${c.color};opacity:0.13;font-family:var(--font-title);">${c.initials}</div>`;

  const pn = document.getElementById('ataquePortraitName'); if(pn) pn.textContent = c.name;
  const ps = document.getElementById('ataquePortraitSub');  if(ps) ps.textContent = `Nivel ${Math.max(1, parseInt(c.level) || 1)} · ${c.race} · ${c.class}`;
  const ao = document.getElementById('arsenalOwner');        if(ao) ao.textContent = `Arsenal de ${c.name}`;

  // Stat pills (STR, DEX, INIT)
  const sr = document.getElementById('ataqueStatRow');
  if (sr) {
    const str = c.attributes?.str || 10;
    const dex = c.attributes?.dex || 10;
    const init = c.initiative || 0;
    const strMod = Math.floor((str-10)/2);
    const dexMod = Math.floor((dex-10)/2);
    sr.innerHTML = `
      <div class="ataque-stat-pill">FUE ${str} (${strMod>=0?'+':''}${strMod})</div>
      <div class="ataque-stat-pill">DES ${dex} (${dexMod>=0?'+':''}${dexMod})</div>
      <div class="ataque-stat-pill">INIC ${init>=0?'+':''}${init}</div>
    `;
  }

  // Mostrar botón de añadir al DM o al dueño del personaje
  const canEdit = canEditCharacter(c);
  const addBtn = document.getElementById('btnAddAttack');
  if (addBtn) {
    addBtn.style.display = canEdit ? 'flex' : 'none';
    addBtn.onclick = () => openAddAttackModal(c.id);
  }

  // Render attacks list
  const listEl = document.getElementById('pgAttackList');
  if (!listEl) return;

  if (!c.attacks || c.attacks.length === 0) {
    listEl.innerHTML = `<div class="no-attacks-msg">⚔️ Sin ataques en el arsenal.<br><span style="font-size:0.82rem;">${canEdit ? 'Puedes añadir el primer ataque de este personaje.' : 'El dueño del personaje o el DM pueden añadir ataques.'}</span></div>`;
    return;
  }

  // Group by type
  const byType = {};
  c.attacks.forEach(atk => {
    if (!byType[atk.type]) byType[atk.type] = [];
    byType[atk.type].push(atk);
  });

  listEl.innerHTML = '';
  Object.entries(byType).forEach(([type, attacks]) => {
    listEl.insertAdjacentHTML('beforeend', `<div class="arsenal-section-title">${type}</div>`);
    attacks.forEach((atk, idx) => {
      const globalIdx = c.attacks.indexOf(atk);
      listEl.insertAdjacentHTML('beforeend', `
        <div class="attack-entry">
          <div class="attack-entry-left">
            <span class="attack-icon">${atk.icon || '⚔️'}</span>
            <div>
              <div class="attack-entry-name">${atk.name}</div>
              <span class="attack-type-badge">${atk.type}</span>
              ${atk.damage ? `<span class="attack-damage-badge">⚄ ${atk.damage}</span>` : ''}
            </div>
          </div>
          <div class="attack-entry-actions">
            <button class="attack-btn" onclick="executeAttack('${c.name}','${atk.name}','${atk.icon||'⚔️'}','${atk.damage||''}')">⚔️ Atacar</button>
            ${canEdit ? `<button class="btn-remove-attack" onclick="removeAttack(${c.id},${globalIdx})" title="Eliminar">✕</button>` : ''}
          </div>
        </div>`);
    });
  });
}

function executeAttack(charName, weaponName, icon, damage) {
  const dmgRoll = formatDamageRoll(damage);
  const safeData = { charName:escapeHTML(charName), weaponName:escapeHTML(weaponName), icon:escapeHTML(icon), dmgRoll };
  const chatText = `Ataca con <b>${safeData.icon} ${safeData.weaponName}</b>${safeData.dmgRoll} ⚔️`;
  addChatMessage('player', safeData.charName, chatText);
  playAttackSound(icon, '');
  if (typeof multiplayer !== 'undefined' && multiplayer.isActive()) {
    multiplayer.broadcast({ type: 'attack_action', charName, weaponName, icon, dmgRoll });
  }
}

function openAddAttackModal(charId = state.activeCharId) {
  const c = getEditableCombatantById(charId) || getActiveChar();
  if(!canEditCharacter(c)) return;
  document.getElementById('newAttackName').value = '';
  document.getElementById('newAttackIcon').value = '⚔️';
  document.getElementById('newAttackDamage').value = '';
  document.getElementById('newAttackType').value = 'Espada';
  const modal = document.getElementById('addAttackModalOverlay');
  modal.dataset.charId = c?.id || '';
  modal.classList.add('active');
  renderAttackStickers();
}

function saveAttackToDM() {
  const c = getModalCharacter('addAttackModalOverlay');
  if (!canEditCharacter(c)) return;
  ensureCombatLoadout(c);
  const name   = document.getElementById('newAttackName').value.trim() || 'Arma';
  const icon   = document.getElementById('newAttackIcon').value.trim() || '⚔️';
  const type   = document.getElementById('newAttackType').value || 'Espada';
  const damage = document.getElementById('newAttackDamage').value.trim();
  if (!c.attacks) c.attacks = [];
  c.attacks.push({ name, icon, type, damage });
  playAttackSound(icon, type);
  saveCombatantSheet(c);
  closeModals();
  renderAtaquePage();
  renderEnemiesPage();
  renderQuickCombatPanel();
}

function removeAttack(charId, idx) {
  const c = getEditableCombatantById(decodeURIComponent(String(charId)));
  if (!canEditCharacter(c) || !c.attacks) return;
  c.attacks.splice(idx, 1);
  saveCombatantSheet(c);
  renderAtaquePage();
  renderEnemiesPage();
  renderQuickCombatPanel();
}

// ===================================================
// DM ITEM / SPELL MANAGEMENT
// ===================================================
// ===================================================
// SOUND ENGINE (Web Audio API – no external files)
// ===================================================
const SoundEngine = (() => {
  let ctx = null;
  let masterGain = null;
  let masterVolume = Math.max(0,Math.min(1,Number(loadLS('crq_master_volume',0.7))||0));
  let weatherBus = null;
  let musicBus = null;
  let weatherVolume = Math.max(0,Math.min(1,Number(loadLS('crq_weather_volume',0.7))||0));
  let musicVolume = Math.max(0,Math.min(1,Number(loadLS('crq_music_volume',0.7))||0));
  let weatherNode = null; // currently playing weather loop
  let weatherGain = null;
  let weatherNodes = [];
  let weatherTimers = [];
  let weatherGeneration = 0;
  let musicTimer = null;
  let musicStep = 0;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    if(!masterGain) {
      masterGain=ctx.createGain();
      masterGain.gain.value=masterVolume;
      masterGain.connect(ctx.destination);
    }
    return ctx;
  }
  function getOutput() { getCtx(); return masterGain; }
  function getWeatherOutput() {
    const c=getCtx();
    if(!weatherBus) {
      weatherBus=c.createGain();
      weatherBus.gain.value=weatherVolume;
      weatherBus.connect(masterGain);
    }
    return weatherBus;
  }
  function getMusicOutput() {
    const c=getCtx();
    if(!musicBus) {
      musicBus=c.createGain();
      musicBus.gain.value=musicVolume;
      musicBus.connect(masterGain);
    }
    return musicBus;
  }
  function setVolume(value) {
    masterVolume=Math.max(0,Math.min(1,Number(value)||0));
    saveLS('crq_master_volume',masterVolume);
    if(masterGain) masterGain.gain.setTargetAtTime(masterVolume,getCtx().currentTime,0.03);
    return masterVolume;
  }
  function getVolume() { return masterVolume; }
  function setWeatherVolume(value) {
    weatherVolume=Math.max(0,Math.min(1,Number(value)||0));
    saveLS('crq_weather_volume',weatherVolume);
    if(weatherBus) weatherBus.gain.setTargetAtTime(weatherVolume,getCtx().currentTime,0.03);
    return weatherVolume;
  }
  function getWeatherVolume() { return weatherVolume; }
  function setMusicVolume(value) {
    musicVolume=Math.max(0,Math.min(1,Number(value)||0));
    saveLS('crq_music_volume',musicVolume);
    if(musicBus) musicBus.gain.setTargetAtTime(musicVolume,getCtx().currentTime,0.03);
    return musicVolume;
  }
  function getMusicVolume() { return musicVolume; }

  /* ================================================================
     HELPERS — Web Audio building blocks
     ================================================================ */

  /** White-noise buffer source routed through a biquad filter */
  function noise(duration, freq, Q, type='bandpass') {
    const c = getCtx();
    const buf = c.createBuffer(1, c.sampleRate * duration, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filt = c.createBiquadFilter();
    filt.type = type;
    filt.frequency.value = freq;
    filt.Q.value = Q;
    src.connect(filt);
    return { src, filt };
  }

  /** Simple oscillator node */
  function osc(freq, type='sine') {
    const c = getCtx();
    const o = c.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    return o;
  }

  /** Play a single oscillator tone with linear gain ramp */
  function playTone(freq, type, startVol, endVol, duration, startTime, trackWeather=false, output=null) {
    const c = getCtx();
    const o = osc(freq, type);
    const g = c.createGain();
    g.gain.setValueAtTime(startVol, startTime);
    g.gain.linearRampToValueAtTime(endVol, startTime + duration);
    o.connect(g);
    g.connect(output || (trackWeather ? getWeatherOutput() : getOutput()));
    if(trackWeather) weatherNodes.push(o,g);
    o.start(startTime);
    o.stop(startTime + duration + 0.01);
  }

  /** Filtered noise burst with attack / release */
  function playNoiseBurst(freq, Q, vol, duration, attack=0.01, release=0.1, output=null) {
    const c = getCtx();
    const now = c.currentTime;
    const { src, filt } = noise(0.5, freq, Q);
    const g = c.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(vol, now + attack);
    g.gain.linearRampToValueAtTime(0, now + duration);
    filt.connect(g);
    g.connect(output || getOutput());
    src.start(now);
    src.stop(now + duration + 0.1);
  }

  /* ---------------------------------------------------------------
     ADVANCED HELPERS — D&D-grade synthesis
     --------------------------------------------------------------- */

  /**
   * Lightweight all-pass reverb simulation.
   * Creates an impulse-response convolver with decaying random samples.
   * Returns a ConvolverNode already connected to destination.
   */
  function makeReverb(decaySec = 1.2, wetGain = 0.28) {
    const c = getCtx();
    const sr = c.sampleRate;
    const len = Math.floor(sr * decaySec);
    const ir = c.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
      }
    }
    const conv = c.createConvolver();
    conv.buffer = ir;
    const wet = c.createGain();
    wet.gain.value = wetGain;
    conv.connect(wet);
    wet.connect(getOutput());
    return conv; // send audio into conv to get reverb
  }

  /**
   * FM (Frequency-Modulation) tone — produces rich harmonic content.
   * carrier + modulator pattern used in classic synth spell sounds.
   */
  function playFM(carrierFreq, modRatio, modIndex, vol, duration, startTime, type='sine') {
    const c = getCtx();
    const modFreq = carrierFreq * modRatio;
    const modGain = modFreq * modIndex;

    const mod = c.createOscillator();
    mod.type = type;
    mod.frequency.value = modFreq;

    const modEnv = c.createGain();
    modEnv.gain.setValueAtTime(modGain, startTime);
    modEnv.gain.exponentialRampToValueAtTime(modGain * 0.1 + 0.001, startTime + duration);

    const carrier = c.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.value = carrierFreq;

    const ampEnv = c.createGain();
    ampEnv.gain.setValueAtTime(0.001, startTime);
    ampEnv.gain.linearRampToValueAtTime(vol, startTime + 0.02);
    ampEnv.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    mod.connect(modEnv);
    modEnv.connect(carrier.frequency);
    carrier.connect(ampEnv);
    ampEnv.connect(getOutput());

    mod.start(startTime);
    mod.stop(startTime + duration + 0.05);
    carrier.start(startTime);
    carrier.stop(startTime + duration + 0.05);
  }

  /**
   * Waveshaper distortion — makes metal/impact sounds gritty and punchy.
   * amount 0-400: higher = more harmonic saturation.
   */
  function makeDistortion(amount = 200) {
    const c = getCtx();
    const ws = c.createWaveShaper();
    const n = 256, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = i * 2 / n - 1;
      curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
    }
    ws.curve = curve;
    ws.oversample = '4x';
    return ws;
  }

  /**
   * Play a noise burst through a chain: noise → filter → distortion → gain → reverb + direct
   * For impactful weapon/attack sounds.
   */
  function playImpact(freq, Q, vol, duration, attack, reverbDecay=0.8, reverbWet=0.22, distAmt=0) {
    const c = getCtx();
    const now = c.currentTime;
    const { src, filt } = noise(Math.max(duration + 0.2, 0.7), freq, Q);

    const g = c.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(vol, now + attack);
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);

    let chain = filt;
    if (distAmt > 0) {
      const dist = makeDistortion(distAmt);
      filt.connect(dist);
      chain = dist;
    }
    chain.connect(g);
    g.connect(getOutput());

    // send to reverb
    const rev = makeReverb(reverbDecay, reverbWet);
    g.connect(rev);

    src.start(now);
    src.stop(now + duration + 0.3);
  }

  /**
   * Metallic clang — layered oscillators + noise for sword/armour impact.
   * Uses inharmonic partials common in real metal percussion.
   */
  function playMetalClang(baseFreq, vol, duration) {
    const c = getCtx();
    const now = c.currentTime;
    // Inharmonic partials (ratios of a bell/metal struck object)
    const partials = [1, 2.756, 5.404, 8.933, 13.34];
    const gains    = [1.0, 0.55, 0.30, 0.18, 0.10];
    const rev = makeReverb(0.6, 0.18);
    partials.forEach((ratio, idx) => {
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.value = baseFreq * ratio;
      const g = c.createGain();
      const pk = vol * gains[idx];
      g.gain.setValueAtTime(pk, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + duration * (1 - idx * 0.15));
      o.connect(g);
      g.connect(getOutput());
      g.connect(rev);
      o.start(now);
      o.stop(now + duration + 0.1);
    });
    // short transient noise for the "strike" click
    playNoiseBurst(3000, 6, vol * 0.6, 0.05, 0.001, 0.04);
  }

  /**
   * Pitch-sweep noise — used for whooshes, fire, arcane surges.
   * freq slides from startFreq to endFreq over sweepTime.
   */
  function playSweepNoise(startFreq, endFreq, Q, vol, duration, attack=0.04) {
    const c = getCtx();
    const now = c.currentTime;
    const bufLen = Math.max(duration + 0.3, 1.0);
    const buf = c.createBuffer(1, c.sampleRate * bufLen, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;

    const filt = c.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.setValueAtTime(startFreq, now);
    filt.frequency.exponentialRampToValueAtTime(endFreq + 1, now + duration);
    filt.Q.value = Q;

    const g = c.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(vol, now + attack);
    g.gain.linearRampToValueAtTime(0, now + duration);

    src.connect(filt);
    filt.connect(g);
    g.connect(getOutput());

    const rev = makeReverb(1.0, 0.20);
    g.connect(rev);

    src.start(now);
    src.stop(now + duration + 0.3);
  }

  /**
   * Rich chord — multiple detuned oscillators creating a full harmonic sound.
   * Used for holy/arcane / healing resonances.
   */
  function playChord(freqs, type, vol, attack, sustain, release, startDelay=0) {
    const c = getCtx();
    const now = c.currentTime + startDelay;
    const rev = makeReverb(1.8, 0.32);
    freqs.forEach(f => {
      // slight detune for chorus-like richness
      [-4, 0, 4].forEach(detune => {
        const o = c.createOscillator();
        o.type = type;
        o.frequency.value = f;
        o.detune.value = detune;
        const g = c.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(vol / freqs.length / 3, now + attack);
        g.gain.setValueAtTime(vol / freqs.length / 3, now + attack + sustain);
        g.gain.exponentialRampToValueAtTime(0.001, now + attack + sustain + release);
        o.connect(g);
        g.connect(getOutput());
        g.connect(rev);
        o.start(now);
        o.stop(now + attack + sustain + release + 0.1);
      });
    });
  }

  /* ---- STOP WEATHER ---- */
  function stopWeather() {
    weatherGeneration++;
    weatherTimers.forEach(timer=>clearTimeout(timer));
    weatherTimers = [];
    weatherNodes.forEach(node=>{
      try { node.stop?.(); } catch(e){}
      try { node.disconnect?.(); } catch(e){}
    });
    weatherNodes = [];
    weatherNode = null;
    weatherGain = null;
  }

  function scheduleWeather(callback, delayMs) {
    const generation=weatherGeneration;
    const timer=setTimeout(()=>{
      if(generation===weatherGeneration) callback();
    },delayMs);
    weatherTimers.push(timer);
  }

  /* ---- START LAYERED WEATHER LOOP ---- */
  function startWeatherLoop(noiseFq, Q, vol, filterType='bandpass', modulationRate=0.12, modulationDepth=0.28) {
    const c = getCtx();
    const { src, filt } = noise(2, noiseFq, Q, filterType);
    const g = c.createGain();
    const now = c.currentTime;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(vol, now + 1.5);
    if(modulationRate>0 && modulationDepth>0) {
      const lfo=c.createOscillator();
      const lfoGain=c.createGain();
      lfo.frequency.value=modulationRate;
      lfoGain.gain.value=vol*modulationDepth;
      lfo.connect(lfoGain);
      lfoGain.connect(g.gain);
      lfo.start(now);
      weatherNodes.push(lfo,lfoGain);
    }
    filt.connect(g);
    g.connect(getWeatherOutput());
    src.start(now);
    weatherNodes.push(src,filt,g);
    weatherNode = src;
    weatherGain = g;
  }

  /* ---- THUNDER ---- */
  function triggerThunder() {
    const c = getCtx();
    const now = c.currentTime;
    // low rumble
    playNoiseBurst(80, 0.5, 0.6, 1.8, 0.02, 1.8, getWeatherOutput());
    // crack
    playNoiseBurst(400, 4, 0.9, 0.18, 0.001, 0.15, getWeatherOutput());
  }

  /* ---- CRICKETS (night) ---- */
  function playCrickets() {
    const c = getCtx();
    const now = c.currentTime;
    [4200, 4400, 4600].forEach((f, i) => {
      for (let rep = 0; rep < 6; rep++) {
        const t = now + i * 0.04 + rep * 0.28;
        playTone(f, 'sine', 0, 0.08, 0.04, t, true);
        playTone(f, 'sine', 0.08, 0, 0.04, t + 0.04, true);
      }
    });
  }

  /* ---- FIRE CRACKLE ---- */
  function startFireCrackle(vol=0.3) {
    const c = getCtx();
    startWeatherLoop(800, 30, vol, 'lowpass');
    // occasional pops
    const pop = () => {
      if (!weatherNode) return;
      playNoiseBurst(1200 + Math.random()*800, 20, 0.25, 0.06 + Math.random()*0.1, 0.001, 0.08, getWeatherOutput());
      scheduleWeather(pop, 150 + Math.random() * 500);
    };
    scheduleWeather(pop, 300);
  }

  /* ===== PUBLIC API ===== */

  /* WEATHER */
  function weather(w) {
    stopWeather();
    if(w==='none') return;
    const c = getCtx();
    switch(w) {
      case 'spring': /* breeze, foliage and distant birds */
        startWeatherLoop(190, 0.45, 0.055, 'lowpass', 0.08, 0.38);
        startWeatherLoop(1800, 0.7, 0.018, 'highpass', 0.17, 0.34);
        [0.5, 1.8, 3.4].forEach((t, i) => {
          const base=2050+i*170+Math.random()*120;
          playTone(base,'sine',0,0.035,0.09,c.currentTime+t,true);
          playTone(base+280,'sine',0.035,0,0.12,c.currentTime+t+0.08,true);
        });
        break;

      case 'summer': /* dry air and subtle insects */
        startWeatherLoop(230, 0.5, 0.04, 'lowpass', 0.07, 0.32);
        startWeatherLoop(5200, 1.4, 0.022, 'bandpass', 0.9, 0.7);
        break;

      case 'autumn': /* layered wind and dry leaves */
        startWeatherLoop(260, 0.55, 0.16, 'bandpass', 0.11, 0.5);
        startWeatherLoop(1700, 1.3, 0.04, 'highpass', 0.24, 0.65);
        [0.2, 0.9, 1.55, 2.35].forEach(t => {
          scheduleWeather(() => playNoiseBurst(1600 + Math.random() * 1200, 5, 0.1, 0.16, 0.01, 0.14, getWeatherOutput()), t * 1000);
        });
        break;

      case 'winter': /* cold continuous wind */
        startWeatherLoop(210, 0.42, 0.2, 'bandpass', 0.07, 0.58);
        startWeatherLoop(900, 0.8, 0.025, 'highpass', 0.16, 0.5);
        break;

      case 'clear':    /* light rural breeze and sparse birds */
        startWeatherLoop(175, 0.45, 0.04, 'lowpass', 0.08, 0.4);
        startWeatherLoop(1600, 0.8, 0.012, 'highpass', 0.18, 0.35);
        [0.8, 2.6, 4.4].forEach(t => {
          const base=2250+Math.random()*330;
          playTone(base,'sine',0,0.035,0.08,c.currentTime+t,true);
          playTone(base+330,'sine',0.035,0,0.11,c.currentTime+t+0.07,true);
        });
        break;

      case 'drizzle': /* soft rain */
        startWeatherLoop(4800, 1.1, 0.1, 'highpass', 0.14, 0.22);
        startWeatherLoop(900, 0.7, 0.035, 'lowpass', 0.09, 0.28);
        break;

      case 'rain':   /* moderate rain */
        startWeatherLoop(4300, 1.0, 0.2, 'highpass', 0.13, 0.24);
        startWeatherLoop(720, 0.65, 0.09, 'lowpass', 0.08, 0.35);
        break;

      case 'heavyrain': /* heavy rain */
        startWeatherLoop(3900, 0.9, 0.3, 'highpass', 0.16, 0.3);
        startWeatherLoop(560, 0.55, 0.18, 'lowpass', 0.07, 0.4);
        break;

      case 'storm': case 'thunderstorm': /* storm + thunder */
        startWeatherLoop(3600, 0.9, 0.34, 'highpass', 0.18, 0.34);
        startWeatherLoop(260, 0.42, 0.28, 'lowpass', 0.065, 0.58);
        [1.8, 5.6, 10.5, 16].forEach(t => scheduleWeather(triggerThunder, t * 1000));
        break;

      case 'blizzard': /* roaring wind + snow */
        startWeatherLoop(240, 0.42, 0.36, 'bandpass', 0.09, 0.7);
        startWeatherLoop(1700, 0.65, 0.1, 'highpass', 0.22, 0.55);
        break;

      case 'snow':   /* light snowy wind */
        startWeatherLoop(260, 0.5, 0.1, 'bandpass', 0.08, 0.45);
        startWeatherLoop(1400, 0.8, 0.018, 'highpass', 0.16, 0.4);
        break;

      case 'wind': case 'wind_storm': /* strong wind */
        startWeatherLoop(285, 0.5, 0.32, 'bandpass', 0.075, 0.72);
        startWeatherLoop(950, 0.7, 0.07, 'highpass', 0.16, 0.55);
        break;

      case 'night':  /* nocturnal field ambience */
        startWeatherLoop(180, 0.35, 0.035, 'lowpass', 0.07, 0.32);
        startWeatherLoop(4700, 1.5, 0.018, 'bandpass', 0.85, 0.8);
        playCrickets();
        break;

      case 'fog':    /* damp distant wind */
        startWeatherLoop(145, 0.45, 0.11, 'lowpass', 0.055, 0.58);
        startWeatherLoop(780, 0.8, 0.025, 'bandpass', 0.12, 0.42);
        break;

      case 'blaze': case 'blazing': case 'fire': /* fire crackle */
        startFireCrackle(0.28);
        break;

      case 'magic': case 'magical': /* ethereal shimmer */
        startWeatherLoop(760, 1.6, 0.06, 'bandpass', 0.14, 0.5);
        [300, 500, 700, 900, 1100].forEach((f, i) => {
          playTone(f, 'sine', 0, 0.045, 0.5, c.currentTime + i * 0.2, true);
          playTone(f, 'sine', 0.045, 0, 0.5, c.currentTime + i * 0.2 + 0.5, true);
        });
        break;

      case 'none': default:
        break; // silence
    }
  }

  /* ================================================================
     SPELL SOUNDS — D&D Fantasy Medieval (keyed by emoji icon)
     Each sound uses the advanced helpers for FM synthesis, reverb,
     sweep noise, and chords to create a rich, cinematic feel.
     ================================================================ */
  const spellSounds = {

    /* ---- FIRE ---- */
    '🔥': () => {
      // Dramatic fire surge: low rumble + roaring sweep + crackling pops
      const c=getCtx(), now=c.currentTime;
      // Deep ignition boom
      playImpact(80, 0.6, 0.9, 0.4, 0.005, 1.2, 0.30, 120);
      // Fire whoosh sweeping up
      playSweepNoise(200, 2800, 4, 0.7, 0.9, 0.02);
      // High crackle layer
      [0.15,0.28,0.40,0.55].forEach(t =>
        setTimeout(() => playNoiseBurst(3500, 18, 0.4, 0.06, 0.001, 0.05), t*1000)
      );
      // FM "flame roar" tone
      playFM(55, 3.5, 8, 0.35, 0.8, now+0.05, 'sawtooth');
    },

    /* ---- LIGHTNING ---- */
    '⚡': () => {
      // Instant crack + sizzle tail + low thunder
      const c=getCtx(), now=c.currentTime;
      // Ultra-fast crack transient
      playImpact(1200, 40, 1.0, 0.06, 0.001, 0.5, 0.25, 350);
      // Sizzle tail
      playSweepNoise(8000, 800, 6, 0.55, 0.5, 0.005);
      // Low thunder sub-bass roll
      playImpact(55, 0.4, 0.6, 0.9, 0.03, 1.5, 0.35, 0);
      // FM electric buzz
      playFM(180, 7, 10, 0.4, 0.18, now, 'square');
      // High-frequency zap arcing
      playTone(4000,'sawtooth',0.5,0,0.06,now);
      playTone(3200,'sawtooth',0.4,0,0.05,now+0.06);
    },

    /* ---- ICE / FROST ---- */
    '❄️': () => {
      const c=getCtx(), now=c.currentTime;
      // Crystalline shatter transient
      playImpact(6000, 12, 0.6, 0.15, 0.001, 0.7, 0.22, 0);
      // Cold whoosh sweeping down
      playSweepNoise(3500, 400, 5, 0.5, 0.8, 0.04);
      // Icy bell-like FM tones
      [0, 0.12, 0.25, 0.40].forEach((t, i) => {
        playFM(1400 + i*300, 2.0, 3, 0.22, 0.35, now+t);
      });
      // High shimmer sparkle
      [3000,3800,4600].forEach((f,i) => {
        playTone(f,'sine',0,0.14,0.1,now+0.1+i*0.07);
        playTone(f,'sine',0.14,0,0.18,now+0.2+i*0.07);
      });
    },

    /* ---- WIND / ARCANE VORTEX ---- */
    '🌀': () => {
      const c=getCtx(), now=c.currentTime;
      // Spinning whoosh up then down
      playSweepNoise(200, 1800, 2, 0.6, 0.6, 0.05);
      playSweepNoise(1800, 200, 2, 0.4, 0.55, 0.65);
      // Arcane harmonic pulse
      playFM(220, 1.5, 5, 0.28, 1.0, now+0.1);
      // Gust pops
      [0.3,0.6,0.9].forEach(t =>
        setTimeout(() => playNoiseBurst(600+Math.random()*400, 3, 0.3, 0.12, 0.01, 0.1), t*1000)
      );
    },

    /* ---- METEOR / COMET ---- */
    '☄️': () => {
      const c=getCtx(), now=c.currentTime;
      // Incoming shriek (high sweep down)
      playSweepNoise(4000, 120, 8, 0.65, 0.6, 0.02);
      // BOOM on impact
      setTimeout(() => {
        playImpact(55, 0.4, 1.0, 0.8, 0.001, 2.0, 0.40, 200);
        playImpact(200, 2, 0.7, 0.5, 0.002, 1.5, 0.30, 0);
        // Shockwave high-freq
        playNoiseBurst(8000, 5, 0.5, 0.3, 0.001, 0.25);
      }, 550);
    },

    /* ---- EXPLOSION ---- */
    '💥': () => {
      const c=getCtx(), now=c.currentTime;
      // Huge sub-bass concussion
      playImpact(40, 0.3, 1.0, 1.2, 0.001, 2.5, 0.45, 300);
      // Mid crunch
      playImpact(300, 4, 0.85, 0.7, 0.002, 1.8, 0.35, 0);
      // High-freq debris hiss
      playSweepNoise(6000, 1500, 6, 0.5, 0.6, 0.01);
      // Sub boom oscillator
      playFM(38, 2, 15, 0.6, 0.9, now, 'sawtooth');
    },

    /* ---- WATER / TIDAL SURGE ---- */
    '🌊': () => {
      const c=getCtx(), now=c.currentTime;
      // Deep underwater surge
      playSweepNoise(80, 600, 2, 0.65, 1.1, 0.08);
      playSweepNoise(600, 80, 2, 0.45, 0.9, 1.2);
      // Bubbling mid
      [0.3,0.55,0.85].forEach(t =>
        setTimeout(() => playNoiseBurst(900, 8, 0.35, 0.12, 0.01, 0.1), t*1000)
      );
      // Low hum of water mass
      playFM(65, 0.5, 3, 0.3, 1.8, now);
    },

    /* ---- VOLCANO / EARTH ---- */
    '🌋': () => {
      const c=getCtx(), now=c.currentTime;
      // Seismic sub-bass
      playImpact(35, 0.3, 1.0, 1.5, 0.01, 3.0, 0.50, 400);
      // Stone crack
      playImpact(180, 3, 0.8, 0.6, 0.001, 1.2, 0.28, 150);
      // Lava hiss
      playSweepNoise(800, 200, 3, 0.45, 0.8, 0.1);
      // Rumble tone
      playFM(45, 1.2, 6, 0.4, 1.2, now, 'sawtooth');
    },

    /* ---- NATURE / DRUID ---- */
    '🍃': () => {
      const c=getCtx(), now=c.currentTime;
      // Rustling leaves sweep
      playSweepNoise(1200, 3000, 4, 0.4, 0.7, 0.06);
      playSweepNoise(3000, 800, 4, 0.3, 0.5, 0.75);
      // Nature chord (Fm pentatonic-ish)
      playChord([174, 220, 261, 349], 'sine', 0.9, 0.08, 0.4, 0.6, 0.1);
      // Chirp accent
      playFM(1800, 2, 1.5, 0.18, 0.12, now+0.2);
    },

    /* ---- RADIANT / HOLY ---- */
    '☀️': () => {
      const c=getCtx(), now=c.currentTime;
      // Heavenly choir-like chord swell
      playChord([523, 659, 784, 1047, 1319], 'sine', 1.4, 0.1, 0.5, 0.9, 0.0);
      // Bright shimmer
      [1400,1800,2200,2600].forEach((f,i) => {
        playFM(f, 1.5, 0.8, 0.18, 0.3, now+i*0.08);
      });
      // Radiant burst noise
      playNoiseBurst(8000, 4, 0.35, 0.45, 0.01, 0.4);
    },

    /* ---- MOON / SHADOW ---- */
    '🌙': () => {
      const c=getCtx(), now=c.currentTime;
      // Deep ethereal drone with reverb
      playChord([110, 138, 165], 'sine', 1.2, 0.15, 1.0, 1.5, 0.0);
      // Whispering harmonic sweep
      playSweepNoise(1500, 300, 1.5, 0.3, 1.4, 0.2);
      // Bell accent
      playFM(660, 2.0, 2.5, 0.22, 0.6, now+0.3);
    },

    /* ---- FOG / MIST ---- */
    '🌫️': () => {
      const c=getCtx(), now=c.currentTime;
      // Eerie low whisper
      playSweepNoise(150, 600, 0.8, 0.4, 1.5, 0.15);
      playSweepNoise(600, 150, 0.8, 0.3, 1.2, 1.5);
      // Ghostly tone
      playFM(220, 0.75, 2, 0.15, 2.0, now);
    },

    /* ---- ARCANE SPARKLE (fallback) ---- */
    '✨': () => {
      const c=getCtx(), now=c.currentTime;
      // Ascending glittering cascade
      [1200,1600,2100,2700,3400,4200].forEach((f,i) => {
        playFM(f, 2.0, 1.2, 0.18, 0.18, now+i*0.055);
      });
      // Sparkling shimmer noise
      playNoiseBurst(7000, 6, 0.3, 0.55, 0.01, 0.5);
    },

    /* ---- WISH / COSMIC ---- */
    '💫': () => {
      const c=getCtx(), now=c.currentTime;
      // Soaring ascending arpeggio with FM richness
      [330, 415, 523, 659, 830, 1047].forEach((f,i) => {
        playFM(f, 2.5, 2, 0.22, 0.25, now+i*0.1);
      });
      playChord([220, 277, 330, 440], 'sine', 0.8, 0.08, 0.6, 1.0, 0.1);
    },

    /* ---- HOLY STAR / DIVINE ---- */
    '🌟': () => {
      const c=getCtx(), now=c.currentTime;
      // Powerful holy trumpet-like chord
      playChord([440, 554, 659, 880, 1100], 'triangle', 1.4, 0.05, 0.55, 1.2, 0.0);
      // Radiant blast noise
      playImpact(5000, 5, 0.5, 0.5, 0.008, 1.0, 0.28, 0);
      // Bright FM overlay
      playFM(1760, 1.5, 1.0, 0.28, 0.7, now+0.06);
    },

    /* ---- HEAL / RESTORE ---- */
    '💖': () => {
      const c=getCtx(), now=c.currentTime;
      // Warm, rising healing chord (major 7th)
      playChord([261, 330, 392, 494, 523], 'sine', 1.4, 0.12, 0.7, 1.2, 0.0);
      // Gentle shimmer
      [1600,2000,2400].forEach((f,i) => {
        playFM(f, 2.0, 0.6, 0.14, 0.4, now+0.15+i*0.1);
      });
      // Soft harmonic glow
      playSweepNoise(800, 2400, 2, 0.25, 0.8, 0.1);
    },
    '❤️‍🩹': () => spellSounds['💖'](),

    /* ---- SHIELD / WARD ---- */
    '🛡️': () => {
      const c=getCtx(), now=c.currentTime;
      // Heavy metallic ward snap
      playMetalClang(320, 0.75, 0.7);
      // Protective hum barrier rising
      playFM(180, 2.0, 4, 0.35, 0.6, now+0.05);
      playSweepNoise(300, 900, 3, 0.3, 0.5, 0.08);
    },

    /* ---- POTION ---- */
    '🧪': () => {
      const c=getCtx(), now=c.currentTime;
      // Glug + bubbling
      [440,380,320,270,230].forEach((f,i) => {
        playTone(f,'sine',0,0.22,0.07,now+i*0.09);
        playTone(f,'sine',0.22,0,0.07,now+i*0.09+0.07);
      });
      // Fizz
      playNoiseBurst(4500, 5, 0.25, 0.5, 0.02, 0.45);
      // Magical sparkle
      playFM(1200, 3, 1.5, 0.18, 0.25, now+0.35);
    },

    /* ---- ACID ---- */
    '🟢': () => {
      const c=getCtx(), now=c.currentTime;
      // Corrosive hiss sweep
      playSweepNoise(500, 3500, 8, 0.55, 0.7, 0.02);
      // Sizzle pops
      [0.1,0.25,0.45,0.6].forEach(t =>
        setTimeout(()=>playNoiseBurst(5000,12,0.35,0.06,0.001,0.05), t*1000)
      );
      // Eerie FM wobble
      playFM(160, 3, 8, 0.3, 0.7, now+0.05, 'sawtooth');
    },

    /* ---- POISON ---- */
    '🟣': () => {
      const c=getCtx(), now=c.currentTime;
      // Dark, detuned FM drone (tritone = "devil's interval")
      playFM(180, 1.414, 6, 0.35, 1.0, now, 'sawtooth');
      playFM(182, 1.414, 6, 0.35, 1.0, now+0.01, 'sawtooth');
      // Toxic hiss
      playSweepNoise(2000, 400, 5, 0.4, 0.9, 0.05);
      // Low gurgle
      playImpact(120, 2, 0.4, 0.55, 0.02, 0.8, 0.18, 0);
    },

    /* ---- RAINBOW / PRISMATIC ---- */
    '🌈': () => {
      const c=getCtx(), now=c.currentTime;
      // Dazzling chromatic cascade
      const freqs = [220, 277, 330, 415, 523, 659, 831];
      freqs.forEach((f,i) => {
        playFM(f, 2.0, 1.5, 0.18, 0.4, now+i*0.09);
      });
      // Prismatic shimmer noise
      playSweepNoise(300, 6000, 3, 0.35, 0.8, 0.08);
    },

    /* ---- HASTE / SPEED ---- */
    '👣': () => {
      const c=getCtx(), now=c.currentTime;
      // Rapid-fire staccato arpeggio
      [330, 415, 523, 659, 831, 1047].forEach((f,i) => {
        playFM(f, 3, 2, 0.2, 0.06, now+i*0.055);
      });
      // Quick whoosh
      playSweepNoise(400, 2500, 5, 0.4, 0.35, 0.01);
    },

    /* ---- FEATHER FALL ---- */
    '🕊️': () => {
      const c=getCtx(), now=c.currentTime;
      // Gentle descending chord + feather-light whoosh
      [1320, 1047, 831, 659, 523, 415].forEach((f,i) => {
        playFM(f, 1.5, 0.8, 0.16, 0.25, now+i*0.1);
      });
      playSweepNoise(2000, 300, 2, 0.28, 1.0, 0.08);
    },

    /* ---- TIME STOP ---- */
    '⏳': () => {
      const c=getCtx(), now=c.currentTime;
      // Eerie clock ticking then silence
      [0, 0.35, 0.70, 1.05].forEach(t =>
        setTimeout(() => playMetalClang(1800, 0.35, 0.12), t*1000)
      );
      // Time-bend sine sweep (slowing down)
      playFM(660, 0.95, 3, 0.3, 1.5, now+0.2);
      // Deep reality freeze drone
      playChord([55, 69, 82], 'sawtooth', 0.8, 0.2, 1.2, 2.0, 0.5);
    },

    /* ---- DEATH / NECROTIC ---- */
    '💀': () => {
      const c=getCtx(), now=c.currentTime;
      // Bone-chilling deep slam
      playImpact(40, 0.3, 1.0, 1.0, 0.001, 2.5, 0.45, 300);
      // Dark tritone chord sting
      playChord([55, 77, 92], 'sawtooth', 0.9, 0.03, 0.5, 1.5, 0.05);
      // Wailing dark sweep
      playSweepNoise(2500, 80, 3, 0.45, 1.0, 0.08);
      // Ominous FM drone
      playFM(55, 1.414, 10, 0.4, 1.5, now+0.1, 'sawtooth');
    },

    /* ---- BLOOD ---- */
    '🩸': () => {
      const c=getCtx(), now=c.currentTime;
      // Visceral heavy thud
      playImpact(80, 0.5, 0.85, 0.5, 0.002, 1.2, 0.28, 180);
      // Dark pulse
      playFM(65, 2, 8, 0.45, 0.6, now, 'sawtooth');
      // Splatter hiss
      playSweepNoise(1500, 300, 5, 0.35, 0.5, 0.03);
    },

    /* ---- DIVINATION / VISION ---- */
    '👁️': () => {
      const c=getCtx(), now=c.currentTime;
      // Eerie rising whistle
      playFM(400, 1.5, 2, 0.22, 1.2, now);
      playFM(600, 1.25, 1.5, 0.18, 1.0, now+0.2);
      // Mind-probe sweep
      playSweepNoise(200, 3000, 1.5, 0.3, 1.2, 0.1);
      // Distant choir note
      playChord([440, 554], 'sine', 0.7, 0.2, 0.8, 1.2, 0.3);
    },

    /* ---- CRYSTAL ORB / SCRYING ---- */
    '🔮': () => {
      const c=getCtx(), now=c.currentTime;
      // Glass resonance with FM
      playFM(392, 2.0, 3, 0.32, 1.5, now);
      playFM(494, 2.0, 3, 0.28, 1.3, now+0.12);
      // Crystalline shimmer
      [1600,2200,3000,4000].forEach((f,i) => {
        playTone(f,'sine',0,0.12,0.2,now+0.2+i*0.08);
        playTone(f,'sine',0.12,0,0.35,now+0.4+i*0.08);
      });
      // Reverb hum
      playChord([196, 247, 294], 'sine', 0.7, 0.15, 1.0, 2.0, 0.0);
    },

    /* ---- BAT / UNDEAD SCREECH ---- */
    '🦇': () => {
      const c=getCtx(), now=c.currentTime;
      // Ultra-high bat screech burst
      playFM(3500, 1.8, 5, 0.45, 0.1, now, 'sawtooth');
      playFM(2800, 2.2, 6, 0.35, 0.08, now+0.08, 'sawtooth');
      playFM(4000, 1.5, 4, 0.3, 0.07, now+0.18, 'sawtooth');
      // Wing flap noise
      [0,0.25,0.5].forEach(t =>
        setTimeout(()=>playNoiseBurst(800,5,0.4,0.08,0.005,0.07), t*1000)
      );
    },

    /* ---- GHOST / BANSHEE ---- */
    '👻': () => {
      const c=getCtx(), now=c.currentTime;
      // Banshee wail with vibrato-like FM
      playFM(350, 0.97, 3, 0.4, 1.0, now);
      playFM(420, 1.02, 3, 0.35, 0.85, now+0.05);
      // Ghostly harmonic ascending
      playSweepNoise(200, 1800, 1.5, 0.35, 1.2, 0.1);
      // Eerie chord decay
      playChord([220, 247, 277], 'sine', 0.8, 0.2, 0.5, 1.5, 0.3);
    },
    '🎭': () => spellSounds['👻'](),

    /* ---- WEB / ENTANGLE ---- */
    '🕸️': () => {
      const c=getCtx(), now=c.currentTime;
      // Sticky snap transient
      playImpact(2500, 18, 0.65, 0.12, 0.001, 0.5, 0.15, 0);
      // Vine/web creaking
      [0.05,0.12,0.22].forEach(t =>
        setTimeout(()=>playNoiseBurst(1800+Math.random()*600,12,0.4,0.08,0.002,0.07), t*1000)
      );
      // Low eerie hum
      playFM(110, 3, 5, 0.22, 0.5, now+0.1);
    },

    /* ---- PORTAL / TELEPORT ---- */
    '🚪': () => {
      const c=getCtx(), now=c.currentTime;
      // Dimensional rip sweep
      playSweepNoise(150, 5000, 3, 0.6, 0.5, 0.03);
      playSweepNoise(5000, 150, 3, 0.5, 0.5, 0.55);
      // Arcane chord
      playChord([220, 277, 330, 415], 'sine', 0.9, 0.06, 0.35, 1.0, 0.15);
      // Space distortion FM
      playFM(180, 2.5, 7, 0.35, 1.0, now+0.08, 'square');
    },

    /* ---- CAT / FAMILIAR ---- */
    '🐈': () => {
      const c=getCtx(), now=c.currentTime;
      // Feline meow: frequency glide
      const o = c.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(900, now);
      o.frequency.linearRampToValueAtTime(650, now+0.18);
      o.frequency.linearRampToValueAtTime(750, now+0.32);
      const g = c.createGain();
      g.gain.setValueAtTime(0,now);
      g.gain.linearRampToValueAtTime(0.28,now+0.06);
      g.gain.linearRampToValueAtTime(0,now+0.45);
      o.connect(g); g.connect(getOutput());
      o.start(now); o.stop(now+0.5);
      // Purr rumble
      playFM(55, 1.0, 2, 0.12, 0.4, now+0.05);
    },

    /* ---- WOLF / BEAST ---- */
    '🐺': () => {
      const c=getCtx(), now=c.currentTime;
      // Howl: rising then falling pitch
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(200, now);
      o.frequency.linearRampToValueAtTime(450, now+0.4);
      o.frequency.linearRampToValueAtTime(280, now+1.1);
      const g = c.createGain();
      g.gain.setValueAtTime(0,now);
      g.gain.linearRampToValueAtTime(0.32,now+0.12);
      g.gain.linearRampToValueAtTime(0,now+1.4);
      const rev = makeReverb(2.0, 0.35);
      o.connect(g); g.connect(getOutput()); g.connect(rev);
      o.start(now); o.stop(now+1.5);
      // Low growl FM
      playFM(80, 1.5, 8, 0.3, 0.8, now, 'sawtooth');
    },

    /* ---- DRAGON ---- */
    '🐉': () => {
      const c=getCtx(), now=c.currentTime;
      // Guttural dragon roar: massive layered impact
      playImpact(55, 0.4, 1.0, 1.2, 0.01, 3.0, 0.50, 450);
      playImpact(120, 1.5, 0.9, 0.9, 0.01, 2.5, 0.40, 200);
      // Fire breath component
      playSweepNoise(300, 2500, 5, 0.55, 0.8, 0.05);
      // Terrifying FM roar
      playFM(65, 2.5, 12, 0.55, 1.2, now+0.05, 'sawtooth');
      playFM(80, 1.8, 10, 0.45, 1.0, now+0.08, 'sawtooth');
    },

    /* ---- VOID / ELDRITCH ---- */
    '🌌': () => {
      const c=getCtx(), now=c.currentTime;
      // Crushing cosmic void chord
      playChord([41, 52, 61, 73], 'sine', 1.2, 0.25, 1.8, 3.0, 0.0);
      // Eerie inward sweep
      playSweepNoise(4000, 40, 1.5, 0.5, 2.5, 0.3);
      // Eldritch FM drone
      playFM(44, 1.414, 15, 0.45, 2.5, now+0.1, 'sawtooth');
      playFM(41, 1.5, 12, 0.4, 2.8, now+0.15, 'sawtooth');
    },

    /* ---- EXTRA STICKER ALIASES ---- */
    '🌪️': () => spellSounds['🌀'](),
    '🪨': () => spellSounds['🌋'](),
    '🌱': () => spellSounds['🍃'](),
    '🌺': () => spellSounds['💖'](),
    '🪽': () => spellSounds['🕊️'](),
    '🪶': () => spellSounds['🕊️'](),
    '🕯️': () => spellSounds['🌟'](),
    '🪬': () => spellSounds['🛡️'](),
    '⚗️': () => spellSounds['🧪'](),
    '🐍': () => spellSounds['🟣'](),
    '🦂': () => spellSounds['🟣'](),
    '🧿': () => spellSounds['👁️'](),
    '🧠': () => spellSounds['🔮'](),
    '🪦': () => spellSounds['💀'](),
    '💤': () => spellSounds['⏳'](),
    '📖': () => spellSounds['✨'](),
  };

  function spell(icon) {
    const fn = spellSounds[icon];
    if (fn) fn();
    else {
      // generic magic sparkle fallback
      spellSounds['✨']();
    }
  }

  /* ================================================================
     ATTACK / ITEM SOUNDS — D&D Fantasy Medieval (keyed by emoji)
     Uses metallic clang, distortion impacts, and sweep noise for
     authentic weapon, armor, and combat sound effects.
     ================================================================ */
  const itemSounds = {
    // Weapons – metal clang
    '🗡️': 'weapon', '⚔️': 'weapon', '🪓': 'weapon', '🔪': 'weapon', '🪒': 'weapon', '🪝': 'weapon',
    '🏹': 'bow', '🎯': 'bow', '🪃': 'bow', '🪶': 'bow', '💘': 'bow',
    '🔨': 'blunt', '⛏️': 'blunt', '🪵': 'blunt', '🦴': 'blunt', '🔱': 'weapon', '🦯': 'weapon',
    '⛓️': 'chain', '👊': 'unarmed', '💪': 'unarmed', '🤜': 'unarmed', '🦶': 'unarmed', '🐾': 'unarmed', '🦷': 'unarmed',
    // Magic weapons
    '🪄': 'magic_weapon', '🧿': 'magic_weapon', '🪬': 'magic_weapon',
    // Defense – armor thud
    '🛡️': 'shield', '⛨': 'shield', '🪖': 'armor', '🥋': 'armor', '🧤': 'armor', '👢': 'armor',
    // Potions
    '🧪': 'potion',
    // Drinks & food
    '🍷': 'liquid', '🍺': 'liquid', '🍖': 'food', '🍗': 'food', '🍞': 'food',
    '🧀': 'food', '🐟': 'food', '🍎': 'food', '🍄': 'food', '🌿': 'food', '🍯': 'liquid',
    // Coins / treasure
    '🪙': 'coin', '💰': 'coin', '💎': 'gem', '💍': 'gem', '👑': 'gem',
    // Accessories / generic
    '🎒': 'bag', '🔑': 'key', '📜': 'paper', '🗺️': 'paper', '🧭': 'generic',
    '📿': 'gem', '🕯️': 'generic', '🎲': 'generic', '🔮': 'gem',
    '🎻': 'generic', '🎺': 'generic', '🪶': 'paper', '🔒': 'key',
    '📦': 'bag', '🏺': 'generic', '🪞': 'gem',
  };

  const itemSoundFns = {

    /* Sharp blade: sword, dagger, axe */
    weapon: () => {
      const c=getCtx(), now=c.currentTime;
      // Blade whoosh
      playSweepNoise(600, 3000, 8, 0.5, 0.18, 0.01);
      // Metallic clang on impact
      playMetalClang(280, 0.8, 0.55);
      // Body impact thud
      playImpact(180, 4, 0.55, 0.22, 0.002, 0.6, 0.18, 100);
    },

    /* Bow / thrown projectile: twang + flight + thud */
    bow: () => {
      const c=getCtx(), now=c.currentTime;
      // Bowstring twang
      const o = c.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(420, now);
      o.frequency.exponentialRampToValueAtTime(80, now+0.3);
      const g = c.createGain();
      g.gain.setValueAtTime(0.45, now);
      g.gain.exponentialRampToValueAtTime(0.001, now+0.3);
      o.connect(g); g.connect(getOutput());
      o.start(now); o.stop(now+0.35);
      // Arrow flight whoosh
      playSweepNoise(2500, 800, 10, 0.35, 0.4, 0.02);
      // Impact thud
      setTimeout(()=>playImpact(250, 5, 0.6, 0.2, 0.001, 0.5, 0.15, 80), 400);
    },

    /* Blunt weapons: hammer, mace, club */
    blunt: () => {
      const c=getCtx(), now=c.currentTime;
      // Heavy swing whoosh
      playSweepNoise(300, 1200, 4, 0.5, 0.2, 0.02);
      // Powerful thud (bone/armor impact)
      playImpact(100, 2, 0.9, 0.45, 0.001, 1.5, 0.35, 280);
      // Bone crack accent
      playNoiseBurst(1500, 8, 0.5, 0.08, 0.001, 0.07);
    },

    /* Unarmed, claws and bites: close heavy impact */
    unarmed: () => {
      const c=getCtx(), now=c.currentTime;
      playSweepNoise(260, 900, 3, 0.32, 0.13, 0.01);
      playImpact(85, 1.8, 0.92, 0.34, 0.001, 1.1, 0.30, 190);
      playNoiseBurst(720, 5, 0.38, 0.10, 0.001, 0.08);
      playFM(62, 1.4, 5, 0.22, 0.22, now, 'sawtooth');
    },

    /* Chains: whip + metal rattle */
    chain: () => {
      const c=getCtx(), now=c.currentTime;
      // Chain rattle
      [0, 0.07, 0.15, 0.23].forEach((t,i) =>
        setTimeout(()=>playMetalClang(900+i*200, 0.4, 0.12), t*1000)
      );
      // Whip crack
      playImpact(2000, 12, 0.65, 0.12, 0.001, 0.5, 0.15, 0);
    },

    /* Magic weapon: sword + arcane shimmer */
    magic_weapon: () => {
      const c=getCtx(), now=c.currentTime;
      // Blade whoosh
      playSweepNoise(800, 4000, 10, 0.45, 0.2, 0.01);
      // Enchanted clang
      playMetalClang(320, 0.7, 0.5);
      // Arcane shimmer overlay
      [1400,1800,2400].forEach((f,i) => {
        playFM(f, 2.0, 1.5, 0.2, 0.25, now+0.05+i*0.07);
      });
    },

    /* Shield: heavy metallic bash */
    shield: () => {
      const c=getCtx(), now=c.currentTime;
      // Heavy shield bash impact
      playMetalClang(200, 0.9, 0.8);
      // Reverberant boom
      playImpact(120, 3, 0.7, 0.5, 0.001, 1.2, 0.30, 180);
      // Metal edge ring
      playFM(640, 3, 2, 0.25, 0.6, now+0.02);
    },

    /* Armor: clanking plate */
    armor: () => {
      const c=getCtx(), now=c.currentTime;
      // Armor clank
      playMetalClang(180, 0.65, 0.6);
      // Heavy thud through plate
      playImpact(200, 5, 0.55, 0.4, 0.003, 0.8, 0.22, 120);
    },

    /* Potion: glug + fizz + magic */
    potion: () => {
      const c=getCtx(), now=c.currentTime;
      [480,400,340,290,250].forEach((f,i) => {
        playTone(f,'sine',0,0.22,0.07,now+i*0.09);
        playTone(f,'sine',0.22,0,0.07,now+i*0.09+0.07);
      });
      // Fizzing
      playNoiseBurst(5000, 5, 0.28, 0.6, 0.02, 0.55);
      // Magic sparkle
      playFM(1600, 3, 1.2, 0.2, 0.3, now+0.45);
    },

    /* Liquid pour */
    liquid: () => {
      const c=getCtx(), now=c.currentTime;
      [320,280,240,210,185].forEach((f,i) => {
        playTone(f,'sine',0,0.14,0.08,now+i*0.09);
        playTone(f,'sine',0.14,0,0.08,now+i*0.09+0.08);
      });
      playNoiseBurst(3500, 4, 0.18, 0.5, 0.01, 0.45);
    },

    /* Food: crunch/bite */
    food: () => {
      playImpact(3000, 10, 0.45, 0.1, 0.001, 0.3, 0.08, 0);
      playNoiseBurst(2000, 6, 0.3, 0.12, 0.002, 0.1);
    },

    /* Coins clinking */
    coin: () => {
      const c=getCtx(), now=c.currentTime;
      [1900,2400,1700,2100,2800].forEach((f,i) => {
        playFM(f, 2.5, 0.5, 0.22, 0.12, now+i*0.06);
      });
      playNoiseBurst(4000, 8, 0.2, 0.25, 0.001, 0.22);
    },

    /* Gem/crystal chime */
    gem: () => {
      const c=getCtx(), now=c.currentTime;
      playFM(2800, 2.0, 0.8, 0.28, 0.45, now);
      playFM(3500, 2.0, 0.7, 0.22, 0.38, now+0.08);
      playFM(4400, 2.0, 0.6, 0.18, 0.32, now+0.16);
      playNoiseBurst(8000, 4, 0.2, 0.35, 0.005, 0.3);
    },

    /* Bag / sack */
    bag: () => {
      playImpact(350, 4, 0.4, 0.3, 0.01, 0.5, 0.12, 0);
      playNoiseBurst(600, 3, 0.28, 0.22, 0.01, 0.2);
    },

    /* Key / lock */
    key: () => {
      const c=getCtx(), now=c.currentTime;
      playMetalClang(1800, 0.45, 0.22);
      playFM(900, 2.5, 1, 0.2, 0.18, now+0.06);
    },

    /* Paper / parchment */
    paper: () => {
      playSweepNoise(4000, 6000, 3, 0.22, 0.2, 0.005);
    },

    /* Generic fallback */
    generic: () => {
      playNoiseBurst(900, 8, 0.32, 0.18, 0.005, 0.16);
    }
  };

  function item(icon) {
    const category = itemSounds[icon];
    const fn = category ? itemSoundFns[category] : null;
    if (fn) fn();
    else itemSoundFns.generic();
  }

  /* Also expose for spell sticker = use spell() with spell icon map */
  function spellFromSpellSounds(icon) { spell(icon); }

  function stopMusic() {
    if(musicTimer) clearInterval(musicTimer);
    musicTimer = null;
    musicStep = 0;
  }

  function music(theme) {
    stopMusic();
    if(theme === 'none') return;
    const themes = {
      tavern:  { notes:[196,247,294,330,294,247,220,247], wave:'triangle', tempo:520, vol:0.045 },
      combat:  { notes:[110,110,147,165,110,196,165,147], wave:'sawtooth', tempo:230, vol:0.055 },
      explore: { notes:[220,247,294,330,294,247,220,196], wave:'sine', tempo:700, vol:0.04 },
      mystery: { notes:[146,174,207,233,207,174,155,174], wave:'sine', tempo:760, vol:0.045 },
      dungeon: { notes:[82,98,110,92,82,73,82,92], wave:'triangle', tempo:900, vol:0.05 },
      victory: { notes:[262,330,392,523,392,440,523,659], wave:'triangle', tempo:360, vol:0.05 }
    };
    const cfg = themes[theme] || themes.explore;
    const playNext = () => {
      const c = getCtx();
      const now = c.currentTime;
      const note = cfg.notes[musicStep++ % cfg.notes.length];
      playTone(note, cfg.wave, cfg.vol, 0, Math.max(0.22, cfg.tempo / 1000 * 0.82), now, false, getMusicOutput());
      playTone(note / 2, 'sine', cfg.vol * 0.38, 0, Math.max(0.3, cfg.tempo / 1000), now, false, getMusicOutput());
      if(theme === 'combat' && musicStep % 2 === 0) playNoiseBurst(120, 0.8, 0.08, 0.13, 0.002, 0.12, getMusicOutput());
    };
    playNext();
    musicTimer = setInterval(playNext, cfg.tempo);
  }

  function prewarm() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    if(ctx && !masterGain) getCtx();
  }
  return { weather, music, spell, item, spellFromSpellSounds, prewarm, setVolume, getVolume, setWeatherVolume, getWeatherVolume, setMusicVolume, getMusicVolume };
})();

let appVolumeBeforeMute=Math.max(0.1,Number(loadLS('crq_volume_before_mute',0.7))||0.7);
function refreshAppVolumeUI() {
  const volume=SoundEngine.getVolume();
  const label=document.getElementById('appVolumeLabel');
  const muteButton=document.getElementById('appMuteButton');
  if(label) label.textContent=`${Math.round(volume*100)}%`;
  if(muteButton) muteButton.textContent=volume>0?'🔊':'🔇';
  refreshChannelVolumeUI();
}
function applyAppVolume(value) {
  const volume=SoundEngine.setVolume(value);
  if(volume>0) {
    appVolumeBeforeMute=volume;
    saveLS('crq_volume_before_mute',volume);
  }
  if(customWeatherAudio) customWeatherAudio.volume=0.62*volume*SoundEngine.getWeatherVolume();
  if(customMusicAudio) customMusicAudio.volume=0.55*volume*SoundEngine.getMusicVolume();
  if(externalMusicAudio) externalMusicAudio.volume=0.55*volume*SoundEngine.getMusicVolume();
  applyExternalYoutubeVolume();
  refreshAppVolumeUI();
}
function adjustAppVolume(delta) {
  applyAppVolume(Math.round((SoundEngine.getVolume()+delta)*10)/10);
}
function toggleAppMute() {
  const volume=SoundEngine.getVolume();
  applyAppVolume(volume>0?0:appVolumeBeforeMute);
}
const channelVolumeBeforeMute={
  weather:Math.max(0.1,Number(loadLS('crq_weather_volume_before_mute',0.7))||0.7),
  music:Math.max(0.1,Number(loadLS('crq_music_volume_before_mute',0.7))||0.7)
};
function getChannelVolume(channel) {
  return channel==='weather' ? SoundEngine.getWeatherVolume() : SoundEngine.getMusicVolume();
}
function refreshChannelVolumeUI() {
  ['weather','music'].forEach(channel=>{
    const volume=getChannelVolume(channel);
    const label=document.getElementById(`${channel}VolumeLabel`);
    const muteButton=document.getElementById(`${channel}MuteButton`);
    if(label) label.textContent=`${Math.round(volume*100)}%`;
    if(muteButton) muteButton.textContent=volume>0?'🔊':'🔇';
    if(channel==='weather') {
      const headerLabel=document.getElementById('weatherHeaderVolumeLabel');
      const headerMuteButton=document.getElementById('weatherHeaderMuteButton');
      if(headerLabel) headerLabel.textContent=`Clima ${Math.round(volume*100)}%`;
      if(headerMuteButton) headerMuteButton.textContent=volume>0?'🔊':'🔇';
    }
  });
}
function applyChannelVolume(channel,value) {
  const volume=channel==='weather'
    ? SoundEngine.setWeatherVolume(value)
    : SoundEngine.setMusicVolume(value);
  if(volume>0) {
    channelVolumeBeforeMute[channel]=volume;
    saveLS(`crq_${channel}_volume_before_mute`,volume);
  }
  if(channel==='weather' && customWeatherAudio) customWeatherAudio.volume=0.62*SoundEngine.getVolume()*volume;
  if(channel==='music') {
    if(customMusicAudio) customMusicAudio.volume=0.55*SoundEngine.getVolume()*volume;
    if(externalMusicAudio) externalMusicAudio.volume=0.55*SoundEngine.getVolume()*volume;
    applyExternalYoutubeVolume();
  }
  refreshChannelVolumeUI();
}
function adjustChannelVolume(channel,delta) {
  applyChannelVolume(channel,Math.round((getChannelVolume(channel)+delta)*10)/10);
}
function toggleChannelMute(channel) {
  const volume=getChannelVolume(channel);
  applyChannelVolume(channel,volume>0?0:channelVolumeBeforeMute[channel]);
}
function postExternalYoutubeCommand(func,args=[]) {
  const iframe=document.getElementById('externalYoutubePlayer');
  if(!iframe?.contentWindow) return;
  iframe.contentWindow.postMessage(JSON.stringify({event:'command',func,args}),'*');
}
function syncExternalYoutubePlayer() {
  const volume=Math.round(100*SoundEngine.getVolume()*SoundEngine.getMusicVolume());
  postExternalYoutubeCommand('setVolume',[volume]);
  postExternalYoutubeCommand(volume>0?'unMute':'mute',[]);
  postExternalYoutubeCommand('playVideo',[]);
}
function applyExternalYoutubeVolume() {
  syncExternalYoutubePlayer();
}
function resumeExternalMusicPlayback() {
  if(externalMusicAudio) externalMusicAudio.play().catch(()=>{});
  syncExternalYoutubePlayer();
}
window.syncExternalYoutubePlayer = syncExternalYoutubePlayer;
window.applyExternalYoutubeVolume = applyExternalYoutubeVolume;
window.resumeExternalMusicPlayback = resumeExternalMusicPlayback;

const itemStickers = {
  "Armas": ["🗡️", "⚔️", "🪓", "🏹", "🔨", "🔱", "🪄", "🪃", "⛏️", "⛓️"],
  "Defensa": ["🛡️", "🪖", "🥋", "🧤", "👢"],
  "Accesorios": ["🎒", "💍", "👑", "💎", "🔑", "📜", "🗺️", "🧭", "📿", "🕯️", "💰", "🪙", "🎲", "🔮", "🎻", "🎺", "🪶", "🔒", "📦", "🏺", "🪞"],
  "Consumibles": ["🧪", "🍷", "🍺", "🍖", "🍗", "🍞", "🧀", "🐟", "🍎", "🍄", "🌿", "🍯"]
};

const spellStickers = {
  "Elementos": ["🔥", "⚡", "❄️", "🌀", "🌪️", "☄️", "💥", "🌊", "🌋", "🪨", "🍃", "🌱", "☀️", "🌙", "🌫️"],
  "Curación & Protección": ["✨", "💫", "🌟", "💖", "❤️‍🩹", "🌺", "🛡️", "🪬", "🧪", "⚗️", "🟢", "🟣", "🌈"],
  "Movimiento & Control": ["👣", "🕊️", "🪽", "🪶", "⏳", "💤", "🕸️", "🚪"],
  "Arcano & Adivinación": ["🔮", "👁️", "🧿", "🧠", "📖", "🕯️", "🌌"],
  "Oscuro & Criaturas": ["💀", "🪦", "🩸", "🐍", "🦂", "🦇", "👻", "🎭", "🐈", "🐺", "🐉"]
};

const itemSuggestions = {
  'espada': '🗡️', 'sable': '🗡️', 'daga': '🗡️', 'florete': '🗡️', 'estoque': '🗡️', 'hoja': '🗡️',
  'hacha': '🪓', 'alabarda': '🪓', 'arco': '🏹', 'flecha': '🏹', 'ballesta': '🏹',
  'martillo': '🔨', 'maza': '🔨', 'garrote': '🔨', 'almadena': '🔨',
  'lanza': '🔱', 'tridente': '🔱', 'baculo': '🪄', 'varita': '🪄', 'bastón': '🪄',
  'escudo': '🛡️', 'casco': '🪖', 'yelmo': '🪖', 'armadura': '🥋', 'cota': '🥋', 'toga': '🥋', 'cuero': '🥋',
  'mochila': '🎒', 'saco': '🎒', 'bolsa': '🎒', 'anillo': '💍', 'sortija': '💍',
  'corona': '👑', 'diadema': '👑', 'gema': '💎', 'rubi': '💎', 'diamante': '💎', 'esmeralda': '💎', 'zafiro': '💎', 'joya': '💎',
  'llave': '🔑', 'ganzua': '🔑', 'pergamino': '📜', 'carta': '📜', 'contrato': '📜',
  'mapa': '🗺️', 'brujula': '🧭', 'collar': '📿', 'amuleto': '📿', 'antorcha': '🕯️', 'vela': '🕯️', 'linterna': '🕯️',
  'pocion': '🧪', 'frasco': '🧪', 'elixir': '🧪', 'vial': '🧪', 'veneno': '🧪',
  'comida': '🍖', 'carne': '🍖', 'ración': '🍖', 'pan': '🍞', 'manzana': '🍎',
  'hongo': '🍄', 'seta': '🍄', 'hierba': '🌿', 'planta': '🌿',
  'cerveza': '🍺', 'jarra': '🍺', 'taberna': '🍺', 'ale': '🍺',
  'queso': '🧀', 'pescado': '🐟', 'trucha': '🐟', 'moneda': '🪙', 'oro': '🪙', 'plata': '🪙', 'cobre': '🪙',
  'bolsa de oro': '💰', 'tesoro': '💰', 'monedas': '💰', 'dado': '🎲', 'dados': '🎲',
  'laud': '🎻', 'violin': '🎻', 'bardo': '🎻', 'musica': '🎻', 'trompeta': '🎺', 'cuerno': '🎺',
  'pluma': '🪶', 'tintero': '🪶', 'cofre': '📦', 'caja': '📦', 'jiron': '🏺', 'urna': '🏺', 'vasija': '🏺',
  'espejo': '🪞', 'botas': '👢', 'calzado': '👢', 'guantes': '🧤'
};

const spellSuggestions = {
  'fuego': '🔥', 'llama': '🔥', 'bola de fuego': '🔥', 'ignición': '🔥', 'calor': '🔥',
  'rayo': '⚡', 'electricidad': '⚡', 'trueno': '⚡', 'relámpago': '⚡',
  'hielo': '❄️', 'frio': '❄️', 'congelar': '❄️', 'nieve': '❄️', 'ventisca': '❄️',
  'viento': '🌀', 'aire': '🌀', 'tornado': '🌀', 'torbellino': '🌀',
  'huracan': '🌪️', 'huracán': '🌪️', 'piedra': '🪨', 'roca': '🪨', 'raiz': '🌱', 'raíz': '🌱',
  'meteoro': '☄️', 'cometa': '☄️', 'explosion': '💥', 'explosión': '💥', 'bomba': '💥',
  'curar': '💖', 'cura': '💖', 'sanar': '💖', 'salud': '💖', 'vida': '💖',
  'flor': '🌺', 'restaurar': '❤️‍🩹', 'amuleto': '🪬', 'alquimia': '⚗️',
  'escudo': '🛡️', 'barrera': '🛡️', 'proteccion': '🛡️', 'protección': '🛡️',
  'brillo': '✨', 'magia': '✨', 'destello': '✨', 'encantamiento': '✨',
  'estrella': '🌟', 'luz': '🌟', 'sagrado': '🌟', 'resplandor': '🌟', 'deseo': '💫', 'suerte': '💫', 'cosmos': '💫',
  'muerte': '💀', 'necromancia': '💀', 'hueso': '💀', 'esqueleto': '💀',
  'sangre': '🩸', 'sangriento': '🩸', 'ojo': '👁️', 'vision': '👁️', 'visión': '👁️', 'detectar': '👁️',
  'bola': '🔮', 'oraculo': '🔮', 'adivinacion': '🔮', 'futuro': '🔮', 'murcielago': '🦇', 'vampiro': '🦇',
  'fantasma': '👻', 'espiritu': '👻', 'espectro': '👻',
  'agua': '🌊', 'ola': '🌊', 'mar': '🌊', 'marea': '🌊',
  'tierra': '🌋', 'terremoto': '🌋', 'volcan': '🌋', 'roca': '🪨',
  'sol': '☀️', 'rayo de sol': '☀️', 'luna': '☀️', 'luz de luna': '🌙',
  'niebla': '🌫️', 'nube': '🌫️', 'acido': '🟢', 'ácido': '🟢', 'veneno': '🟣', 'ponzoña': '🟣',
  'arcoiris': '🌈', 'iris': '🌈', 'velocidad': '👣', 'prisa': '👣', 'paso': '👣',
  'pluma': '🪶', 'vuelo': '🪽', 'volar': '🪽', 'caida': '🕊️', 'tiempo': '⏳', 'ralentizar': '⏳', 'dormir': '💤', 'sueño': '💤',
  'red': '🕸️', 'telaraña': '🕸️', 'telarañas': '🕸️', 'puerta': '🚪', 'portal': '🚪', 'teletransporte': '🚪',
  'gato': '🐈', 'familiar': '🐈', 'lobo': '🐺', 'bestia': '🐺', 'dragon': '🐉', 'dragón': '🐉',
  'serpiente': '🐍', 'escorpion': '🦂', 'escorpión': '🦂', 'tumba': '🪦',
  'mente': '🧠', 'libro': '📖', 'grimorio': '📖', 'mal de ojo': '🧿', 'vacio': '🌌', 'astral': '🌌', 'banido': '🌌'
};

function renderItemStickers() {
  const container = document.getElementById('itemStickerPicker');
  if(!container) return;
  container.innerHTML = '';
  Object.entries(itemStickers).forEach(([cat, list]) => {
    container.insertAdjacentHTML('beforeend', `<div class="sticker-category-title">${cat}</div>`);
    list.forEach(emoji => {
      container.insertAdjacentHTML('beforeend', `<button type="button" class="sticker-btn" onclick="selectItemSticker('${emoji}', this)">${emoji}</button>`);
    });
  });
}

function renderSpellStickers() {
  const container = document.getElementById('spellStickerPicker');
  if(!container) return;
  container.innerHTML = '';
  Object.entries(spellStickers).forEach(([cat, list]) => {
    container.insertAdjacentHTML('beforeend', `<div class="sticker-category-title">${cat}</div>`);
    list.forEach(emoji => {
      container.insertAdjacentHTML('beforeend', `<button type="button" class="sticker-btn" onclick="selectSpellSticker('${emoji}', this)">${emoji}</button>`);
    });
  });
}

function selectItemSticker(emoji, btn) {
  document.getElementById('newItemIcon').value = emoji;
  const picker = document.getElementById('itemStickerPicker');
  picker.querySelectorAll('.sticker-btn').forEach(b => b.classList.remove('highlighted'));
  if (btn) btn.classList.add('highlighted');
}

function selectSpellSticker(emoji, btn) {
  document.getElementById('newSpellIcon').value = emoji;
  const picker = document.getElementById('spellStickerPicker');
  picker.querySelectorAll('.sticker-btn').forEach(b => b.classList.remove('highlighted'));
  if (btn) btn.classList.add('highlighted');
  SoundEngine.spell(emoji);
}

function suggestItemSticker() {
  const name = document.getElementById('newItemName').value.toLowerCase();
  const picker = document.getElementById('itemStickerPicker');
  picker.querySelectorAll('.sticker-btn').forEach(b => b.classList.remove('highlighted'));
  
  for (const [kw, emoji] of Object.entries(itemSuggestions)) {
    if (name.includes(kw)) {
      document.getElementById('newItemIcon').value = emoji;
      const categoryInput = document.getElementById('newItemCategory');
      if(categoryInput) {
        const inferredCategory = inferInventoryCategory({name, icon: emoji});
        if(inferredCategory !== 'bag') categoryInput.value = inferredCategory;
      }
      const buttons = Array.from(picker.querySelectorAll('.sticker-btn'));
      const matchingBtn = buttons.find(b => b.textContent === emoji);
      if (matchingBtn) {
        matchingBtn.classList.add('highlighted');
        matchingBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      break;
    }
  }
}

function suggestSpellSticker() {
  const name = document.getElementById('newSpellName').value.toLowerCase();
  const picker = document.getElementById('spellStickerPicker');
  picker.querySelectorAll('.sticker-btn').forEach(b => b.classList.remove('highlighted'));
  
  for (const [kw, emoji] of Object.entries(spellSuggestions)) {
    if (name.includes(kw)) {
      document.getElementById('newSpellIcon').value = emoji;
      const buttons = Array.from(picker.querySelectorAll('.sticker-btn'));
      const matchingBtn = buttons.find(b => b.textContent === emoji);
      if (matchingBtn) {
        matchingBtn.classList.add('highlighted');
        matchingBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      break;
    }
  }
}

function openAddItemModal(charId = state.activeCharId) {
  const c = getEditableCombatantById(charId) || getActiveChar();
  if(!canEditCharacter(c)) return;
  document.getElementById('newItemName').value='';
  document.getElementById('newItemIcon').value='🎒';
  document.getElementById('newItemQty').value='1';
  document.getElementById('newItemCategory').value='bag';
  const modal = document.getElementById('addItemModalOverlay');
  modal.dataset.charId = c?.id || '';
  modal.classList.add('active');
  renderItemStickers();
}
function saveItemToDM() {
  const c = getModalCharacter('addItemModalOverlay');
  if(!canEditCharacter(c)) return;
  ensureCombatLoadout(c);
  const name     = document.getElementById('newItemName').value.trim() || 'Objeto';
  const icon     = document.getElementById('newItemIcon').value.trim() || '🎒';
  const qty      = parseInt(document.getElementById('newItemQty').value)||1;
  const selectedCategory = document.getElementById('newItemCategory').value || 'bag';
  const slot = selectedCategory !== 'bag' && inventoryCategories[selectedCategory]
    ? selectedCategory
    : inferInventoryCategory({name, icon});
  if(!Array.isArray(c.inventory)) c.inventory = [];
  c.inventory.push({name,icon,qty,equipped:false,category:'bag',slot});
  SoundEngine.item(icon);
  saveCombatantSheet(c);
  closeModals();
  renderInventarioPage();
  renderEnemiesPage();
  renderQuickCombatPanel();
}

function openAddSpellModal(charId = state.activeCharId) {
  const c = getEditableCombatantById(charId) || getActiveChar();
  if(!canEditCharacter(c)) return;
  document.getElementById('newSpellName').value='';
  document.getElementById('newSpellLevel').value='1';
  document.getElementById('newSpellIcon').value='✨';
  document.getElementById('newSpellDamage').value='';
  const modal = document.getElementById('addSpellModalOverlay');
  modal.dataset.charId = c?.id || '';
  modal.classList.add('active');
  renderSpellStickers();
}
function saveSpellToDM() {
  const c = getModalCharacter('addSpellModalOverlay');
  if(!canEditCharacter(c)) return;
  ensureCombatLoadout(c);
  if(!c.spells) {
    c.spells = {slots:[4,2,2,0,0,0,0,0,0],usedSlots:[0,0,0,0,0,0,0,0,0],prepared:[]};
  }
  const name  = document.getElementById('newSpellName').value.trim() || 'Conjuro';
  const level = parseInt(document.getElementById('newSpellLevel').value)||1;
  const icon  = document.getElementById('newSpellIcon').value.trim() || '✨';
  const damage = document.getElementById('newSpellDamage').value.trim();
  c.spells.prepared.push({name,level,icon,damage});
  SoundEngine.spell(icon);
  saveCombatantSheet(c);
  closeModals();
  renderHechizosPage();
  renderEnemiesPage();
  renderQuickCombatPanel();
}

// ===================================================
// MODALS GENERAL
// ===================================================
function closeModals() {
  document.querySelectorAll('.modal-overlay').forEach(m=>m.classList.remove('active'));
  clearMapEditorGridPreview();
  updateTokenPanelAvoidance(false);
}

let characterDraftSkills = [];
let characterEditingId = null;

function renderCharacterDraftSkills() {
  const list = document.getElementById('newCharSkillList');
  if(!list) return;
  if(characterDraftSkills.length === 0) {
    list.innerHTML = '<div class="empty-skill-msg">Sin habilidades agregadas. Puedes guardar así o crear las que necesites.</div>';
    return;
  }
  list.innerHTML = characterDraftSkills.map((skill, idx) => `
    <div class="character-skill-row">
      <span>${escapeHTML(skill.name)}</span>
      <strong>${fmtMod(skill.mod)}</strong>
      <button type="button" class="skill-remove-btn" onclick="removeSkillFromCharacterDraft(${idx})" title="Quitar habilidad">×</button>
    </div>`).join('');
}

function addSkillToCharacterDraft() {
  const nameInput = document.getElementById('newCharSkillName');
  const modInput = document.getElementById('newCharSkillMod');
  const name = nameInput?.value.trim();
  if(!name) return;
  const modValue = parseInt(modInput?.value);
  const mod = Number.isFinite(modValue) ? modValue : 0;
  const existing = characterDraftSkills.find(skill => skill.name.toLowerCase() === name.toLowerCase());
  if(existing) existing.mod = mod;
  else characterDraftSkills.push({ name, mod });
  if(nameInput) nameInput.value = '';
  if(modInput) modInput.value = '0';
  renderCharacterDraftSkills();
}

function removeSkillFromCharacterDraft(index) {
  characterDraftSkills.splice(index, 1);
  renderCharacterDraftSkills();
}

function getCharacterDraftSkills() {
  return characterDraftSkills.reduce((skills, skill) => {
    if(skill.name) skills[skill.name] = parseInt(skill.mod) || 0;
    return skills;
  }, {});
}

function getCharacterVisionFromModal(existingChar = null) {
  const previous = existingChar ? normalizeCharacterVision(existingChar) : {...characterVisionDefaults};
  const radius = parseInt(document.getElementById('newCharVisionRadius')?.value);
  const angle = parseInt(document.getElementById('newCharVisionAngle')?.value);
  const team = document.getElementById('newCharVisionTeam')?.value || previous.team;
  return {
    clearsFog: document.getElementById('newCharVisionClearsFog')?.checked !== false,
    hiddenInFog: previous.hiddenInFog === true,
    radiusSquares: Number.isFinite(radius) ? Math.max(0, radius) : previous.radiusSquares,
    angle: Number.isFinite(angle) ? Math.max(15, Math.min(360, angle)) : previous.angle,
    team: characterVisionTeams[team] ? team : previous.team
  };
}

function openCharModal(charId = null) {
  const editingChar = charId !== null && charId !== undefined ? getCharacterById(decodeURIComponent(String(charId))) : null;
  if(editingChar && !canEditCharacter(editingChar)) return;
  const isEditing = !!editingChar;
  if(!isEditing && !isDM() && getOwnedCharacters().length >= MAX_PLAYER_CHARACTERS) {
    alert(`Puedes tener hasta ${MAX_PLAYER_CHARACTERS} personajes en esta campaña.`);
    updateCharacterCreateButton();
    return;
  }
  characterEditingId = isEditing ? editingChar.id : null;
  const title = document.getElementById('charModalTitle');
  const saveBtn = document.getElementById('charModalSaveBtn');
  if(title) title.textContent = isEditing ? 'Editar ficha de personaje' : 'Crear Personaje';
  if(saveBtn) saveBtn.textContent = isEditing ? 'Guardar Cambios' : 'Guardar Personaje';
  document.getElementById('newCharName').value = editingChar?.name || '';
  document.getElementById('newCharRace').value = editingChar?.race || '';
  document.getElementById('newCharClass').value = editingChar?.class || '';
  document.getElementById('newCharLevel').value = Math.max(1, parseInt(editingChar?.level) || 1);
  document.getElementById('newCharStr').value = editingChar?.attributes?.str ?? 10;
  document.getElementById('newCharDex').value = editingChar?.attributes?.dex ?? 10;
  document.getElementById('newCharCon').value = editingChar?.attributes?.con ?? 10;
  document.getElementById('newCharInt').value = editingChar?.attributes?.int ?? 10;
  document.getElementById('newCharWis').value = editingChar?.attributes?.wis ?? 10;
  document.getElementById('newCharCha').value = editingChar?.attributes?.cha ?? 10;
  document.getElementById('newCharInit').value = editingChar?.initiative ?? 10;
  document.getElementById('newCharHp').value = editingChar?.maxHp ?? 15;
  const colorInput = document.getElementById('newCharColor');
  if(colorInput) {
    colorInput.value = normalizeTokenColor(editingChar?.color, randColor());
    colorInput.oninput = updateCharColorPreview;
    updateCharColorPreview();
  }
  const vision = editingChar ? normalizeCharacterVision(editingChar) : {...characterVisionDefaults};
  const visionRadius = document.getElementById('newCharVisionRadius');
  const visionAngle = document.getElementById('newCharVisionAngle');
  const visionTeam = document.getElementById('newCharVisionTeam');
  const visionClearsFog = document.getElementById('newCharVisionClearsFog');
  if(visionRadius) visionRadius.value = String(vision.radiusSquares);
  if(visionAngle) visionAngle.value = String(vision.angle);
  if(visionTeam) visionTeam.value = vision.team;
  if(visionClearsFog) visionClearsFog.checked = vision.clearsFog !== false;
  characterDraftSkills = Object.entries(editingChar?.skills || {}).map(([name, mod]) => ({name, mod: parseInt(mod) || 0}));
  const skillNameInput = document.getElementById('newCharSkillName');
  const skillModInput = document.getElementById('newCharSkillMod');
  if(skillNameInput) skillNameInput.value = '';
  if(skillModInput) skillModInput.value = '0';
  renderCharacterDraftSkills();
  const typeSelect=document.getElementById('newCharType');
  if(typeSelect) {
    typeSelect.value=editingChar?.type || 'player';
    typeSelect.disabled=!isDM() || isEditing;
    const typeGroup=typeSelect.closest('.form-group');
    if(typeGroup) typeGroup.style.display=isDM()?'':'none';
  }
  document.getElementById('charModalOverlay').classList.add('active');
}
function saveCharacter() {
  const editingChar = characterEditingId !== null ? getCharacterById(characterEditingId) : null;
  if(editingChar && !canEditCharacter(editingChar)) return;
  if(!editingChar && !isDM() && getOwnedCharacters().length >= MAX_PLAYER_CHARACTERS) {
    alert(`Puedes tener hasta ${MAX_PLAYER_CHARACTERS} personajes en esta campaña.`);
    closeModals();
    updateCharacterCreateButton();
    return;
  }
  const name = document.getElementById('newCharName').value||'Héroe';
  const race = document.getElementById('newCharRace').value||'Desconocida';
  const cls  = document.getElementById('newCharClass').value||'Aventurero';
  const type = editingChar ? editingChar.type : (isDM() ? document.getElementById('newCharType').value : 'player');
  const level = Math.max(1, parseInt(document.getElementById('newCharLevel').value)||1);
  const hp   = parseInt(document.getElementById('newCharHp').value)||10;
  const init = parseInt(document.getElementById('newCharInit').value)||10;
  const tokenColor = normalizeTokenColor(document.getElementById('newCharColor')?.value, editingChar?.color || randColor());
  const attr = {
    str:parseInt(document.getElementById('newCharStr').value)||10,
    dex:parseInt(document.getElementById('newCharDex').value)||10,
    con:parseInt(document.getElementById('newCharCon').value)||10,
    int:parseInt(document.getElementById('newCharInt').value)||10,
    wis:parseInt(document.getElementById('newCharWis').value)||10,
    cha:parseInt(document.getElementById('newCharCha').value)||10
  };
  const vision = getCharacterVisionFromModal(editingChar);
  if(editingChar) {
    const hpDelta = hp - (parseInt(editingChar.maxHp) || hp);
    Object.assign(editingChar, {
      name, race, class:cls, level, type, initiative:init,
      maxHp:hp, hp:Math.max(0, Math.min(hp, (parseInt(editingChar.hp) || hp) + hpDelta)),
      initials:initials(name), color:tokenColor, attributes:attr, skills:getCharacterDraftSkills(), vision
    });
    if(type==='player') saveChars();
    else saveEnemies();
    combatants = getInitiativeCombatants();
    closeModals();
    characterEditingId = null;
    updateChatSenders();
    renderInitiative();
    renderCharListSidebar();
    renderPersonajePage();
    renderInventarioPage();
    renderHechizosPage();
    renderAtaquePage();
    renderQuickCombatPanel();
    renderEnemiesPage();
    if(typeof drawMap === 'function') drawMap();
    addChatMessage('sys','',`Ficha actualizada: <b>${escapeHTML(name)}</b>.`);
    return;
  }
  // Determine userId: if player is creating their own, link it
  const userId = (!isDM() && state.currentUser) ? state.currentUser.id : null;
  const obj = {
    id:Date.now(), name, race, class:cls, level, hp, maxHp:hp, type, initiative:init,
    color:tokenColor, initials:initials(name), online:true, portrait:null,
    attributes:attr,
    skills:getCharacterDraftSkills(),
    inventory:[], copper:0, silver:0, gold:0, spells:null, userId, vision
  };
  if(type==='player') { characters.push(obj); saveChars(); }
  else { enemies.push(obj); saveEnemies(); }
  combatants = getInitiativeCombatants();
  closeModals();
  state.activeCharId = obj.id;
  saveLS('crq_active_char_id', obj.id);
  updateChatSenders();
  renderInitiative();
  renderCharListSidebar();
  updateCharacterCreateButton();
  restoreCharDetail();
  renderPersonajePage();
  renderInventarioPage();
  renderHechizosPage();
  renderAtaquePage();
  renderQuickCombatPanel();
  renderEnemiesPage();
  addChatMessage('sys','',`<b>${name}</b> se ha unido a la campaña.`);
}

function levelUpCharacter(charId = state.activeCharId) {
  const c = getCharacterById(charId);
  if(!canEditCharacter(c)) return;
  c.level = Math.max(1, parseInt(c.level) || 1) + 1;
  saveChars();
  renderCharListSidebar();
  renderPersonajePage();
  renderInventarioPage();
  renderHechizosPage();
  renderAtaquePage();
  renderQuickCombatPanel();
  addChatMessage('sys','',`⬆ <b>${escapeHTML(c.name)}</b> subió a nivel ${c.level}. Ajusta su ficha si recibió mejoras.`);
  openCharModal(c.id);
}

function openMapListModal() {
  updateTokenPanelAvoidance(true);
  document.getElementById('mapListModalOverlay').classList.add('active');
  document.getElementById('btnNewMap').style.display = isDM() ? '' : 'none';
  renderMapList();
}
function getMapEditorNumber(id, fallback = 0) {
  const value = Number(document.getElementById(id)?.value);
  return Number.isFinite(value) ? value : fallback;
}
function setMapEditorValue(id, value) {
  const el = document.getElementById(id);
  if(el) el.value = value ?? '';
}
function updateMapConfigLabels() {
  const padding = document.getElementById('newMapPaddingPct');
  const opacity = document.getElementById('newMapGridOpacity');
  const paddingLabel = document.getElementById('newMapPaddingLabel');
  const opacityLabel = document.getElementById('newMapGridOpacityLabel');
  if(paddingLabel && padding) paddingLabel.textContent = Number(padding.value || 0).toFixed(2);
  if(opacityLabel && opacity) opacityLabel.textContent = Number(opacity.value || 0).toFixed(2);
}
function getMapEditorDraft() {
  const modal = document.getElementById('mapCreateModalOverlay');
  const map = maps.find(m => String(m.id) === String(modal?.dataset.mapId));
  if(!map || map.id !== state.activeMapId) return null;
  return {
    ...map,
    gridType: document.getElementById('newMapGridType')?.value || map.gridType || 'square',
    gridPixelSize: Math.max(0, parseFloat(document.getElementById('newMapGridPixelSize')?.value) || 0),
    sceneWidth: Math.max(0, parseInt(document.getElementById('newMapSceneWidth')?.value) || 0),
    sceneHeight: Math.max(0, parseInt(document.getElementById('newMapSceneHeight')?.value) || 0),
    paddingPct: Math.max(0, Math.min(0.5, parseFloat(document.getElementById('newMapPaddingPct')?.value) || 0)),
    backgroundOffsetX: getMapEditorNumber('newMapOffsetX', 0),
    backgroundOffsetY: getMapEditorNumber('newMapOffsetY', 0),
    gridWidth: Math.max(0, parseInt(document.getElementById('newMapGridWidth')?.value) || 0),
    gridHeight: Math.max(0, parseInt(document.getElementById('newMapGridHeight')?.value) || 0),
    gridStyle: document.getElementById('newMapGridStyle')?.value || map.gridStyle || 'solid',
    gridThickness: Math.max(0.25, parseFloat(document.getElementById('newMapGridThickness')?.value) || 1),
    gridColor: /^#[0-9a-f]{6}$/i.test(document.getElementById('newMapGridColor')?.value || '') ? document.getElementById('newMapGridColor').value : '#a855f7',
    gridOpacity: Math.max(0, Math.min(1, parseFloat(document.getElementById('newMapGridOpacity')?.value) || 0)),
    gridHidden: document.getElementById('newMapHideGrid')?.checked === true
  };
}
function previewMapEditorGrid() {
  updateMapConfigLabels();
  const draft = getMapEditorDraft();
  if(!draft) {
    mapState.gridPreview = null;
    return;
  }
  mapState.gridPreview = draft;
  mapState.gridVisible = draft.gridHidden !== true;
  if(mapState.canvas && typeof drawMap === 'function') drawMap();
}
function clearMapEditorGridPreview() {
  if(!mapState?.gridPreview) return;
  mapState.gridPreview = null;
  const activeMap = maps.find(m => m.id === state.activeMapId);
  mapState.gridVisible = activeMap?.gridHidden !== true;
  if(mapState.canvas && typeof drawMap === 'function') drawMap();
}
function bindMapEditorPreview() {
  const modal = document.getElementById('mapCreateModalOverlay');
  if(!modal) return;
  modal.querySelectorAll('input,select').forEach(el => {
    if(el.dataset.previewBound === 'true') return;
    el.dataset.previewBound = 'true';
    el.addEventListener('input', previewMapEditorGrid);
    el.addEventListener('change', previewMapEditorGrid);
  });
}
function syncMapSceneDimensions() {
  const preview = document.getElementById('newMapPreview');
  const width = Number(preview?.dataset.naturalWidth) || preview?.naturalWidth || 0;
  const height = Number(preview?.dataset.naturalHeight) || preview?.naturalHeight || 0;
  if(!width || !height) {
    alert('Primero selecciona una imagen del mapa para tomar sus dimensiones.');
    return;
  }
  setMapEditorValue('newMapSceneWidth', Math.round(width));
  setMapEditorValue('newMapSceneHeight', Math.round(height));
  previewMapEditorGrid();
}
function openMapCreateModal(mapId = null) {
  if(!isDM()) return;
  closeModals();
  updateTokenPanelAvoidance(true);
  const modal = document.getElementById('mapCreateModalOverlay');
  const map = maps.find(m => String(m.id) === String(mapId));
  modal.dataset.mapId = map?.id || '';
  document.getElementById('mapEditorTitle').textContent = map ? 'Editar Mapa' : 'Nuevo Mapa';
  document.getElementById('newMapName').value = map?.name || '';
  document.getElementById('newMapAuthor').value = map?.author || 'Mis Mapas';
  setMapEditorValue('newMapGridType', map?.gridType || 'square');
  setMapEditorValue('newMapGridPixelSize', map?.gridPixelSize || '');
  setMapEditorValue('newMapSceneWidth', map?.sceneWidth || '');
  setMapEditorValue('newMapSceneHeight', map?.sceneHeight || '');
  setMapEditorValue('newMapPaddingPct', Number.isFinite(Number(map?.paddingPct)) ? Number(map.paddingPct) : 0.05);
  setMapEditorValue('newMapOffsetX', Number.isFinite(Number(map?.backgroundOffsetX)) ? Number(map.backgroundOffsetX) : 0);
  setMapEditorValue('newMapOffsetY', Number.isFinite(Number(map?.backgroundOffsetY)) ? Number(map.backgroundOffsetY) : 0);
  document.getElementById('newMapGridWidth').value = map?.gridWidth || '';
  document.getElementById('newMapGridHeight').value = map?.gridHeight || '';
  document.getElementById('newMapFeetPerSquare').value = map?.feetPerSquare || 5;
  document.getElementById('newMapDistanceUnit').value = map?.distanceUnit || 'pies';
  setMapEditorValue('newMapGridStyle', map?.gridStyle || 'solid');
  setMapEditorValue('newMapGridThickness', Number.isFinite(Number(map?.gridThickness)) ? Number(map.gridThickness) : 1);
  setMapEditorValue('newMapGridColor', /^#[0-9a-f]{6}$/i.test(map?.gridColor || '') ? map.gridColor : '#a855f7');
  setMapEditorValue('newMapGridOpacity', Number.isFinite(Number(map?.gridOpacity)) ? Number(map.gridOpacity) : 0.16);
  document.getElementById('newMapHideGrid').checked = map?.gridHidden === true;
  document.getElementById('newMapImageFile').value = '';
  const preview = document.getElementById('newMapPreview');
  preview.src = map?.image || '';
  preview.dataset.naturalWidth = map?.imageWidth || '';
  preview.dataset.naturalHeight = map?.imageHeight || '';
  preview.style.display = map?.image ? '' : 'none';
  updateMapConfigLabels();
  bindMapEditorPreview();
  previewMapEditorGrid();
  modal.classList.add('active');
}
function previewMapImage(event) {
  const file = event.target.files?.[0];
  const preview = document.getElementById('newMapPreview');
  if(!file) return;
  preview.src = URL.createObjectURL(file);
  preview.onload = () => {
    preview.dataset.naturalWidth = preview.naturalWidth || '';
    preview.dataset.naturalHeight = preview.naturalHeight || '';
    if(!document.getElementById('newMapSceneWidth').value) document.getElementById('newMapSceneWidth').value = preview.naturalWidth || '';
    if(!document.getElementById('newMapSceneHeight').value) document.getElementById('newMapSceneHeight').value = preview.naturalHeight || '';
  };
  preview.style.display = '';
}
function filterMapList() { renderMapList(); }
function renderMapList() {
  const s = document.getElementById('mapSearchInput').value.toLowerCase();
  const c = document.getElementById('mapListContainer');
  c.innerHTML='';
  maps.filter(m=>String(m.name||'').toLowerCase().includes(s)||String(m.author||'').toLowerCase().includes(s)).forEach(m=>{
    c.insertAdjacentHTML('beforeend',`
      <div class="map-list-item ${m.id===state.activeMapId?'active':''}" onclick="selectMap(${m.id})">
        <img src="${m.thumb||defaultMapThumb}" class="map-thumb" alt="">
        <div class="map-info"><div class="map-title">${escapeHTML(m.name)}</div><div class="map-author">${escapeHTML(m.author)} · ${m.gridWidth&&m.gridHeight?`${m.gridWidth}×${m.gridHeight} casillas`:'rejilla automática'}</div></div>
        ${isDM()?`<button class="btn-secondary" style="padding:7px 9px;" onclick="event.stopPropagation();openMapCreateModal(${m.id})" title="Editar calibración del mapa">⚙</button>`:''}
      </div>`);
  });
}
function selectMap(id) {
  if(typeof multiplayer !== 'undefined' && multiplayer.isActive() && !isDM()) return;
  state.activeMapId=id;
  saveLS('crq_active_map_id', id);
  loadActiveMap();
  closeModals();
  addChatMessage('sys','',`Mapa cargado: <b>${escapeHTML(maps.find(m=>m.id===id)?.name || 'Mapa')}</b>`);
  if (typeof multiplayer !== 'undefined' && multiplayer.isHost()) {
    multiplayer.broadcast({
      type: 'map_change',
      activeMapId: id,
      tokens: mapState.tokens,
      structures: mapState.structures,
      walls: mapState.walls,
      fogOfWar: mapState.fogOfWar,
      fogStrokes: mapState.fogStrokes,
      fogExploredAreas: mapState.fogExploredAreas,
      exploredFogPolygons: mapState.exploredFogPolygons
    });
  }
}
function openSceneListModal() {
  if(!isDM()) return;
  updateTokenPanelAvoidance(true);
  const input=document.getElementById('newSceneName');
  if(input && !input.value.trim()) {
    const map=maps.find(m=>m.id===state.activeMapId);
    input.value=map ? map.name : '';
  }
  document.getElementById('sceneListModalOverlay').classList.add('active');
  renderSceneList();
}
function captureCurrentSceneData() {
  storeCurrentMapTokens();
  storeCurrentMapStructures();
  storeCurrentMapWalls();
  storeCurrentMapFog();
  const map=maps.find(m=>m.id===state.activeMapId);
  return {
    mapId: state.activeMapId,
    mapSnapshot: map ? cloneGameData(map) : null,
    tokens: cloneGameData(mapState.tokens),
    structures: cloneGameData(mapState.structures),
    walls: cloneGameData(mapState.walls),
    fogOfWar: mapState.fogOfWar,
    fogStrokes: cloneGameData(mapState.fogStrokes),
    fogExploredAreas: mapState.fogExploredAreas,
    exploredFogPolygons: cloneGameData(mapState.exploredFogPolygons),
    weather: mapState.weather,
    music: mapState.music,
    externalMusicUrl: mapState.externalMusicUrl,
    mapView: getCurrentMapView()
  };
}
function saveCurrentScene() {
  if(!isDM()) return;
  const input=document.getElementById('newSceneName');
  const map=maps.find(m=>m.id===state.activeMapId);
  const name=(input?.value || '').trim() || `Escena - ${map?.name || 'Mapa'}`;
  scenes.unshift({
    id: Date.now(),
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    data: captureCurrentSceneData()
  });
  saveScenes();
  if(input) input.value='';
  renderSceneList();
  addChatMessage('sys','',`🎬 Escena guardada: <b>${escapeHTML(name)}</b>.`);
}
function updateScene(id) {
  if(!isDM()) return;
  const scene=scenes.find(s=>s.id===id);
  if(!scene) return;
  scene.updatedAt=Date.now();
  scene.data=captureCurrentSceneData();
  saveScenes();
  renderSceneList();
  addChatMessage('sys','',`🎬 Escena actualizada: <b>${escapeHTML(scene.name)}</b>.`);
}
function deleteScene(id) {
  if(!isDM()) return;
  if(!confirm('¿Borrar esta escena?')) return;
  scenes=scenes.filter(s=>s.id!==id);
  saveScenes();
  renderSceneList();
}
function renderSceneList() {
  const box=document.getElementById('sceneListContainer');
  if(!box) return;
  if(!scenes.length) {
    box.innerHTML='<div class="scene-empty">Todavía no hay escenas. Coloca mapa, tokens y ambiente, luego guarda la escena actual.</div>';
    return;
  }
  box.innerHTML=scenes.map(scene=>{
    const data=scene.data || {};
    const map=maps.find(m=>m.id===data.mapId) || data.mapSnapshot || {};
    const active=data.mapId===state.activeMapId ? 'active' : '';
    const date=new Date(scene.updatedAt || scene.createdAt || Date.now()).toLocaleString();
    return `
      <div class="scene-list-item ${active}">
        <img src="${map.thumb || map.image || defaultMapThumb}" class="scene-thumb" alt="">
        <div class="scene-info">
          <div class="scene-title">${escapeHTML(scene.name)}</div>
          <div class="scene-meta">${escapeHTML(map.name || 'Mapa')} · ${(data.tokens || []).length} tokens · ${escapeHTML(data.weather || 'sin clima')} · ${escapeHTML(date)}</div>
        </div>
        <div class="scene-actions">
          <button class="btn-primary" onclick="loadScene(${scene.id})">Cargar</button>
          <button class="btn-secondary" onclick="updateScene(${scene.id})" title="Sobrescribir con el tablero actual">Actualizar</button>
          <button class="btn-danger" onclick="deleteScene(${scene.id})" title="Borrar escena">×</button>
        </div>
      </div>`;
  }).join('');
}
function broadcastSceneState(sceneData) {
  if (typeof multiplayer !== 'undefined' && multiplayer.isHost()) {
    multiplayer.broadcast({
      type: 'map_change',
      activeMapId: state.activeMapId,
      mapSnapshot: sceneData.mapSnapshot || null,
      tokens: mapState.tokens,
      structures: mapState.structures,
      walls: mapState.walls,
      fogOfWar: mapState.fogOfWar,
      fogStrokes: mapState.fogStrokes,
      fogExploredAreas: mapState.fogExploredAreas,
      exploredFogPolygons: mapState.exploredFogPolygons,
      weather: sceneData.weather,
      music: sceneData.music,
      externalMusicUrl: sceneData.externalMusicUrl,
      mapView: sceneData.mapView
    });
  }
}
function loadScene(id) {
  if(!isDM()) return;
  const scene=scenes.find(s=>s.id===id);
  if(!scene || !scene.data) return;
  const data=scene.data;
  if(data.mapSnapshot && !maps.some(m=>m.id===data.mapId)) {
    maps.push(cloneGameData(data.mapSnapshot));
  }
  const activeMap=maps.find(m=>m.id===data.mapId);
  if(!activeMap) {
    addChatMessage('sys','','No se pudo cargar la escena: falta el mapa original.');
    return;
  }
  state.activeMapId=data.mapId;
  activeMap.tokens=cloneGameData(data.tokens || []);
  activeMap.structures=cloneGameData(data.structures || []);
  activeMap.walls=cloneGameData(data.walls || []);
  activeMap.fogOfWar=data.fogOfWar === true;
  activeMap.fogStrokes=cloneGameData(data.fogStrokes || []);
  activeMap.fogExploredAreas=data.fogExploredAreas === true;
  activeMap.exploredFogPolygons=cloneGameData(data.exploredFogPolygons || []);
  saveMaps();
  saveLS('crq_active_map_id', state.activeMapId);
  loadActiveMap(data.mapView || null);
  setWeather(data.weather || 'none', true);
  if(data.externalMusicUrl) playExternalMusic(data.externalMusicUrl,true);
  else setMusic(data.music || 'none', true);
  closeModals();
  renderSceneList();
  addChatMessage('sys','',`🎬 Escena cargada: <b>${escapeHTML(scene.name)}</b>.`);
  broadcastSceneState(data);
}
function saveMap() {
  if(!isDM()) return;
  const name   = document.getElementById('newMapName').value||'Nuevo Mapa';
  const author = document.getElementById('newMapAuthor').value||'Mis Mapas';
  const fi = document.getElementById('newMapImageFile');
  const modal = document.getElementById('mapCreateModalOverlay');
  const editing = maps.find(m => String(m.id) === String(modal.dataset.mapId));
  const gridType = document.getElementById('newMapGridType').value || 'square';
  const gridPixelSize = Math.max(0, parseFloat(document.getElementById('newMapGridPixelSize').value) || 0);
  const sceneWidth = Math.max(0, parseInt(document.getElementById('newMapSceneWidth').value) || 0);
  const sceneHeight = Math.max(0, parseInt(document.getElementById('newMapSceneHeight').value) || 0);
  const paddingPct = Math.max(0, Math.min(0.5, parseFloat(document.getElementById('newMapPaddingPct').value) || 0));
  const backgroundOffsetX = getMapEditorNumber('newMapOffsetX', 0);
  const backgroundOffsetY = getMapEditorNumber('newMapOffsetY', 0);
  const gridWidth = Math.max(0, parseInt(document.getElementById('newMapGridWidth').value) || 0);
  const gridHeight = Math.max(0, parseInt(document.getElementById('newMapGridHeight').value) || 0);
  const feetPerSquare = Math.max(1, parseFloat(document.getElementById('newMapFeetPerSquare').value) || 5);
  const distanceUnit = document.getElementById('newMapDistanceUnit').value || 'pies';
  const gridStyle = document.getElementById('newMapGridStyle').value || 'solid';
  const gridThickness = Math.max(0.25, parseFloat(document.getElementById('newMapGridThickness').value) || 1);
  const gridColor = /^#[0-9a-f]{6}$/i.test(document.getElementById('newMapGridColor').value || '') ? document.getElementById('newMapGridColor').value : '#a855f7';
  const gridOpacity = Math.max(0, Math.min(1, parseFloat(document.getElementById('newMapGridOpacity').value) || 0));
  const gridHidden = document.getElementById('newMapHideGrid').checked;
  const create = (img) => {
    const preview = document.getElementById('newMapPreview');
    const imageWidth = Number(preview?.dataset.naturalWidth) || 0;
    const imageHeight = Number(preview?.dataset.naturalHeight) || 0;
    const mapData = {
      name, author, gridType, gridPixelSize, sceneWidth, sceneHeight,
      paddingPct, backgroundOffsetX, backgroundOffsetY,
      gridWidth, gridHeight, feetPerSquare, distanceUnit,
      gridStyle, gridThickness, gridColor, gridOpacity, gridHidden,
      imageWidth, imageHeight
    };
    if(editing) {
      Object.assign(editing, mapData);
      if(img) editing.thumb = editing.image = img;
    } else {
      maps.push({id:Date.now(),...mapData,thumb:img||defaultMapThumb,image:img||'',bg:'#000',rooms:[],tokens:[],structures:[],walls:[],fogOfWar:false,fogStrokes:[],fogExploredAreas:false,exploredFogPolygons:[]});
    }
    saveMaps(); closeModals(); openMapListModal();
    if(editing && editing.id === state.activeMapId) loadActiveMap();
    if (typeof multiplayer !== 'undefined' && multiplayer.isHost()) {
      multiplayer.broadcast({
        type: 'init_state',
        characters,
        enemies,
        npcs,
        maps,
        activeMapId: state.activeMapId,
        tokens: mapState.tokens,
        walls: mapState.walls,
        fogOfWar: mapState.fogOfWar,
        fogStrokes: mapState.fogStrokes,
        fogExploredAreas: mapState.fogExploredAreas,
        exploredFogPolygons: mapState.exploredFogPolygons,
        currentTurnIndex: state.currentTurnIndex,
        round: state.round,
        weather: mapState.weather,
        music: mapState.music,
        externalMusicUrl: mapState.externalMusicUrl,
        manualAdaptation,
        mapView: getCurrentMapView()
      });
    }
  };
  if(fi.files&&fi.files[0]) {
    const r=new FileReader();
    r.onload=e=> {
      compressImage(e.target.result, 1200, 1200, 0.7, (compressedImg) => {
        create(compressedImg);
      });
    };
    r.readAsDataURL(fi.files[0]);
  }
  else create(null);
}

// ===================================================
// CHAT
// ===================================================
function updateChatSenders() {
  const sel = document.getElementById('chatSender');
  if(!sel) return;
  sel.innerHTML = '';
  if(isDM()) {
    sel.insertAdjacentHTML('beforeend','<option value="DM">👑 Dungeon Master</option>');
    characters.forEach(c=>sel.insertAdjacentHTML('beforeend',`<option value="${escapeHTML(c.id)}">${escapeHTML(c.name)}</option>`));
  } else if(state.currentUser) {
    characters.filter(c=>c.userId===state.currentUser.id)
      .forEach(c=>sel.insertAdjacentHTML('beforeend',`<option value="${escapeHTML(c.id)}">${escapeHTML(c.name)}</option>`));
  }
  if(!sel.options.length) {
    sel.insertAdjacentHTML('beforeend','<option value="">Sin personaje asignado</option>');
  }
}
function sendChatMessage() {
  const inp = document.getElementById('chatInputMsg');
  const msg = inp.value.trim();
  if(!msg) return;
  const sel = document.getElementById('chatSender');
  if(!sel || !sel.value) return;
  const isDm = isDM() && sel.value==='DM';
  let senderName = sel.options[sel.selectedIndex].text;
  if(!isDM()) {
    const myChar = characters.find(c=>String(c.id)===String(sel.value) && c.userId===state.currentUser?.id);
    if(!myChar) return;
    senderName = myChar.name;
  }
  
  addChatMessage(isDm?'dm':'player', escapeHTML(senderName), escapeHTML(msg));
  
  if (typeof multiplayer !== 'undefined' && multiplayer.isActive()) {
    multiplayer.sendChat(isDm?'dm':'player', senderName, msg);
  }
  inp.value='';
}
function addChatMessage(type,sender,text) {
  const box = document.getElementById('chatBox');
  if(!box) return;
  let html;
  if(type==='sys') html=`<div class="chat-msg msg-sys">${text}</div>`;
  else html=`<div class="chat-msg msg-${type}"><div class="msg-sender">${sender}</div><div>${text}</div></div>`;
  box.insertAdjacentHTML('beforeend',html);
  box.scrollTop=box.scrollHeight;
}

// ===================================================
// INITIATIVE
// ===================================================
function renderInitiative() {
  const panel = document.getElementById('mapInitiativePanel');
  const list = document.getElementById('initiativeList');
  if(panel) panel.style.display = isDM() ? 'flex' : 'none';
  if(!isDM()) {
    if(list) list.innerHTML = '';
    return;
  }
  if(!list) return;
  list.innerHTML='';
  if(combatants.length === 0) state.currentTurnIndex = 0;
  else if(!Number.isInteger(state.currentTurnIndex) || state.currentTurnIndex >= combatants.length) {
    state.currentTurnIndex = 0;
  }
  combatants.forEach((c,i)=>{
    const hp=Math.max(0,parseInt(c.hp) || 0);
    const maxHp=Math.max(1,parseInt(c.maxHp) || hp || 1);
    const pct=Math.max(0,Math.min(100,(hp/maxHp)*100));
    const isOnMap = mapState.tokens.some(t => t.id === c.id);
    const canToggleToken = isDM() || (state.currentUser && c.type === 'player' && c.userId === state.currentUser.id);
    const typeLabel = c.type === 'player' ? 'Jugador' : (c.type === 'npc' ? 'NPC' : 'Enemigo');
    const typeClass = c.type === 'player' ? 'tag-player' : (c.type === 'npc' ? 'tag-npc' : 'tag-enemy');
    const tokenActionBtn = canToggleToken ? `<button onclick="toggleMapToken('${c.id}')" style="background:rgba(255,255,255,0.08);border:1px solid var(--glass-border);color:${isOnMap?'var(--ruby)':'var(--emerald)'};width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:bold;cursor:pointer;flex-shrink:0;" title="${isOnMap?'Quitar del mapa':'Poner en mapa'}">${isOnMap?'✕':'＋'}</button>` : '';
    const rollDetail = c.lastInitiativeRoll
      ? `<div class="init-roll-detail">d20 ${c.lastInitiativeRoll.roll} ${fmtMod(c.lastInitiativeRoll.mod)} = ${c.lastInitiativeRoll.total}</div>`
      : '';
    
    list.insertAdjacentHTML('beforeend',`
      <div class="init-item ${i===state.currentTurnIndex?'active-turn':''}">
        <div class="init-val">${c.initiative}</div>
        <div class="init-avatar" style="background:${c.color}">${c.portrait ? `<img src="${c.portrait}" style="width:100%;height:100%;object-fit:cover;">` : c.initials}</div>
        <div class="init-info">
          <div class="init-name" style="display:flex;justify-content:space-between;align-items:center;width:100%;">
            <span>${c.name}</span>
            <div style="display:flex;gap:6px;align-items:center;">
              <span class="init-tags ${typeClass}">${typeLabel}</span>
              ${tokenActionBtn}
            </div>
          </div>
          <div class="hp-bar-container"><div class="hp-bar" style="width:${pct}%;background:${getHpColor(hp,maxHp)};"></div></div>
          ${rollDetail}
        </div>
      </div>`);
  });
  document.getElementById('roundCount').textContent = state.round;
}
function getInitiativeModifier(combatant) {
  return calcMod(parseInt(combatant?.attributes?.dex) || 10);
}
function rebuildCombatantsByInitiative() {
  combatants=getInitiativeCombatants();
}
function rollInitiativeForCombatants() {
  if(!isDM()) return;
  const all=getInitiativeCombatants();
  if(all.length===0) {
    addChatMessage('sys','','No hay combatientes para tirar iniciativa.');
    return;
  }
  all.forEach(c=>{
    const roll=Math.floor(Math.random()*20)+1;
    const mod=getInitiativeModifier(c);
    const total=roll+mod;
    c.initiative=total;
    c.lastInitiativeRoll={roll,mod,total};
  });
  rebuildCombatantsByInitiative();
  state.currentTurnIndex=0;
  state.round=1;
  saveChars();
  saveEnemies();
  saveNpcs();
  renderInitiative();
  renderCharListSidebar();
  renderEnemiesPage();
  const detail=combatants.map(c=>`${escapeHTML(c.name)}: <b>${c.initiative}</b>`).join(' · ');
  addChatMessage('sys','',`🎲 <b>Iniciativa automática:</b> ${detail}`);
  if (typeof multiplayer !== 'undefined' && multiplayer.isActive()) {
    multiplayer.broadcast({ type: 'turn_update', currentTurnIndex: 0, round: 1 });
  }
}
function syncMapTokens() {
  const m = maps.find(m => m.id === state.activeMapId);
  mapState.tokens.forEach(normalizeTokenGridSize);
  if (m) {
    m.tokens = JSON.parse(JSON.stringify(mapState.tokens));
    saveMaps();
  }
}

function broadcastMapTokens() {
  if (typeof multiplayer !== 'undefined' && multiplayer.isActive()) {
    multiplayer.broadcast({ type: 'tokens_update', tokens: mapState.tokens });
  }
}

function updatePortraitMapTokenButton() {
  const btn=document.getElementById('portraitMapTokenBtn');
  if(!btn) return;
  const c=getActiveChar();
  const canUse=!!c && canEditCharacter(c);
  btn.style.display=canUse ? '' : 'none';
  if(!canUse) return;
  const onMap=mapState.tokens.some(token=>String(token.id)===String(c.id));
  btn.textContent=onMap ? '✕ Quitar token' : '📍 Poner token';
  btn.classList.toggle('on-map', onMap);
}

function toggleActiveCharacterMapToken() {
  const c=getActiveChar();
  if(!canEditCharacter(c)) return;
  toggleMapToken(c.id);
  updatePortraitMapTokenButton();
}

function addMapTokenForCombatant(combatantId, options = {}) {
  const cid = isNaN(combatantId) ? combatantId : parseInt(combatantId);
  const c = getCombatantById(cid);
  if (!c || (!isDM() && !canEditCharacter(c))) return;
  const sameTokens = mapState.tokens.filter(t => String(t.id) === String(cid));
  const base = sameTokens[sameTokens.length - 1];
  const grid=getActiveMapGrid();
  const offset = grid.size * (1 + (sameTokens.length % 4));
  const start = base ? {x:base.x + offset,y:base.y + offset} : {x:grid.size*2.5,y:grid.size*2.5};
  const snapped = snapMapPointToGrid(start, {sizeSquares:1});
  mapState.tokens.push({
    tokenId: 'tk_' + Date.now() + '_' + Math.random().toString(36).slice(2,8),
    id: cid,
    x: snapped.x,
    y: snapped.y,
    tx: snapped.x,
    ty: snapped.y,
    sizeSquares: 1,
    radius: grid.size / 2
  });
  syncMapTokens();
  drawMap();
  renderInitiative();
  renderEnemiesPage();
  renderNpcPage();
  updatePortraitMapTokenButton();
  addChatMessage('sys', '', `<b>${escapeHTML(c.name)}</b> ${options.duplicate ? 'duplicado' : 'añadido'} al mapa.`);
  broadcastMapTokens();
}

function toggleMapToken(combatantId, options = {}) {
  const cid = isNaN(combatantId) ? combatantId : parseInt(combatantId);
  const c = getCombatantById(cid);
  if (!c) return;
  if (!isDM() && !canEditCharacter(c)) return;
  if (!isDM() && typeof multiplayer !== 'undefined' && multiplayer.isClient() && !options.fromHost) {
    multiplayer.broadcast({ type: 'token_toggle', combatantId: cid });
    return;
  }

  const tokenIndex = mapState.tokens.findIndex(t => t.id === cid);
  if (tokenIndex !== -1) {
    mapState.tokens.splice(tokenIndex, 1);
    addChatMessage('sys', '', `Token quitado del mapa.`);
  } else {
    addMapTokenForCombatant(cid);
    return;
  }
  syncMapTokens();
  drawMap();
  renderInitiative();
  renderEnemiesPage();
  renderNpcPage();
  updatePortraitMapTokenButton();
  broadcastMapTokens();
}
function nextTurn() {
  if(!isDM()) return;
  if(combatants.length === 0) {
    addChatMessage('sys','','No hay combatientes en la iniciativa.');
    return;
  }
  state.currentTurnIndex=(state.currentTurnIndex+1)%combatants.length;
  if(state.currentTurnIndex===0) state.round++;
  renderInitiative();
  addChatMessage('sys','',`Turno de <b>${combatants[state.currentTurnIndex].name}</b>`);
  if (typeof multiplayer !== 'undefined' && multiplayer.isActive()) {
    multiplayer.broadcast({ type: 'turn_update', currentTurnIndex: state.currentTurnIndex, round: state.round });
  }
}
function nextRound() {
  if(!isDM()) return;
  if(combatants.length === 0) {
    addChatMessage('sys','','No hay combatientes en la iniciativa.');
    return;
  }
  state.currentTurnIndex=0; state.round++;
  renderInitiative();
  addChatMessage('sys','',`🔥 <b>¡Ronda ${state.round}!</b>`);
  if (typeof multiplayer !== 'undefined' && multiplayer.isActive()) {
    multiplayer.broadcast({ type: 'turn_update', currentTurnIndex: state.currentTurnIndex, round: state.round });
  }
}
function resetRounds() {
  if(!isDM()) return;
  state.currentTurnIndex = 0;
  state.round = 1;
  renderInitiative();
  addChatMessage('sys','',`🔄 <b>Iniciativa reiniciada. ¡Ronda 1!</b>`);
  if (typeof multiplayer !== 'undefined' && multiplayer.isActive()) {
    multiplayer.broadcast({ type: 'turn_update', currentTurnIndex: 0, round: 1 });
  }
}

// ===================================================
// DICE ENGINE
// ===================================================
function parseDiceFormula(formula) {
  let cleaned = formula.replace(/\s+/g,'').toLowerCase();
  if(!cleaned) return null;
  const rolls=[]; let modifier=0;
  const dicePattern=/([+-]?)(?:(\d+))?d(\d+)/g;
  let match;
  while((match=dicePattern.exec(cleaned))!==null) {
    const sign=match[1]==='-'?-1:1;
    const count=match[2]?parseInt(match[2],10):1;
    const faces=parseInt(match[3],10);
    rolls.push({sign,count,faces});
  }
  const remains=cleaned.replace(/[+-]?(?:\d*)?d\d+/g,'');
  const modPattern=/([+-]?\d+)/g; let modMatch;
  while((modMatch=modPattern.exec(remains))!==null) modifier+=parseInt(modMatch[1],10);
  return {rolls,modifier};
}
function addDiceToFormula(faces) {
  const input=document.getElementById('diceFormulaInput');
  let val=input.value.trim();
  if(!val) { input.value=`1d${faces}`; return; }
  const regex=new RegExp(`(\\d*)d${faces}$`);
  const m=val.match(regex);
  if(m) { const count=m[1]?parseInt(m[1],10):1; val=val.replace(regex,`${count+1}d${faces}`); }
  else val=val+` + 1d${faces}`;
  input.value=val;
}
function clearFormula() {
  document.getElementById('diceFormulaInput').value='';
  const el=document.getElementById('rollResult'); el.textContent='--'; el.className='roll-result-display';
}
function rollDice(faces) { document.getElementById('diceFormulaInput').value=`1d${faces}`; rollFormula(); }
function rollFormula() {
  const input=document.getElementById('diceFormulaInput');
  const formula=input.value.trim(); if(!formula) return;
  const parsed=parseDiceFormula(formula);
  if(!parsed||(parsed.rolls.length===0&&parsed.modifier===0)) { addChatMessage('sys','',`Fórmula inválida: <b>${formula}</b>`); return; }
  let total=parsed.modifier; const details=[]; let hasCrit=false,hasFumble=false,primaryFaces=20,totalDiceCount=0;
  const allRolls=[];
  const diceVisuals=[];
  parsed.rolls.forEach(group=>{
    const groupRolls=[];
    for(let i=0;i<group.count;i++){
      const r=Math.floor(Math.random()*group.faces)+1;
      groupRolls.push(r); allRolls.push(r); diceVisuals.push({value:r,faces:group.faces}); total+=r*group.sign;
      if(group.faces===20){ if(r===20)hasCrit=true; if(r===1)hasFumble=true; }
    }
    totalDiceCount+=group.count; primaryFaces=group.faces;
    details.push(`${group.sign===-1?'-':''}[${groupRolls.join(', ')}]d${group.faces}`);
  });
  if(parsed.modifier!==0) details.push(fmtMod(parsed.modifier));
  const detailStr=details.join(' + ').replace(/\+\s*-/g,'- ');
  
  const sel=document.getElementById('chatSender');
  const senderName=sel.options[sel.selectedIndex].text;
  
  if (typeof multiplayer !== 'undefined' && multiplayer.isActive()) {
    multiplayer.broadcast({
      type: 'dice_roll',
      total,
      primaryFaces,
      allRolls,
      diceVisuals,
      formula,
      detailStr,
      hasCrit,
      hasFumble,
      senderName
    });
  }

  animate3DDice(total,primaryFaces,()=>{
    showRollResult(total,total,primaryFaces);
    if(totalDiceCount===1&&primaryFaces===20){
      const el=document.getElementById('rollResult'); el.className='roll-result-display';
      if(hasCrit)el.classList.add('crit'); if(hasFumble)el.classList.add('fumble');
    }
    sendFormulaRollToChat(formula,detailStr,total,hasCrit,hasFumble,senderName);
  },allRolls,diceVisuals);
}
function sendFormulaRollToChat(formula,details,total,hasCrit,hasFumble,senderName) {
  const sel=document.getElementById('chatSender');
  const isDm = senderName ? (senderName === 'DM' || senderName === 'Dungeon Master') : (sel.value==='DM');
  const name = senderName || sel.options[sel.selectedIndex].text;
  const safeName = escapeHTML(name);
  const safeFormula = escapeHTML(formula);
  const safeDetails = escapeHTML(details);
  let extra='',critClass='';
  if(hasCrit){extra='<div class="roll-total crit">¡CRÍTICO! 🎯</div>';critClass='crit';}
  else if(hasFumble){extra='<div class="roll-total fumble">¡PIFIA! 💀</div>';critClass='fumble';}
  document.getElementById('chatBox').insertAdjacentHTML('beforeend',`
    <div class="chat-msg msg-roll" style="border-left:3px solid ${isDm?'var(--accent)':'rgba(100,116,139,0.6)'}">
      <div class="msg-sender">${safeName}</div>
      <div>Tira <b>${safeFormula}</b></div>
      <div class="roll-details">${safeDetails}</div>
      <div class="roll-total ${critClass}">${total}</div>${extra}
    </div>`);
  document.getElementById('chatBox').scrollTop=99999;
}
function addSkillRollToChat(data) {
  let extra=data.hasCrit?'<div class="roll-total crit">Â¡CRÃTICO!</div>':(data.hasFumble?'<div class="roll-total fumble">Â¡PIFIA!</div>':'');
  document.getElementById('chatBox').insertAdjacentHTML('beforeend',`
    <div class="chat-msg msg-roll">
      <div class="msg-sender">${escapeHTML(data.senderName)}</div>
      <b>${escapeHTML(data.formula)}</b>
      <div class="roll-details">${escapeHTML(data.detailStr)}</div>
      <div class="roll-total ${data.hasCrit?'crit':data.hasFumble?'fumble':''}">${data.total}</div>${extra}
    </div>`);
  document.getElementById('chatBox').scrollTop=99999;
}
function addDiceRollToChat(data) {
  if(!data) return;
  if (String(data.formula || '').startsWith('Tirada de')) {
    addSkillRollToChat(data);
  } else {
    sendFormulaRollToChat(data.formula, data.detailStr, data.total, data.hasCrit, data.hasFumble, data.senderName);
  }
}
function shouldAnimateRemoteDiceRolls() {
  return false;
}
function normalizeDiceRollData(data, senderName = data?.senderName) {
  const total = Number(data?.total);
  const primaryFaces = Number(data?.primaryFaces);
  if(!Number.isFinite(total) || !Number.isFinite(primaryFaces) || primaryFaces < 2) return null;
  const allRolls = Array.isArray(data.allRolls)
    ? data.allRolls.map(Number).filter(Number.isFinite).slice(0,100)
    : [];
  const diceVisuals = Array.isArray(data.diceVisuals)
    ? data.diceVisuals.map(d=>({value:Number(d?.value),faces:Number(d?.faces)}))
        .filter(d=>Number.isFinite(d.value) && Number.isFinite(d.faces) && d.faces >= 2)
        .slice(0,100)
    : [];
  return {
    type:'dice_roll', total, primaryFaces, allRolls, diceVisuals,
    formula:String(data.formula ?? '').slice(0,120),
    detailStr:String(data.detailStr ?? '').slice(0,300),
    hasCrit:!!data.hasCrit, hasFumble:!!data.hasFumble,
    senderName:String(senderName ?? 'Jugador').slice(0,80)
  };
}
function rollSkill(charName,skillName,mod) {
  const roll=Math.floor(Math.random()*20)+1; const total=roll+mod;
  
  if (typeof multiplayer !== 'undefined' && multiplayer.isActive()) {
    multiplayer.broadcast({
      type: 'dice_roll',
      total: total,
      primaryFaces: 20,
      allRolls: [roll],
      diceVisuals: [{value:roll,faces:20}],
      formula: `Tirada de ${skillName}`,
      detailStr: `1d20(${roll}) ${fmtMod(mod)}`,
      hasCrit: roll===20,
      hasFumble: roll===1,
      senderName: charName
    });
  }

  animate3DDice(roll,20,()=>{
    showRollResult(total,roll,20);
    let extra=roll===20?'<div class="roll-total crit">¡CRÍTICO!</div>':(roll===1?'<div class="roll-total fumble">¡PIFIA!</div>':'');
    document.getElementById('chatBox').insertAdjacentHTML('beforeend',`
      <div class="chat-msg msg-roll">
        <div class="msg-sender">${charName}</div>
        <b>Tirada de ${skillName}</b>
        <div class="roll-details">1d20(${roll}) ${fmtMod(mod)}</div>
        <div class="roll-total ${roll===20?'crit':roll===1?'fumble':''}">${total}</div>${extra}
      </div>`);
    document.getElementById('chatBox').scrollTop=99999;
  },[roll],[{value:roll,faces:20}]);
}
function showRollResult(total,raw,faces) {
  const el=document.getElementById('rollResult'); el.className='roll-result-display';
  el.textContent=total;
  if(faces===20&&raw===20)el.classList.add('crit');
  if(faces===20&&raw===1)el.classList.add('fumble');
  el.style.transform='scale(1.25)'; setTimeout(()=>el.style.transform='scale(1)',150);
}
function getVisualDiceFaces(faces) {
  const allowed = [4,6,8,10,12,20,100];
  const numericFaces = Number(faces);
  if(numericFaces === 100) return 100;
  return allowed.includes(numericFaces) ? numericFaces : 6;
}
function getDiceFaceCount(faces) {
  const visualFaces = getVisualDiceFaces(faces);
  return visualFaces === 100 ? 10 : visualFaces;
}
function createDiceFacesHTML(value, faces) {
  const faceCount = getDiceFaceCount(faces);
  const values = [value];
  for(let i=1;i<faceCount;i++) values.push(((i - 1) % faceCount) + 1);
  return values.map(v=>`<div class="face-3d">${v}</div>`).join('');
}
function animate3DDice(result,faces,callback,individualRolls=[],diceVisuals=null) {
  const overlay=document.getElementById('dice3DOverlay');
  const container=document.getElementById('dice3DContainer');
  if(!container) return callback();
  
  container.innerHTML = '';
  
  // Todos los dados serán cubos (6 caras)
  // Display up to 10 dice dynamically based on the roll formula
  const diceToShow = Array.isArray(diceVisuals) && diceVisuals.length
    ? diceVisuals.slice(0, 10).map(d=>({ value:Number(d.value), faces:Number(d.faces) }))
    : (individualRolls.length > 0 ? individualRolls.slice(0, 10).map(value=>({ value, faces })) : [{value:result, faces}]);
  
  diceToShow.forEach((die, idx) => {
    const rollClass = (idx % 2 === 0) ? 'rolling-1' : 'rolling-2';
    
    // Determine the values to show on the other 5 faces so the die looks realistic
    const visualFaces = 6;
    const facesHTML = createDiceFacesHTML(die.value, visualFaces);
    
    // If the rolled value is outside 1-6 (e.g., from a d20 roll like 18), we show standard d6 numbers on the other faces
    container.insertAdjacentHTML('beforeend', `
      <div class="scene-3d dice-d${visualFaces}">
        <div class="cube-3d ${rollClass}" id="cube3D-${idx}" style="animation-delay: ${idx * 60}ms">
          ${facesHTML}
        </div>
      </div>
    `);
  });
  
  overlay.classList.add('active');
  
  const maxDelay = (diceToShow.length - 1) * 60;
  const animTime = 900 + maxDelay;
  
  setTimeout(() => {
    callback();
    setTimeout(() => {
      overlay.classList.remove('active');
    }, 1000);
  }, animTime);
}

// ===================================================
// MAP CANVAS
// ===================================================
const mapState = {
  canvas:null,ctx:null,zoom:1,offsetX:0,offsetY:0,
  isDragging:false,dragStartX:0,dragStartY:0,
  tokens:[],structures:[],walls:[],fogStrokes:[],exploredFogPolygons:[],wallDraft:null,pendingStructure:null,structureMode:'add',draggingToken:null,rotatingToken:null,selectedTokenId:null,pings:[],currentImage:null,
  gridVisible:true, gridPreview:null, fogOfWar:false, fogSeeThrough:false, fogExploredAreas:false, measurement:null,
  weather: 'none', music: 'none', externalMusicUrl:null, weatherParticles: [],
  lightningFlash: 0,
  lastTokenBroadcast: 0,
  initialized: false, loopStarted: false, loadSequence: 0
};
function initMap() {
  mapState.canvas=document.getElementById('mapCanvas');
  mapState.ctx=mapState.canvas.getContext('2d');
  if(!mapState.initialized) {
    window.addEventListener('resize',resizeCanvas);
    mapState.canvas.addEventListener('mousedown',onMapDown);
    mapState.canvas.addEventListener('mousemove',onMapMove);
    mapState.canvas.addEventListener('mouseup',onMapUp);
    mapState.canvas.addEventListener('mouseleave',onMapUp);
    mapState.canvas.addEventListener('contextmenu',e=>e.preventDefault());
    mapState.canvas.addEventListener('dblclick',onMapDblClick);
    mapState.canvas.addEventListener('wheel', onMapWheel, { passive: false });
    mapState.initialized = true;
  }
  resizeCanvas();
  
  const m = maps.find(m => m.id === state.activeMapId);
  if (m && m.tokens) {
    mapState.tokens = JSON.parse(JSON.stringify(m.tokens)).map(t => ({...t, tx: t.x, ty: t.y}));
  } else {
    mapState.tokens = [];
  }
  mapState.structures = JSON.parse(JSON.stringify(m?.structures || []));
  mapState.walls = JSON.parse(JSON.stringify(m?.walls || []));
  mapState.fogStrokes = JSON.parse(JSON.stringify(m?.fogStrokes || []));
  mapState.fogOfWar = m?.fogOfWar === true;
  mapState.fogExploredAreas = m?.fogExploredAreas === true;
  mapState.exploredFogPolygons = JSON.parse(JSON.stringify(m?.exploredFogPolygons || []));
  
  if(!mapState.loopStarted) {
    mapState.loopStarted = true;
    requestAnimationFrame(mapLoop);
  }
  loadActiveMap(state.pendingMapView || null);
  setWeather(state.pendingWeather || 'none', true);
  if(state.pendingExternalMusicUrl) playExternalMusic(state.pendingExternalMusicUrl,true);
  else setMusic(state.pendingMusic || mapState.music || 'none', true);
  state.pendingMapView = null;
  state.pendingWeather = null;
  state.pendingMusic = null;
  state.pendingExternalMusicUrl = null;
}
function resizeCanvas() {
  const c=document.getElementById('mapContainer');
  if(!c||!mapState.canvas)return;
  const r=mapState.canvas.getBoundingClientRect();
  const sizeChanged=mapState.canvas.width!==r.width||mapState.canvas.height!==r.height;
  mapState.canvas.width=r.width; mapState.canvas.height=r.height;
  if(sizeChanged && mapState.weather!=='none' && mapState.weather!=='custom') {
    setWeather(mapState.weather,true,true);
  } else {
    drawMap();
  }
}
function getCurrentMapView() {
  return { zoom: mapState.zoom, offsetX: mapState.offsetX, offsetY: mapState.offsetY, gridVisible: mapState.gridVisible, fogOfWar: mapState.fogOfWar, fogExploredAreas: mapState.fogExploredAreas };
}
function getActiveMapGrid() {
  const activeMap = maps.find(m => m.id === state.activeMapId);
  const map = mapState.gridPreview && String(mapState.gridPreview.id) === String(state.activeMapId) ? mapState.gridPreview : activeMap;
  const image = mapState.currentImage;
  let size = Math.max(0, Number(map?.gridPixelSize) || 0) || 50;
  const hasWidth = map?.gridWidth > 0;
  const hasHeight = map?.gridHeight > 0;
  if(!(Number(map?.gridPixelSize) > 0) && hasWidth && hasHeight && image?.width && image?.height) {
    size = Math.min(image.width / map.gridWidth, image.height / map.gridHeight);
  } else if(!(Number(map?.gridPixelSize) > 0) && hasWidth && image?.width) size = image.width / map.gridWidth;
  else if(!(Number(map?.gridPixelSize) > 0) && hasHeight && image?.height) size = image.height / map.gridHeight;
  const safeSize = Math.max(4, size);
  const sceneWidth = Math.max(0, Number(map?.sceneWidth) || 0);
  const sceneHeight = Math.max(0, Number(map?.sceneHeight) || 0);
  const width = sceneWidth || (hasWidth ? map.gridWidth * safeSize : (image?.width || 6000));
  const height = sceneHeight || (hasHeight ? map.gridHeight * safeSize : (image?.height || 6000));
  const paddingPct = Math.max(0, Math.min(0.5, Number(map?.paddingPct) || 0));
  const paddingX = width * paddingPct;
  const paddingY = height * paddingPct;
  return {
    size: safeSize,
    width,
    height,
    type: map?.gridType || 'square',
    style: map?.gridStyle || 'solid',
    thickness: Math.max(0.25, Number(map?.gridThickness) || 1),
    color: /^#[0-9a-f]{6}$/i.test(map?.gridColor || '') ? map.gridColor : '#a855f7',
    opacity: Math.max(0, Math.min(1, Number.isFinite(Number(map?.gridOpacity)) ? Number(map.gridOpacity) : 0.16)),
    backgroundX: paddingX + (Number(map?.backgroundOffsetX) || 0),
    backgroundY: paddingY + (Number(map?.backgroundOffsetY) || 0),
    backgroundWidth: Math.max(1, width - paddingX * 2),
    backgroundHeight: Math.max(1, height - paddingY * 2),
    distance: Math.max(1, Number(map?.feetPerSquare) || 5),
    unit: map?.distanceUnit || 'pies'
  };
}
function getTokenSizeSquares(token) {
  if(token && Number.isFinite(Number(token.sizeSquares))) {
    return Math.max(1, Math.min(6, Math.round(Number(token.sizeSquares))));
  }
  const grid=getActiveMapGrid();
  return Math.max(1, Math.min(6, Math.round(((Number(token?.radius)||26)*2)/grid.size) || 1));
}
function getTokenRadius(token) {
  const grid=getActiveMapGrid();
  return Math.max(grid.size*0.5, grid.size*getTokenSizeSquares(token)/2);
}
function normalizeTokenGridSize(token) {
  if(!token) return token;
  token.sizeSquares=getTokenSizeSquares(token);
  token.radius=getTokenRadius(token);
  return token;
}
function snapMapPointToGrid(pos, token = null) {
  const grid=getActiveMapGrid();
  const sizeSquares=getTokenSizeSquares(token);
  const halfOffset = sizeSquares % 2 === 0 ? 0 : 0.5;
  return {
    x: (Math.round(pos.x/grid.size - halfOffset) + halfOffset) * grid.size,
    y: (Math.round(pos.y/grid.size - halfOffset) + halfOffset) * grid.size
  };
}
function getVisibleMapScreenBounds() {
  const grid=getActiveMapGrid();
  const left=Math.max(0,mapState.offsetX);
  const top=Math.max(0,mapState.offsetY);
  const right=Math.min(mapState.canvas.width,mapState.offsetX+grid.width*mapState.zoom);
  const bottom=Math.min(mapState.canvas.height,mapState.offsetY+grid.height*mapState.zoom);
  if(right<=left||bottom<=top) return {x:0,y:0,width:mapState.canvas.width,height:mapState.canvas.height};
  return {x:left,y:top,width:right-left,height:bottom-top};
}
function fitMapToBoard() {
  if(!mapState.canvas) return;
  const map = maps.find(m => m.id === state.activeMapId);
  if(!mapState.currentImage && !(map?.gridWidth > 0 && map?.gridHeight > 0)) {
    mapState.zoom = 1;
    mapState.offsetX = 0;
    mapState.offsetY = 0;
    drawMap();
    return;
  }
  const grid = getActiveMapGrid();
  const padding = 30;
  mapState.zoom = Math.max(0.1, Math.min(8, Math.min(
    (mapState.canvas.width - padding * 2) / grid.width,
    (mapState.canvas.height - padding * 2) / grid.height
  )));
  mapState.offsetX = (mapState.canvas.width - grid.width * mapState.zoom) / 2;
  mapState.offsetY = (mapState.canvas.height - grid.height * mapState.zoom) / 2;
  drawMap();
}
function applySavedMapView(view) {
  if (!view) return;
  if (Number.isFinite(view.zoom)) mapState.zoom = Math.max(0.1, Math.min(8, view.zoom));
  if (Number.isFinite(view.offsetX)) mapState.offsetX = view.offsetX;
  if (Number.isFinite(view.offsetY)) mapState.offsetY = view.offsetY;
  if (typeof view.gridVisible === 'boolean') mapState.gridVisible = view.gridVisible;
  if (typeof view.fogOfWar === 'boolean') mapState.fogOfWar = view.fogOfWar;
  if (typeof view.fogExploredAreas === 'boolean') mapState.fogExploredAreas = view.fogExploredAreas;
  syncMapToolButtons();
  drawMap();
}
function loadActiveMap(savedView = null) {
  closeTokenActionPanel();
  const loadSequence = ++mapState.loadSequence;
  const m=maps.find(m=>m.id===state.activeMapId);
  mapState.zoom=1; mapState.offsetX=0; mapState.offsetY=0;
  mapState.gridVisible = m?.gridHidden !== true;
  mapState.fogOfWar = m?.fogOfWar === true;
  syncMapToolButtons();
  if(m) {
    mapState.tokens = (m.tokens || []).map(t => ({...t, tx: t.x, ty: t.y}));
    mapState.structures = JSON.parse(JSON.stringify(m.structures || []));
    mapState.walls = JSON.parse(JSON.stringify(m.walls || []));
    mapState.fogStrokes = JSON.parse(JSON.stringify(m.fogStrokes || []));
    mapState.fogOfWar = m.fogOfWar === true;
    mapState.fogExploredAreas = m.fogExploredAreas === true;
    mapState.exploredFogPolygons = JSON.parse(JSON.stringify(m.exploredFogPolygons || []));
  } else {
    mapState.tokens = [];
    mapState.structures = [];
    mapState.walls = [];
    mapState.fogStrokes = [];
    mapState.fogOfWar = false;
    mapState.fogExploredAreas = false;
    mapState.exploredFogPolygons = [];
  }
  syncMapToolButtons();
  mapState.wallDraft = null;
  if(m&&m.image) {
    const img=new Image(); img.src=m.image;
    img.onload=()=>{
      if(loadSequence !== mapState.loadSequence) return;
      mapState.currentImage=img;
      if (savedView) applySavedMapView(savedView);
      else fitMapToBoard();
    };
    img.onerror=()=>{
      if(loadSequence !== mapState.loadSequence) return;
      mapState.currentImage=null;
      if (savedView) applySavedMapView(savedView);
      else fitMapToBoard();
    };
  } else {
    mapState.currentImage=null;
    if (savedView) applySavedMapView(savedView);
    else fitMapToBoard();
  }
}
function setMapTool(t) {
  if(t !== 'wall') mapState.wallDraft = null;
  if((t === 'fog-reveal' || t === 'fog-hide') && isDM() && !mapState.fogOfWar) {
    mapState.fogOfWar = true;
    const map = maps.find(m=>m.id===state.activeMapId);
    if(map) {
      map.fogOfWar = true;
      saveMaps();
    }
    broadcastFogOfWar();
  }
  state.mapTool=t;
  syncMapToolButtons();
  drawMap();
}
function syncMapToolButtons() {
  document.getElementById('toolMove')?.classList.toggle('active',state.mapTool==='move');
  document.getElementById('toolPing')?.classList.toggle('active',state.mapTool==='ping');
  document.getElementById('toolFog')?.classList.toggle('active',mapState.fogOfWar===true);
  document.getElementById('toolFogReveal')?.classList.toggle('active',state.mapTool==='fog-reveal');
  document.getElementById('toolFogHide')?.classList.toggle('active',state.mapTool==='fog-hide');
  document.getElementById('sideToolFog')?.classList.toggle('active',mapState.fogOfWar===true);
  document.getElementById('sideToolFogPeek')?.classList.toggle('active',mapState.fogSeeThrough===true);
  document.getElementById('sideToolExploredFog')?.classList.toggle('active',mapState.fogExploredAreas===true);
  document.getElementById('toolWalls')?.classList.toggle('active',state.mapTool==='wall');
  document.getElementById('toolWallRemove')?.classList.toggle('active',state.mapTool==='wall-remove');
  document.getElementById('quickToolMove')?.classList.toggle('active',state.mapTool==='move');
  document.getElementById('quickToolPing')?.classList.toggle('active',state.mapTool==='ping');
  document.getElementById('quickToolMeasure')?.classList.toggle('active',state.mapTool==='measure');
  document.getElementById('quickToolFog')?.classList.toggle('active',mapState.fogOfWar===true);
  document.getElementById('quickToolFogReveal')?.classList.toggle('active',state.mapTool==='fog-reveal');
  document.getElementById('quickToolFogHide')?.classList.toggle('active',state.mapTool==='fog-hide');
  document.getElementById('quickToolWall')?.classList.toggle('active',state.mapTool==='wall');
  document.getElementById('quickToolWallRemove')?.classList.toggle('active',state.mapTool==='wall-remove');
  document.getElementById('quickToolGrid')?.classList.toggle('active',mapState.gridVisible);
}
function toggleMapGrid() {
  mapState.gridVisible = !mapState.gridVisible;
  const map = maps.find(m=>m.id===state.activeMapId);
  if(map && isDM()) {
    map.gridHidden = !mapState.gridVisible;
    saveMaps();
  }
  syncMapToolButtons();
  drawMap();
  if(typeof multiplayer !== 'undefined' && multiplayer.isHost()) {
    multiplayer.broadcast({ type:'grid_visibility', visible:mapState.gridVisible });
  }
}
function toggleFogOfWar(forceValue = null) {
  if(!isDM()) return;
  mapState.fogOfWar = typeof forceValue === 'boolean' ? forceValue : !mapState.fogOfWar;
  const map = maps.find(m=>m.id===state.activeMapId);
  if(map) {
    map.fogOfWar = mapState.fogOfWar;
    map.fogExploredAreas = mapState.fogExploredAreas === true;
    map.exploredFogPolygons = JSON.parse(JSON.stringify(mapState.exploredFogPolygons || []));
    saveMaps();
  }
  if(!mapState.fogOfWar && (state.mapTool==='fog-reveal' || state.mapTool==='fog-hide')) state.mapTool='move';
  if(mapState.fogOfWar) ensureSelectedVisionToken();
  syncMapToolButtons();
  drawMap();
  addChatMessage('sys','',`Niebla de guerra ${mapState.fogOfWar ? 'activada para jugadores' : 'desactivada'}.`);
  broadcastFogOfWar();
}
function toggleSeeThroughFog() {
  if(!isDM()) return;
  mapState.fogSeeThrough = !mapState.fogSeeThrough;
  if(mapState.fogSeeThrough && mapState.fogOfWar) ensureSelectedVisionToken();
  syncMapToolButtons();
  drawMap();
}
function toggleExploredFogAreas() {
  if(!isDM()) return;
  mapState.fogExploredAreas = !mapState.fogExploredAreas;
  if(mapState.fogExploredAreas) {
    mapState.fogOfWar = true;
    ensureSelectedVisionToken();
  }
  const map = maps.find(m=>m.id===state.activeMapId);
  if(map) {
    map.fogOfWar = mapState.fogOfWar === true;
    map.fogExploredAreas = mapState.fogExploredAreas === true;
    map.exploredFogPolygons = JSON.parse(JSON.stringify(mapState.exploredFogPolygons || []));
    saveMaps();
  }
  syncMapToolButtons();
  drawMap();
  broadcastFogOfWar();
}
function syncFogToPlayers(message='') {
  storeCurrentMapFog();
  syncMapToolButtons();
  drawMap();
  broadcastFogOfWar();
  broadcastFogStrokes();
  if(message) addChatMessage('sys','',message);
}
function coverAllFog() {
  if(!isDM()) return;
  mapState.fogOfWar = true;
  mapState.fogStrokes = [];
  mapState.exploredFogPolygons = [];
  syncFogToPlayers('Niebla de guerra: todo el mapa quedó cubierto para jugadores.');
}
function revealAllFog() {
  if(!isDM()) return;
  const grid=getActiveMapGrid();
  mapState.fogOfWar = true;
  mapState.fogStrokes = [{
    mode:'reveal',
    x:grid.width/2,
    y:grid.height/2,
    radius:Math.hypot(grid.width,grid.height)
  }];
  syncFogToPlayers('Niebla de guerra: todo el mapa quedó revelado para jugadores.');
}
function resetFogEdits() {
  if(!isDM()) return;
  if(mapState.fogStrokes.length && !confirm('¿Borrar las zonas pintadas de niebla de este mapa?')) return;
  mapState.fogStrokes = [];
  syncFogToPlayers('Edición de niebla reiniciada.');
}
function resetMapView() {
  fitMapToBoard();
}
function mapZoom(d) {
  const cx=mapState.canvas.width/2,cy=mapState.canvas.height/2,prev=mapState.zoom;
  mapState.zoom=Math.max(0.1,Math.min(8,mapState.zoom+d));
  const sc=mapState.zoom/prev;
  mapState.offsetX=cx-(cx-mapState.offsetX)*sc;
  mapState.offsetY=cy-(cy-mapState.offsetY)*sc; drawMap();
}
function onMapWheel(e) {
  e.preventDefault();
  const r=mapState.canvas.getBoundingClientRect();
  const mouseX=e.clientX-r.left;
  const mouseY=e.clientY-r.top;
  const prev=mapState.zoom;
  const delta=e.deltaY < 0 ? 0.14 : -0.14;
  mapState.zoom=Math.max(0.1,Math.min(8,mapState.zoom+delta));
  const sc=mapState.zoom/prev;
  mapState.offsetX=mouseX-(mouseX-mapState.offsetX)*sc;
  mapState.offsetY=mouseY-(mouseY-mapState.offsetY)*sc;
  drawMap();
}
function getMapPos(e) {
  const r=mapState.canvas.getBoundingClientRect();
  return {x:(e.clientX-r.left-mapState.offsetX)/mapState.zoom, y:(e.clientY-r.top-mapState.offsetY)/mapState.zoom};
}
function getMapTokenByTokenId(tokenId) {
  return mapState.tokens.find(token => token.tokenId === tokenId);
}
function getMapTokenAt(pos) {
  for(let i=mapState.tokens.length-1;i>=0;i--) {
    const token=mapState.tokens[i];
    if(token.hidden && !isDM()) continue;
    normalizeTokenGridSize(token);
    if((pos.x-token.x)**2+(pos.y-token.y)**2<=token.radius**2) return token;
  }
  return null;
}
function canControlMapToken(token) {
  const combatant=token && getCombatantById(token.id);
  if(!token || !combatant) return false;
  if(token.hidden && !isDM()) return false;
  return isDM() || canEditCharacter(combatant);
}
function updateTokenFacingToward(token,pos) {
  if(!token || !pos) return false;
  const dx=pos.x-token.x;
  const dy=pos.y-token.y;
  if(Math.hypot(dx,dy)<=0.5) return false;
  token.facing=Math.atan2(dy,dx);
  return true;
}
function broadcastTokenTransform(token, throttle=true) {
  if(!token || typeof multiplayer === 'undefined' || !multiplayer.isActive()) return;
  const now=Date.now();
  if(throttle && now - mapState.lastTokenBroadcast <= 40) return;
  mapState.lastTokenBroadcast=now;
  multiplayer.broadcast({type:'token_move',tokenId:token.tokenId,x:token.x,y:token.y,facing:token.facing});
}
function canResizeToken(token, combatant = null) {
  const c = combatant || (token && getCombatantById(token.id));
  return !!token && !!c && (isDM() || canEditCharacter(c));
}
function getTokenPortraitMarkup(combatant) {
  if(!combatant) return '<div class="token-action-initials">?</div>';
  if(combatant.portrait) return `<img src="${combatant.portrait}" alt="${escapeHTML(combatant.name||'Token')}">`;
  return `<div class="token-action-initials" style="color:${combatant.color||'#a855f7'};">${escapeHTML(combatant.initials||initials(combatant.name||'TK'))}</div>`;
}
function updateTokenPanelAvoidance(active = false) {
  const wrap=document.getElementById('mapContainer');
  if(wrap) wrap.classList.toggle('director-panel-open', active === true);
}
function renderTokenActionPanel() {
  const panel=document.getElementById('tokenActionPanel');
  if(!panel) return;
  if(!mapState.selectedTokenId) {
    panel.style.display='none';
    return;
  }
  const token=getMapTokenByTokenId(mapState.selectedTokenId);
  const combatant=token && getCombatantById(token.id);
  if(!token || !combatant || !canResizeToken(token, combatant)) {
    closeTokenActionPanel();
    return;
  }
  document.getElementById('tokenActionPreview').innerHTML=getTokenPortraitMarkup(combatant);
  document.getElementById('tokenActionName').textContent=combatant.name||'Token';
  document.getElementById('tokenActionMeta').textContent=token.hidden ? 'Este token está oculto para jugadores.' : 'Este token está visible en el tablero.';
  document.getElementById('tokenHideButton').textContent=token.hidden ? 'Mostrar token' : 'Ocultar token';
  normalizeTokenGridSize(token);
  const sizeLabel=document.getElementById('tokenSizeLabel');
  if(sizeLabel) sizeLabel.textContent=`${token.sizeSquares}x${token.sizeSquares} casilla${token.sizeSquares===1?'':'s'}`;
  const hideBtn=document.getElementById('tokenHideButton');
  const deleteBtn=panel.querySelector('.token-delete-btn');
  if(hideBtn) hideBtn.style.display=isDM() ? '' : 'none';
  if(deleteBtn) deleteBtn.style.display=isDM() ? '' : 'none';
  if(!isDM()) document.getElementById('tokenActionMeta').textContent='Puedes ajustar el tamaño de tu token.';
  panel.style.display='block';
}
function closeTokenActionPanel() {
  mapState.selectedTokenId=null;
  const panel=document.getElementById('tokenActionPanel');
  if(panel) panel.style.display='none';
}
function selectMapToken(token) {
  if(!canResizeToken(token)) return;
  mapState.selectedTokenId=token.tokenId;
  const combatant=getCombatantById(token.id);
  if(isDM() && combatant?.type === 'enemy') state.quickCombatActorId=combatant.id;
  renderTokenActionPanel();
  renderQuickCombatPanel();
  drawMap();
}
function syncSelectedTokenChange(message='') {
  syncMapTokens();
  drawMap();
  renderInitiative();
  renderEnemiesPage();
  renderNpcPage();
  renderTokenActionPanel();
  broadcastMapTokens();
  if(message) addChatMessage('sys','',message);
}
function toggleSelectedTokenHidden() {
  if(!isDM()) return;
  const token=getMapTokenByTokenId(mapState.selectedTokenId);
  const combatant=token && getCombatantById(token.id);
  if(!token || !combatant) return closeTokenActionPanel();
  token.hidden = !token.hidden;
  syncSelectedTokenChange(`Token de <b>${escapeHTML(combatant.name)}</b> ${token.hidden ? 'ocultado para jugadores' : 'visible para jugadores'}.`);
}
function deleteSelectedMapToken() {
  if(!isDM()) return;
  const token=getMapTokenByTokenId(mapState.selectedTokenId);
  const combatant=token && getCombatantById(token.id);
  if(!token) return closeTokenActionPanel();
  mapState.tokens=mapState.tokens.filter(item=>item.tokenId!==token.tokenId);
  closeTokenActionPanel();
  syncSelectedTokenChange(combatant ? `Token de <b>${escapeHTML(combatant.name)}</b> eliminado del mapa.` : 'Token eliminado del mapa.');
}
function adjustSelectedTokenSize(delta) {
  const token=getMapTokenByTokenId(mapState.selectedTokenId);
  const combatant=token && getCombatantById(token.id);
  if(!canResizeToken(token, combatant)) return closeTokenActionPanel();
  const step = delta > 0 ? 1 : -1;
  token.sizeSquares=Math.max(1,Math.min(6,getTokenSizeSquares(token)+step));
  normalizeTokenGridSize(token);
  const snapped=snapMapPointToGrid({x:token.x,y:token.y}, token);
  token.x=snapped.x;
  token.y=snapped.y;
  token.tx=snapped.x;
  token.ty=snapped.y;
  syncMapTokens();
  drawMap();
  renderTokenActionPanel();
  if(typeof multiplayer !== 'undefined' && multiplayer.isClient() && !isDM()) {
    multiplayer.broadcast({type:'token_resize',tokenId:token.tokenId,sizeSquares:token.sizeSquares,radius:token.radius});
  } else {
    broadcastMapTokens();
  }
}
function getFogBrushRadius() {
  const grid=getActiveMapGrid();
  return Math.max(grid.size*1.4,70);
}
function addFogStroke(pos,mode) {
  if(!isDM() || (mode!=='reveal' && mode!=='hide')) return;
  const last=mapState.fogStrokes[mapState.fogStrokes.length-1];
  const radius=getFogBrushRadius();
  if(last && last.mode===mode && Math.hypot(last.x-pos.x,last.y-pos.y)<radius*0.35) return;
  mapState.fogStrokes.push({mode,x:pos.x,y:pos.y,radius});
  if(mapState.fogStrokes.length>1200) mapState.fogStrokes.splice(0,mapState.fogStrokes.length-1200);
  storeCurrentMapFog();
  broadcastFogStrokes();
  drawMap();
}
function onMapDown(e) {
  const pos=getMapPos(e);
  if(e.button === 2) {
    e.preventDefault();
    const token=getMapTokenAt(pos);
    if(!canControlMapToken(token)) return;
    mapState.rotatingToken=token;
    mapState.selectedTokenId=token.tokenId;
    updateTokenFacingToward(token,pos);
    mapState.tokens.push(mapState.tokens.splice(mapState.tokens.indexOf(token),1)[0]);
    renderTokenActionPanel();
    renderQuickCombatPanel();
    drawMap();
    broadcastTokenTransform(token);
    return;
  }
  if(e.button !== 0) return;
  if((state.mapTool==='fog-reveal' || state.mapTool==='fog-hide') && isDM()) {
    if(!mapState.fogOfWar) toggleFogOfWar(true);
    mapState.isFogPainting=true;
    addFogStroke(pos,state.mapTool==='fog-reveal'?'reveal':'hide');
    return;
  }
  if(state.mapTool==='wall-remove' && isDM()) {
    removeWallAt(pos);
    return;
  }
  if(state.mapTool==='wall' && isDM()) {
    mapState.wallDraft={x1:pos.x,y1:pos.y,x2:pos.x,y2:pos.y};
    drawMap();
    return;
  }
  if(state.mapTool==='structure-remove' && isDM()) {
    removeStructureAt(pos);
    return;
  }
  if(state.mapTool==='structure' && mapState.pendingStructure && isDM()) {
    const size = Math.max(20, Number(document.getElementById('structureSize')?.value) || 52);
    mapState.structures.push({...mapState.pendingStructure,id:'st_'+Date.now()+'_'+Math.random(),x:pos.x,y:pos.y,size});
    storeCurrentMapStructures();
    broadcastStructures();
    drawMap();
    return;
  }
  if(state.mapTool==='measure') {
    mapState.measurement={startX:pos.x,startY:pos.y,endX:pos.x,endY:pos.y};
    drawMap();
    return;
  }
  if(state.mapTool==='ping') {
    mapState.pings.push({x:pos.x,y:pos.y,radius:0,alpha:1});
    addChatMessage('sys','','📌 Señalado en el mapa.');
    if (typeof multiplayer !== 'undefined' && multiplayer.isActive()) {
      multiplayer.broadcast({ type: 'map_ping', x: pos.x, y: pos.y, sender: state.currentUser.username });
    }
    return;
  }
  for(let i=mapState.tokens.length-1;i>=0;i--) {
    const t=mapState.tokens[i];
    if(t.hidden && !isDM()) continue;
    normalizeTokenGridSize(t);
    if((pos.x-t.x)**2+(pos.y-t.y)**2<=t.radius**2) {
      if (!canControlMapToken(t)) break;
      if(isDM() && mapState.fogOfWar && mapState.selectedTokenId!==t.tokenId) {
        mapState.selectedTokenId=t.tokenId;
        renderTokenActionPanel();
        drawMap();
      }
      mapState.draggingToken=t; mapState.tokens.push(mapState.tokens.splice(i,1)[0]); return;
    }
  }
  mapState.isDragging=true; mapState.dragStartX=e.clientX-mapState.offsetX; mapState.dragStartY=e.clientY-mapState.offsetY;
}
function onMapMove(e) {
  if(mapState.rotatingToken) {
    e.preventDefault();
    const p=getMapPos(e);
    if(updateTokenFacingToward(mapState.rotatingToken,p)) {
      drawMap();
      broadcastTokenTransform(mapState.rotatingToken);
    }
    return;
  }
  if(mapState.isFogPainting && (state.mapTool==='fog-reveal' || state.mapTool==='fog-hide') && isDM()) {
    const p=getMapPos(e);
    addFogStroke(p,state.mapTool==='fog-reveal'?'reveal':'hide');
  }
  else if(mapState.wallDraft && state.mapTool==='wall' && isDM()) {
    const p=getMapPos(e);
    mapState.wallDraft.x2=p.x;
    mapState.wallDraft.y2=p.y;
    drawMap();
  }
  else if(mapState.measurement && !mapState.measurement.finished && state.mapTool==='measure') {
    const p=getMapPos(e);
    mapState.measurement.endX=p.x;
    mapState.measurement.endY=p.y;
    drawMap();
  }
  else if(mapState.draggingToken) {
    const p=getMapPos(e);
    mapState.draggingToken.x=p.x;
    mapState.draggingToken.y=p.y;
    mapState.draggingToken.tx=p.x;
    mapState.draggingToken.ty=p.y;
    drawMap();
    // Transmisión en tiempo real (throttled a 40ms)
    broadcastTokenTransform(mapState.draggingToken);
  }
  else if(mapState.isDragging) { mapState.offsetX=e.clientX-mapState.dragStartX; mapState.offsetY=e.clientY-mapState.dragStartY; drawMap(); }
}
function onMapUp() {
  mapState.isDragging=false;
  mapState.isFogPainting=false;
  if(mapState.rotatingToken) {
    const rotatedToken=mapState.rotatingToken;
    mapState.rotatingToken=null;
    syncMapTokens();
    drawMap();
    if (typeof multiplayer !== 'undefined' && multiplayer.isActive()) {
      broadcastTokenTransform(rotatedToken,false);
      if (!multiplayer.isClient()) broadcastMapTokens();
    }
    return;
  }
  if(mapState.wallDraft) {
    const w=mapState.wallDraft;
    mapState.wallDraft=null;
    if(Math.hypot(w.x2-w.x1,w.y2-w.y1) > 12) {
      mapState.walls.push({id:'wall_'+Date.now()+'_'+Math.random().toString(36).slice(2),x1:w.x1,y1:w.y1,x2:w.x2,y2:w.y2});
      storeCurrentMapWalls();
      broadcastWalls();
      addChatMessage('sys','','Muro invisible agregado al tablero.');
    }
    drawMap();
    return;
  }
  if(mapState.measurement && !mapState.measurement.finished) {
    const m=mapState.measurement;
    m.finished=true;
    const grid=getActiveMapGrid();
    const squares=Math.hypot(m.endX-m.startX,m.endY-m.startY)/grid.size;
    addChatMessage('sys','',`📏 Distancia medida: <b>${squares.toFixed(1)} casillas</b> (${(squares*grid.distance).toFixed(1)} ${grid.unit}).`);
    setTimeout(()=>{ if(mapState.measurement===m) mapState.measurement=null; drawMap(); },1200);
  }
  if(mapState.draggingToken) {
    const movedToken = mapState.draggingToken;
    const snapped=snapMapPointToGrid({x:movedToken.x,y:movedToken.y}, movedToken);
    movedToken.x=snapped.x;
    movedToken.y=snapped.y;
    movedToken.tx=snapped.x;
    movedToken.ty=snapped.y;
    normalizeTokenGridSize(movedToken);
    mapState.draggingToken=null;
    syncMapTokens();
    if (typeof multiplayer !== 'undefined' && multiplayer.isActive()) {
      multiplayer.broadcast({ type: 'token_move', tokenId: movedToken.tokenId, x: movedToken.x, y: movedToken.y, facing:movedToken.facing });
      if (!multiplayer.isClient()) broadcastMapTokens();
    }
  }
}
function onMapDblClick(e) {
  const pos = getMapPos(e);
  for(let i=mapState.tokens.length-1;i>=0;i--) {
    const t=mapState.tokens[i];
    normalizeTokenGridSize(t);
    if((pos.x-t.x)**2+(pos.y-t.y)**2<=t.radius**2) {
      selectMapToken(t);
      return;
    }
  }
  if (!isDM()) return;
  if(removeWallAt(pos, true)) return;
  if(removeStructureAt(pos)) return;
}
function drawVisionWalls(ctx) {
  if(!isDM() || (!mapState.walls.length && !mapState.wallDraft)) return;
  ctx.save();
  ctx.lineCap='round';
  ctx.lineJoin='round';
  ctx.setLineDash([12/(mapState.zoom||1),8/(mapState.zoom||1)]);
  ctx.lineWidth=4/(mapState.zoom||1);
  ctx.strokeStyle='rgba(34,211,238,0.9)';
  ctx.shadowColor='rgba(34,211,238,0.45)';
  ctx.shadowBlur=10/(mapState.zoom||1);
  ctx.beginPath();
  mapState.walls.forEach(w=>{ctx.moveTo(w.x1,w.y1);ctx.lineTo(w.x2,w.y2);});
  ctx.stroke();
  if(mapState.wallDraft) {
    ctx.setLineDash([4/(mapState.zoom||1),4/(mapState.zoom||1)]);
    ctx.lineWidth=3/(mapState.zoom||1);
    ctx.strokeStyle='rgba(250,204,21,0.95)';
    ctx.beginPath();
    ctx.moveTo(mapState.wallDraft.x1,mapState.wallDraft.y1);
    ctx.lineTo(mapState.wallDraft.x2,mapState.wallDraft.y2);
    ctx.stroke();
  }
  ctx.restore();
}
const FOV_RADIUS = 300;
const FOV_RAY_EPSILON = 0.0001;
const FOV_BOUNDARY_RAYS = 96;
const FOV_MAX_EXPLORED_POLYGONS = 90;
const FOV_EXPLORED_VISIBILITY = 0.42;
const FOV_OCCLUDED_AMBIENT_VISIBILITY = 0.01;
const FOV_SOFT_EDGE_BLUR = 7;
const fovRenderCache = {
  canvas:null,
  ctx:null,
  width:0,
  height:0,
  polygonCache:new Map()
};

function mapToCanvas(x,y,zoom=mapState.zoom,offsetX=mapState.offsetX,offsetY=mapState.offsetY) {
  return {x:x*zoom+offsetX,y:y*zoom+offsetY};
}
function normalizeFovAngle(angle) {
  const twoPi=Math.PI*2;
  let a=angle%twoPi;
  if(a<0) a+=twoPi;
  return a;
}
function cross2D(ax,ay,bx,by) {
  return ax*by-ay*bx;
}
function raySegmentIntersection(origin,angle,wall,maxDist=Infinity) {
  const dx=Math.cos(angle);
  const dy=Math.sin(angle);
  const sx=wall.x2-wall.x1;
  const sy=wall.y2-wall.y1;
  const denom=cross2D(dx,dy,sx,sy);
  if(Math.abs(denom)<0.000001) return null;
  const qpx=wall.x1-origin.x;
  const qpy=wall.y1-origin.y;
  const t=cross2D(qpx,qpy,sx,sy)/denom;
  const u=cross2D(qpx,qpy,dx,dy)/denom;
  if(t>=0 && t<=maxDist && u>=0 && u<=1) return {x:origin.x+dx*t,y:origin.y+dy*t,dist:t};
  return null;
}
function angleDelta(a,b) {
  return Math.atan2(Math.sin(a-b),Math.cos(a-b));
}
function distancePointToFovSegment(px,py,wall) {
  const vx=wall.x2-wall.x1;
  const vy=wall.y2-wall.y1;
  const lenSq=vx*vx+vy*vy;
  if(lenSq<=0) return Math.hypot(px-wall.x1,py-wall.y1);
  const t=Math.max(0,Math.min(1,((px-wall.x1)*vx+(py-wall.y1)*vy)/lenSq));
  const x=wall.x1+vx*t;
  const y=wall.y1+vy*t;
  return Math.hypot(px-x,py-y);
}
function isValidFovWall(w) {
  return w && Number.isFinite(w.x1) && Number.isFinite(w.y1) && Number.isFinite(w.x2) && Number.isFinite(w.y2);
}
function fingerprintFovWalls(walls) {
  return (walls||[])
    .filter(isValidFovWall)
    .map(w=>`${Math.round(w.x1*10)/10},${Math.round(w.y1*10)/10},${Math.round(w.x2*10)/10},${Math.round(w.y2*10)/10}`)
    .join('|');
}

// Calcula el polígono de visibilidad en coordenadas del mapa.
// El algoritmo lanza rayos desde el jugador hacia cada endpoint de muro y dos rayos
// vecinos (+/- epsilon) para no perder esquinas. Cada rayo se corta contra todos
// los muros cercanos y conserva solo la intersección más cercana; si no choca,
// termina en el borde circular del radio de visión.
function calcularFOV(playerX, playerY, radio, walls, options = {}) {
  const radius=Math.max(1,Number(radio)||FOV_RADIUS);
  const origin={x:playerX,y:playerY};
  const visionAngle=Number(options.visionAngle ?? options.angle ?? 360);
  const facing=Number(options.facing)||0;
  const fullCircle=visionAngle>=359;
  const halfAngle=(visionAngle*Math.PI/180)/2;
  const nearbyWalls=(walls||[])
    .filter(isValidFovWall)
    .filter(w=>distancePointToFovSegment(playerX,playerY,w)<=radius+0.5);
  const angles=[];

  // Rayos de contorno para formar una circunferencia limpia aun si no hay muros.
  const boundarySteps=fullCircle ? FOV_BOUNDARY_RAYS : Math.max(18,Math.ceil(FOV_BOUNDARY_RAYS*(visionAngle/360)));
  for(let i=0;i<=(fullCircle ? boundarySteps-1 : boundarySteps);i++) {
    const a=fullCircle
      ? (Math.PI*2*i)/boundarySteps
      : facing-halfAngle+(halfAngle*2*i)/boundarySteps;
    angles.push(a);
  }

  nearbyWalls.forEach(w=>{
    [{x:w.x1,y:w.y1},{x:w.x2,y:w.y2}].forEach(p=>{
      if(Math.hypot(p.x-origin.x,p.y-origin.y)>radius+0.5) return;
      const a=Math.atan2(p.y-origin.y,p.x-origin.x);
      if(!fullCircle && Math.abs(angleDelta(a,facing))>halfAngle+0.01) return;
      angles.push(a-FOV_RAY_EPSILON,a,a+FOV_RAY_EPSILON);
    });
  });

  return angles
    .map(angle=>{
      let best={x:origin.x+Math.cos(angle)*radius,y:origin.y+Math.sin(angle)*radius,dist:radius,angle};
      nearbyWalls.forEach(w=>{
        const hit=raySegmentIntersection(origin,angle,w,radius);
        if(hit && hit.dist<best.dist) best={...hit,angle};
      });
      best.angleNorm=normalizeFovAngle(angle);
      return best;
    })
    .sort((a,b)=>fullCircle ? a.angleNorm-b.angleNorm : angleDelta(a.angle,facing)-angleDelta(b.angle,facing));
}
function getVisibilityPolygon(origin,radius,visionAngle=360,facing=0) {
  return calcularFOV(origin.x,origin.y,radius,mapState.walls,{visionAngle,facing});
}
function getCachedFovPolygon(playerX,playerY,radio,walls,options={}) {
  const key=[
    Math.round(playerX*10)/10,
    Math.round(playerY*10)/10,
    Math.round((Number(radio)||FOV_RADIUS)*10)/10,
    Math.round((Number(options.visionAngle ?? options.angle ?? 360))*10)/10,
    Math.round((Number(options.facing)||0)*1000)/1000,
    fingerprintFovWalls(walls)
  ].join('|');
  if(!fovRenderCache.polygonCache.has(key)) {
    if(fovRenderCache.polygonCache.size>80) fovRenderCache.polygonCache.clear();
    fovRenderCache.polygonCache.set(key,calcularFOV(playerX,playerY,radio,walls,options));
  }
  return fovRenderCache.polygonCache.get(key);
}
function getFovOffscreen(ctxPrincipal) {
  const width=ctxPrincipal.canvas.width;
  const height=ctxPrincipal.canvas.height;
  if(!fovRenderCache.canvas || fovRenderCache.width!==width || fovRenderCache.height!==height) {
    fovRenderCache.canvas=document.createElement('canvas');
    fovRenderCache.ctx=fovRenderCache.canvas.getContext('2d');
    fovRenderCache.width=width;
    fovRenderCache.height=height;
    fovRenderCache.canvas.width=width;
    fovRenderCache.canvas.height=height;
  }
  return fovRenderCache.ctx;
}
function resetFovOverlay(ctxPrincipal, opacity=1) {
  const fogCtx=getFovOffscreen(ctxPrincipal);
  fogCtx.setTransform(1,0,0,1,0,0);
  fogCtx.clearRect(0,0,fovRenderCache.width,fovRenderCache.height);
  fogCtx.globalCompositeOperation='source-over';
  const parsedOpacity=Number(opacity);
  const overlayOpacity=Number.isFinite(parsedOpacity) ? Math.max(0,Math.min(1,parsedOpacity)) : 1;
  fogCtx.fillStyle=`rgba(0,0,0,${overlayOpacity})`;
  fogCtx.fillRect(0,0,fovRenderCache.width,fovRenderCache.height);
  return fogCtx;
}
function cutFovPolygon(fogCtx, polygon, playerX, playerY, radio, zoom, offsetX, offsetY, options={}) {
  if(!Array.isArray(polygon) || !polygon.length) return;
  const center=mapToCanvas(playerX,playerY,zoom,offsetX,offsetY);
  const scaledRadius=Math.max(1,radio*zoom);
  const visionAngle=Number(options.visionAngle ?? options.angle ?? 360);
  const alpha=Math.max(0,Math.min(1,Number(options.alpha ?? 1)));
  const edgeBlur=Math.max(0,Number(options.edgeBlur ?? FOV_SOFT_EDGE_BLUR) || 0);

  fogCtx.save();
  fogCtx.globalCompositeOperation='destination-out';
  if(edgeBlur>0) fogCtx.filter=`blur(${edgeBlur}px)`;
  fogCtx.beginPath();
  if(visionAngle<359) fogCtx.moveTo(center.x,center.y);
  polygon.forEach((p,i)=>{
    const cp=mapToCanvas(p.x,p.y,zoom,offsetX,offsetY);
    if(i===0 && visionAngle>=359) fogCtx.moveTo(cp.x,cp.y);
    else fogCtx.lineTo(cp.x,cp.y);
  });
  fogCtx.closePath();

  // destination-out borra según el alpha de la fuente: alpha 1 en el centro
  // deja visión clara; alpha 0 en el borde conserva oscuridad para el degradado.
  const gradient=fogCtx.createRadialGradient(center.x,center.y,0,center.x,center.y,scaledRadius);
  gradient.addColorStop(0,`rgba(0,0,0,${alpha})`);
  gradient.addColorStop(0.72,`rgba(0,0,0,${alpha})`);
  gradient.addColorStop(1,'rgba(0,0,0,0)');
  fogCtx.fillStyle=gradient;
  fogCtx.fill();
  fogCtx.restore();
}
function cutFovHole(fogCtx, playerX, playerY, radio, walls, zoom, offsetX, offsetY, options={}) {
  const polygon=getCachedFovPolygon(playerX,playerY,radio,walls,options);
  cutFovPolygon(fogCtx,polygon,playerX,playerY,radio,zoom,offsetX,offsetY,options);
}
function cutAmbientVisionArea(fogCtx, playerX, playerY, radio, zoom, offsetX, offsetY, options={}) {
  const alpha=Math.max(0,Math.min(1,Number(options.ambientAlpha ?? FOV_OCCLUDED_AMBIENT_VISIBILITY)));
  if(alpha<=0) return;
  const polygon=calcularFOV(playerX,playerY,radio,[],options);
  cutFovPolygon(fogCtx,polygon,playerX,playerY,radio,zoom,offsetX,offsetY,{
    ...options,
    alpha,
    edgeBlur:Math.max(FOV_SOFT_EDGE_BLUR,Number(options.edgeBlur ?? FOV_SOFT_EDGE_BLUR) || 0)
  });
}
function getExploredFovKey(playerX,playerY,radio,visionAngle,facing) {
  const grid=getActiveMapGrid();
  const cell=Math.max(24,grid.size*0.5);
  const radiusBucket=Math.round((Number(radio)||FOV_RADIUS)/grid.size);
  const angleBucket=Math.round(Number(visionAngle)||360);
  const facingBucket=angleBucket>=359 ? 0 : Math.round(normalizeFovAngle(Number(facing)||0)/(Math.PI/8));
  return `${Math.round(playerX/cell)}:${Math.round(playerY/cell)}:${radiusBucket}:${angleBucket}:${facingBucket}`;
}
function rememberExploredFovPolygon(polygon, playerX, playerY, radio, options={}) {
  if(!mapState.fogOfWar || !Array.isArray(polygon) || polygon.length<3) return;
  const visionAngle=Number(options.visionAngle ?? options.angle ?? 360);
  const facing=Number(options.facing)||0;
  const ownerKey=options.userId ? `:${options.userId}` : '';
  const key=getExploredFovKey(playerX,playerY,radio,visionAngle,facing) + ownerKey;
  if(mapState.exploredFogPolygons.some(item=>item?.key===key)) return;
  const stride=Math.max(1,Math.ceil(polygon.length/80));
  const points=polygon
    .filter((_,index)=>index%stride===0 || index===polygon.length-1)
    .map(p=>({x:Math.round(p.x*10)/10,y:Math.round(p.y*10)/10}));
  mapState.exploredFogPolygons.push({
    key,
    x:Math.round(playerX*10)/10,
    y:Math.round(playerY*10)/10,
    radius:Math.round((Number(radio)||FOV_RADIUS)*10)/10,
    visionAngle,
    facing,
    tokenId:options.tokenId || null,
    combatantId:options.combatantId ?? null,
    userId:options.userId || null,
    points
  });
  if(mapState.exploredFogPolygons.length>FOV_MAX_EXPLORED_POLYGONS) {
    mapState.exploredFogPolygons.splice(0,mapState.exploredFogPolygons.length-FOV_MAX_EXPLORED_POLYGONS);
  }
  storeCurrentMapFog();
  broadcastFogStrokes();
}
function cutExploredFogAreas(fogCtx, options={}) {
  if(!mapState.fogExploredAreas || !Array.isArray(mapState.exploredFogPolygons)) return;
  const allowedUserId=options.userId || null;
  mapState.exploredFogPolygons.forEach(area=>{
    if(!area || !Array.isArray(area.points) || area.points.length<3) return;
    if(allowedUserId && area.userId !== allowedUserId) return;
    cutFovPolygon(
      fogCtx,
      area.points,
      Number(area.x)||0,
      Number(area.y)||0,
      Number(area.radius)||FOV_RADIUS,
      mapState.zoom,
      mapState.offsetX,
      mapState.offsetY,
      {visionAngle:Number(area.visionAngle)||360,alpha:FOV_EXPLORED_VISIBILITY}
    );
  });
}

// Dibuja el fog of war sobre el canvas principal usando un canvas offscreen.
// El polígono se calcula en coordenadas de mapa y cada punto se convierte a
// coordenadas de canvas para respetar pan/zoom.
function dibujarFOV(ctxPrincipal, playerX, playerY, radio, walls, zoom, offsetX, offsetY, options={}) {
  const fogCtx=resetFovOverlay(ctxPrincipal);
  cutFovHole(fogCtx,playerX,playerY,radio,walls,zoom,offsetX,offsetY,options);
  ctxPrincipal.drawImage(fovRenderCache.canvas,0,0);
}
function getTokenFacing(t) {
  return Number.isFinite(t?.facing) ? t.facing : 0;
}
function getTokenImageRotation(token, combatant) {
  if(!token || !combatant?.portrait) return 0;
  return getTokenFacing(token) + Math.PI / 2;
}
function playerHasVisionAccess(c) {
  if(!state.currentUser || !c) return false;
  return c.userId === state.currentUser.id;
}
function getPlayerVisionTokens() {
  if(isDM() || !state.currentUser) return [];
  return mapState.tokens.filter(t=>{
    if(t.hidden) return false;
    const c=getCombatantById(t.id);
    const vision = c ? normalizeCharacterVision(c) : null;
    return c && c.type==='player' && vision.clearsFog && vision.radiusSquares > 0 && playerHasVisionAccess(c);
  });
}
function getDmVisionTokens() {
  if(!isDM()) return [];
  return mapState.tokens.filter(t=>{
    if(t.hidden) return false;
    const c=getCombatantById(t.id);
    const vision = c ? normalizeCharacterVision(c) : null;
    return c && c.type==='player' && vision.clearsFog && vision.radiusSquares > 0;
  });
}
function getTokenVisionRenderConfig(token, combatant, grid=getActiveMapGrid()) {
  if(!token || !combatant) return null;
  const vision=normalizeCharacterVision(combatant);
  if(!vision.clearsFog || vision.radiusSquares<=0) return null;
  return {
    radius:Math.max(1,grid.size*vision.radiusSquares),
    options:{
      visionAngle:vision.angle,
      facing:getTokenFacing(token)
    }
  };
}
function getSelectedVisionToken() {
  const token=getMapTokenByTokenId(mapState.selectedTokenId);
  const combatant=token && getCombatantById(token.id);
  return token && combatant ? {token,combatant} : null;
}
function ensureSelectedVisionToken() {
  if(getSelectedVisionToken()) return;
  const token=mapState.tokens.find(t=>!t.hidden) || mapState.tokens[0];
  if(!token) return;
  mapState.selectedTokenId=token.tokenId;
  renderTokenActionPanel();
}
function paintFogStroke(ctx,stroke,alpha=1) {
  const gradient=ctx.createRadialGradient(stroke.x,stroke.y,0,stroke.x,stroke.y,stroke.radius);
  gradient.addColorStop(0,`rgba(0,0,0,${alpha})`);
  gradient.addColorStop(0.78,`rgba(0,0,0,${alpha})`);
  gradient.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=gradient;
  ctx.beginPath();
  ctx.arc(stroke.x,stroke.y,stroke.radius,0,Math.PI*2);
  ctx.fill();
}
function applyManualFogStrokes(ctx,alpha=1) {
  mapState.fogStrokes.forEach(stroke=>{
    ctx.globalCompositeOperation = stroke.mode === 'reveal' ? 'destination-out' : 'source-over';
    paintFogStroke(ctx,stroke,alpha);
  });
}
function drawDmFogPreview(ctx) {
  if(!mapState.fogOfWar || !isDM()) return;
  const grid=getActiveMapGrid();
  ctx.save();
  ctx.globalAlpha=0.28;
  ctx.fillStyle='rgba(1,0,8,0.45)';
  ctx.fillRect(0,0,grid.width,grid.height);
  applyManualFogStrokes(ctx,0.65);
  ctx.globalCompositeOperation='source-over';
  ctx.globalAlpha=1;
  ctx.strokeStyle='rgba(168,85,247,0.45)';
  ctx.lineWidth=2/(mapState.zoom||1);
  ctx.setLineDash([10/(mapState.zoom||1),7/(mapState.zoom||1)]);
  ctx.strokeRect(0,0,grid.width,grid.height);
  ctx.restore();
}
function drawPlayerVisionFog(ctx) {
  if(!state.currentUser || !mapState.fogOfWar) return;
  const grid=getActiveMapGrid();
  const fogOpacity=isDM() && mapState.fogSeeThrough ? 0.66 : 1;
  const fogCtx=resetFovOverlay(ctx,fogOpacity);
  if(isDM()) {
    if(mapState.fogExploredAreas && !mapState.fogSeeThrough) cutExploredFogAreas(fogCtx);
    getDmVisionTokens().forEach(t=>{
      const c=getCombatantById(t.id);
      const config=getTokenVisionRenderConfig(t,c,grid);
      if(!config) return;
      const ownerOptions={...config.options,tokenId:t.tokenId,combatantId:c.id,userId:c.userId||null};
      const polygon=getCachedFovPolygon(t.x,t.y,config.radius,mapState.walls,ownerOptions);
      rememberExploredFovPolygon(polygon,t.x,t.y,config.radius,ownerOptions);
      cutAmbientVisionArea(fogCtx,t.x,t.y,config.radius,mapState.zoom,mapState.offsetX,mapState.offsetY,ownerOptions);
      cutFovPolygon(fogCtx,polygon,t.x,t.y,config.radius,mapState.zoom,mapState.offsetX,mapState.offsetY,ownerOptions);
    });
    ctx.drawImage(fovRenderCache.canvas,0,0);
    return;
  }

  const visionTokens=getPlayerVisionTokens();
  cutExploredFogAreas(fogCtx,{userId:state.currentUser.id});
  visionTokens.forEach(t=>{
    const c=getCombatantById(t.id);
    const config=getTokenVisionRenderConfig(t,c,grid);
    if(!config) return;
    const ownerOptions={...config.options,tokenId:t.tokenId,combatantId:c.id,userId:c.userId||state.currentUser.id};
    const polygon=getCachedFovPolygon(t.x,t.y,config.radius,mapState.walls,ownerOptions);
    rememberExploredFovPolygon(polygon,t.x,t.y,config.radius,ownerOptions);
    cutAmbientVisionArea(fogCtx,t.x,t.y,config.radius,mapState.zoom,mapState.offsetX,mapState.offsetY,ownerOptions);
    cutFovPolygon(fogCtx,polygon,t.x,t.y,config.radius,mapState.zoom,mapState.offsetX,mapState.offsetY,ownerOptions);
  });
  ctx.drawImage(fovRenderCache.canvas,0,0);
}
function hexToRgba(hex, alpha=1) {
  const clean=String(hex||'#a855f7').replace('#','');
  const value=/^[0-9a-f]{6}$/i.test(clean) ? clean : 'a855f7';
  const r=parseInt(value.slice(0,2),16);
  const g=parseInt(value.slice(2,4),16);
  const b=parseInt(value.slice(4,6),16);
  return `rgba(${r},${g},${b},${Math.max(0,Math.min(1,alpha))})`;
}
function applyGridStrokeStyle(ctx, grid) {
  ctx.strokeStyle=hexToRgba(grid.color,grid.opacity);
  ctx.lineWidth=Math.max(0.25,grid.thickness);
  if(grid.style==='dashed') ctx.setLineDash([grid.size*0.35,grid.size*0.18]);
  else if(grid.style==='dotted') ctx.setLineDash([ctx.lineWidth,grid.size*0.18]);
  else ctx.setLineDash([]);
  ctx.lineCap=grid.style==='dotted'?'round':'butt';
}
function drawHexCell(ctx,cx,cy,w,h,pointy=false) {
  ctx.beginPath();
  if(pointy) {
    ctx.moveTo(cx,cy-h/2);
    ctx.lineTo(cx+w/2,cy-h/4);
    ctx.lineTo(cx+w/2,cy+h/4);
    ctx.lineTo(cx,cy+h/2);
    ctx.lineTo(cx-w/2,cy+h/4);
    ctx.lineTo(cx-w/2,cy-h/4);
  } else {
    ctx.moveTo(cx-w/2,cy);
    ctx.lineTo(cx-w/4,cy-h/2);
    ctx.lineTo(cx+w/4,cy-h/2);
    ctx.lineTo(cx+w/2,cy);
    ctx.lineTo(cx+w/4,cy+h/2);
    ctx.lineTo(cx-w/4,cy+h/2);
  }
  ctx.closePath();
  ctx.stroke();
}
function drawMapGridOverlay(ctx, grid) {
  if(!mapState.gridVisible) return;
  ctx.save();
  applyGridStrokeStyle(ctx,grid);
  ctx.beginPath();
  if(grid.type==='square') {
    for(let x=0;x<=grid.width+0.1;x+=grid.size){ctx.moveTo(x,0);ctx.lineTo(x,grid.height);}
    for(let y=0;y<=grid.height+0.1;y+=grid.size){ctx.moveTo(0,y);ctx.lineTo(grid.width,y);}
    ctx.stroke();
  } else if(grid.type.startsWith('hex-row')) {
    const w=grid.size;
    const h=Math.sqrt(3)/2*w;
    const stepX=w*0.75;
    const odd=grid.type.endsWith('odd');
    for(let col=0,x=w/2;x<=grid.width+w;x+=stepX,col++) {
      const offset=(col%2===1)===odd ? h/2 : 0;
      for(let y=h/2-offset;y<=grid.height+h;y+=h) drawHexCell(ctx,x,y,w,h,false);
    }
  } else {
    const h=grid.size;
    const w=Math.sqrt(3)/2*h;
    const stepY=h*0.75;
    const odd=grid.type.endsWith('odd');
    for(let row=0,y=h/2;y<=grid.height+h;y+=stepY,row++) {
      const offset=(row%2===1)===odd ? w/2 : 0;
      for(let x=w/2-offset;x<=grid.width+w;x+=w) drawHexCell(ctx,x,y,w,h,true);
    }
  }
  ctx.restore();
}
function drawMap() {
  const {canvas,ctx,zoom,offsetX,offsetY,currentImage,pings,tokens}=mapState;
  const m=maps.find(m=>m.id===state.activeMapId);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.save(); ctx.translate(offsetX,offsetY); ctx.scale(zoom,zoom);
  ctx.fillStyle='#020109'; ctx.fillRect(-5000,-5000,10000,10000);
  const grid=getActiveMapGrid();
  if(currentImage) { ctx.drawImage(currentImage,grid.backgroundX,grid.backgroundY,grid.backgroundWidth,grid.backgroundHeight); }
  else if(m&&m.rooms) {
    ctx.fillStyle='#0d0520'; ctx.strokeStyle='#1f0a45'; ctx.lineWidth=3;
    m.rooms.forEach(r=>{ctx.fillRect(r.x,r.y,r.w,r.h);ctx.strokeRect(r.x,r.y,r.w,r.h);});
  }
  drawMapGridOverlay(ctx,grid);
  drawVisionWalls(ctx);
  mapState.structures.forEach(s=>{
    ctx.save();
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.shadowColor='rgba(0,0,0,0.75)';ctx.shadowBlur=8;
    if(s.image) {
      let img=structureImageCache[s.image];
      if(!img) {
        img=new Image();
        img.src=s.image;
        img.onload=()=>drawMap();
        structureImageCache[s.image]=img;
      }
      if(img.complete && img.naturalWidth!==0) {
        ctx.drawImage(img,s.x-(s.size||52)/2,s.y-(s.size||52)/2,s.size||52,s.size||52);
      } else {
        ctx.font=`${s.size||52}px "Segoe UI Emoji",sans-serif`;
        ctx.fillText(s.icon||'🏚️',s.x,s.y);
      }
    } else {
      ctx.font=`${s.size||52}px "Segoe UI Emoji",sans-serif`;
      ctx.fillText(s.icon||'🏚️',s.x,s.y);
    }
    ctx.shadowBlur=0;
    if(isDM() && (state.mapTool==='structure' || state.mapTool==='structure-remove')) {
      ctx.beginPath();ctx.arc(s.x,s.y,(s.size||52)*0.58,0,Math.PI*2);
      ctx.strokeStyle=state.mapTool==='structure-remove'?'rgba(239,68,68,0.78)':'rgba(245,158,11,0.55)';
      ctx.lineWidth=2/mapState.zoom;ctx.stroke();
    }
    ctx.restore();
  });
  if(mapState.measurement) {
    const m=mapState.measurement;
    const grid=getActiveMapGrid();
    const squares=Math.hypot(m.endX-m.startX,m.endY-m.startY)/grid.size;
    ctx.save();
    ctx.strokeStyle='rgba(245,158,11,0.95)'; ctx.fillStyle='rgba(245,158,11,0.95)';
    ctx.lineWidth=3/mapState.zoom; ctx.setLineDash([10/mapState.zoom,6/mapState.zoom]);
    ctx.beginPath();ctx.moveTo(m.startX,m.startY);ctx.lineTo(m.endX,m.endY);ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();ctx.arc(m.startX,m.startY,6/mapState.zoom,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(m.endX,m.endY,6/mapState.zoom,0,Math.PI*2);ctx.fill();
    ctx.font=`${14/mapState.zoom}px sans-serif`;
    ctx.fillText(`${squares.toFixed(1)} casillas · ${(squares*grid.distance).toFixed(1)} ${grid.unit}`,m.endX+10/mapState.zoom,m.endY-10/mapState.zoom);
    ctx.restore();
  }
  for(let i=pings.length-1;i>=0;i--) {
    const p=pings[i];
    ctx.beginPath();ctx.arc(p.x,p.y,p.radius,0,Math.PI*2);
    ctx.strokeStyle=`rgba(168,85,247,${p.alpha})`;ctx.lineWidth=4;ctx.stroke();
    ctx.beginPath();ctx.arc(p.x,p.y,p.radius*1.6,0,Math.PI*2);
    ctx.strokeStyle=`rgba(168,85,247,${p.alpha*0.35})`;ctx.lineWidth=2;ctx.stroke();
    p.radius+=2.5/zoom; p.alpha-=0.022; if(p.alpha<=0)pings.splice(i,1);
  }
  const tokenTotals = tokens.reduce((acc,t)=>{ const key=String(t.id); acc[key]=(acc[key]||0)+1; return acc; },{});
  const tokenOrdinals = {};
  tokens.forEach(t=>{
    if(t.hidden && !isDM()) return;
    const c = getCombatantById(t.id);
    if (!c) return;
    normalizeTokenGridSize(t);
    const tokenIsHidden = t.hidden === true;
    ctx.save();
    if(tokenIsHidden) ctx.globalAlpha = 0.45;
    const tokenKey = String(t.id);
    tokenOrdinals[tokenKey] = (tokenOrdinals[tokenKey] || 0) + 1;
    const initialsText = c.initials || initials(c.name);
    const color = c.color || '#a855f7';
    
    const tokenZoom = mapState.zoom || 1;
    const tokenStroke = Math.max(1.15 / tokenZoom, 0.65);
    const tokenInset = Math.max(1.5 / tokenZoom, 1);
    ctx.beginPath();ctx.arc(t.x+2,t.y+2,t.radius,0,Math.PI*2);ctx.fillStyle='rgba(0,0,0,0.48)';ctx.fill();
    ctx.beginPath();ctx.arc(t.x,t.y,t.radius,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();
    ctx.lineWidth=tokenStroke;ctx.strokeStyle='rgba(255,255,255,0.22)';ctx.stroke();
    
    ctx.save();
    ctx.beginPath();ctx.arc(t.x,t.y,t.radius-tokenInset,0,Math.PI*2);ctx.clip();
    
    if (c.portrait) {
      let img = imageCache[c.id];
      if (!img) {
        img = new Image();
        img.src = c.portrait;
        imageCache[c.id] = img;
        img.onload = () => { drawMap(); };
      }
      if (img.complete && img.naturalWidth !== 0) {
        const rotation=getTokenImageRotation(t,c);
        ctx.save();
        ctx.translate(t.x,t.y);
        ctx.rotate(rotation);
        ctx.drawImage(img, -t.radius, -t.radius, t.radius * 2, t.radius * 2);
        ctx.restore();
      } else {
        ctx.beginPath();ctx.arc(t.x,t.y,t.radius-tokenInset,0,Math.PI*2);ctx.fillStyle = color;ctx.fill();
      }
    } else {
      ctx.beginPath();ctx.arc(t.x,t.y,t.radius-tokenInset,0,Math.PI*2);ctx.fillStyle = color;ctx.fill();
      ctx.fillStyle='#fff';ctx.font='bold 16px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.shadowColor='rgba(0,0,0,0.8)';ctx.shadowBlur=6;ctx.fillText(initialsText,t.x,t.y);ctx.shadowBlur=0;
    }
    ctx.restore();
    
    ctx.beginPath();ctx.arc(t.x,t.y,t.radius-tokenInset,0,Math.PI*2);ctx.strokeStyle='rgba(255,255,255,0.12)';ctx.lineWidth=tokenStroke;ctx.stroke();
    if(tokenTotals[tokenKey] > 1) {
      const badgeX=t.x+t.radius*0.62, badgeY=t.y-t.radius*0.62;
      ctx.beginPath();ctx.arc(badgeX,badgeY,9,0,Math.PI*2);ctx.fillStyle='rgba(15,8,30,0.95)';ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,0.45)';ctx.lineWidth=2;ctx.stroke();
      ctx.fillStyle='#fff';ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(tokenOrdinals[tokenKey],badgeX,badgeY+0.5);
    }
    if(tokenIsHidden) {
      ctx.globalAlpha = 1;
      ctx.beginPath();ctx.arc(t.x,t.y,t.radius+6,0,Math.PI*2);
      ctx.strokeStyle='rgba(245,158,11,0.9)';ctx.lineWidth=2/(mapState.zoom||1);ctx.setLineDash([6/(mapState.zoom||1),5/(mapState.zoom||1)]);ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle='rgba(15,8,30,0.9)';ctx.fillRect(t.x-22,t.y+t.radius+7,44,16);
      ctx.fillStyle='rgba(245,158,11,0.95)';ctx.font=`${10/(mapState.zoom||1)}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('OCULTO',t.x,t.y+t.radius+15);
    }
    if(mapState.selectedTokenId === t.tokenId && canResizeToken(t, c)) {
      ctx.globalAlpha = 1;
      const selectedGap = Math.max(4 / tokenZoom, 2);
      ctx.beginPath();ctx.arc(t.x,t.y,t.radius+selectedGap,0,Math.PI*2);
      ctx.strokeStyle='rgba(168,85,247,0.78)';ctx.lineWidth=Math.max(1.5/tokenZoom,0.8);ctx.stroke();
    }
    ctx.restore();
  });

  ctx.restore();

  // Weather Draw & Update Loop (Screen-Space Overlay)
  const width = canvas.width;
  const height = canvas.height;
  const weatherBounds=getVisibleMapScreenBounds();
  ctx.save();
  ctx.beginPath();
  ctx.rect(weatherBounds.x,weatherBounds.y,weatherBounds.width,weatherBounds.height);
  ctx.clip();
  
  if ((mapState.weather === 'rain' || mapState.weather === 'storm') && mapState.weatherParticles.length > 0) {
    if (mapState.weather === 'storm' && Math.random() < 0.007 && mapState.lightningFlash <= 0) {
      mapState.lightningFlash = 0.7 + Math.random() * 0.3;
    }
    ctx.fillStyle = mapState.weather === 'storm' ? 'rgba(20, 25, 50, 0.16)' : 'rgba(60, 75, 105, 0.07)';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = mapState.weather === 'storm' ? 'rgba(175, 200, 255, 0.62)' : 'rgba(165, 195, 235, 0.42)';
    ctx.lineWidth = mapState.weather === 'storm' ? 1.8 : 1.25;
    ctx.beginPath();
    mapState.weatherParticles.forEach(p => {
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + Math.cos(p.angle) * p.length, p.y + Math.sin(p.angle) * p.length);
      p.x += Math.cos(p.angle) * p.speed;
      p.y += p.speed;
      if (p.y > height || p.x > width || p.x < -50) {
        p.x = Math.random() * width;
        p.y = -p.length;
      }
    });
    ctx.stroke();
    if (mapState.lightningFlash > 0) {
      ctx.fillStyle = `rgba(235, 245, 255, ${mapState.lightningFlash})`;
      ctx.fillRect(0, 0, width, height);
      mapState.lightningFlash -= 0.045 + Math.random() * 0.055;
    }
  } else if (mapState.weather === 'drizzle' && mapState.weatherParticles.length > 0) {
    ctx.strokeStyle = 'rgba(160, 190, 255, 0.35)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    mapState.weatherParticles.forEach(p => {
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x, p.y + p.length);
      p.y += p.speed;
      if (p.y > height) {
        p.x = Math.random() * width;
        p.y = -p.length;
      }
    });
    ctx.stroke();
  } else if ((mapState.weather === 'snow' || mapState.weather === 'winter') && mapState.weatherParticles.length > 0) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.beginPath();
    mapState.weatherParticles.forEach(p => {
      ctx.moveTo(p.x, p.y);
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      p.y += p.speed;
      p.x += Math.sin(p.density) * 0.5 + p.drift * 0.2;
      p.density += 0.01;
      if (p.y > height) {
        p.x = Math.random() * width;
        p.y = -p.radius * 2;
        p.speed = 1 + Math.random() * 2.5;
      }
    });
    ctx.fill();
  } else if (mapState.weather === 'blizzard' && mapState.weatherParticles.length > 0) {
    ctx.fillStyle = 'rgba(200, 230, 255, 0.06)';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(235, 245, 255, 0.85)';
    ctx.beginPath();
    mapState.weatherParticles.forEach(p => {
      ctx.moveTo(p.x, p.y);
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      p.y += p.speed;
      p.x += p.drift;
      if (p.y > height || p.x < -20) {
        p.x = Math.random() * width + 200;
        p.y = -p.radius * 2;
      }
    });
    ctx.fill();
  } else if (mapState.weather === 'clear' && mapState.weatherParticles.length > 0) {
    ctx.fillStyle = 'rgba(255, 180, 0, 0.03)';
    ctx.fillRect(0, 0, width, height);
    mapState.weatherParticles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 220, 100, ${p.alpha})`;
      ctx.fill();
      p.y -= p.speed;
      p.alpha -= p.fadeSpeed;
      if (p.alpha <= 0 || p.y < 0) {
        p.x = Math.random() * width;
        p.y = height + 10;
        p.alpha = Math.random();
      }
    });
  } else if ((mapState.weather === 'blaze' || mapState.weather === 'summer') && mapState.weatherParticles.length > 0) {
    ctx.fillStyle = 'rgba(255, 90, 0, 0.09)';
    ctx.fillRect(0, 0, width, height);
    mapState.weatherParticles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `${p.color}${p.alpha})`;
      ctx.fill();
      p.y -= p.speed;
      p.x += Math.sin(p.wobble) * 0.4;
      p.wobble += 0.03;
      p.alpha -= p.fadeSpeed;
      if (p.alpha <= 0 || p.y < 0) {
        p.x = Math.random() * width;
        p.y = height + 10;
        p.alpha = 0.6 + Math.random() * 0.4;
      }
    });
  } else if (mapState.weather === 'night') {
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.sqrt(cx*cx + cy*cy);
    const grad = ctx.createRadialGradient(cx, cy, radius * 0.3, cx, cy, radius);
    grad.addColorStop(0, 'rgba(12, 10, 45, 0.22)');
    grad.addColorStop(0.7, 'rgba(6, 4, 30, 0.65)');
    grad.addColorStop(1, 'rgba(2, 1, 15, 0.88)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  } else if (mapState.weather === 'fog' && mapState.weatherParticles.length > 0) {
    ctx.fillStyle = 'rgba(5, 5, 15, 0.15)';
    ctx.fillRect(0, 0, width, height);
    mapState.weatherParticles.forEach(p => {
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
      grad.addColorStop(0, `rgba(200, 205, 220, ${p.alpha})`);
      grad.addColorStop(0.6, `rgba(180, 185, 200, ${p.alpha * 0.4})`);
      grad.addColorStop(1, 'rgba(180, 185, 200, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      p.x += p.speed;
      p.y += Math.sin(p.driftSpeed) * 0.1;
      p.driftSpeed += 0.005;
      if (p.x - p.radius > width) {
        p.x = -p.radius;
        p.y = Math.random() * height;
      }
    });
  } else if (mapState.weather === 'spring' && mapState.weatherParticles.length > 0) {
    ctx.fillStyle = 'rgba(120, 210, 130, 0.045)';
    ctx.fillRect(0, 0, width, height);
    mapState.weatherParticles.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      p.x += p.drift;
      p.y += p.speed;
      p.rotation += p.spin;
      if (p.y > height + 10 || p.x > width + 20) {
        p.x = Math.random() * width - 40;
        p.y = -10;
      }
    });
  } else if ((mapState.weather === 'autumn' || mapState.weather === 'wind') && mapState.weatherParticles.length > 0) {
    ctx.fillStyle = mapState.weather === 'autumn' ? 'rgba(170, 90, 20, 0.055)' : 'rgba(160, 180, 190, 0.035)';
    ctx.fillRect(0, 0, width, height);
    mapState.weatherParticles.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size, -p.size * 0.45, p.size * 2, p.size * 0.9);
      ctx.restore();
      p.x += p.speed;
      p.y += Math.sin(p.wobble) * p.drift;
      p.wobble += 0.08;
      p.rotation += p.spin;
      if (p.x > width + 20) {
        p.x = -20;
        p.y = Math.random() * height;
      }
    });
  } else if (mapState.weather === 'magic' && mapState.weatherParticles.length > 0) {
    ctx.fillStyle = 'rgba(120, 50, 200, 0.04)';
    ctx.fillRect(0, 0, width, height);
    mapState.weatherParticles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `${p.color}${p.alpha})`;
      ctx.fill();
      p.y -= p.speed;
      p.alpha -= p.fadeSpeed;
      if (p.alpha <= 0 || p.y < 0) {
        p.x = Math.random() * width;
        p.y = height + 10;
        p.alpha = Math.random();
      }
    });
  }

  ctx.restore();
  drawPlayerVisionFog(ctx);
}
function mapLoop() {
  // Interpolación lineal (lerp) para movimiento suave de tokens
  let needsRedraw = false;
  mapState.tokens.forEach(t => {
    if (t.tx !== undefined && t !== mapState.draggingToken) {
      const dx = (t.tx - t.x) * 0.18;
      const dy = (t.ty - t.y) * 0.18;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        t.x += dx;
        t.y += dy;
        needsRedraw = true;
      } else if (Math.abs(t.tx - t.x) > 0 || Math.abs(t.ty - t.y) > 0) {
        t.x = t.tx;
        t.y = t.ty;
        needsRedraw = true;
      }
    }
  });
  const animatedWeathers = ['spring', 'summer', 'autumn', 'winter', 'rain', 'storm', 'drizzle', 'snow', 'blizzard', 'clear', 'blaze', 'wind', 'fog', 'magic'];
  if (needsRedraw || mapState.pings.length > 0 || animatedWeathers.includes(mapState.weather) || mapState.lightningFlash > 0) {
    drawMap();
  }
  requestAnimationFrame(mapLoop);
}

function setWeather(w, remoteOverride = false, visualOnly = false) {
  if (!remoteOverride && state.currentUser && !isDM()) return;
  if(!visualOnly) stopCustomWeather();
  mapState.weather = w;
  mapState.weatherParticles = [];
  mapState.lightningFlash = 0;

  // ---- Play ambient weather sound ----
  if(!visualOnly) SoundEngine.weather(w);
  
  document.querySelectorAll('#weatherPanel .weather-opt').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`w-${w}`);
  if (activeBtn) activeBtn.classList.add('active');
  
  const width = mapState.canvas ? mapState.canvas.width : 800;
  const height = mapState.canvas ? mapState.canvas.height : 600;
  
  if (w === 'rain' || w === 'storm') {
    mapState.lightningFlash = 0;
    const amount = w === 'storm' ? 360 : 220;
    for (let i = 0; i < amount; i++) {
      mapState.weatherParticles.push({
        x: Math.random() * width,
        y: Math.random() * height - height,
        speed: (w === 'storm' ? 16 : 10) + Math.random() * 8,
        length: (w === 'storm' ? 28 : 18) + Math.random() * 18,
        angle: 1.05 + Math.random() * 0.12
      });
    }
  } else if (w === 'drizzle') {
    for (let i = 0; i < 80; i++) {
      mapState.weatherParticles.push({
        x: Math.random() * width,
        y: Math.random() * height - height,
        speed: 4 + Math.random() * 2.5,
        length: 8 + Math.random() * 6,
        angle: Math.PI / 2
      });
    }
  } else if (w === 'snow' || w === 'winter') {
    for (let i = 0; i < (w === 'winter' ? 125 : 80); i++) {
      mapState.weatherParticles.push({
        x: Math.random() * width,
        y: Math.random() * height - height,
        speed: 1 + Math.random() * 2.5,
        radius: 1.5 + Math.random() * 3.5,
        density: Math.random() * 10,
        drift: Math.random() * 2 - 1
      });
    }
  } else if (w === 'blizzard') {
    for (let i = 0; i < 260; i++) {
      mapState.weatherParticles.push({
        x: Math.random() * width + 200,
        y: Math.random() * height - height,
        speed: 3 + Math.random() * 5,
        radius: 1 + Math.random() * 3,
        drift: -4 - Math.random() * 7
      });
    }
  } else if (w === 'clear') {
    for (let i = 0; i < 20; i++) {
      mapState.weatherParticles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        speed: 0.2 + Math.random() * 0.4,
        size: 1 + Math.random() * 2,
        alpha: Math.random(),
        fadeSpeed: 0.005 + Math.random() * 0.01
      });
    }
  } else if (w === 'blaze' || w === 'summer') {
    for (let i = 0; i < 42; i++) {
      mapState.weatherParticles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        speed: 0.35 + Math.random() * 0.8,
        size: 1 + Math.random() * 2.5,
        alpha: 0.35 + Math.random() * 0.5,
        fadeSpeed: 0.003 + Math.random() * 0.008,
        wobble: Math.random() * 10,
        color: w === 'summer' ? 'rgba(255, 210, 70, ' : 'rgba(255, 100, 30, '
      });
    }
  } else if (w === 'fog') {
    for (let i = 0; i < 18; i++) {
      mapState.weatherParticles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 80 + Math.random() * 170,
        alpha: 0.035 + Math.random() * 0.055,
        speed: 0.15 + Math.random() * 0.4,
        driftSpeed: Math.random() * 10
      });
    }
  } else if (w === 'magic') {
    for (let i = 0; i < 48; i++) {
      mapState.weatherParticles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        speed: 0.25 + Math.random() * 0.75,
        size: 1 + Math.random() * 2.5,
        alpha: 0.3 + Math.random() * 0.7,
        fadeSpeed: 0.004 + Math.random() * 0.01,
        color: Math.random() > 0.5 ? 'rgba(190, 110, 255, ' : 'rgba(100, 210, 255, '
      });
    }
  } else if (w === 'spring') {
    const colors = ['#f9a8d4', '#fbcfe8', '#fef3c7', '#bbf7d0'];
    for (let i = 0; i < 64; i++) {
      mapState.weatherParticles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        speed: 0.45 + Math.random() * 0.85,
        drift: 0.2 + Math.random() * 0.8,
        size: 2 + Math.random() * 3,
        rotation: Math.random() * Math.PI,
        spin: -0.035 + Math.random() * 0.07,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  } else if (w === 'autumn' || w === 'wind') {
    const colors = w === 'autumn' ? ['#f59e0b', '#ea580c', '#b45309', '#fbbf24'] : ['#cbd5e1', '#94a3b8', '#e2e8f0'];
    for (let i = 0; i < (w === 'autumn' ? 82 : 54); i++) {
      mapState.weatherParticles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        speed: 1.8 + Math.random() * 3.5,
        drift: 0.6 + Math.random() * 1.8,
        size: 2 + Math.random() * 4,
        wobble: Math.random() * 10,
        rotation: Math.random() * Math.PI,
        spin: -0.08 + Math.random() * 0.16,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  }
  drawMap();

  if (!visualOnly && typeof multiplayer !== 'undefined' && multiplayer.isHost() && !remoteOverride) {
    multiplayer.broadcast({ type: 'weather_change', weather: w });
  }
}

function stopCustomWeather() {
  if(customWeatherAudio) {
    customWeatherAudio.pause();
    customWeatherAudio.src='';
    customWeatherAudio=null;
  }
}
function importCustomWeather(event) {
  if(!isDM()) return;
  Array.from(event.target.files||[]).forEach(file=>{
    const reader=new FileReader();
    reader.onload=e=>{
      customWeatherTracks.push({id:'weather_'+Date.now()+'_'+Math.random(),name:file.name,dataUrl:e.target.result});
      renderCustomWeatherList();
    };
    reader.readAsDataURL(file);
  });
  event.target.value='';
}
function renderCustomWeatherList() {
  const list=document.getElementById('customWeatherList');
  if(!list) return;
  list.innerHTML=customWeatherTracks.length?'':'<div style="font-size:0.72rem;color:var(--text-3);">Todavía no has importado ambientes.</div>';
  customWeatherTracks.forEach(track=>{
    const row=document.createElement('div');
    row.style.cssText='display:grid;grid-template-columns:1fr auto auto;gap:5px;align-items:center;padding:5px 7px;background:rgba(255,255,255,.04);border:1px solid var(--glass-border);border-radius:6px;';
    row.innerHTML=`<span style="font-size:0.72rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHTML(track.name)}">${escapeHTML(track.name)}</span><button class="weather-opt" title="Reproducir ambiente">▶</button><button class="weather-opt" title="Quitar ambiente">×</button>`;
    row.children[1].onclick=()=>playCustomWeather(track.id);
    row.children[2].onclick=()=>deleteCustomWeather(track.id);
    list.appendChild(row);
  });
}
function playCustomWeather(trackId,remoteData=null) {
  if(!remoteData && !isDM()) return;
  const track=remoteData||customWeatherTracks.find(item=>item.id===trackId);
  if(!track) return;
  SoundEngine.weather('none');
  stopCustomWeather();
  customWeatherAudio=new Audio(track.dataUrl);
  customWeatherAudio.loop=true;
  customWeatherAudio.volume=0.62*SoundEngine.getVolume()*SoundEngine.getWeatherVolume();
  customWeatherAudio.play().catch(()=>{});
  mapState.weather='custom';
  mapState.weatherParticles=[];
  document.querySelectorAll('#weatherPanel .weather-opt').forEach(btn=>btn.classList.remove('active'));
  drawMap();
  if(typeof multiplayer!=='undefined' && multiplayer.isHost() && !remoteData) {
    multiplayer.broadcast({type:'custom_weather_change',track:{id:track.id,name:track.name,dataUrl:track.dataUrl}});
  }
}
function deleteCustomWeather(trackId) {
  if(!isDM()) return;
  customWeatherTracks=customWeatherTracks.filter(track=>track.id!==trackId);
  renderCustomWeatherList();
}

function closeMapControlPanels(exceptId = '') {
  ['weatherPanel','structuresPanel','musicPanel'].forEach(id=>{
    if(id !== exceptId) document.getElementById(id).style.display='none';
  });
  if(exceptId !== 'weatherPanel') document.getElementById('toolWeather').classList.remove('active');
  if(exceptId !== 'structuresPanel') document.getElementById('toolStructures')?.classList.remove('active');
  if(exceptId !== 'musicPanel') document.getElementById('toolMusic').classList.remove('active');
  updateTokenPanelAvoidance(!!exceptId);
}
function toggleWeatherPanel() {
  if (!isDM()) return;
  const panel = document.getElementById('weatherPanel');
  if(!panel) return;
  const isHidden = panel.style.display === 'none';
  closeMapControlPanels(isHidden ? 'weatherPanel' : '');
  panel.style.display = isHidden ? 'flex' : 'none';
  document.getElementById('toolWeather').classList.toggle('active', isHidden);
  updateTokenPanelAvoidance(isHidden);
  if(isHidden) renderCustomWeatherList();
}
function toggleStructuresPanel() {
  if(!isDM()) return;
  const panel=document.getElementById('structuresPanel');
  const isHidden=panel.style.display==='none';
  closeMapControlPanels(isHidden ? 'structuresPanel' : '');
  panel.style.display=isHidden?'flex':'none';
  document.getElementById('toolStructures')?.classList.toggle('active',isHidden);
  updateTokenPanelAvoidance(isHidden);
  if(isHidden) {
    renderStructureCatalog();
    setStructureMode(mapState.structureMode||'add');
  }
}
function openMapDirectorPanel(panel) {
  if(!isDM()) return;
  switchPage('mapa');
  document.querySelectorAll('#mainNavTabs button').forEach(b=>b.classList.toggle('active',b.dataset.page==='mapa'));
  if(panel==='structures') toggleStructuresPanel();
  else if(panel==='music') toggleMusicPanel();
}
function selectStructure(sticker) {
  if(!isDM()) return;
  mapState.pendingStructure={stickerId:sticker.id,icon:sticker.icon||'🏚️',name:sticker.name,image:sticker.image||null};
  setStructureMode('add');
  document.querySelectorAll('.structure-opt').forEach(btn=>btn.classList.toggle('active',btn.dataset.structureId===sticker.id));
}
function setStructureMode(mode) {
  if(!isDM()) return;
  mapState.structureMode=mode==='remove'?'remove':'add';
  document.getElementById('structureAddMode')?.classList.toggle('active',mapState.structureMode==='add');
  document.getElementById('structureRemoveMode')?.classList.toggle('active',mapState.structureMode==='remove');
  if(mapState.structureMode==='remove') setMapTool('structure-remove');
  else if(mapState.pendingStructure) setMapTool('structure');
  else setMapTool('move');
  drawMap();
}
function renderStructureCatalog() {
  const picker=document.getElementById('structureStickerPicker');
  if(!picker) return;
  picker.innerHTML='';
  structureCatalog.forEach(sticker=>{
    const wrap=document.createElement('div');
    wrap.style.cssText='position:relative;display:flex;';
    const preview=sticker.image?`<img src="${escapeHTML(sticker.image)}" alt="" style="width:28px;height:28px;object-fit:contain;">`:escapeHTML(sticker.icon||'🏚️');
    wrap.innerHTML=`<button class="weather-opt structure-opt" data-structure-id="${escapeHTML(sticker.id)}" style="width:100%;font-size:1.25rem;" title="${escapeHTML(sticker.name)}">${preview}</button><button title="Borrar sticker" style="position:absolute;right:-3px;top:-5px;width:16px;height:16px;padding:0;border-radius:50%;border:1px solid rgba(239,68,68,.55);background:#3b0b16;color:#fecaca;font-size:10px;line-height:14px;">×</button>`;
    wrap.firstElementChild.onclick=()=>selectStructure(sticker);
    wrap.lastElementChild.onclick=e=>{e.stopPropagation();deleteStructureSticker(sticker.id);};
    picker.appendChild(wrap);
  });
}
function addStructureSticker() {
  if(!isDM()) return;
  const icon=document.getElementById('newStructureIcon').value.trim();
  const name=document.getElementById('newStructureName').value.trim()||'Estructura';
  const file=document.getElementById('newStructureImage').files[0];
  if(!icon && !file) {
    alert('Escribe un emoji o selecciona una imagen para crear la estructura.');
    return;
  }
  const saveSticker=image=>{
    const sticker={id:'custom_'+Date.now(),icon:icon||'🏚️',name,image:image||null};
    structureCatalog.push(sticker);
    saveLS('crq_structure_catalog',structureCatalog);
    document.getElementById('newStructureIcon').value='';
    document.getElementById('newStructureName').value='';
    document.getElementById('newStructureImage').value='';
    renderStructureCatalog();
    selectStructure(sticker);
    addChatMessage('sys','','Sticker personalizado listo para colocar en el tablero.');
  };
  if(!file) {
    saveSticker(null);
    return;
  }
  const reader=new FileReader();
  reader.onload=e=>compressImage(e.target.result,180,180,0.78,saveSticker);
  reader.readAsDataURL(file);
}
function restoreDefaultStructureStickers() {
  if(!isDM()) return;
  defaultStructureCatalog.forEach(sticker=>{
    if(!structureCatalog.some(existing=>existing.id===sticker.id)) structureCatalog.push({...sticker});
  });
  saveLS('crq_structure_catalog',structureCatalog);
  renderStructureCatalog();
}
function deleteStructureSticker(id) {
  if(!isDM()) return;
  const removed=structureCatalog.find(sticker=>sticker.id===id);
  structureCatalog=structureCatalog.filter(sticker=>sticker.id!==id);
  saveLS('crq_structure_catalog',structureCatalog);
  if(removed && mapState.pendingStructure?.stickerId===removed.id) {
    cancelStructurePlacement();
  }
  renderStructureCatalog();
}
function cancelStructurePlacement() {
  mapState.pendingStructure=null;
  setStructureMode('add');
  document.querySelectorAll('.structure-opt').forEach(btn=>btn.classList.remove('active'));
}
function removeStructureAt(pos) {
  for(let i=mapState.structures.length-1;i>=0;i--) {
    const s=mapState.structures[i];
    if((pos.x-s.x)**2+(pos.y-s.y)**2<=((s.size||52)*0.58)**2) {
      mapState.structures.splice(i,1);
      storeCurrentMapStructures();
      broadcastStructures();
      drawMap();
      addChatMessage('sys','','Estructura eliminada del mapa.');
      return true;
    }
  }
  return false;
}
function distancePointToSegment(pos, wall) {
  const dx=wall.x2-wall.x1;
  const dy=wall.y2-wall.y1;
  const lenSq=dx*dx+dy*dy;
  if(!lenSq) return Math.hypot(pos.x-wall.x1,pos.y-wall.y1);
  const t=Math.max(0,Math.min(1,((pos.x-wall.x1)*dx+(pos.y-wall.y1)*dy)/lenSq));
  return Math.hypot(pos.x-(wall.x1+t*dx),pos.y-(wall.y1+t*dy));
}
function removeWallAt(pos, silent=false) {
  const tolerance=Math.max(8,18/(mapState.zoom||1));
  let bestIndex=-1;
  let bestDistance=Infinity;
  for(let i=mapState.walls.length-1;i>=0;i--) {
    const d=distancePointToSegment(pos,mapState.walls[i]);
    if(d<bestDistance) {
      bestDistance=d;
      bestIndex=i;
    }
  }
  if(bestIndex>=0 && bestDistance<=tolerance) {
    mapState.walls.splice(bestIndex,1);
    storeCurrentMapWalls();
    broadcastWalls();
    drawMap();
    if(!silent) addChatMessage('sys','','Muro invisible eliminado del tablero.');
    return true;
  }
  return false;
}
function storeCurrentMapStructures() {
  const map=maps.find(m=>m.id===state.activeMapId);
  if(!map) return;
  map.structures=JSON.parse(JSON.stringify(mapState.structures));
  saveMaps();
}
function storeCurrentMapWalls() {
  const map=maps.find(m=>m.id===state.activeMapId);
  if(!map) return;
  map.walls=JSON.parse(JSON.stringify(mapState.walls));
  saveMaps();
}
function storeCurrentMapFog() {
  const map=maps.find(m=>m.id===state.activeMapId);
  if(!map) return;
  map.fogOfWar=mapState.fogOfWar===true;
  map.fogStrokes=JSON.parse(JSON.stringify(mapState.fogStrokes || []));
  map.fogExploredAreas=mapState.fogExploredAreas===true;
  map.exploredFogPolygons=JSON.parse(JSON.stringify(mapState.exploredFogPolygons || []));
  saveMaps();
}
function broadcastStructures() {
  if(typeof multiplayer!=='undefined' && multiplayer.isHost()) {
    multiplayer.broadcast({type:'structures_update',structures:mapState.structures});
  }
}
function broadcastWalls() {
  if(typeof multiplayer!=='undefined' && multiplayer.isHost()) {
    multiplayer.broadcast({type:'walls_update',walls:mapState.walls});
  }
}
function broadcastFogOfWar() {
  if(typeof multiplayer!=='undefined' && multiplayer.isHost()) {
    multiplayer.broadcast({
      type:'fog_of_war',
      fogOfWar:mapState.fogOfWar,
      fogExploredAreas:mapState.fogExploredAreas,
      exploredFogPolygons:mapState.exploredFogPolygons
    });
  }
}
function broadcastFogStrokes() {
  if(typeof multiplayer!=='undefined' && multiplayer.isHost()) {
    multiplayer.broadcast({
      type:'fog_strokes_update',
      fogStrokes:mapState.fogStrokes,
      fogExploredAreas:mapState.fogExploredAreas,
      exploredFogPolygons:mapState.exploredFogPolygons
    });
  }
}
function toggleMusicPanel() {
  if(!isDM()) return;
  const panel=document.getElementById('musicPanel');
  const isHidden=panel.style.display==='none';
  closeMapControlPanels(isHidden ? 'musicPanel' : '');
  panel.style.display=isHidden?'flex':'none';
  document.getElementById('toolMusic').classList.toggle('active',isHidden);
  updateTokenPanelAvoidance(isHidden);
  if(isHidden) renderCustomMusicList();
}
function stopExternalMusic() {
  if(externalYoutubeSyncTimer) {
    clearTimeout(externalYoutubeSyncTimer);
    externalYoutubeSyncTimer=null;
  }
  postExternalYoutubeCommand('stopVideo',[]);
  if(externalMusicAudio) {
    externalMusicAudio.pause();
    externalMusicAudio.src='';
    externalMusicAudio=null;
  }
  const player=document.getElementById('externalMusicPlayer');
  if(player) {
    player.innerHTML='';
    player.style.display='none';
  }
}
function clearExternalMusic() {
  const input=document.getElementById('externalMusicUrl');
  if(input) input.value='';
  setMusic('none');
}
function getExternalMusicSource(rawUrl) {
  let url;
  try { url=new URL(String(rawUrl||'').trim()); } catch(e) { return null; }
  if(!['https:','http:'].includes(url.protocol)) return null;
  const host=url.hostname.replace(/^www\./,'').toLowerCase();
  let youtubeId=null;
  if(host==='youtu.be') {
    youtubeId=url.pathname.split('/').filter(Boolean)[0]||null;
  } else if(host==='youtube.com'||host.endsWith('.youtube.com')) {
    youtubeId=url.searchParams.get('v');
    if(!youtubeId && /^\/(?:shorts|embed|live)\//.test(url.pathname)) {
      youtubeId=url.pathname.split('/').filter(Boolean)[1]||null;
    }
  }
  if(youtubeId) {
    const safeId=/^[a-zA-Z0-9_-]{6,}$/.test(youtubeId) ? youtubeId : '';
    if(safeId) return {kind:'youtube',url:`https://www.youtube-nocookie.com/embed/${safeId}?autoplay=1&mute=1&loop=1&playlist=${safeId}&enablejsapi=1&playsinline=1`};
  }
  if(host==='youtu.be'||host==='youtube.com'||host.endsWith('.youtube.com')) return {error:'youtube'};
  if(/\.mp4(?:$|[?#])/i.test(url.href)) return {error:'video'};
  return {kind:'audio',url:url.href};
}
function playExternalMusicFromInput() {
  if(!isDM()) return;
  const input=document.getElementById('externalMusicUrl');
  playExternalMusic(input?.value||'');
}
function playExternalMusic(rawUrl,remoteOverride=false) {
  if(!remoteOverride && !isDM()) return;
  const source=getExternalMusicSource(rawUrl);
  if(!source?.kind) {
    const player=document.getElementById('externalMusicPlayer');
    if(player) {
      player.style.display='block';
      player.innerHTML=source?.error==='youtube'
        ? '<div style="font-size:0.72rem;color:#fecaca;">✕ No pude reconocer el video de YouTube. Usa un enlace watch, youtu.be, Shorts o live válido.</div>'
        : '<div style="font-size:0.72rem;color:#fecaca;">✕ Usa un enlace válido de YouTube o un enlace directo de audio M4A. No se admite video MP4.</div>';
    }
    return;
  }
  SoundEngine.music('none');
  stopCustomMusic();
  stopExternalMusic();
  mapState.music='external';
  mapState.externalMusicUrl=String(rawUrl).trim();
  const input=document.getElementById('externalMusicUrl');
  if(input) input.value=mapState.externalMusicUrl;
  document.querySelectorAll('.music-opt,#music-none').forEach(btn=>btn.classList.remove('active'));
  const player=document.getElementById('externalMusicPlayer');
  if(source.kind==='youtube') {
    if(player) {
      player.style.display='block';
      player.innerHTML=`
        <iframe id="externalYoutubePlayer" class="external-youtube-player" title="Reproductor de YouTube" src="${escapeHTML(source.url)}" allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" onload="syncExternalYoutubePlayer()" allowfullscreen></iframe>
        <div class="external-music-sync">
          <button class="weather-opt external-music-resume" type="button" onclick="resumeExternalMusicPlayback()">Activar musica</button>
          <span>Si el navegador del jugador bloquea el audio, toca este boton una vez.</span>
        </div>`;
    }
    externalYoutubeSyncTimer=setTimeout(()=>{
      externalYoutubeSyncTimer=null;
      syncExternalYoutubePlayer();
    },900);
  } else {
  externalMusicAudio=new Audio(source.url);
  externalMusicAudio.loop=true;
  externalMusicAudio.volume=0.55*SoundEngine.getVolume()*SoundEngine.getMusicVolume();
  if(player) {
    player.style.display='block';
    player.innerHTML='<div style="font-size:0.72rem;color:var(--text-2);">⌛ Cargando audio M4A...</div>';
  }
  externalMusicAudio.addEventListener('playing',()=>{
    if(player) player.innerHTML='<div style="font-size:0.72rem;color:var(--text-2);">▶ Audio M4A en reproducción</div>';
  },{once:true});
  externalMusicAudio.addEventListener('error',()=>{
    if(player) player.innerHTML='<div style="font-size:0.72rem;color:#fecaca;">✕ No se pudo reproducir. Usa un enlace directo o firmado que entregue audio M4A.</div>';
  },{once:true});
  externalMusicAudio.play().catch(()=>{
    if(player) player.innerHTML='<div style="font-size:0.72rem;color:#fecaca;">✕ El navegador bloqueó o no pudo abrir el enlace de audio.</div>';
  });
  }
  if(typeof multiplayer!=='undefined' && multiplayer.isHost() && !remoteOverride) {
    multiplayer.broadcast({type:'external_music_change',url:String(rawUrl).trim()});
  }
}
function stopCustomMusic() {
  if(customMusicAudio) {
    customMusicAudio.pause();
    customMusicAudio.src='';
    customMusicAudio=null;
  }
}
function importCustomMusic(event) {
  if(!isDM()) return;
  [...(event.target.files||[])].filter(file=>file.type.startsWith('audio/')||/\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i.test(file.name)).forEach(file=>{
    const reader=new FileReader();
    reader.onload=e=>{
      customMusicTracks.push({id:'track_'+Date.now()+'_'+Math.random(),name:file.name,dataUrl:e.target.result});
      renderCustomMusicList();
    };
    reader.readAsDataURL(file);
  });
  event.target.value='';
}
function renderCustomMusicList() {
  const list=document.getElementById('customMusicList');
  if(!list) return;
  list.innerHTML=customMusicTracks.length?'':'<div style="font-size:0.72rem;color:var(--text-3);">Todavía no has importado audios.</div>';
  customMusicTracks.forEach(track=>{
    const row=document.createElement('div');
    row.style.cssText='display:grid;grid-template-columns:1fr auto auto;gap:5px;align-items:center;padding:5px 7px;background:rgba(255,255,255,.04);border:1px solid var(--glass-border);border-radius:6px;';
    row.innerHTML=`<span style="font-size:.72rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHTML(track.name)}">${escapeHTML(track.name)}</span><button class="weather-opt" style="padding:4px 7px;">▶</button><button class="weather-opt" style="padding:4px 7px;color:#fecaca;">×</button>`;
    row.children[1].onclick=()=>playCustomMusic(track.id);
    row.children[2].onclick=()=>deleteCustomMusic(track.id);
    list.appendChild(row);
  });
}
function playCustomMusic(trackId,remoteData=null) {
  if(!remoteData && !isDM()) return;
  const track=remoteData||customMusicTracks.find(item=>item.id===trackId);
  if(!track?.dataUrl) return;
  SoundEngine.music('none');
  stopExternalMusic();
  stopCustomMusic();
  customMusicAudio=new Audio(track.dataUrl);
  customMusicAudio.loop=true;
  customMusicAudio.volume=0.55*SoundEngine.getVolume()*SoundEngine.getMusicVolume();
  customMusicAudio.play().catch(()=>{});
  mapState.music='custom';
  mapState.externalMusicUrl=null;
  document.querySelectorAll('.music-opt,#music-none').forEach(btn=>btn.classList.remove('active'));
  if(typeof multiplayer!=='undefined' && multiplayer.isHost() && !remoteData) {
    multiplayer.broadcast({type:'custom_music_change',track:{id:track.id,name:track.name,dataUrl:track.dataUrl}});
  }
}
function deleteCustomMusic(trackId) {
  if(!isDM()) return;
  customMusicTracks=customMusicTracks.filter(track=>track.id!==trackId);
  renderCustomMusicList();
}
function setMusic(theme,remoteOverride=false) {
  if(!remoteOverride && !isDM()) return;
  stopExternalMusic();
  stopCustomMusic();
  mapState.music=theme;
  mapState.externalMusicUrl=null;
  SoundEngine.music(theme);
  document.querySelectorAll('.music-opt,#music-none').forEach(btn=>btn.classList.remove('active'));
  document.getElementById(`music-${theme}`)?.classList.add('active');
  if(typeof multiplayer!=='undefined' && multiplayer.isHost() && !remoteOverride) {
    multiplayer.broadcast({type:'music_change',music:theme});
  }
}

// ===================================================
// MANUAL MANAGEMENT
// ===================================================
const manualThemePresets={
  arcano:{label:'Arcano',icon:'🔮',accent:'#a855f7',bright:'#c084fc',dim:'#7c3aed',glow:'rgba(168,85,247,0.35)',void:'#05030f',deep:'#0b0618',panel:'rgba(30,15,55,0.55)',card:'rgba(40,20,70,0.5)'},
  bosque:{label:'Bosque',icon:'🌲',accent:'#16a34a',bright:'#86efac',dim:'#166534',glow:'rgba(34,197,94,0.32)',void:'#020b07',deep:'#06180e',panel:'rgba(10,48,27,0.58)',card:'rgba(18,66,38,0.5)'},
  oscuro:{label:'Oscuro',icon:'🕯️',accent:'#dc2626',bright:'#fca5a5',dim:'#7f1d1d',glow:'rgba(220,38,38,0.3)',void:'#080202',deep:'#180606',panel:'rgba(52,12,18,0.58)',card:'rgba(72,18,24,0.5)'},
  hielo:{label:'Hielo',icon:'❄️',accent:'#0ea5e9',bright:'#bae6fd',dim:'#0369a1',glow:'rgba(14,165,233,0.3)',void:'#020a12',deep:'#061827',panel:'rgba(11,46,70,0.58)',card:'rgba(15,62,92,0.5)'},
  desierto:{label:'Desierto',icon:'☀️',accent:'#d97706',bright:'#fde68a',dim:'#92400e',glow:'rgba(217,119,6,0.3)',void:'#100802',deep:'#241407',panel:'rgba(73,40,10,0.58)',card:'rgba(96,53,14,0.5)'},
  oceano:{label:'Océano',icon:'🌊',accent:'#0284c7',bright:'#7dd3fc',dim:'#075985',glow:'rgba(2,132,199,0.32)',void:'#020910',deep:'#051b2a',panel:'rgba(7,48,72,0.58)',card:'rgba(9,64,94,0.5)'}
};
function normalizeManualText(value) {
  return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
}
function normalizeManualTheme(value) {
  const text=normalizeManualText(value);
  if(/bosque|forest|selva|naturaleza/.test(text)) return 'bosque';
  if(/oscuro|terror|horror|cripta|vampir|undead|muerto|necrom/.test(text)) return 'oscuro';
  if(/hielo|nieve|invierno|glaciar|frost/.test(text)) return 'hielo';
  if(/desierto|arena|\bsol\b|calor|duna/.test(text)) return 'desierto';
  if(/oceano|mar|pirata|naval|costa|agua/.test(text)) return 'oceano';
  return 'arcano';
}
function normalizeManualWeather(value) {
  const text=normalizeManualText(value);
  const options={primavera:'spring',verano:'summer',otono:'autumn',invierno:'winter',sol:'clear',calor:'blaze',llovizna:'drizzle',lluvia:'rain',tormenta:'storm',viento:'wind',nieve:'snow',ventisca:'blizzard',noche:'night',niebla:'fog',arcano:'magic'};
  return Object.entries(options).find(([label])=>new RegExp(`\\b${label}\\b`).test(text))?.[1]||null;
}
function normalizeManualMusic(value) {
  const text=normalizeManualText(value);
  return ['tavern','combat','explore','mystery','dungeon','victory'].find(theme=>text.includes(theme))
    || ({taberna:'tavern',combate:'combat',exploracion:'explore',misterio:'mystery',mazmorra:'dungeon',victoria:'victory'}[
      ['taberna','combate','exploracion','misterio','mazmorra','victoria'].find(theme=>text.includes(theme))
    ]||null);
}
function parseManualAdaptation(manual) {
  const source=`${manual?.title||''}\n${manual?.content||''}`;
  const directives={};
  source.split(/\r?\n/).forEach(line=>{
    const match=line.match(/^\s*@(tema|campaña|campana|clima|música|musica)\s*:\s*(.+?)\s*$/i);
    if(match) directives[normalizeManualText(match[1])]=match[2];
  });
  const normalized=normalizeManualText(source);
  const theme=directives.tema ? normalizeManualTheme(directives.tema) : normalizeManualTheme(normalized);
  const inferredWeather=normalizeManualWeather(normalized);
  const inferredMusic=normalizeManualMusic(normalized);
  return {
    manualId:manual?.id||null,
    theme,
    campaign:(directives.campana||manual?.title||'Campaña del Dungeon Master').trim(),
    weather:normalizeManualWeather(directives.clima)||inferredWeather,
    music:normalizeManualMusic(directives.musica)||inferredMusic,
    updated:Date.now()
  };
}
function applyManualAdaptationProfile(profile) {
  if(!profile) return;
  const preset=manualThemePresets[profile.theme]||manualThemePresets.arcano;
  const root=document.documentElement.style;
  root.setProperty('--accent',preset.accent);
  root.setProperty('--accent-bright',preset.bright);
  root.setProperty('--accent-dim',preset.dim);
  root.setProperty('--accent-glow',preset.glow);
  root.setProperty('--bg-void',preset.void);
  root.setProperty('--bg-deep',preset.deep);
  root.setProperty('--bg-panel',preset.panel);
  root.setProperty('--bg-card',preset.card);
  const badge=document.getElementById('campaignBadge');
  if(badge) badge.textContent=`${preset.icon} ${profile.campaign||'Campaña del Dungeon Master'}`;
  manualAdaptation=profile;
  saveLS('crq_manual_adaptation',profile);
  renderManualAdaptationSummary();
}
function resetManualAdaptationProfile() {
  manualAdaptation=null;
  saveLS('crq_manual_adaptation',null);
  applyManualAdaptationProfile({manualId:null,theme:'arcano',campaign:'Campaña del Dungeon Master',weather:null,music:null,updated:Date.now()});
  manualAdaptation=null;
  saveLS('crq_manual_adaptation',null);
  renderManualAdaptationSummary();
}
function applyManualAdaptation(manualId=activeManualId,broadcast=true) {
  const manual=manuals.find(item=>item.id===manualId);
  if(!manual) return;
  activeManualId=manual.id;
  saveLS('crq_active_manual_id',activeManualId);
  const profile=parseManualAdaptation(manual);
  applyManualAdaptationProfile(profile);
  if(broadcast&&typeof multiplayer!=='undefined'&&multiplayer.isHost()) {
    multiplayer.broadcast({type:'manual_adaptation_change',adaptation:profile});
  }
}
function applyActiveManualAdaptation() {
  if(!isDM()) return;
  applyManualAdaptation(activeManualId);
}
function renderManualAdaptationSummary() {
  const summary=document.getElementById('manualAdaptationSummary');
  if(!summary) return;
  const profile=manualAdaptation;
  if(!profile||profile.manualId!==activeManualId) {
    summary.classList.remove('active');
    summary.innerHTML='';
    return;
  }
  const preset=manualThemePresets[profile.theme]||manualThemePresets.arcano;
  summary.classList.add('active');
  summary.innerHTML=`<strong>${preset.icon} Tablero adaptado:</strong> tema ${escapeHTML(preset.label)} · campaña ${escapeHTML(profile.campaign)}
    <div class="manual-adaptation-actions">
      ${profile.weather?`<button onclick="applySuggestedManualWeather()">Aplicar clima sugerido</button>`:''}
      ${profile.music?`<button onclick="applySuggestedManualMusic()">Aplicar música sugerida</button>`:''}
    </div>`;
}
function applySuggestedManualWeather() {
  if(isDM()&&manualAdaptation?.weather) setWeather(manualAdaptation.weather);
}
function applySuggestedManualMusic() {
  if(isDM()&&manualAdaptation?.music) setMusic(manualAdaptation.music);
}
function saveManuals() {
  return saveLS('crq_manuals',manuals);
}
function createManual() {
  if(!isDM()) return;
  const manual={id:'manual_'+Date.now(),title:'Nuevo manual',type:'notes',content:'',dataUrl:null,fileName:null,updated:Date.now()};
  manuals.unshift(manual);
  activeManualId=manual.id;
  saveLS('crq_active_manual_id',activeManualId);
  saveManuals();
  renderManualsPage();
}
function importManualFiles(event) {
  if(!isDM()) return;
  const files=[...(event.target.files||[])];
  files.forEach(file=>{
    const isPdf=file.type==='application/pdf'||/\.pdf$/i.test(file.name);
    const isText=/\.(txt|md|json)$/i.test(file.name)||file.type.startsWith('text/');
    if(!isPdf&&!isText) return;
    if(isPdf&&file.size>1500000) {
      alert(`El PDF "${file.name}" supera 1.5 MB. Usa una versión reducida para no llenar el almacenamiento del navegador.`);
      return;
    }
    const reader=new FileReader();
    reader.onload=e=>{
      const manual={
        id:'manual_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),
        title:file.name.replace(/\.[^.]+$/,''),
        type:isPdf?'pdf':'text',
        content:isPdf?'':String(e.target.result||''),
        dataUrl:isPdf?e.target.result:null,
        fileName:file.name,
        updated:Date.now()
      };
      manuals.unshift(manual);
      activeManualId=manual.id;
      saveLS('crq_active_manual_id',activeManualId);
      saveManuals();
      renderManualsPage();
      renderSelectionManualList();
      applyManualAdaptation(activeManualId);
    };
    if(isPdf) reader.readAsDataURL(file);
    else reader.readAsText(file);
  });
  event.target.value='';
}
function renderManualsPage() {
  const list=document.getElementById('manualList');
  if(!list) return;
  if(!isDM()) {
    list.innerHTML='';
    return;
  }
  list.innerHTML=manuals.length
    ? manuals.map(manual=>`<button class="manual-list-item ${manual.id===activeManualId?'active':''}" onclick="selectManual('${manual.id}')">
        <div class="manual-list-name">${escapeHTML(manual.title)}</div>
        <div class="manual-list-type">${manual.type==='pdf'?'PDF adjunto':'Texto editable'} · ${new Date(manual.updated||Date.now()).toLocaleDateString()}</div>
      </button>`).join('')
    : '<div class="enemy-empty">Todavía no hay manuales.</div>';
  const manual=manuals.find(item=>item.id===activeManualId);
  const empty=document.getElementById('manualEmptyState');
  const editor=document.getElementById('manualEditor');
  if(!manual) {
    empty.style.display='flex';
    editor.style.display='none';
    renderManualAdaptationSummary();
    return;
  }
  empty.style.display='none';
  editor.style.display='flex';
  document.getElementById('manualTitle').value=manual.title;
  document.getElementById('manualContent').value=manual.content||'';
  document.getElementById('manualOpenFileButton').style.display=manual.dataUrl?'':'none';
  renderManualAdaptationSummary();
}
function selectManual(id) {
  if(!isDM()) return;
  activeManualId=id;
  saveLS('crq_active_manual_id',activeManualId);
  applyManualAdaptation(activeManualId);
  renderManualsPage();
}
function saveActiveManual() {
  if(!isDM()) return;
  const manual=manuals.find(item=>item.id===activeManualId);
  if(!manual) return;
  manual.title=document.getElementById('manualTitle').value.trim()||'Manual sin título';
  manual.content=document.getElementById('manualContent').value;
  manual.updated=Date.now();
  saveManuals();
  applyManualAdaptation(activeManualId);
  renderManualsPage();
  renderSelectionManualList();
}
function deleteActiveManual() {
  if(!isDM()) return;
  const manual=manuals.find(item=>item.id===activeManualId);
  if(!manual||!confirm(`¿Eliminar el manual "${manual.title}"?`)) return;
  manuals=manuals.filter(item=>item.id!==activeManualId);
  activeManualId=manuals[0]?.id||null;
  saveLS('crq_active_manual_id',activeManualId);
  saveManuals();
  if(activeManualId) applyManualAdaptation(activeManualId);
  else resetManualAdaptationProfile();
  renderManualsPage();
  renderSelectionManualList();
}
function openActiveManualFile() {
  if(!isDM()) return;
  const manual=manuals.find(item=>item.id===activeManualId);
  if(manual?.dataUrl) window.open(manual.dataUrl,'_blank','noopener');
}

// ===================================================
// PARTIDA MANAGEMENT (SAVES)
// ===================================================
function getCurrentInviteCode() {
  if(typeof multiplayer !== 'undefined' && multiplayer.isActive()) {
    if(multiplayer.code) return multiplayer.code.startsWith('TM-') ? multiplayer.code : `TM-${multiplayer.code}`;
    const headerCode = document.getElementById('headerGameCodeVal')?.textContent?.trim();
    if(headerCode && headerCode !== '-') return headerCode.startsWith('TM-') ? headerCode : `TM-${headerCode}`;
  }
  return '';
}

function getInviteMessage() {
  const code = getCurrentInviteCode();
  if(!code) return '';
  return `Te invito a mi partida de Tower Wizard. Entra, elige "Unirse a una Partida" y usa este código: ${code}`;
}

function renderInvitePanel() {
  const codeEl = document.getElementById('partidaInviteCode');
  const hintEl = document.getElementById('partidaInviteHint');
  const btn = document.getElementById('partidaInviteButton');
  if(!codeEl || !hintEl || !btn) return;
  const code = getCurrentInviteCode();
  const active = !!code;
  codeEl.textContent = active ? code : 'Sin partida activa';
  hintEl.textContent = active
    ? 'Los jugadores deben usar este código en "Unirse a una Partida".'
    : 'Crea o inicia una partida multijugador para generar un código.';
  btn.disabled = !active;
  renderRoomAccessPanel();
}

function getApprovedPlayersStorageKey() {
  const code = multiplayer.code || getCurrentInviteCode().replace(/^TM-/,'');
  return code ? `crq_approved_players_${code}` : 'crq_approved_players';
}

function loadApprovedPlayersForRoom() {
  multiplayer.approvedPlayers = loadLS(getApprovedPlayersStorageKey(), {});
}

function saveApprovedPlayersForRoom() {
  saveLS(getApprovedPlayersStorageKey(), multiplayer.approvedPlayers || {});
}

function addRoomEvent(type, text) {
  if(!multiplayer.roomEvents) multiplayer.roomEvents = [];
  multiplayer.roomEvents.unshift({ id:Date.now()+Math.random(), type, text, time:Date.now() });
  multiplayer.roomEvents = multiplayer.roomEvents.slice(0, 30);
  renderRoomAccessPanel();
}

function getPendingJoinRows() {
  if(!multiplayer.pendingJoins) return [];
  return Object.entries(multiplayer.pendingJoins)
    .filter(([,row]) => row && row.conn && row.conn.open)
    .map(([peer,row]) => ({ peer, ...row }));
}

function renderRoomAccessPanel() {
  const pendingList = document.getElementById('roomPendingList');
  const connectedList = document.getElementById('roomConnectedList');
  const eventLog = document.getElementById('roomEventLog');
  if(!pendingList || !connectedList || !eventLog) return;
  if(!isDM() || !multiplayer.isHost()) {
    pendingList.innerHTML = '<div class="room-access-empty">Solo el Dungeon Master anfitrión puede aprobar ingresos.</div>';
    connectedList.innerHTML = '<div class="room-access-empty">Crea o inicia una sala multijugador para ver jugadores.</div>';
    eventLog.innerHTML = '<div class="room-access-empty">Sin sala activa.</div>';
    return;
  }
  const pending = getPendingJoinRows();
  pendingList.innerHTML = pending.length ? pending.map(row => `
    <div class="room-access-row">
      <div>
        <div class="room-access-name">${escapeHTML(row.username || 'Jugador')}</div>
        <div class="room-access-meta">Quiere entrar a la sala</div>
      </div>
      <div class="room-access-actions">
        <button class="room-accept-btn" onclick="acceptPendingJoin('${encodeInline(row.peer)}')">Aceptar</button>
        <button class="room-reject-btn" onclick="rejectPendingJoin('${encodeInline(row.peer)}')">Rechazar</button>
      </div>
    </div>
  `).join('') : '<div class="room-access-empty">No hay jugadores esperando aprobación.</div>';
  const connected = getConnectedPlayerRows();
  connectedList.innerHTML = connected.length ? connected.map(row => `
    <div class="room-access-row">
      <div>
        <div class="room-access-name">${escapeHTML(row.username)}</div>
        <div class="room-access-meta">Dentro de la sala</div>
      </div>
      <div class="room-access-actions">
        <button class="room-reject-btn" onclick="kickPlayer('${encodeInline(row.peer)}')">Echar</button>
      </div>
    </div>
  `).join('') : '<div class="room-access-empty">No hay jugadores conectados.</div>';
  eventLog.innerHTML = multiplayer.roomEvents?.length ? multiplayer.roomEvents.map(ev => `
    <div class="room-event-row ${escapeHTML(ev.type || '')}">
      <strong>${new Date(ev.time).toLocaleTimeString()}</strong> ${escapeHTML(ev.text || '')}
    </div>
  `).join('') : '<div class="room-access-empty">Todavía no hay movimientos en la sala.</div>';
}

function copyTextToClipboard(text) {
  if(!text) return Promise.reject(new Error('No hay texto para copiar.'));
  if(navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(textarea);
  return ok ? Promise.resolve() : Promise.reject(new Error('No se pudo copiar.'));
}

function copyInviteToClipboard() {
  const msg = getInviteMessage();
  if(!msg) {
    alert('Primero crea o inicia una partida multijugador para generar un código de invitación.');
    return;
  }
  copyTextToClipboard(msg).then(() => {
    const btn = document.getElementById('partidaInviteButton');
    if(!btn) return;
    const prev = btn.textContent;
    btn.textContent = 'Invitación copiada ✓';
    setTimeout(() => { btn.textContent = prev; }, 1400);
  }).catch(() => alert('No se pudo copiar la invitación. Código: ' + getCurrentInviteCode()));
}

function renderSavesList() {
  const container = document.getElementById('saveListContainer');
  if(!container) return;
  if(saves.length === 0) {
    container.innerHTML = '<div style="color:var(--text-3);font-style:italic;">No hay partidas guardadas.</div>';
    return;
  }
  container.innerHTML = saves.map(s => `
    <div class="save-item">
      <div class="save-info">
        <div class="save-name">${s.name}</div>
        <div class="save-date">${new Date(s.timestamp).toLocaleString()}</div>
        <div class="save-date">Ronda ${s.data?.round || 1} · ${s.data?.weather || 'none'} · ${s.data?.tokens?.length || 0} tokens</div>
      </div>
      <div class="save-actions">
        <button class="btn-primary" onclick="loadGame(${s.id})">Cargar</button>
        <button class="btn-danger" style="padding:11px 14px;" onclick="deleteSave(${s.id})">✕</button>
      </div>
    </div>
  `).join('');
}

function cloneGameData(data) {
  return JSON.parse(JSON.stringify(data));
}

function storeCurrentMapTokens() {
  const currentMap = maps.find(m => m.id === state.activeMapId);
  if (currentMap) currentMap.tokens = cloneGameData(mapState.tokens);
}

function saveCurrentGame() {
  const input = document.getElementById('saveGameName');
  const name = input.value.trim() || 'Partida Guardada';
  storeCurrentMapTokens();
  storeCurrentMapStructures();
  storeCurrentMapWalls();
  storeCurrentMapFog();
  const newSave = {
    id: Date.now(),
    name: name,
    timestamp: Date.now(),
    data: {
      characters: cloneGameData(characters),
      enemies: cloneGameData(enemies),
      npcs: cloneGameData(npcs),
      maps: cloneGameData(maps),
      scenes: cloneGameData(scenes),
      activeMapId: state.activeMapId,
      activeCharId: state.activeCharId,
      currentTurnIndex: state.currentTurnIndex,
      round: state.round,
      weather: mapState.weather,
      music: mapState.music,
      externalMusicUrl: mapState.externalMusicUrl,
      tokens: cloneGameData(mapState.tokens),
      walls: cloneGameData(mapState.walls),
      fogOfWar: mapState.fogOfWar,
      fogStrokes: cloneGameData(mapState.fogStrokes),
      fogExploredAreas: mapState.fogExploredAreas,
      exploredFogPolygons: cloneGameData(mapState.exploredFogPolygons),
      mapView: getCurrentMapView()
    }
  };
  saves.unshift(newSave);
  saveLS('crq_saves', saves);
  input.value = '';
  renderSavesList();
  addChatMessage('sys', '', `💾 Partida guardada: <b>${name}</b>`);
}

function loadGame(id,skipConfirm=false) {
  if(!skipConfirm&&!confirm('¿Estás seguro de que quieres cargar esta partida? Se perderá el progreso actual no guardado.')) return;
  const save = saves.find(s => s.id === id);
  if(!save) return;
  const data = save.data || {};
  // Actualizar en memoria sin recargar la página (mantiene conexión multijugador)
  characters = cloneGameData(data.characters || []);
  enemies = cloneGameData(data.enemies || []);
  npcs = cloneGameData(data.npcs || []);
  maps = cloneGameData(data.maps || []);
  scenes = cloneGameData(data.scenes || scenes || []);
  state.activeMapId = maps.some(m => m.id === data.activeMapId) ? data.activeMapId : maps[0]?.id;
  state.activeCharId = characters.some(c => c.id === data.activeCharId) ? data.activeCharId : characters[0]?.id;
  state.currentTurnIndex = Number.isInteger(data.currentTurnIndex) ? data.currentTurnIndex : 0;
  state.round = Number.isInteger(data.round) ? data.round : 1;
  const restoredTokens = cloneGameData(data.tokens || []);
  const restoredWalls = cloneGameData(data.walls || []);
  const restoredFogStrokes = cloneGameData(data.fogStrokes || []);
  const restoredExploredFogPolygons = cloneGameData(data.exploredFogPolygons || []);
  const activeMap = maps.find(m => m.id === state.activeMapId);
  if (activeMap && data.tokens) activeMap.tokens = restoredTokens;
  if (activeMap && data.walls) activeMap.walls = restoredWalls;
  if (activeMap && typeof data.fogOfWar === 'boolean') activeMap.fogOfWar = data.fogOfWar;
  if (activeMap && data.fogStrokes) activeMap.fogStrokes = restoredFogStrokes;
  if (activeMap && typeof data.fogExploredAreas === 'boolean') activeMap.fogExploredAreas = data.fogExploredAreas;
  if (activeMap && data.exploredFogPolygons) activeMap.exploredFogPolygons = restoredExploredFogPolygons;
  saveLS('crq_chars', characters);
  saveLS('crq_enemies', enemies);
  saveLS('crq_npcs', npcs);
  saveLS('crq_maps', maps);
  saveLS('crq_scenes', scenes);
  saveLS('crq_active_map_id', state.activeMapId);
  saveLS('crq_active_char_id', state.activeCharId);
  combatants = getInitiativeCombatants();
  state.currentTurnIndex = Math.max(0, Math.min(state.currentTurnIndex, Math.max(0, combatants.length - 1)));
  loadActiveMap(data.mapView);
  setWeather(data.weather || 'none', true);
  if(data.externalMusicUrl) playExternalMusic(data.externalMusicUrl,true);
  else setMusic(data.music || 'none', true);
  renderAll();
  switchPage('mapa');
  document.querySelectorAll('#mainNavTabs button').forEach(b => b.classList.toggle('active', b.dataset.page === 'mapa'));
  addChatMessage('sys','',`💾 Partida cargada: <b>${save.name}</b>. La mesa volvió al punto guardado.`);
  // Transmitir nuevo estado a todos los jugadores conectados
  if (typeof multiplayer !== 'undefined' && multiplayer.isHost()) {
    multiplayer.broadcast({
      type: 'init_state',
      characters, enemies, npcs, maps,
      activeMapId: state.activeMapId,
      tokens: mapState.tokens,
      walls: mapState.walls,
      fogOfWar: mapState.fogOfWar,
      fogStrokes: mapState.fogStrokes,
      fogExploredAreas: mapState.fogExploredAreas,
      exploredFogPolygons: mapState.exploredFogPolygons,
      currentTurnIndex: state.currentTurnIndex,
      round: state.round,
      weather: mapState.weather,
      music: mapState.music,
      externalMusicUrl: mapState.externalMusicUrl,
      manualAdaptation,
      mapView: data.mapView || getCurrentMapView()
    });
  }
}

function createNewGame() {
  if(!confirm('⚠️ ¡PELIGRO! Esto borrará todos los personajes, mapas e inventarios actuales. ¿Estás seguro de continuar?')) return;
  saveLS('crq_chars', []);
  saveLS('crq_enemies', []);
  saveLS('crq_npcs', []);
  saveLS('crq_maps', [{id:1,name:'Mapa Inicial',author:'Sistema',thumb:'',image:'',bg:'#000',rooms:[],tokens:[],structures:[],walls:[],fogOfWar:false,fogStrokes:[],fogExploredAreas:false,exploredFogPolygons:[]}]);
  saveLS('crq_scenes', []);
  saveLS('crq_active_map_id', 1);
  localStorage.removeItem('crq_active_char_id');
  window.location.reload();
}

function deleteSave(id) {
  if(!confirm('¿Borrar este archivo de guardado?')) return;
  saves = saves.filter(s => s.id !== id);
  saveLS('crq_saves', saves);
  renderSavesList();
  renderSelectionSavesList();
}

// ===================================================
// MULTIPLAYER MANAGEMENT (PEERJS)
// ===================================================
const multiplayer = {
  peer: null,
  conn: null,
  connections: [],
  active: false,
  role: 'solo',
  code: null,
  clientUsernames: {},
  pendingJoins: {},
  approvedPlayers: {},
  roomEvents: [],
  kicked: false,
  started: false,
  reconnectCode: null,
  reconnectTimer: null,
  reconnectAttempts: 0,
  waitingMessageShown: false,
  
  isActive() {
    return this.active;
  },
  
  isHost() {
    return this.active && this.role === 'host';
  },
  
  isClient() {
    return this.active && this.role === 'client';
  },

  broadcast(data) {
    if (!this.active) return;
    const msg = JSON.stringify(data);
    if (this.role === 'host') {
      this.connections.forEach(c => {
        if (c.open && this.clientUsernames[c.peer]) c.send(msg);
      });
    } else if (this.role === 'client' && this.conn && this.conn.open) {
      this.conn.send(msg);
    }
  },

  sendChat(chatType, sender, text) {
    this.broadcast({ type: 'chat', chatType, sender, text });
  },

  updateConnectedLobbyUI() {
    const listDiv = document.getElementById('connectedPlayers');
    const countSpan = document.getElementById('connectedCount');
    if (!listDiv) return;

    const names = Object.values(this.clientUsernames);
    countSpan.textContent = names.length;
    
    if (names.length === 0) {
      listDiv.innerHTML = `<div style="color:var(--text-dim); font-style:italic; text-align:center; padding:10px 0;">Esperando aventureros...</div>`;
    } else {
      listDiv.innerHTML = names.map(n => `<div style="padding:6px 10px; margin-bottom:6px; background:rgba(255,255,255,0.04); border:1px solid var(--glass-border); border-radius:var(--radius-sm); font-weight:500; color:var(--text-1); display:flex; align-items:center; gap:8px;"><span class="role-dot player" style="width:8px; height:8px;"></span>${escapeHTML(n)}</div>`).join('');
    }
    const startButton = document.getElementById('btnStartHostedGame');
    if(startButton) startButton.style.display = multiplayer.code ? '' : 'none';
    renderPlayerKickList();
    renderRoomAccessPanel();
  }
};

function getConnectedPlayerRows() {
  if(!multiplayer.isHost()) return [];
  return multiplayer.connections
    .filter(conn => conn && conn.open && multiplayer.clientUsernames[conn.peer])
    .map(conn => ({peer:conn.peer, username:multiplayer.clientUsernames[conn.peer]}));
}

function getOrCreatePlayerUser(joinData) {
  let existingUser = users.find(u => u.username.toLowerCase() === joinData.username.toLowerCase());
  if (!existingUser) {
    let userId = joinData.userId;
    while(users.some(u => String(u.id) === String(userId))) userId = Date.now() + Math.floor(Math.random()*1000);
    existingUser = { id: userId, username: joinData.username, password: '', role: 'player' };
    users.push(existingUser);
    saveUsers();
  }
  return existingUser;
}

function sendInitialStateToConnection(conn) {
  if(!conn || !conn.open) return;
  conn.send(JSON.stringify({
    type: 'init_state',
    characters,
    enemies,
    npcs,
    maps,
    activeMapId: state.activeMapId,
    tokens: mapState.tokens,
    walls: mapState.walls,
    fogOfWar: mapState.fogOfWar,
    fogStrokes: mapState.fogStrokes,
    fogExploredAreas: mapState.fogExploredAreas,
    exploredFogPolygons: mapState.exploredFogPolygons,
    currentTurnIndex: state.currentTurnIndex,
    round: state.round,
    weather: mapState.weather,
    music: mapState.music,
    externalMusicUrl: mapState.externalMusicUrl,
    manualAdaptation,
    mapView: getCurrentMapView()
  }));
}

function approveJoinConnection(conn, joinData) {
  if(!conn || !joinData || !conn.open) return;
  joinData.username = String(joinData.username || 'Jugador').trim();
  const existingUser = getOrCreatePlayerUser(joinData);
  joinData.userId = existingUser.id;
  multiplayer.clientUsernames[conn.peer] = joinData.username;
  multiplayer.approvedPlayers[String(existingUser.id)] = joinData.username;
  saveApprovedPlayersForRoom();
  delete multiplayer.pendingJoins?.[conn.peer];
  characters.forEach(c => {
    if (String(c.userId) === String(existingUser.id)) c.online = true;
  });
  saveChars();
  try {
    if(conn.open) conn.send(JSON.stringify({ type:'join_accepted', message: multiplayer.started ? 'Ingreso aprobado. Entrando a la campaña...' : 'Ingreso aprobado. Esperando que el Dungeon Master inicie la campaña.' }));
  } catch(e) {
    console.warn('No se pudo notificar aprobacion:', e);
  }
  sendInitialStateToConnection(conn);
  if(multiplayer.started) {
    conn.send(JSON.stringify({ type:'start_game', code:'TM-' + multiplayer.code }));
  }
  addChatMessage('sys', '', `🔌 <b>${escapeHTML(joinData.username)}</b> se ha unido a la partida.`);
  addRoomEvent('accept', `${joinData.username} entró a la sala.`);
  multiplayer.broadcast({ type: 'characters_update', characters });
  multiplayer.updateConnectedLobbyUI();
  renderInvitePanel();
}

function acceptPendingJoin(peerEncoded) {
  if(!isDM() || !multiplayer.isHost()) return;
  const peer = decodeURIComponent(String(peerEncoded));
  const request = multiplayer.pendingJoins?.[peer];
  if(!request) return;
  approveJoinConnection(request.conn, request);
}

function rejectPendingJoin(peerEncoded) {
  if(!isDM() || !multiplayer.isHost()) return;
  const peer = decodeURIComponent(String(peerEncoded));
  const request = multiplayer.pendingJoins?.[peer];
  if(!request) return;
  try {
    if(request.conn?.open) request.conn.send(JSON.stringify({ type:'join_rejected', reason:'El Dungeon Master rechazó tu ingreso a la sala.' }));
  } catch(e) {
    console.warn('No se pudo notificar el rechazo:', e);
  }
  addRoomEvent('reject', `${request.username || 'Un jugador'} fue rechazado.`);
  setTimeout(()=>{ try { request.conn?.close(); } catch(e) {} }, 80);
  delete multiplayer.pendingJoins[peer];
  multiplayer.connections = multiplayer.connections.filter(c => c !== request.conn);
  multiplayer.updateConnectedLobbyUI();
  renderInvitePanel();
}

function renderPlayerKickList() {
  const list=document.getElementById('playerKickList');
  if(!list) return;
  if(!isDM() || !multiplayer.isHost()) {
    list.innerHTML='<div class="player-kick-empty">Solo disponible para el Dungeon Master anfitrion.</div>';
    return;
  }
  const rows=getConnectedPlayerRows();
  if(!rows.length) {
    list.innerHTML='<div class="player-kick-empty">No hay jugadores conectados.</div>';
    return;
  }
  list.innerHTML=rows.map(row=>`
    <div class="player-kick-row">
      <div class="player-kick-name">${escapeHTML(row.username)}</div>
      <button class="player-kick-btn" onclick="kickPlayer('${encodeInline(row.peer)}')">Echar</button>
    </div>
  `).join('');
}

function togglePlayerKickPanel(force = null) {
  const panel=document.getElementById('playerKickPanel');
  const btn=document.getElementById('quickToolPlayers');
  if(!panel) return;
  if(!isDM() || !multiplayer.isHost()) {
    panel.style.display='none';
    btn?.classList.remove('active');
    return;
  }
  const show=typeof force === 'boolean' ? force : panel.style.display === 'none';
  if(show) renderPlayerKickList();
  panel.style.display=show ? 'block' : 'none';
  btn?.classList.toggle('active', show);
}

function kickPlayer(peerEncoded) {
  if(!isDM() || !multiplayer.isHost()) return;
  const peerId=decodeURIComponent(String(peerEncoded));
  const conn=multiplayer.connections.find(c => c.peer === peerId);
  const username=multiplayer.clientUsernames[peerId] || 'Jugador';
  if(!conn) return;
  if(!confirm(`¿Echar a ${username} de la partida?`)) return;
  const user=users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if(user) {
    characters.forEach(c => { if(c.userId === user.id) c.online = false; });
    saveChars();
  }
  try {
    if(conn.open) conn.send(JSON.stringify({type:'kicked',reason:'El Dungeon Master te echo de la partida.'}));
  } catch(e) {
    console.warn('No se pudo notificar la expulsion:', e);
  }
  setTimeout(()=>{ try { conn.close(); } catch(e) {} }, 80);
  multiplayer.connections = multiplayer.connections.filter(c => c !== conn);
  delete multiplayer.clientUsernames[peerId];
  addChatMessage('sys','',`<b>${escapeHTML(username)}</b> fue expulsado de la partida por el Dungeon Master.`);
  addRoomEvent('reject', `${username} fue expulsado por el Dungeon Master.`);
  multiplayer.broadcast({ type: 'characters_update', characters });
  multiplayer.updateConnectedLobbyUI();
}

function showGameSelection() {
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('gameSelectionScreen').classList.remove('hidden');
  document.getElementById('panelCreateGame').style.display = 'none';
  document.getElementById('panelJoinGame').style.display = 'none';
  document.getElementById('panelLoadSavedGame').style.display = 'none';
  document.getElementById('panelLoadManual').style.display = 'none';
  document.getElementById('gameSelectionOptions').style.display = 'flex';
  const dm=isDM();
  document.getElementById('btnCreateGameOption').style.display = dm?'':'none';
  document.getElementById('btnJoinGameOption').style.display = '';
  document.getElementById('btnLoadSavedGameOption').style.display = dm?'':'none';
  const manualOption = document.getElementById('btnLoadManualOption');
  if(manualOption) manualOption.style.display = 'none';
}

function cancelGameSelection() {
  showGameSelection();
  if (multiplayer.peer) {
    multiplayer.peer.destroy();
    multiplayer.peer = null;
  }
  multiplayer.active = false;
  multiplayer.role = 'solo';
  multiplayer.started = false;
  multiplayer.connections = [];
  multiplayer.clientUsernames = {};
  multiplayer.pendingJoins = {};
  setConnectionStatus('offline','Desconectado');
}

function playSolo() {
  multiplayer.active = false;
  multiplayer.role = 'solo';
  multiplayer.started = false;
  document.getElementById('gameSelectionScreen').classList.add('hidden');
  document.getElementById('headerGameCodeBadge').style.display = 'none';
  setConnectionStatus('offline','Desconectado');
  launchApp();
}
function showLoadSavedGameMode() {
  if(!isDM()) return;
  document.getElementById('gameSelectionOptions').style.display='none';
  document.getElementById('panelLoadSavedGame').style.display='';
  renderSelectionSavesList();
}
function renderSelectionSavesList() {
  const container=document.getElementById('selectionSaveList');
  if(!container) return;
  container.innerHTML=saves.length
    ? saves.map(save=>`<div class="selection-library-item">
        <div class="selection-library-info">
          <div class="selection-library-name">${escapeHTML(save.name)}</div>
          <div class="selection-library-meta">${new Date(save.timestamp).toLocaleString()} · Ronda ${save.data?.round||1}</div>
        </div>
        <button class="btn-primary" onclick="loadSavedGameFromSelection(${save.id})">Cargar</button>
      </div>`).join('')
    : '<div class="enemy-empty">No hay partidas guardadas.</div>';
}
function loadSavedGameFromSelection(id) {
  if(!isDM()) return;
  if(!confirm('¿Cargar esta partida guardada? Se reemplazará el estado actual del tablero.')) return;
  playSolo();
  setTimeout(()=>loadGame(id,true),0);
}
function showManualSelectionMode() {
  if(!isDM()) return;
  document.getElementById('gameSelectionOptions').style.display='none';
  document.getElementById('panelLoadManual').style.display='';
  renderSelectionManualList();
}
function renderSelectionManualList() {
  const container=document.getElementById('selectionManualList');
  if(!container) return;
  container.innerHTML=manuals.length
    ? manuals.map(manual=>`<div class="selection-library-item">
        <div class="selection-library-info">
          <div class="selection-library-name">${escapeHTML(manual.title)}</div>
          <div class="selection-library-meta">${manual.type==='pdf'?'PDF adjunto':'Texto editable'} · ${new Date(manual.updated||Date.now()).toLocaleDateString()}</div>
        </div>
        <button class="btn-primary" onclick="openManualLibraryFromSelection('${manual.id}')">Editar</button>
      </div>`).join('')
    : '<div class="enemy-empty">Importa un PDF o crea un manual editable dentro del tablero.</div>';
}
function openManualLibraryFromSelection(id=null) {
  if(!isDM()) return;
  activeManualId=id||activeManualId||manuals[0]?.id||null;
  playSolo();
  switchPage('manual');
  document.querySelectorAll('#mainNavTabs button').forEach(button=>button.classList.toggle('active',button.dataset.page==='manual'));
}

function generateGameCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for(let i=0; i<5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function normalizeGameCodeInput(code) {
  const clean=String(code||'').trim().toUpperCase();
  return clean.startsWith('TM-') ? clean : `TM-${clean}`;
}

function setConnectionStatus(status='connected', text='Conectado') {
  const badge=document.getElementById('connectionStatusBadge');
  if(!badge) return;
  badge.style.display = multiplayer.isActive() ? 'block' : 'none';
  badge.classList.remove('connected','waiting','offline');
  badge.classList.add(status);
  badge.textContent=text;
}

function scheduleClientReconnect(delay=3000) {
  if(!multiplayer.isClient() || multiplayer.kicked || !multiplayer.reconnectCode) return;
  clearTimeout(multiplayer.reconnectTimer);
  multiplayer.reconnectTimer=setTimeout(()=>{
    connectClientToHost(multiplayer.reconnectCode,true);
  },delay);
}

function handleClientConnectionLost() {
  if(multiplayer.kicked) return;
  multiplayer.conn=null;
  setConnectionStatus('waiting','Esperando al DM...');
  if(!multiplayer.waitingMessageShown) {
    multiplayer.waitingMessageShown=true;
    addChatMessage('sys','','Conexión pausada: el Dungeon Master no está disponible. Te quedarás en la campaña mientras se reconecta.');
  }
  scheduleClientReconnect(2500);
}

function setupClientConnection(conn,targetId,fromReconnect=false) {
  multiplayer.conn=conn;
  conn.on('open', () => {
    multiplayer.reconnectAttempts=0;
    multiplayer.waitingMessageShown=false;
    setConnectionStatus('connected', fromReconnect ? 'Reconectado' : 'Conectado');
    const joinStatus=document.getElementById('joinStatus');
    if(joinStatus) joinStatus.textContent = fromReconnect ? 'Reconectado con el Dungeon Master.' : 'Autenticando e inicializando...';
    conn.send(JSON.stringify({
      type: 'join',
      username: state.currentUser.username,
      userId: state.currentUser.id,
      role: state.currentUser.role
    }));
  });
  conn.on('data', (raw) => {
    try {
      const data = JSON.parse(raw);
      handleClientIncomingData(data);
    } catch (e) {
      console.error('Error parsing client data:', e);
    }
  });
  conn.on('close', handleClientConnectionLost);
  conn.on('error', (err) => {
    console.error('Connection error:', err);
    setConnectionStatus('waiting','Reconectando...');
    scheduleClientReconnect(Math.min(12000,2500 + multiplayer.reconnectAttempts * 1000));
  });
}

function connectClientToHost(targetId,fromReconnect=false) {
  if(!targetId) return;
  multiplayer.active=true;
  multiplayer.role='client';
  multiplayer.reconnectCode=normalizeGameCodeInput(targetId);
  multiplayer.reconnectAttempts++;
  setConnectionStatus(fromReconnect ? 'waiting' : 'connected', fromReconnect ? 'Reconectando...' : 'Conectando...');
  const openConnection=()=>{
    if(!multiplayer.isClient() || multiplayer.kicked) return;
    const conn=multiplayer.peer.connect(multiplayer.reconnectCode);
    setupClientConnection(conn,multiplayer.reconnectCode,fromReconnect);
  };
  if(!multiplayer.peer || multiplayer.peer.destroyed) {
    multiplayer.peer = new Peer();
    multiplayer.peer.on('open', openConnection);
    multiplayer.peer.on('error', (err) => {
      console.error('Peer error:', err);
      if(fromReconnect) {
        setConnectionStatus('waiting','Esperando al DM...');
        scheduleClientReconnect(Math.min(15000,3000 + multiplayer.reconnectAttempts * 1000));
      } else {
        const joinStatus=document.getElementById('joinStatus');
        if(joinStatus) joinStatus.textContent = 'No se encontró la partida. Reintentando mientras el DM abre la sala...';
        scheduleClientReconnect(4000);
      }
    });
  } else if(multiplayer.peer.open) {
    openConnection();
  } else {
    multiplayer.peer.on('open', openConnection);
  }
}

function showCreateGameMode(forceNewCode=false,retryCount=0) {
  if(!isDM()) return;
  document.getElementById('gameSelectionOptions').style.display = 'none';
  document.getElementById('panelCreateGame').style.display = '';
  document.getElementById('hostStatus').textContent = 'Conectando con el servidor de señales...';
  document.getElementById('hostCodeContainer').style.display = 'none';
  document.getElementById('btnStartHostedGame').style.display = 'none';

  multiplayer.active = true;
  multiplayer.role = 'host';
  multiplayer.started = false;
  multiplayer.connections = [];
  multiplayer.clientUsernames = {};
  multiplayer.pendingJoins = {};
  multiplayer.roomEvents = [];
  multiplayer.updateConnectedLobbyUI();

  let savedCode = !forceNewCode ? loadLS('crq_last_host_code', null) : null;
  let code = /^[A-Z0-9]{5}$/.test(String(savedCode||'')) ? savedCode : generateGameCode();
  let fullId = 'TM-' + code;

  multiplayer.peer = new Peer(fullId);
  
  multiplayer.peer.on('open', (id) => {
    multiplayer.code = code;
    saveLS('crq_last_host_code', code);
    loadApprovedPlayersForRoom();
    document.getElementById('hostStatus').textContent = 'Servidor activo. Esperando jugadores...';
    document.getElementById('hostCodeContainer').style.display = '';
    document.getElementById('hostGameCode').textContent = 'TM-' + code;
    document.getElementById('headerGameCodeVal').textContent = 'TM-' + code;
    document.getElementById('btnStartHostedGame').style.display = '';
    setConnectionStatus('connected','Sala activa');
  });

  multiplayer.peer.on('error', (err) => {
    console.error('Peer error:', err);
    if (err.type === 'id-taken') {
      if(savedCode && retryCount < 20) {
        document.getElementById('hostStatus').textContent = 'El código anterior se está liberando. Reintentando...';
        setTimeout(()=>showCreateGameMode(false,retryCount+1),1500);
      } else {
        saveLS('crq_last_host_code', null);
        showCreateGameMode(true,0);
      }
    } else {
      document.getElementById('hostStatus').innerHTML = `<span style="color:var(--ruby)">Error al crear partida. Inténtalo de nuevo.</span>`;
    }
  });

  multiplayer.peer.on('connection', (conn) => {
    multiplayer.connections.push(conn);
    
    conn.on('data', (raw) => {
      try {
        const data = JSON.parse(raw);
        handleHostIncomingData(conn, data);
      } catch (e) {
        console.error('Error parsing data:', e);
      }
    });

    conn.on('close', () => {
      multiplayer.connections = multiplayer.connections.filter(c => c !== conn);
      const pending = multiplayer.pendingJoins?.[conn.peer];
      if(pending) {
        delete multiplayer.pendingJoins[conn.peer];
        addRoomEvent('leave', `${pending.username || 'Un jugador'} canceló su solicitud.`);
      }
      const username = multiplayer.clientUsernames[conn.peer];
      if (username) {
        const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (user) {
          characters.forEach(c => {
            if (c.userId === user.id) c.online = false;
          });
          saveChars();
        }
        addChatMessage('sys', '', `❌ <b>${username}</b> se ha desconectado.`);
        addRoomEvent('leave', `${username} salió de la sala.`);
        multiplayer.broadcast({ type: 'characters_update', characters });
        delete multiplayer.clientUsernames[conn.peer];
      }
      multiplayer.updateConnectedLobbyUI();
      renderInvitePanel();
    });
  });
}

function getHostConnectionUser(conn) {
  const username = multiplayer.clientUsernames[conn.peer];
  if(!username) return null;
  return users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
}

function handleHostIncomingData(conn, data) {
  if(!data || typeof data.type !== 'string') return;
  if (data.type === 'join') {
    if(typeof data.username !== 'string' || !data.username.trim() || data.userId == null) return;
    data.username = data.username.trim();
    loadApprovedPlayersForRoom();
    const alreadyApproved = multiplayer.approvedPlayers?.[String(data.userId)] === data.username;
    if(alreadyApproved) {
      approveJoinConnection(conn, data);
      return;
    }
    multiplayer.pendingJoins[conn.peer] = {
      conn,
      username: data.username,
      userId: data.userId,
      role: data.role || 'player',
      requestedAt: Date.now()
    };
    try {
      if(conn.open) conn.send(JSON.stringify({ type:'join_pending', message:'Solicitud enviada. Esperando aprobación del Dungeon Master.' }));
    } catch(e) {
      console.warn('No se pudo notificar espera de aprobacion:', e);
    }
    addRoomEvent('pending', `${data.username} quiere entrar a la sala.`);
    multiplayer.updateConnectedLobbyUI();
    renderInvitePanel();
  }
  else if (data.type === 'chat') {
    const clientUser = getHostConnectionUser(conn);
    if(!clientUser) return;
    const ownedCharacter = characters.find(c => c.userId === clientUser.id);
    const safeData = {
      type: 'chat',
      chatType: 'player',
      sender: ownedCharacter?.name || clientUser.username,
      text: String(data.text ?? '')
    };
    addChatMessage(safeData.chatType, escapeHTML(safeData.sender), escapeHTML(safeData.text));
    multiplayer.connections.forEach(c => {
      if (c !== conn && c.open) {
        c.send(JSON.stringify(safeData));
      }
    });
  }
  else if (data.type === 'dice_roll') {
    const clientUser = getHostConnectionUser(conn);
    const ownedCharacter = clientUser && characters.find(c => c.userId === clientUser.id);
    data = normalizeDiceRollData(data, ownedCharacter?.name || clientUser?.username);
    if(!clientUser || !data) return;
    addDiceRollToChat(data);
    if(shouldAnimateRemoteDiceRolls()) animate3DDice(data.total, data.primaryFaces, () => {
      showRollResult(data.total, data.total, data.primaryFaces);
      if (data.formula.startsWith('Tirada de')) {
        let extra=data.hasCrit?'<div class="roll-total crit">¡CRÍTICO!</div>':(data.hasFumble?'<div class="roll-total fumble">¡PIFIA!</div>':'');
        document.getElementById('chatBox').insertAdjacentHTML('beforeend',`
          <div class="chat-msg msg-roll">
            <div class="msg-sender">${escapeHTML(data.senderName)}</div>
            <b>${escapeHTML(data.formula)}</b>
            <div class="roll-details">${escapeHTML(data.detailStr)}</div>
            <div class="roll-total ${data.hasCrit?'crit':data.hasFumble?'fumble':''}">${data.total}</div>${extra}
          </div>`);
        document.getElementById('chatBox').scrollTop=99999;
      } else {
        sendFormulaRollToChat(data.formula, data.detailStr, data.total, data.hasCrit, data.hasFumble, data.senderName);
      }
    }, data.allRolls);

    multiplayer.connections.forEach(c => {
      if (c !== conn && c.open) {
        c.send(JSON.stringify(data));
      }
    });
  }
  else if (data.type === 'map_ping') {
    const clientUser = getHostConnectionUser(conn);
    if(!clientUser || !Number.isFinite(data.x) || !Number.isFinite(data.y)) return;
    const safeData = { type:'map_ping', x:data.x, y:data.y, sender:clientUser.username };
    mapState.pings.push({ x: safeData.x, y: safeData.y, radius: 0, alpha: 1 });
    addChatMessage('sys', '', `📌 Señalado en el mapa por ${escapeHTML(safeData.sender)}.`);
    multiplayer.connections.forEach(c => {
      if (c !== conn && c.open) {
        c.send(JSON.stringify(safeData));
      }
    });
  }
  else if (data.type === 'characters_update') {
    const clientUser = getHostConnectionUser(conn);
    if(!clientUser || !Array.isArray(data.characters)) return;
    data.characters.filter(c => c && c.userId === clientUser.id).forEach(incoming => {
      const index = characters.findIndex(c => String(c.id) === String(incoming.id));
      if(index >= 0) {
        if(characters[index].userId === clientUser.id) characters[index] = incoming;
      } else if(incoming.type === 'player') {
        characters.push(incoming);
      }
    });
    saveLS('crq_chars', characters);
    combatants = getInitiativeCombatants();
    restorePlayerActiveCharacter();
    updateChatSenders();
    renderCharListSidebar();
    renderPersonajePage();
    renderInventarioPage();
    renderHechizosPage();
    renderAtaquePage();
    renderQuickCombatPanel();
    renderInitiative();
    multiplayer.connections.forEach(c => {
      if (c.open) c.send(JSON.stringify({ type: 'characters_update', characters }));
    });
  }
  else if (data.type === 'token_toggle') {
    const clientUser = getHostConnectionUser(conn);
    if(!clientUser) return;
    const cid = isNaN(data.combatantId) ? data.combatantId : parseInt(data.combatantId);
    const ownedCharacter = characters.find(c => c.userId === clientUser.id && String(c.id) === String(cid));
    if(!ownedCharacter) return;
    toggleMapToken(ownedCharacter.id, { fromHost: true });
  }
  else if (data.type === 'token_move') {
    const token = mapState.tokens.find(t => t.tokenId === data.tokenId);
    const clientUser = getHostConnectionUser(conn);
    const combatant = token && getCombatantById(token.id);
    if(!token || token.hidden || !clientUser || !combatant || combatant.userId !== clientUser.id ||
       !Number.isFinite(data.x) || !Number.isFinite(data.y)) return;
    const snapped=snapMapPointToGrid({x:data.x,y:data.y}, token);
    token.tx = snapped.x; token.ty = snapped.y;
    token.x = snapped.x; token.y = snapped.y;
    normalizeTokenGridSize(token);
    if(Number.isFinite(data.facing)) token.facing = data.facing;
    syncMapTokens();
    multiplayer.connections.forEach(c => {
      if (c !== conn && c.open) c.send(JSON.stringify({
        type: 'token_move', tokenId: token.tokenId, x: token.x, y: token.y, facing: token.facing
      }));
    });
  }
  else if (data.type === 'token_resize') {
    const token = mapState.tokens.find(t => t.tokenId === data.tokenId);
    const clientUser = getHostConnectionUser(conn);
    const combatant = token && getCombatantById(token.id);
    if(!token || token.hidden || !clientUser || !combatant || combatant.userId !== clientUser.id) return;
    token.sizeSquares = Math.max(1, Math.min(6, Math.round(Number(data.sizeSquares) || getTokenSizeSquares(token))));
    normalizeTokenGridSize(token);
    const snapped=snapMapPointToGrid({x:token.x,y:token.y}, token);
    token.x=snapped.x; token.y=snapped.y; token.tx=snapped.x; token.ty=snapped.y;
    syncMapTokens();
    multiplayer.connections.forEach(c => {
      if (c !== conn && c.open) c.send(JSON.stringify({
        type: 'token_resize', tokenId: token.tokenId, sizeSquares: token.sizeSquares, radius: token.radius
      }));
    });
  }
  else if (data.type === 'spell_cast') {
    const clientUser = getHostConnectionUser(conn);
    const ownedCharacter = clientUser && characters.find(c => c.userId === clientUser.id);
    if(!ownedCharacter) return;
    const safeData = {
      type:'spell_cast', charName:ownedCharacter.name,
      spellName:String(data.spellName ?? ''), spellIcon:String(data.spellIcon || '✨'),
      spellDamage:String(data.spellDamage || ''),
      dmgRoll:String(data.dmgRoll || '').replace(/<[^>]*>/g,'')
    };
    addChatMessage('player', escapeHTML(safeData.charName), `Conjura: <b>${escapeHTML(safeData.spellName)}</b>${escapeHTML(safeData.dmgRoll)} 🎇`);
    SoundEngine.spell(safeData.spellIcon);
    multiplayer.connections.forEach(c => {
      if (c !== conn && c.open) c.send(JSON.stringify(safeData));
    });
  }
  else if (data.type === 'attack_action') {
    const clientUser = getHostConnectionUser(conn);
    const ownedCharacter = clientUser && characters.find(c => c.userId === clientUser.id);
    if(!ownedCharacter) return;
    const safeData = {
      type:'attack_action', charName:ownedCharacter.name,
      icon:String(data.icon || '⚔️'), weaponName:String(data.weaponName ?? ''),
      dmgRoll:String(data.dmgRoll || '').replace(/<[^>]*>/g,'')
    };
    addChatMessage('player', escapeHTML(safeData.charName), `Ataca con <b>${escapeHTML(safeData.icon)} ${escapeHTML(safeData.weaponName)}</b>${escapeHTML(safeData.dmgRoll)} ⚔️`);
    playAttackSound(safeData.icon, '');
    multiplayer.connections.forEach(c => {
      if (c !== conn && c.open) c.send(JSON.stringify(safeData));
    });
  }
}

function startHostedGame() {
  multiplayer.started = true;
  multiplayer.broadcast({ type: 'start_game', code:'TM-' + multiplayer.code });
  
  document.getElementById('gameSelectionScreen').classList.add('hidden');
  document.getElementById('headerGameCodeBadge').style.display = 'flex';
  document.getElementById('headerGameCodeVal').textContent = 'TM-' + multiplayer.code;
  setConnectionStatus('connected','Sala activa');

  launchApp();
}

function showJoinGameMode() {
  document.getElementById('gameSelectionOptions').style.display = 'none';
  document.getElementById('panelJoinGame').style.display = '';
  document.getElementById('joinStatus').textContent = '';
  document.getElementById('joinGameCode').value = '';
}

function doJoinGame() {
  const codeIn = document.getElementById('joinGameCode').value.trim().toUpperCase();
  if (!codeIn) {
    document.getElementById('joinStatus').textContent = 'Ingresa un código de partida válido.';
    return;
  }
  
  const targetId = normalizeGameCodeInput(codeIn);

  document.getElementById('joinStatus').textContent = 'Conectando con el anfitrión...';

  multiplayer.kicked = false;
  connectClientToHost(targetId,false);
}

function handleClientIncomingData(data) {
  if (data.type === 'init_state') {
    characters = data.characters;
    enemies = data.enemies;
    npcs = data.npcs || [];
    maps = data.maps;
    state.activeMapId = data.activeMapId;
    mapState.tokens = (data.tokens || []).map(t => ({...t, tx: t.x, ty: t.y}));
    mapState.walls = Array.isArray(data.walls) ? cloneGameData(data.walls) : cloneGameData((maps.find(m=>m.id===state.activeMapId)?.walls) || []);
    mapState.fogOfWar = typeof data.fogOfWar === 'boolean' ? data.fogOfWar : (maps.find(m=>m.id===state.activeMapId)?.fogOfWar === true);
    mapState.fogStrokes = Array.isArray(data.fogStrokes) ? cloneGameData(data.fogStrokes) : cloneGameData((maps.find(m=>m.id===state.activeMapId)?.fogStrokes) || []);
    mapState.fogExploredAreas = typeof data.fogExploredAreas === 'boolean' ? data.fogExploredAreas : (maps.find(m=>m.id===state.activeMapId)?.fogExploredAreas === true);
    mapState.exploredFogPolygons = Array.isArray(data.exploredFogPolygons) ? cloneGameData(data.exploredFogPolygons) : cloneGameData((maps.find(m=>m.id===state.activeMapId)?.exploredFogPolygons) || []);
    state.currentTurnIndex = data.currentTurnIndex;
    state.round = data.round;
    state.pendingMapView = data.mapView || null;
    state.pendingWeather = data.weather || 'none';
    state.pendingMusic = data.music || 'none';
    state.pendingExternalMusicUrl = data.externalMusicUrl || null;
    if(data.manualAdaptation) applyManualAdaptationProfile(data.manualAdaptation);
    const activeMap = maps.find(m => m.id === state.activeMapId);
    if (activeMap) {
      activeMap.tokens = cloneGameData(mapState.tokens);
      activeMap.walls = cloneGameData(mapState.walls);
      activeMap.fogOfWar = mapState.fogOfWar;
      activeMap.fogStrokes = cloneGameData(mapState.fogStrokes);
      activeMap.fogExploredAreas = mapState.fogExploredAreas;
      activeMap.exploredFogPolygons = cloneGameData(mapState.exploredFogPolygons);
    }
    combatants = getInitiativeCombatants();
    
    saveLS('crq_chars', characters);
    saveLS('crq_enemies', enemies);
    saveLS('crq_npcs', npcs);
    saveLS('crq_maps', maps);
    saveLS('crq_active_map_id', state.activeMapId);
    
    restorePlayerActiveCharacter();
    if (mapState.canvas) {
      loadActiveMap(data.mapView);
      setWeather(data.weather || 'none', true);
      if(data.externalMusicUrl) playExternalMusic(data.externalMusicUrl,true);
      else setMusic(data.music || 'none', true);
      state.pendingMapView = null;
      state.pendingWeather = null;
      state.pendingMusic = null;
      state.pendingExternalMusicUrl = null;
      renderAll();
      switchPage('mapa');
      document.querySelectorAll('#mainNavTabs button').forEach(b => b.classList.toggle('active', b.dataset.page === 'mapa'));
    }
  }
  else if (data.type === 'start_game') {
    const code = data.code || multiplayer.reconnectCode || document.getElementById('joinGameCode').value.trim().toUpperCase();
    document.getElementById('gameSelectionScreen').classList.add('hidden');
    
    document.getElementById('headerGameCodeBadge').style.display = 'flex';
    document.getElementById('headerGameCodeVal').textContent = code;
    setConnectionStatus('connected','Conectado');

    const app = document.getElementById('mainApp');
    if (app && app.style.display !== 'none') return;
    launchApp();
  }
  else if (data.type === 'join_pending') {
    setConnectionStatus('waiting','Esperando aprobación...');
    const joinStatus=document.getElementById('joinStatus');
    if(joinStatus) joinStatus.textContent = data.message || 'Solicitud enviada. Esperando aprobación del Dungeon Master.';
  }
  else if (data.type === 'join_accepted') {
    setConnectionStatus('connected','Aprobado');
    const joinStatus=document.getElementById('joinStatus');
    if(joinStatus) joinStatus.textContent = data.message || 'Ingreso aprobado.';
  }
  else if (data.type === 'join_rejected') {
    multiplayer.kicked = true;
    multiplayer.active = false;
    clearTimeout(multiplayer.reconnectTimer);
    setConnectionStatus('offline','Ingreso rechazado');
    const joinStatus=document.getElementById('joinStatus');
    if(joinStatus) joinStatus.textContent = data.reason || 'El Dungeon Master rechazó tu ingreso a la sala.';
    alert(data.reason || 'El Dungeon Master rechazó tu ingreso a la sala.');
    try { multiplayer.conn?.close(); } catch(e) {}
  }
  else if (data.type === 'kicked') {
    multiplayer.kicked = true;
    alert(data.reason || 'El Dungeon Master te saco de la partida.');
    try { multiplayer.conn?.close(); } catch(e) {}
    window.location.reload();
  }
  else if (data.type === 'characters_update') {
    characters = data.characters;
    saveLS('crq_chars', characters);
    combatants = getInitiativeCombatants();

    restorePlayerActiveCharacter();
    updateChatSenders();
    renderCharListSidebar();
    renderPersonajePage();
    renderInventarioPage();
    renderHechizosPage();
    renderAtaquePage();
    renderQuickCombatPanel();
    renderInitiative();
    
    const m = maps.find(m => m.id === state.activeMapId);
    if (m && typeof drawMap === 'function') drawMap();
  }
  else if (data.type === 'enemies_update') {
    enemies = data.enemies;
    saveLS('crq_enemies', enemies);
    combatants = getInitiativeCombatants();
    renderInitiative();
    renderEnemiesPage();
  }
  else if (data.type === 'npcs_update') {
    npcs = data.npcs || [];
    saveLS('crq_npcs', npcs);
    rebuildCombatantsByInitiative();
    renderInitiative();
    renderNpcPage();
    if(typeof drawMap === 'function') drawMap();
  }
  else if (data.type === 'map_change') {
    if(data.mapSnapshot && !maps.some(m=>m.id===data.activeMapId)) {
      maps.push(cloneGameData(data.mapSnapshot));
    }
    state.activeMapId = data.activeMapId;
    mapState.tokens = data.tokens;
    mapState.structures = Array.isArray(data.structures) ? data.structures : [];
    mapState.walls = Array.isArray(data.walls) ? data.walls : [];
    mapState.fogOfWar = data.fogOfWar === true;
    mapState.fogStrokes = Array.isArray(data.fogStrokes) ? data.fogStrokes : [];
    mapState.fogExploredAreas = data.fogExploredAreas === true;
    mapState.exploredFogPolygons = Array.isArray(data.exploredFogPolygons) ? data.exploredFogPolygons : [];
    const activeMap=maps.find(m=>m.id===state.activeMapId);
    if(activeMap) {
      activeMap.tokens=JSON.parse(JSON.stringify(mapState.tokens || []));
      activeMap.structures=JSON.parse(JSON.stringify(mapState.structures));
      activeMap.walls=JSON.parse(JSON.stringify(mapState.walls));
      activeMap.fogOfWar=mapState.fogOfWar;
      activeMap.fogStrokes=JSON.parse(JSON.stringify(mapState.fogStrokes));
      activeMap.fogExploredAreas=mapState.fogExploredAreas;
      activeMap.exploredFogPolygons=JSON.parse(JSON.stringify(mapState.exploredFogPolygons));
      saveMaps();
    }
    saveLS('crq_active_map_id', state.activeMapId);
    loadActiveMap(data.mapView || null);
    if(typeof data.weather === 'string') setWeather(data.weather || 'none', true);
    if(data.externalMusicUrl) playExternalMusic(data.externalMusicUrl,true);
    else if(typeof data.music === 'string') setMusic(data.music || 'none', true);
    drawMap();
  }
  else if (data.type === 'tokens_update') {
    mapState.tokens = (data.tokens || []).map(t => ({...t, tx: t.x, ty: t.y}));
    const m = maps.find(m => m.id === state.activeMapId);
    if (m) {
      m.tokens = JSON.parse(JSON.stringify(data.tokens));
      saveLS('crq_maps', maps);
    }
    drawMap();
    renderInitiative();
    renderEnemiesPage();
    renderNpcPage();
    renderTokenActionPanel();
    updatePortraitMapTokenButton();
  }
  else if (data.type === 'dice_roll') {
    data = normalizeDiceRollData(data);
    if(!data) return;
    addDiceRollToChat(data);
    if(shouldAnimateRemoteDiceRolls()) animate3DDice(data.total, data.primaryFaces, () => {
      showRollResult(data.total, data.total, data.primaryFaces);
      if (data.formula.startsWith('Tirada de')) {
        let extra=data.hasCrit?'<div class="roll-total crit">¡CRÍTICO!</div>':(data.hasFumble?'<div class="roll-total fumble">¡PIFIA!</div>':'');
        document.getElementById('chatBox').insertAdjacentHTML('beforeend',`
          <div class="chat-msg msg-roll">
            <div class="msg-sender">${escapeHTML(data.senderName)}</div>
            <b>${escapeHTML(data.formula)}</b>
            <div class="roll-details">${escapeHTML(data.detailStr)}</div>
            <div class="roll-total ${data.hasCrit?'crit':data.hasFumble?'fumble':''}">${data.total}</div>${extra}
          </div>`);
        document.getElementById('chatBox').scrollTop=99999;
      } else {
        sendFormulaRollToChat(data.formula, data.detailStr, data.total, data.hasCrit, data.hasFumble, data.senderName);
      }
    }, data.allRolls);
  }
  else if (data.type === 'chat') {
    addChatMessage(data.chatType, escapeHTML(data.sender), escapeHTML(data.text));
  }
  else if (data.type === 'map_ping') {
    mapState.pings.push({ x: data.x, y: data.y, radius: 0, alpha: 1 });
    addChatMessage('sys', '', `📌 Señalado en el mapa por ${escapeHTML(data.sender)}.`);
  }
  else if (data.type === 'weather_change') {
    setWeather(data.weather, true);
  }
  else if (data.type === 'custom_weather_change') {
    playCustomWeather(data.track?.id,data.track);
  }
  else if (data.type === 'music_change') {
    setMusic(data.music || 'none', true);
  }
  else if (data.type === 'custom_music_change') {
    playCustomMusic(data.track?.id, data.track);
  }
  else if (data.type === 'external_music_change') {
    playExternalMusic(data.url,true);
  }
  else if (data.type === 'manual_adaptation_change') {
    if(data.adaptation) applyManualAdaptationProfile(data.adaptation);
  }
  else if (data.type === 'structures_update') {
    mapState.structures = Array.isArray(data.structures) ? data.structures : [];
    const map=maps.find(m=>m.id===state.activeMapId);
    if(map) {
      map.structures=JSON.parse(JSON.stringify(mapState.structures));
      saveMaps();
    }
    drawMap();
  }
  else if (data.type === 'walls_update') {
    mapState.walls = Array.isArray(data.walls) ? data.walls : [];
    const map=maps.find(m=>m.id===state.activeMapId);
    if(map) {
      map.walls=JSON.parse(JSON.stringify(mapState.walls));
      saveMaps();
    }
    drawMap();
  }
  else if (data.type === 'fog_of_war') {
    mapState.fogOfWar = data.fogOfWar === true;
    if(typeof data.fogExploredAreas === 'boolean') mapState.fogExploredAreas = data.fogExploredAreas;
    if(Array.isArray(data.exploredFogPolygons)) mapState.exploredFogPolygons = JSON.parse(JSON.stringify(data.exploredFogPolygons));
    const map=maps.find(m=>m.id===state.activeMapId);
    if(map) {
      map.fogOfWar=mapState.fogOfWar;
      map.fogExploredAreas=mapState.fogExploredAreas;
      map.exploredFogPolygons=JSON.parse(JSON.stringify(mapState.exploredFogPolygons));
      saveMaps();
    }
    syncMapToolButtons();
    drawMap();
  }
  else if (data.type === 'fog_strokes_update') {
    mapState.fogStrokes = Array.isArray(data.fogStrokes) ? data.fogStrokes : [];
    if(typeof data.fogExploredAreas === 'boolean') mapState.fogExploredAreas = data.fogExploredAreas;
    if(Array.isArray(data.exploredFogPolygons)) mapState.exploredFogPolygons = JSON.parse(JSON.stringify(data.exploredFogPolygons));
    const map=maps.find(m=>m.id===state.activeMapId);
    if(map) {
      map.fogStrokes=JSON.parse(JSON.stringify(mapState.fogStrokes));
      map.fogExploredAreas=mapState.fogExploredAreas;
      map.exploredFogPolygons=JSON.parse(JSON.stringify(mapState.exploredFogPolygons));
      saveMaps();
    }
    drawMap();
  }
  else if (data.type === 'grid_visibility') {
    mapState.gridVisible = data.visible === true;
    syncMapToolButtons();
    drawMap();
  }
  else if (data.type === 'turn_update') {
    state.currentTurnIndex = data.currentTurnIndex;
    state.round = data.round;
    renderInitiative();
    if (combatants[state.currentTurnIndex]) {
      addChatMessage('sys', '', `Turno de <b>${combatants[state.currentTurnIndex].name}</b>`);
    }
  }
  else if (data.type === 'token_move') {
    const token = mapState.tokens.find(t => t.tokenId === data.tokenId);
    if (token) {
      const snapped=snapMapPointToGrid({x:data.x,y:data.y}, token);
      token.tx = snapped.x;
      token.ty = snapped.y;
      if(Number.isFinite(data.facing)) token.facing = data.facing;
    }
  }
  else if (data.type === 'token_resize') {
    const token = mapState.tokens.find(t => t.tokenId === data.tokenId);
    if (token) {
      token.sizeSquares = Math.max(1, Math.min(6, Math.round(Number(data.sizeSquares) || getTokenSizeSquares(token))));
      normalizeTokenGridSize(token);
      const snapped=snapMapPointToGrid({x:token.x,y:token.y}, token);
      token.x=snapped.x; token.y=snapped.y; token.tx=snapped.x; token.ty=snapped.y;
      syncMapTokens();
      drawMap();
      renderTokenActionPanel();
    }
  }
  else if (data.type === 'spell_cast') {
    addChatMessage('player', escapeHTML(data.charName), `Conjura: <b>${escapeHTML(data.spellName)}</b>${data.dmgRoll || ''} 🎇`);
    SoundEngine.spell(data.spellIcon || '✨');
  }
  else if (data.type === 'attack_action') {
    addChatMessage('player', escapeHTML(data.charName), `Ataca con <b>${escapeHTML(data.icon)} ${escapeHTML(data.weaponName)}</b>${data.dmgRoll} ⚔️`);
    playAttackSound(data.icon, '');
  }
}

function copyGameCodeToClipboard() {
  const badgeVal = document.getElementById('headerGameCodeVal');
  const codeVal = badgeVal.textContent;
  if (!codeVal || codeVal === '-') return;
  navigator.clipboard.writeText(codeVal).then(() => {
    const badge = document.getElementById('headerGameCodeBadge');
    const prevText = badge.innerHTML;
    badge.innerHTML = '¡Copiado! ✓';
    setTimeout(() => {
      badge.innerHTML = `<span>Código:</span> <span id="headerGameCodeVal">${codeVal}</span>`;
    }, 1200);
  });
}

// ===================================================
// BOOT
// ===================================================
window.onload = function() {
  if(state.currentUser?.email) {
    showGameSelection();
  } else if(state.currentUser) {
    state.currentUser=null;
    saveLS('crq_session',null);
    switchAuthTab('register');
    document.getElementById('regError').textContent='Tu cuenta local es anterior al uso de correo. Regístrala nuevamente con el mismo nombre y contraseña para asociar tu email.';
  }
  document.getElementById('loginPass').addEventListener('keypress', e=>{ if(e.key==='Enter') doLogin(); });
  document.getElementById('loginEmail').addEventListener('keypress', e=>{ if(e.key==='Enter') doLogin(); });
  document.getElementById('regPass').addEventListener('keypress', e=>{ if(e.key==='Enter') doRegister(); });
  document.getElementById('regEmail').addEventListener('keypress', e=>{ if(e.key==='Enter') doRegister(); });
  // Desbloquear AudioContext en el primer gesto del usuario (política de autoplay de navegadores)
  document.addEventListener('pointerdown', () => { try { SoundEngine.prewarm(); } catch(e){} }, { capture: true });
};
