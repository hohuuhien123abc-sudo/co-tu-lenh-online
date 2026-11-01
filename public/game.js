const socket = io();
const $ = id => document.getElementById(id);
let mySide = null, roomCode = null, state = null, selected = null;
let toastTimer;
function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600)}
function playerName(){return $('playerName').value.trim() || 'Người chơi'}
$('createBtn').onclick=()=>{ $('lobbyError').textContent=''; socket.emit('create-room',{name:playerName()}); };
$('joinBtn').onclick=()=>{ $('lobbyError').textContent=''; const code=$('roomCode').value.trim().toUpperCase(); if(code.length!==6){$('lobbyError').textContent='Mã phòng cần có 6 ký tự.';return;} socket.emit('join-room',{code,name:playerName()}); };
$('roomCode').addEventListener('input',e=>e.target.value=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6));
socket.on('joined-room',data=>{roomCode=data.code;mySide=data.side;$('lobby').classList.add('hidden');$('game').classList.remove('hidden');$('roomLabel').textContent=roomCode;toast(`Bạn vào phòng ${roomCode} – phe ${mySide==='red'?'Đỏ':'Xanh'}.`);});
socket.on('error-message',message=>{if($('game').classList.contains('hidden'))$('lobbyError').textContent=message;else toast(message);});
socket.on('room-state',renderState);
function renderState(s){state=s;$('redName').textContent=s.players.find(p=>p.side==='red')?.name||'Đang chờ...';$('blueName').textContent=s.players.find(p=>p.side==='blue')?.name||'Đang chờ...';$('redStatus').textContent=s.players.find(p=>p.side==='red')?.connected?'Đã kết nối':'Chưa kết nối';$('blueStatus').textContent=s.players.find(p=>p.side==='blue')?.connected?'Đã kết nối':'Chưa kết nối';$('turnText').textContent=!s.started?'Chờ người chơi...':s.turn==='red'?'Phe Đỏ':'Phe Xanh';$('startBtn').disabled=!(s.players.length===2&&!s.started&&mySide==='red');$('startBtn').textContent=s.started?'VÁN ĐÃ BẮT ĐẦU':'BẮT ĐẦU VÁN';$('logList').innerHTML=s.log.map(x=>`<li>${escapeHtml(x)}</li>`).join('');renderBoard(s.board);}
function escapeHtml(str){return String(str).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function renderBoard(board){const root=$('board');root.innerHTML='';for(let r=0;r<12;r++){for(let c=0;c<11;c++){const cell=document.createElement('button');cell.className='cell';cell.type='button';if(r===5||r===6)cell.classList.add('river');if(selected&&selected.r===r&&selected.c===c)cell.classList.add('selected');const p=board[r][c];if(p){const piece=document.createElement('span');piece.className=`piece ${p.side}`;piece.textContent=p.label||'•';cell.append(piece);}cell.addEventListener('click',()=>cellClick(r,c));root.append(cell);}}}
function cellClick(r,c){if(!state?.started)return;const piece=state.board[r][c];if(!selected){if(piece?.side===mySide){selected={r,c};renderBoard(state.board);}return;}if(selected.r===r&&selected.c===c){selected=null;renderBoard(state.board);return;}socket.emit('demo-move',{from:selected,to:{r,c}});selected=null;renderBoard(state.board);}
$('startBtn').onclick=()=>socket.emit('start-game');
$('copyBtn').onclick=async()=>{try{await navigator.clipboard.writeText(roomCode);toast('Đã sao chép mã phòng!');}catch{toast(`Mã phòng: ${roomCode}`);}};
$('leaveBtn').onclick=()=>location.reload();
