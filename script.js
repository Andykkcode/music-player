/* ============================================================
   Music Player - script.js
   职责：负责一切"行为逻辑"（点了按钮会发生什么）
   ============================================================

   【当前状态：P3-⑤ - 黑胶标签显示歌名】
   相比 P3-④ 新增：
   1. 黑胶唱片中心的标签改为显示"当前播放的歌名"
   2. 歌名字号自适应：歌名越长字越小，保证不溢出圆形标签
   */

/* ---------- 第 1 步：找到页面上的所有元素 ---------- */
const fileInput = document.getElementById('file-input');   // 隐藏的文件选择框
const chooseBtn = document.getElementById('choose-btn');   // "添加歌曲到歌单"按钮
const playlistEl = document.getElementById('playlist');    // 歌单列表 <ul>
const prevBtn = document.getElementById('prev-btn');       // 上一首按钮
const playBtn = document.getElementById('play-btn');       // 播放/暂停按钮
const nextBtn = document.getElementById('next-btn');       // 下一首按钮
const songTitle = document.getElementById('song-title');   // 歌曲标题
const progress = document.getElementById('progress');      // 进度条滑块
const currentTimeEl = document.getElementById('current-time'); // 当前时间文字
const totalTimeEl = document.getElementById('total-time'); // 总时长文字
const volume = document.getElementById('volume');          // 音量滑块
const vinyl = document.getElementById('vinyl');            // 黑胶唱片（P3-② 新增）
const tonearm = document.getElementById('tonearm');        // 唱臂（P3-② 新增）
const modeBtn = document.getElementById('mode-btn');        // 播放模式按钮（P3-④ 新增）
const labelSong = document.getElementById('label-song');    // 黑胶标签中间的歌名（P3-⑤ 新增）


/* ---------- 歌单数据 ----------
   playlist 是一个"数组"（Array）——可以装很多东西的容器，
   里面每个元素是一首歌：{ name: '歌名', url: '临时播放地址' }。
   数组的顺序就是播放顺序：[0] 第一首，[1] 第二首……

   currentIndex 记录"当前正在播第几首"。
   -1 表示"还没播任何歌"（数组下标从 0 开始，-1 是安全区）。 */
const playlist = [];
let currentIndex = -1;

/* audio 变量：当前播放的音频对象。
   一开始是 null，表示"还没有任何音频"。 */
let audio = null;

/* ---------- 播放模式（P3-④ 新增）----------
   三种模式，用字符串表示，方便记忆和比较：
   'order'   → 顺序播放：按列表顺序，播完最后一首自动停止（默认）
   'loop'    → 单曲循环：当前这一首反复播放，永远不换歌
   'shuffle' → 随机播放：每首放完随机跳到另一首
   playModeInfo 负责"模式 → 按钮文字/提示"的翻译。 */
let playMode = 'order';
const playModeInfo = {
  order:   { text: '顺序',   icon: '↻',  title: '顺序播放：按列表顺序，播完最后一首停止' },
  loop:    { text: '单曲循环', icon: '🔂', title: '单曲循环：当前这一首反复播放' },
  shuffle: { text: '随机',   icon: '🔀', title: '随机播放：每首放完随机跳到下一首' },
};

/* ---------- 第 2 步：添加歌曲 ---------- */
chooseBtn.addEventListener('click', () => {
  fileInput.click();  // 程序化点击隐藏的 input，浏览器弹出文件选择窗口
});

/* fileInput 监听 change 事件：用户选好文件后触发。
   因为 input 加了 multiple，这次拿到的是"文件列表"（可能不止一个）。
   e.target.files 不是普通数组，用 Array.from() 把它转成数组才好用
   forEach 遍历。 */
fileInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;  // 用户点了取消，直接结束

  /* 把每一首歌都加入歌单数组。
     URL.createObjectURL(file)：本地文件 → 浏览器能播的临时地址。
     file.name.replace(/\.[^.]+$/, '')：去掉 ".mp3" 这种扩展名，只留歌名。 */
  files.forEach((file) => {
    playlist.push({
      name: file.name.replace(/\.[^.]+$/, ''),
      url: URL.createObjectURL(file),
    });
  });

  /* 把数组里的歌画到页面上（生成列表行） */
  renderPlaylist();

  /* 如果之前一首都没播过，自动开始播第一首。
     注意：这里和 P1 不同——P1 每次选文件都新开一首；
     P2 只有"歌单还是空的"时才会自动播，之后选歌只是"加歌"。 */
  if (!audio) {
    loadAndPlay(0);
  }

  /* 重置文件选择框：下次选同样的文件也能触发 change 事件 */
  fileInput.value = '';
});

/* ---------- 第 3 步：把歌单画到页面上 ----------
   核心新知识点：动态创建 DOM。
   document.createElement('li')：凭空造一个 <li> 元素。
   playlistEl.appendChild(li)：把它挂到歌单 <ul> 里面。
   "先创建 → 再装饰 → 最后挂上页面"，是前端最常用的套路。 */
function renderPlaylist() {
  /* 清空旧列表。如果不清，每次选歌都会把旧的行再画一遍，
     列表就会越变越长、全是重复。innerHTML = '' 是"清空内容"的快捷方式。 */
  playlistEl.innerHTML = '';

  /* forEach 遍历数组：数组里有多少首歌，就画多少行。
     song 是当前这一首，i 是它的下标（0, 1, 2...）。 */
  playlist.forEach((song, i) => {
    const li = document.createElement('li');  // 1. 创建一行
    li.className = 'playlist-item';            // 2. 给它穿上样式

    /* 如果这一首就是正在播的（i === currentIndex），
       加一个 active class，CSS 会用红色高亮它。
       classList 是管理 class 的"工具箱"。 */
    if (i === currentIndex) {
      li.classList.add('active');
    }

    /* 3. 往行里填内容：序号 + 歌名。
       歌名用一个 <span> 包起来并加 class="song-name"，
       CSS 会让它占满剩余空间（flex: 1），歌名再长也不会挤到删除按钮。 */
    li.innerHTML = `<span class="index">${i + 1}</span><span class="song-name">${song.name}</span>`;

    /* 4. 行尾的"×"删除按钮：
       注意两个细节——
       a) e.stopPropagation()：阻止点击冒泡到 <li> 上。
          如果不加，点"×"会同时触发"点击整行 → 播放这首歌"，
          结果就是"想删歌，反而开始播这首歌"。
       b) 为什么用 addEventListener 而不是写在 innerHTML 里？
          写在模板字符串里的 onclick 不方便传 i 这个变量（容易踩坑），
          分开写更清晰。 */
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '×';
    deleteBtn.title = '从歌单移除';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeSong(i);
    });
    li.appendChild(deleteBtn);

    /* 5. 给这一行绑定点击事件：点它 → 播放第 i 首。
       这里用到了"闭包"：forEach 每次循环的 i 都是独立的，
       点击时用的就是自己那一行的 i，不会串。 */
    li.addEventListener('click', () => {
      loadAndPlay(i);
    });

    playlistEl.appendChild(li);  // 6. 挂到页面上去
  });

  /* 更新上一首/下一首按钮的可用状态 */
  updateCtrlBtns();

  /* 如果当前有歌在播，让高亮的那一行滚进可视区域，
     这样歌单很长时，切歌后不用手动滚动找位置。 */
  const active = playlistEl.querySelector('.active');
  if (active) active.scrollIntoView({ block: 'nearest' });
}

/* ---------- 第 4 步：加载并播放某一首 ----------
   P2 最重要的重构：把 P1 里"选文件 → 创建音频"的一大段代码，
   抽成了一个可以反复调用的函数 loadAndPlay(index)。
   好处：上一首、下一首、点列表……所有地方想换歌，
   都只需要喊一句 loadAndPlay(下标)，不用复制粘贴。 */
