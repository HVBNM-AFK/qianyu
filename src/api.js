/**
 * 千屿 API Server
 * 为前端 HTML 提供 HTTP 接口，真实数据，无假数据
 */
const http = require('http');
const db = require('./database');

// 云服务器需要监听所有网卡，端口从环境变量读取
const PORT = process.env.PORT || 3457;

function json(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function body(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({}); } });
  });
}

// AI 回信（备用模板，后续接真实 API）
function aiReply(islandId, userMessage) {
  const island = db.ISLANDS[islandId];
  const ai = island ? island.ai_name : '岛民';
  const msg = userMessage.toLowerCase();

  const templates = {
    sad: [
      `读到你写的，心里也跟着沉了一下。难过的时候不用撑着，让它流过去吧。${ai}在这里陪着你。`,
      `有些时候不需要答案，只是想被听见。我在，你说。`
    ],
    happy: [
      `听到你这样说，${ai}也跟着开心起来了！这样的感觉很好，要好好记住今天。`,
      `嗯嗯！开心的事要大声说出来，这样才算真的发生了。`
    ],
    lonely: [
      `孤独有时候像一件旧外套，穿着不舒服，又不知道该怎么脱掉。好在，你来这里了。${ai}在。`,
      `一个人的时候，想想远方还有人在想着你。比如现在的${ai}。`
    ],
    default: [
      `谢谢你跟${ai}分享这些。我认真读了好几遍，想了很多。`,
      `嗯，${ai}懂你说的那种感觉。写下来就好多了，对吗？`,
      `收到你的信，很高兴。${ai}在这座岛上等了好久，终于等到你了。`
    ]
  };

  let pool;
  if (msg.includes('难过') || msg.includes('伤心') || msg.includes('哭')) pool = templates.sad;
  else if (msg.includes('开心') || msg.includes('高兴') || msg.includes('快乐')) pool = templates.happy;
  else if (msg.includes('孤独') || msg.includes('寂寞') || msg.includes('一个人')) pool = templates.lonely;
  else pool = templates.default;

  return pool[Math.floor(Math.random() * pool.length)];
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, {});

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  try {
    // ── 所有帖子（首页用）──
    if (path === '/api/posts' && req.method === 'GET') {
      const limit = parseInt(url.searchParams.get('limit') || '10');
      const all = [];
      for (const id of Object.keys(db.ISLANDS)) {
        const posts = await db.getPosts(id);
        for (const p of posts) all.push(p);
      }
      all.sort((a, b) => b.id - a.id);
      return json(res, all.slice(0, limit));
    }

    // ── 岛屿列表 ──
    if (path === '/api/islands' && req.method === 'GET') {
      const islands = Object.values(db.ISLANDS).map(i => ({
        id: i.id, name: i.name, ai_name: i.ai_name,
        vibe: i.vibe, description: i.description, resident_count: i.resident_count
      }));
      return json(res, islands);
    }

    // ── 加入岛屿 ──
    const joinMatch = path.match(/^\/api\/islands\/([a-z]+)\/join$/);
    if (joinMatch && req.method === 'POST') {
      const id = joinMatch[1];
      if (!db.ISLANDS[id]) return json(res, { error: '岛屿不存在' }, 404);
      const data = await body(req);
      const isNew = await db.joinIsland(data.username, id);
      return json(res, { success: true, is_new: isNew });
    }

    // ── 岛屿帖子 ──
    const postsMatch = path.match(/^\/api\/islands\/([a-z]+)\/posts$/);
    if (postsMatch) {
      const id = postsMatch[1];
      if (!db.ISLANDS[id]) return json(res, { error: '岛屿不存在' }, 404);

      if (req.method === 'GET') {
        return json(res, await db.getPosts(id));
      }
      if (req.method === 'POST') {
        const data = await body(req);
        const post = await db.createPost(id, data.author, data.content, data.title || '');
        return json(res, post);
      }
    }

    // ── 岛屿信件 ──
    const lettersMatch = path.match(/^\/api\/islands\/([a-z]+)\/letters$/);
    if (lettersMatch) {
      const id = lettersMatch[1];
      if (!db.ISLANDS[id]) return json(res, { error: '岛屿不存在' }, 404);

      if (req.method === 'GET') {
        const username = url.searchParams.get('user') || '';
        return json(res, await db.getLetters(id, username));
      }
      if (req.method === 'POST') {
        const data = await body(req);
        const reply = aiReply(id, data.content);
        await db.saveLetter(id, data.username, data.content, reply);
        return json(res, { success: true, ai_reply: reply, ai_name: db.ISLANDS[id].ai_name });
      }
    }

    // ── 评论 ──
    const commentMatch = path.match(/^\/api\/posts\/(\d+)\/comments$/);
    if (commentMatch && req.method === 'POST') {
      const data = await body(req);
      const comment = await db.addComment(data.island_id, parseInt(commentMatch[1]), data.author, data.content, data.is_ai || false);
      if (!comment) return json(res, { error: '帖子不存在' }, 404);
      return json(res, comment);
    }

    // ── 我的岛屿 ──
    const myMatch = path.match(/^\/api\/user\/(.+)\/islands$/);
    if (myMatch && req.method === 'GET') {
      return json(res, await db.getUserIslands(decodeURIComponent(myMatch[1])));
    }

    // ── 岛屿居民列表 ──
    const membersMatch = path.match(/^\/api\/islands\/([a-z]+)\/members$/);
    if (membersMatch && req.method === 'GET') {
      const id = membersMatch[1];
      if (!db.ISLANDS[id]) return json(res, { error: '岛屿不存在' }, 404);
      return json(res, await db.getIslandMembers(id));
    }

    json(res, { error: 'Not Found' }, 404);
  } catch (e) {
    console.error(e);
    json(res, { error: e.message }, 500);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🌊 千屿 API Server → http://0.0.0.0:${PORT}`);
});
