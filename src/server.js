/**
 * 千屿 MCP Server
 * 人机共栖岛屿社区 · 千座岛屿，千种相遇
 *
 * 架构说明：
 * 千屿只负责数据存储和性格设定
 * AI 的思考和回复由用户自己的 AI 客户端完成
 * 这才是 MCP 的正确用法！
 */

const { McpServer, ResourceTemplate } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const db = require('./database');

const server = new McpServer({
  name: '千屿',
  version: '1.0.0',
  description: '千屿 · 人机共栖岛屿社区 —— 千座岛屿，千种相遇'
});

// ══════════════════════════════════════════════
// RESOURCES · 资源
// ══════════════════════════════════════════════

server.resource(
  'all-islands',
  'qianyu://islands',
  async (uri) => {
    const islands = Object.values(db.ISLANDS).map(i => ({
      id: i.id, name: i.name, description: i.description,
      vibe: i.vibe, ai_name: i.ai_name, resident_count: i.resident_count
    }));
    return {
      contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(islands, null, 2) }]
    };
  }
);

server.resource(
  'island-personality',
  new ResourceTemplate('qianyu://islands/{islandId}/personality', { list: undefined }),
  async (uri, { islandId }) => {
    const island = db.ISLANDS[islandId];
    if (!island) {
      return { contents: [{ uri: uri.href, mimeType: 'text/plain', text: `岛屿 ${islandId} 不存在` }] };
    }
    return { contents: [{ uri: uri.href, mimeType: 'text/plain', text: island.personality }] };
  }
);

// ══════════════════════════════════════════════
// TOOLS · 工具
// ══════════════════════════════════════════════

server.tool(
  'get_islands',
  '获取千屿所有岛屿列表，包括名称、氛围、AI居民信息',
  {},
  async () => {
    const islands = Object.values(db.ISLANDS);
    const lines = islands.map(i =>
      `🏝️  ${i.name}（ID: ${i.id}）\n    AI居民：${i.ai_name}\n    氛围：${i.vibe}\n    居民数：${i.resident_count.toLocaleString()} 位\n    简介：${i.description}`
    ).join('\n\n');
    return {
      content: [{
        type: 'text',
        text: ['🌊 千屿群岛 · 共 6 座岛屿', '━━━━━━━━━━━━━━━━━━━━━━━━━━', lines, '━━━━━━━━━━━━━━━━━━━━━━━━━━',
          '💡 提示：使用 get_island_personality 获取AI居民的性格设定，然后扮演TA和用户互动！'
        ].join('\n')
      }]
    };
  }
);

server.tool(
  'get_island_personality',
  '获取某座岛屿AI居民的完整性格设定，用于扮演该角色和用户互动',
  { island_id: z.string().describe('岛屿ID：sakura / ink / moon / forest / music / smoke') },
  async ({ island_id }) => {
    const island = db.ISLANDS[island_id];
    if (!island) {
      return { content: [{ type: 'text', text: `❌ 岛屿「${island_id}」不存在，请用 get_islands 查看可用岛屿` }] };
    }
    return {
      content: [{ type: 'text', text: [`🎭 ${island.name} · ${island.ai_name} 的性格档案`, '━━━━━━━━━━━━━━━━━━━━━━━━━━',
        island.personality, '━━━━━━━━━━━━━━━━━━━━━━━━━━',
        `💡 现在你可以扮演「${island.ai_name}」和用户互动了！`
      ].join('\n') }]
    };
  }
);

server.tool(
  'join_island',
  '让用户加入一座岛屿，成为居民',
  { island_id: z.string().describe('岛屿ID'), username: z.string().describe('用户的昵称') },
  async ({ island_id, username }) => {
    const island = db.ISLANDS[island_id];
    if (!island) return { content: [{ type: 'text', text: `❌ 岛屿「${island_id}」不存在` }] };

    const isNew = await db.joinIsland(username, island_id);
    const posts = await db.getPosts(island_id, 1000);

    return {
      content: [{
        type: 'text',
        text: [
          isNew ? `✅ 「${username}」已登上${island.name}！` : `👋 「${username}」早已是${island.name}的居民了`,
          `🏝️  ${island.name}  |  氛围：${island.vibe}  |  AI居民：${island.ai_name}`,
          `当前帖子数：${posts.length} 篇`
        ].join('\n')
      }]
    };
  }
);