function loadAndPlay(index) {
  /* 下标越界保护：index 不在合法范围内就直接返回。
     （比如歌单只有 3 首，却要播第 9 首，就是越界） */
  if (index < 0 || index >= playlist.length) return;

  const song = playlist[index];

  /* 如果之前有一首在播，先停掉它，并释放它的临时地址，
     否则每切一首歌就占一块内存（内存泄漏的坏习惯）。 */
  if (audio) {
    audio.pause();
    URL.revokeObjectURL(audio.src);
  }

  /* 记录当前播到第几首，创建新的音频对象 */
  currentIndex = index;
  audio = new Audio(song.url);
  audio.volume = volume.value;  // 新歌沿用音量滑块的值

  /* 标题、按钮、进度条全部复位 */
  songTitle.textContent = song.name;
  songTitle.title = song.name;
  /* P3-⑤：黑胶标签中间也印上当前歌名，并让字号自适应 */
  labelSong.textContent = song.name;
  fitLabelText();
  playBtn.disabled = false;
  progress.value = 0;
  currentTimeEl.textContent = '0:00';
  totalTimeEl.textContent = '0:00';

  /* 开始播放（.catch 兜底：被浏览器自动播放拦截也没关系，
     用户手动点一下播放按钮就能放出来） */
  audio.play().catch(() => {});

  /* ---------- 监听音频的"生命周期事件" ---------- */

  /* loadedmetadata：音频的时长加载完成时触发，此时才知道总时长 */
  audio.addEventListener('loadedmetadata', () => {
    totalTimeEl.textContent = formatTime(audio.duration);
  });

  /* timeupdate：播放位置移动时频繁触发（约每 0.25 秒一次）。
     这是进度条跟着歌曲走的"发动机"。 */
  audio.addEventListener('timeupdate', () => {
    currentTimeEl.textContent = formatTime(audio.currentTime);
    progress.value = (audio.currentTime / audio.duration) * 100 || 0;
  });

  /* play / pause 事件：按钮文字跟着播放状态切换。
     P3-② 新增联动：播放 → 唱片转起来 + 唱臂落下；
     暂停 → 唱片停转 + 唱臂抬起。 */
  audio.addEventListener('play', () => {
    playBtn.textContent = '暂停';
    vinyl.classList.add('spinning');     // 唱片开始旋转（CSS 动画）
    tonearm.classList.add('playing');    // 唱臂垂下来搭在盘面上
  });
  audio.addEventListener('pause', () => {
    playBtn.textContent = '播放';
    vinyl.classList.remove('spinning');  // 唱片停转
    tonearm.classList.remove('playing'); // 唱臂抬起
  });

  /* ended：整首歌放完时。
     P3-④ 改动：具体"下一首放什么"交给 nextTrack() 统一决定
     （它内部按当前播放模式 order / loop / shuffle 分情况处理）。 */
  audio.addEventListener('ended', () => {
    nextTrack();
  });

  /* 重新画一遍列表：让高亮从旧歌移动到新歌上 */
  renderPlaylist();
}

/* ---------- 第 5.5 步：删除歌曲 ----------
   P3-① 新增。点歌单行尾的"×"会调用这里。
   删除不是"从页面上抹掉一行"那么简单，要处理三种情况：
   (a) 删的歌正在播放 → 停掉它，自动切到下一首（没有下一首就切到最后一首）
   (b) 删的歌排在正在播的歌"前面" → 正在播的歌下标要跟着减 1
   (c) 删的歌排在正在播的歌"后面" → 正在播的歌不受影响
   最后还要释放被删歌曲的内存（URL.revokeObjectURL），养成好习惯。 */
