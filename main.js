function shuffle(arr) {
  for(let i=arr.length-1; i>0; --i) {
    let j = Math.floor(Math.random() * (i+1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const icons = [
    "🐱", "🐶", "🐰", "🦊", "🐸",
    "🍎", "🍊", "🍉", "🍇", "🍌",
    "😊", "😺", "😎", "🥳", "🤩"
];

let currentLevel = 1;
let board = [];
let selected = [];
let lock = false;
let timer = null;
let timeLeft = 0;
let movesLeft = 0;
let reshuffleLeft = 0;
let size = 8;
let maxTimeThisLevel = 120;
let reshuffleTipTimer = null;

let gameState = 'idle'; // idle, running, paused, fail, win

function getLevelSetting(level) {
  let boardSize = Math.min(6 + (level-1), 10);  // 最大 10x10
  let baseTime = 120 + (level-1)*8;             // 每關+8秒，起始2分鐘
  let moves = Math.ceil((boardSize*boardSize)*1.35);
  let reshuffle = Math.max(3 - Math.floor((level-1)/3), 1);
  return {
    size: boardSize,
    time: baseTime,
    moves: moves,
    reshuffle: reshuffle
  }
}

function updateStatus() {
  document.getElementById('level').textContent = currentLevel;
  document.getElementById('time').textContent = timeLeft;
  document.getElementById('moves').textContent = movesLeft;
  document.getElementById('reshuffle-count').textContent = reshuffleLeft;
  document.getElementById('reshuffle').disabled = (reshuffleLeft <= 0 || gameState !== 'running');
  document.getElementById('restart').disabled = (gameState !== 'running');
  document.getElementById('pause').disabled = !(gameState === 'running');
}

function initLevel() {
  gameState = 'idle';
  document.getElementById('startOverlay').style.display = "flex";
  document.getElementById('pauseOverlay').style.display = "none";
  document.getElementById('failOverlay').style.display = "none";
  document.getElementById('successOverlay').style.display = "none";
  document.getElementById('message').textContent = '';
  restoreMainButtons();
  let setting = getLevelSetting(currentLevel);
  size = setting.size + 2;
  timeLeft = setting.time;
  maxTimeThisLevel = setting.time;
  movesLeft = setting.moves;
  reshuffleLeft = setting.reshuffle;
  selected = [];
  lock = true; // idle時不能操作
  updateStatus();
  if (timer) clearInterval(timer);

  // emoji 配對資料數一定要是偶數
  let total = (size-2) * (size-2);
  if (total % 2 !== 0) total--;
  let iconsNeeded = [];
  for(let i=0;i<total/2;++i) {
    let icon = icons[i % icons.length];
    iconsNeeded.push(icon, icon);
  }
  iconsNeeded = shuffle(iconsNeeded);
  let realBoard = Array(size-2).fill(0).map(()=>Array(size-2).fill(''));
  for (let i=0, idx=0; i<size-2; ++i) {
    for (let j=0; j<size-2; ++j, ++idx) {
      realBoard[i][j] = iconsNeeded[idx];
    }
  }
  board = Array(size).fill(0).map(()=>Array(size).fill(''));
  for (let i=1; i<size-1; ++i) {
    for (let j=1; j<size-1; ++j) {
      board[i][j] = realBoard[i-1][j-1];
    }
  }
  drawBoard(true);
  setTimeout(()=>{checkAndAutoReshuffle();}, 400);
}

// 開始遊戲
function startGame() {
  document.getElementById('startOverlay').style.display = "none";
  gameState = 'running';
  lock = false;
  updateStatus();
  drawBoard(); // 確保開始後棋盤可互動
  timer = setInterval(() => {
    if (gameState !== 'running') return;
    timeLeft--;
    updateStatus();
    if (timeLeft <= 0) {
      clearInterval(timer);
      showFail('時間到！');
    }
  }, 1000);
}

// 暫停遊戲
function pauseGame() {
  if (gameState !== 'running') return;
  gameState = 'paused';
  lock = true;
  document.getElementById('pauseOverlay').style.display = "flex";
  updateStatus();
}

// 繼續遊戲
function resumeGame() {
  if (gameState !== 'paused') return;
  gameState = 'running';
  lock = false;
  document.getElementById('pauseOverlay').style.display = "none";
  updateStatus();
}

// 重新開始本關
function restartLevel() {
  initLevel();
}

// 下一關
function nextLevel() {
  currentLevel++;
  document.getElementById('successOverlay').style.display = "none";
  initLevel();
}

// 再試一次
function onTryAgain() {
  document.getElementById('failOverlay').style.display = "none";
  initLevel();
}

// 洗牌
function reshuffle(manual = true) {
  if (manual && (reshuffleLeft <= 0 || gameState !== 'running')) return;
  let arr = [];
  for(let i=1;i<size-1;++i)
    for(let j=1;j<size-1;++j)
      if(board[i][j]!="") arr.push(board[i][j]);
  arr = shuffle(arr);
  for(let i=1,idx=0;i<size-1;++i)
    for(let j=1;j<size-1;++j)
      if(board[i][j]!="") board[i][j]=arr[idx++];
  if (manual) reshuffleLeft--;
  updateStatus();
  drawBoard(true);
  setTimeout(()=>{checkAndAutoReshuffle();}, 200);
}

// 棋盤檢查與自動重排
function checkAndAutoReshuffle() {
  if (!hasPairToMatch()) {
    reshuffle(false);
    showReshuffleTip();
  }
}
function hasPairToMatch() {
  let pos = [];
  for(let i=1;i<size-1;++i)
    for(let j=1;j<size-1;++j)
      if(board[i][j]!="") pos.push([i,j]);
  for(let x=0;x<pos.length;++x) for(let y=x+1;y<pos.length;++y) {
    let [i1,j1]=pos[x], [i2,j2]=pos[y];
    if(board[i1][j1]===board[i2][j2] && canLink(i1,j1,i2,j2)) return true;
  }
  return false;
}

// 主要棋盤渲染
function drawBoard(animate = false) {
  let gb = document.getElementById("game-board");
  gb.innerHTML = "";
  gb.style.gridTemplateColumns = `repeat(${size-2}, minmax(30px, 1fr))`;
  gb.style.gridTemplateRows = `repeat(${size-2}, minmax(30px, 1fr))`;
  let tileArr = [];
  for(let i=1;i<size-1;++i) {
    for(let j=1;j<size-1;++j) {
      let tile = document.createElement("div");
      tile.className = "tile";
      tile.id = "t-"+i+"-"+j;
      if (board[i][j] === "") {
        tile.classList.add("removed");
      } else {
        tile.textContent = board[i][j];
        tile.onclick = ()=>tileClick(i, j, tile);
        if (gameState !== 'running') tile.style.pointerEvents = 'none';
        tileArr.push(tile);
      }
      gb.appendChild(tile);
    }
  }
  if (animate) {
    shuffle(tileArr);
    tileArr.forEach((tile, idx) => {
      setTimeout(()=>{
        tile.classList.add("visible");
      }, 120 + Math.random() * 320 + idx * 12);
    });
  } else {
    tileArr.forEach(tile => tile.classList.add("visible"));
  }
}

// 主要點擊事件
function tileClick(i, j, tile) {
  if (lock || movesLeft <= 0 || isOverlayOpen() || gameState !== 'running') return;
  if (board[i][j] === "") return;
  if (selected.length === 1 && selected[0][0] === i && selected[0][1] === j) return;
  tile.classList.add("selected");
  selected.push([i, j]);
  if (selected.length === 2) {
    lock = true;
    movesLeft--;
    updateStatus();
    let [[x1,y1],[x2,y2]] = selected;
    if (board[x1][y1] === board[x2][y2] && canLink(x1, y1, x2, y2)) {
      setTimeout(()=>{
        board[x1][y1]="";
        board[x2][y2]="";
        drawBoard();
        selected = [];
        lock = false;
        // ★每成功消除一對，加5秒
        timeLeft = Math.min(timeLeft+5, maxTimeThisLevel);
        updateStatus();
        if (isWin()) {
          clearInterval(timer);
          showSuccess();
        } else {
          setTimeout(()=>{checkAndAutoReshuffle();}, 200);
        }
      }, 230);
    } else {
      setTimeout(()=>{
        document.getElementById("t-"+x1+"-"+y1).classList.remove("selected");
        document.getElementById("t-"+x2+"-"+y2).classList.remove("selected");
        selected = [];
        lock = false;
        if (movesLeft <= 0) {
          clearInterval(timer);
          showFail('步數用完！');
        } else {
          setTimeout(()=>{checkAndAutoReshuffle();}, 200);
        }
      }, 380);
    }
  }
}

// 勝利判定
function isWin() {
  for(let i=1;i<size-1;++i) for(let j=1;j<size-1;++j) if(board[i][j]!="") return false;
  return true;
}

// 支援外圍虛擬空白（經典連連看繞邊消除）
function canLink(x1, y1, x2, y2) {
  if (x1 === x2 && y1 === y2) return false;
  // 0折
  if (canLine(x1, y1, x2, y2)) return true;
  // 1折
  if (board[x1][y2] === "" && canLine(x1, y1, x1, y2) && canLine(x1, y2, x2, y2)) return true;
  if (board[x2][y1] === "" && canLine(x1, y1, x2, y1) && canLine(x2, y1, x2, y2)) return true;
  // 2折（最外圈也能嘗試）
  for (let i = 0; i < size; ++i) {
    if (
      board[i][y1] === "" &&
      board[i][y2] === "" &&
      canLine(x1, y1, i, y1) &&
      canLine(i, y1, i, y2) &&
      canLine(i, y2, x2, y2)
    ) return true;
    if (
      board[x1][i] === "" &&
      board[x2][i] === "" &&
      canLine(x1, y1, x1, i) &&
      canLine(x1, i, x2, i) &&
      canLine(x2, i, x2, y2)
    ) return true;
  }
  return false;
}

function canLine(x1, y1, x2, y2) {
  if (x1 === x2) {
    let [a,b]=[y1,y2].sort((a,b)=>a-b);
    for(let j=a+1;j<b;++j) if(board[x1][j]!="") return false;
    return true;
  }
  if (y1 === y2) {
    let [a,b]=[x1,x2].sort((a,b)=>a-b);
    for(let i=a+1;i<b;++i) if(board[i][y1]!="") return false;
    return true;
  }
  return false;
}

function showSuccess() {
  gameState = 'win';
  closeOverlay();
  document.getElementById('successOverlay').style.display = "flex";
  document.getElementById('message').innerHTML = "";
}

function showFail(msg) {
  gameState = 'fail';
  document.getElementById('failMsg').textContent = msg;
  document.getElementById('failOverlay').style.display = "flex";
  document.getElementById('message').textContent = '';
}

function isOverlayOpen() {
  return (
    (document.getElementById('failOverlay').style.display !== "none" && document.getElementById('failOverlay').style.display !== "") ||
    (document.getElementById('successOverlay').style.display !== "none" && document.getElementById('successOverlay').style.display !== "")
  );
}
function closeOverlay() {
  document.getElementById('failOverlay').style.display = "none";
  document.getElementById('pauseOverlay').style.display = "none";
  document.getElementById('successOverlay').style.display = "none";
}

// 洗牌與開始鍵的初始化
function restoreMainButtons() {
  document.querySelector('.button-row').innerHTML = `
    <button id="reshuffle">重排牌陣</button>
    <button id="restart">重新開始</button>
  `;
  document.getElementById("restart").onclick = () => restartLevel();
  document.getElementById("reshuffle").onclick = () => reshuffle();
}

// Accordion(遊戲規則) JS
function toggleAccordion() {
  let btn = document.querySelector('.accordion-btn');
  let panel = document.getElementById('rule-panel');
  btn.classList.toggle('open');
  panel.classList.toggle('open');
}

// 暫停鍵監聽
document.getElementById("pause").onclick = () => pauseGame();

// 顯示自動重排提示
function showReshuffleTip() {
  let tip = document.getElementById('reshuffleTip');
  tip.style.display = "block";
  tip.style.animation = "fadeoutTip 1.5s forwards";
  if (reshuffleTipTimer) clearTimeout(reshuffleTipTimer);
  reshuffleTipTimer = setTimeout(()=>{ tip.style.display = "none"; }, 1600);
}

// 初始化進入第一關
window.onload = () => {
  initLevel();
};
