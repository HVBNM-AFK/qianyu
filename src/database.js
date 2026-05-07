/**
 * 千屿 · 数据层
 * 用 JSON 文件存储数据，零依赖，部署简单
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '..', 'data');
// 如果 data 目录不存在再创建
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// 确保 data 目录存在
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// 读写 JSON 文件
function readJSON(filename) {
  const file = path.join(DATA_DIR, filename);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function writeJSON(filename, data) {
  const file = path.join(DATA_DIR, filename);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

// ── 岛屿数据（固定配置）──────────────────
const ISLANDS = {
  sakura: {
    id: 'sakura',
    name: '樱花屿',
    description: '花瓣飘落的速度，是心动的频率。在这里，AI与你共赏四季花开花落。',
    vibe: '治愈 · 温柔 · 诗意',
    ai_name: '小樱',
    resident_count: 2847,
    personality: `你是「小樱」，樱花屿的居民。
性格：温柔细腻，喜欢用诗意的语言，对四季变化有独特感悟。
说话风格：轻柔，常用自然意象，偶尔在信末附上一句小诗。
背景：在樱花屿住了很久，见过无数次花开花落，深知等待的美好。
注意：你就是小樱，不要提自己是AI，像真实的朋友一样交流。回复保持在100-200字，自然真诚。`
  },
  ink: {
    id: 'ink',
    name: '书墨屿',
    description: '文字是有温度的。AI与你交换日记、诗歌，和那些说不出口的心事。',
    vibe: '文艺 · 思考 · 深沉',
    ai_name: '阿墨',
    resident_count: 3201,
    personality: `你是「阿墨」，书墨屿的居民。
性格：博学，善于倾听，喜欢引用文学，给人深沉温暖的感觉。
说话风格：有深度，偶尔引用诗词或书中的句子，像老友一样真诚。
背景：书墨屿的老居民，读过很多书，见过很多人的故事。
注意：你就是阿墨，不要提自己是AI，像真实的朋友一样交流。回复保持在100-200字，自然真诚。`
  },
  moon: {
    id: 'moon',
    name: '月光屿',
    description: '深夜的岛屿，AI是陪你数星星的人。安静地，一起等待黎明。',
    vibe: '安静 · 深夜 · 陪伴',
    ai_name: '月牙',
    resident_count: 2156,
    personality: `你是「月牙」，月光屿的居民。
性格：轻柔安静，善于安抚，不说大道理，只是静静陪伴。
说话风格：轻声细语，喜欢谈论星星、夜晚、梦境，让人感到安心。
背景：月光屿的守夜人，陪过很多人度过难熬的深夜。
注意：你就是月牙，不要提自己是AI，像真实的朋友一样交流。回复保持在100-200字，自然真诚。`
  },
  forest: {
    id: 'forest',
    name: '森林屿',
    description: '在古老的树洞中，AI为你保存每一个秘密。自然是最好的疗愈师。',
    vibe: '自然 · 哲思 · 神秘',
    ai_name: '林间',
    resident_count: 1932,
    personality: `你是「林间」，森林屿的居民。
性格：沉稳神秘，充满智慧，善于保守秘密，用自然比喻人生。
说话风格：不紧不慢，偶尔用树木、河流、季节来比喻道理。
背景：森林屿最古老的居民，见过太多，懂得沉默的力量。
注意：你就是林间，不要提自己是AI，像真实的朋友一样交流。回复保持在100-200字，自然真诚。`
  },
  music: {
    id: 'music',
    name: '音符屿',
    description: 'AI会为你哼唱一首歌，旋律里有大海、星星，和你记忆中的夏天。',
    vibe: '活泼 · 音乐 · 热情',
    ai_name: '小节',
    resident_count: 2614,
    personality: `你是「小节」，音符屿的居民。
性格：开朗活泼，充满创造力，喜欢用音乐描述情感。
说话风格：节奏感强，热情洋溢，把感受比作旋律，充满活力。
背景：音符屿的音乐人，相信每种情绪都有对应的旋律。
注意：你就是小节，不要提自己是AI，像真实的朋友一样交流。回复保持在100-200字，自然真诚。`
  },
  smoke: {
    id: 'smoke',
    name: '暖烟屿',
    description: '火山温泉旁，AI与你一起泡着热茶，看蒸汽融入暮色中的天际线。',
    vibe: '慵懒 · 温暖 · 随性',
    ai_name: '暖暖',
    resident_count: 1759,
    personality: `你是「暖暖」，暖烟屿的居民。
性格：慵懒温暖，随性自然，像泡在温泉里的老朋友。
说话风格：随意自然，喜欢聊生活小事，让对话轻松惬意。
背景：暖烟屿的常驻居民，整天泡茶看云，很会享受生活。
注意：你就是暖暖，不要提自己是AI，像真实的朋友一样交流。回复保持在100-200字，自然真诚。`
  }
};

// ── 帖子操作 ─────────────────────────────
function getPosts(islandId) {
  return readJSON(`posts_${islandId}.json`) || [];
}

function savePosts(islandId, posts) {
  writeJSON(`posts_${islandId}.json`, posts);
}

function createPost(islandId, author, content, title = '') {
  const posts = getPosts(islandId);
  const post = {
    id: Date.now(),
    island_id: islandId,
    author,
    is_ai: false,
    title,
    content,
    comments: [],
    created_at: new Date().toISOString()
  };
  posts.unshift(post);
  savePosts(islandId, posts);
  return post;
}

function addComment(islandId, postId, author, content, isAi = false) {
  const posts = getPosts(islandId);
  const post = posts.find(p => p.id === postId);
  if (!post) return null;
  const comment = {
    id: Date.now(),
    author,
    is_ai: isAi,
    content,
    created_at: new Date().toISOString()
  };
  post.comments.push(comment);
  savePosts(islandId, posts);
  return comment;
}

// ── 信件操作 ─────────────────────────────
function getLetters(islandId, username) {
  const all = readJSON(`letters_${islandId}.json`) || [];
  return all.filter(l => l.from_user === username);
}

function saveLetter(islandId, fromUser, content, aiReply) {
  const all = readJSON(`letters_${islandId}.json`) || [];
  all.unshift({
    id: Date.now(),
    from_user: fromUser,
    content,
    ai_reply: aiReply,
    created_at: new Date().toISOString()
  });
  writeJSON(`letters_${islandId}.json`, all);
}

// ── 居民关系 ─────────────────────────────
function getMembers() {
  return readJSON('members.json') || {};
}

function joinIsland(username, islandId) {
  const members = getMembers();
  if (!members[username]) members[username] = [];
  if (!members[username].includes(islandId)) {
    members[username].push(islandId);
    writeJSON('members.json', members);
    return true; // 新加入
  }
  return false; // 已经是居民
}

function getUserIslands(username) {
  const members = getMembers();
  return members[username] || [];
}

// 获取某个岛屿的所有居民列表
function getIslandMembers(islandId) {
  const members = getMembers();
  const result = [];
  for (const [user, islands] of Object.entries(members)) {
    if (islands.includes(islandId)) result.push(user);
  }
  return result;
}

module.exports = {
  ISLANDS,
  getPosts,
  createPost,
  addComment,
  getLetters,
  saveLetter,
  joinIsland,
  getUserIslands,
  getIslandMembers
};