function removeSong(index) {
  /* 释放内存：这首被删了，它的临时播放地址没用了 */
  URL.revokeObjectURL(playlist[index].url);

  /* splice(从哪里删, 删几个)：从数组里真正移除这一项。
     数组的长度和后面每首歌的下标都会自动变化。 */
  playlist.splice(index, 1);

  /* 情况 (a)：删掉的正好是正在播的歌 */
  if (index === currentIndex) {
    audio.pause();          // 停止播放
    audio = null;           // 扔掉音频对象
    currentIndex = -1;      // 标记"没有在播的歌"（先复位，loadAndPlay 会重新设置）

    if (playlist.length > 0) {
      /* 还有歌 → 自动切歌。
         优先播"原来下一首"的位置（删除后它就顶到 index 了）；
         如果删除的是最后一首（index 已经越界），就播新的最后一首。 */
      const next = Math.min(index, playlist.length - 1);
      loadAndPlay(next);
    } else {
      /* 歌单空了 → 整个播放器复位到初始状态 */
      songTitle.textContent = '还没有选择歌曲';
      songTitle.title = '';
      playBtn.disabled = true;
      playBtn.textContent = '播放';
      progress.value = 0;
      currentTimeEl.textContent = '0:00';
      totalTimeEl.textContent = '0:00';
    }
  }
  /* 情况 (b)：删的歌在正在播的歌前面，
     所有排在它后面的歌都往前挪了一位，正在播的歌下标 -1 */
  else if (index < currentIndex) {
    currentIndex--;
  }
  /* 情况 (c)：删的歌在后面，什么都不用做 */

  /* 重新画列表：被删的行消失，剩下的行重新排号 */
  renderPlaylist();
}

/* ---------- 第 6 步：上一首 / 下一首 ----------
   P3-④ 改动："下一首"在随机模式下不再是顺序 +1，
   而是随机挑一首（且尽量不跟当前重复）。 */
prevBtn.addEventListener('click', () => {
  /* 只有当前不是第一首时才能往前切（第一首没有"上一首"） */
  if (currentIndex > 0) loadAndPlay(currentIndex - 1);
});

nextBtn.addEventListener('click', () => {
  /* 随机模式：随机挑一首。Math.random() 返回 0~1 之间的小数，
     乘上歌单长度再向下取整，就得到一个合法的随机下标。 */
  if (playMode === 'shuffle') {
    if (playlist.length < 2) return;  // 只有一首歌，随机没有意义
    let next = currentIndex;
    while (next === currentIndex) {
      next = Math.floor(Math.random() * playlist.length);
    }
    loadAndPlay(next);
    return;
  }
  /* 顺序模式：只有当前不是最后一首时才能往后切 */
  if (currentIndex < playlist.length - 1) loadAndPlay(currentIndex + 1);
});

/* ---------- 第 6.5 步：播放模式切换（P3-④ 新增） ---------- */
modeBtn.addEventListener('click', () => {
  /* 三种模式排成一圈：顺序 → 单曲循环 → 随机 → 顺序……
     indexOf 找到当前模式在第几位，+1 取下一个，% 3 防止越界（3 % 3 = 0 回到开头）。 */
  const modes = ['order', 'loop', 'shuffle'];
  playMode = modes[(modes.indexOf(playMode) + 1) % modes.length];
  updateModeBtn();
  updateCtrlBtns();  // 随机模式下按钮可用性规则不同，切完模式顺手刷新
});

/* 把模式按钮的文字和提示换成当前模式的样子。
   另外：不是顺序模式时给按钮加一个高亮 class（mode-active），
   让人一眼看出"现在不是默认的顺序播放"。 */
function updateModeBtn() {
  const info = playModeInfo[playMode];
  modeBtn.textContent = info.icon + ' ' + info.text;
  modeBtn.title = info.title;
  modeBtn.classList.toggle('mode-active', playMode !== 'order');
}

/* ---------- 第 6.6 步：一首歌放完后的"下一首去哪"（P3-④ 新增） ----------
   三种模式在这里分岔：
   - order：有下一首就顺序接上；放完最后一首就停（恢复按钮和唱片）
   - loop：单曲循环，直接重播当前这首
   - shuffle：随机挑一首（歌单只有一首时只能重播自己） */