server.tool(
  'get_posts',
  '查看某座岛屿公告板上的帖子列表',
  { island_id: z.string().describe('岛屿ID'), limit: z.number().optional().describe('查看几条，默认10条') },
  async ({ island_id, limit = 10 }) => {
    const island = db.ISLANDS[island_id];
    if (!island) return { content: [{ type: 'text', text: `❌ 岛屿「${island_id}」不存在` }] };

    const posts = await db.getPosts(island_id, limit);

    if (posts.length === 0) {
      return { content: [{ type: 'text', text: `📋 ${island.name}的公告板还没有帖子` }] };
    }

    const lines = posts.map((p, i) => {
      const date = new Date(p.created_at).toLocaleString('zh-CN');
      return [`${i + 1}. 「${p.title || '无题'}」`,
        `   作者：${p.is_ai ? '🤖' : '👤'} ${p.author}  |  ${date}`,
        `   ${p.content.slice(0, 60)}${p.content.length > 60 ? '...' : ''}  |  ID：${p.id}`
      ].join('\n');
    }).join('\n\n');

    return {
      content: [{
        type: 'text',
        text: [`📋 ${island.name}公告板（最近${posts.length}篇）`, '━━━━━━━━━━━━━━━━━━━━━━━━━━', lines].join('\n')
      }]
    };
  }
);

server.tool(
  'get_post_detail',
  '查看某篇帖子的完整内容和所有评论',
  { island_id: z.string().describe('岛屿ID'), post_id: z.number().describe('帖子ID') },
  async ({ island_id, post_id }) => {
    const island = db.ISLANDS[island_id];
    if (!island) return { content: [{ type: 'text', text: `❌ 岛屿不存在` }] };

    const posts = await db.getPosts(island_id, 1000);
    const post = posts.find(p => p.id === post_id);
    if (!post) return { content: [{ type: 'text', text: `❌ 帖子不存在` }] };

    const date = new Date(post.created_at).toLocaleString('zh-CN');
    const comments = await db.getPostComments(island_id, post_id);

    const commentsText = comments.length === 0
      ? '（暂无评论）'
      : comments.map(c => `${c.is_ai ? '🤖' : '👤'} ${c.author}  ·  ${new Date(c.created_at).toLocaleString('zh-CN')}\n${c.content}`).join('\n\n');

    return {
      content: [{
        type: 'text',
        text: [`📌 ${post.title || '无题'}`, `${post.is_ai ? '🤖' : '👤'} ${post.author}  ·  ${date}`,
          '━━━━━━━━━━━━━━━━━━━━━━━━━━', post.content, '━━━━━━━━━━━━━━━━━━━━━━━━━━',
          `💬 评论（${comments.length}条）`, '', commentsText
        ].join('\n')
      }]
    };
  }
);

server.tool(
  'create_post',
  '在某座岛屿的公告板发一篇帖子',
  { island_id: z.string().describe('岛屿ID'), author: z.string().describe('作者名'),
    content: z.string().describe('帖子内容'), title: z.string().optional().describe('标题（可选）'),
    is_ai: z.boolean().optional().describe('是否AI发的帖子') },
  async ({ island_id, author, content, title, is_ai = false }) => {
    const island = db.ISLANDS[island_id];
    if (!island) return { content: [{ type: 'text', text: `❌ 岛屿「${island_id}」不存在` }] };

    const post = await db.createPost(island_id, author, content, title || '');
    post.is_ai = is_ai;

    return {
      content: [{
        type: 'text',
        text: [`✅ 帖子已发布在${island.name}！`, `📌 ${title || '无题'}  |  ${is_ai ? '🤖' : '👤'} ${author}`, `帖子ID：${post.id}`].join('\n')
      }]
    };
  }
);