function nextTrack() {
  if (playMode === 'loop') {
    loadAndPlay(currentIndex);       // 单曲循环：重新加载自己
    return;
  }

  if (playMode === 'shuffle') {
    if (playlist.length === 0) return;
    let next = currentIndex;
    while (playlist.length > 1 && next === currentIndex) {
      next = Math.floor(Math.random() * playlist.length);
    }
    loadAndPlay(next);
    return;
  }

  /* 顺序模式 */
  if (currentIndex < playlist.length - 1) {
    loadAndPlay(currentIndex + 1);
  } else {
    /* 最后一首放完：播放器恢复静止 */
    playBtn.textContent = '播放';
    vinyl.classList.remove('spinning');
    tonearm.classList.remove('playing');
  }
}

/* ---------- 第 7 步：播放 / 暂停 ---------- */
playBtn.addEventListener('click', () => {
  if (!audio) return;  // 还没有歌曲，什么都不做

  /* audio.paused 是音频对象自带的属性：
     暂停状态是 true，播放状态是 false。 */
  if (audio.paused) {
    audio.play().catch(() => {
      alert('播放失败，请重新选择文件');  // 兜底提示
    });
  } else {
    audio.pause();
  }
});

/* ---------- 第 8 步：拖动进度条跳转 ---------- */
progress.addEventListener('input', () => {
  if (!audio || !audio.duration) return;  // 没有歌或者时长未知，忽略
  /* 百分比 → 秒数：滑到 30 → 30/100 × 总时长 */
  audio.currentTime = (progress.value / 100) * audio.duration;
});

/* ---------- 第 9 步：音量控制 ---------- */
volume.addEventListener('input', () => {
  if (audio) audio.volume = volume.value;
});

/* ---------- 工具函数 1：更新上一首/下一首按钮的可用状态 ----------
   顺序模式：播到第一首时"上一首"禁用，播到最后一首时"下一首"禁用。
   随机模式（P3-④ 改动）：前后按钮都变成"随机跳"，只要歌单有 2 首
   以上就永远可用，只有 0~1 首时才禁用（没得跳）。 */
function updateCtrlBtns() {
  if (playMode === 'shuffle') {
    prevBtn.disabled = playlist.length < 2;
    nextBtn.disabled = playlist.length < 2;
  } else {
    prevBtn.disabled = currentIndex <= 0;
    nextBtn.disabled = currentIndex >= playlist.length - 1;
  }
}

/* ---------- 工具函数 1.5：黑胶标签歌名字号自适应（P3-⑤ 新增） ----------
   标签是个小圆（直径 92px），歌名长了会溢出。
   思路：先给一个"最大字号"，然后不断缩小，直到文字宽度
   不超过标签可用宽度为止。用二分法（每次砍一半）快速逼近，
   最多试几次就能找到合适字号，不会卡顿。 */
function fitLabelText() {
  const maxSize = 13;   // 歌名最短时用的最大字号（px）
  const minSize = 7;    // 歌名再长也不能小于这个字号
  const maxWidth = 66;  // 标签内可用宽度（px），留出边距

  /* 从最大字号开始，往下试。每次把字号减 1px，
     直到文字宽度放得下为止。 */
  let size = maxSize;
  labelSong.style.fontSize = size + 'px';
  while (size > minSize && labelSong.scrollWidth > maxWidth) {
    size--;
    labelSong.style.fontSize = size + 'px';
  }
}

/* ---------- 工具函数 2：把秒数变成 "分:秒" 显示 ---------- */
function formatTime(seconds) {
  if (isNaN(seconds)) return '0:00';  // 时长还没加载出来，显示 0:00
  seconds = Math.floor(seconds);      // 去掉小数（73.6 → 73）
  const minutes = Math.floor(seconds / 60);  // 73 ÷ 60 = 1 分钟
  const rest = seconds % 60;                // 73 ÷ 60 余 13 秒
  /* String(rest).padStart(2, '0')：把 13 补成两位数。
     如果 rest 是 5，就显示 "05"，避免出现 "1:5" 这种丑格式。 */
  return minutes + ':' + String(rest).padStart(2, '0');
}