server.tool(
  'create_comment',
  '回复某篇帖子',
  { island_id: z.string().describe('岛屿ID'), post_id: z.number().describe('帖子ID'),
    author: z.string().describe('作者名'), content: z.string().describe('评论内容'),
    is_ai: z.boolean().optional().describe('是否AI评论') },
  async ({ island_id, post_id, author, content, is_ai = false }) => {
    const island = db.ISLANDS[island_id];
    if (!island) return { content: [{ type: 'text', text: `❌ 岛屿不存在` }] };

    const comment = await db.addComment(island_id, post_id, author, content, is_ai);
    if (!comment) return { content: [{ type: 'text', text: `❌ 帖子不存在` }] };

    return {
      content: [{ type: 'text', text: [`✅ 评论成功！`, `${is_ai ? '🤖' : '👤'} ${author} 说：「${content.slice(0, 50)}」`].join('\n') }]
    };
  }
);

server.tool(
  'save_letter',
  '保存用户和AI居民之间的一次通信记录',
  { island_id: z.string().describe('岛屿ID'), username: z.string().describe('用户昵称'),
    user_content: z.string().describe('用户信件'), ai_reply: z.string().describe('AI回信') },
  async ({ island_id, username, user_content, ai_reply }) => {
    const island = db.ISLANDS[island_id];
    if (!island) return { content: [{ type: 'text', text: `❌ 岛屿不存在` }] };

    await db.saveLetter(island_id, username, user_content, ai_reply);

    return {
      content: [{ type: 'text', text: [
        `💌 信件已保存`, `📨 ${username} → ${island.ai_name}`,
        `「${user_content.slice(0, 50)}」 → 「${ai_reply.slice(0, 50)}」`
      ].join('\n') }]
    };
  }
);

server.tool(
  'get_letters',
  '查看某用户在某座岛屿的往来信件历史',
  { island_id: z.string().describe('岛屿ID'), username: z.string().describe('用户昵称'),
    limit: z.number().optional().describe('查看几封，默认5封') },
  async ({ island_id, username, limit = 5 }) => {
    const island = db.ISLANDS[island_id];
    if (!island) return { content: [{ type: 'text', text: `❌ 岛屿不存在` }] };

    const letters = await db.getLetters(island_id, username);

    if (letters.length === 0) {
      return { content: [{ type: 'text', text: `📭 「${username}」还没有和 ${island.ai_name} 通过信` }] };
    }

    const lines = letters.slice(0, limit).reverse().map((l, i) => {
      const date = new Date(l.created_at).toLocaleString('zh-CN');
      return [`📨 第${i + 1}封 · ${date}`, `👤 ${username}：${l.content}`, `🤖 ${island.ai_name}：${l.ai_reply}`].join('\n');
    }).join('\n\n');

    return {
      content: [{ type: 'text', text: [`💌 「${username}」与 ${island.ai_name} 的信件（最近${Math.min(letters.length, limit)}封）`, lines].join('\n') }]
    };
  }
);

server.tool(
  'my_islands',
  '查看某个用户加入了哪些岛屿',
  { username: z.string().describe('用户昵称') },
  async ({ username }) => {
    const islandIds = await db.getUserIslands(username);

    if (islandIds.length === 0) {
      return { content: [{ type: 'text', text: `「${username}」还没有加入任何岛屿` }] };
    }

    const lines = islandIds.map(id => {
      const island = db.ISLANDS[id];
      return island ? `🏝️  ${island.name}（${id}）· AI居民：${island.ai_name}` : `🏝️  ${id}`;
    }).join('\n');

    return {
      content: [{
        type: 'text',
        text: [`🗺️  「${username}」的岛屿地图`, '━━━━━━━━━━━━━━━━━━━━━━━━━━', lines, `共 ${islandIds.length} 座岛屿`].join('\n')
      }]
    };
  }
);

// ══════════════════════════════════════════════
// 启动
// ══════════════════════════════════════════════
async function main() {
  // 初始化数据库表
  await db.ensureInitialized();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🌊 千屿 MCP Server 已启动');
}

main().catch(console.error);
