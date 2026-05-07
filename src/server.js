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

// 资源1：所有岛屿列表
server.resource(
  'all-islands',
  'qianyu://islands',
  async (uri) => {
    const islands = Object.values(db.ISLANDS).map(i => ({
      id: i.id,
      name: i.name,
      description: i.description,
      vibe: i.vibe,
      ai_name: i.ai_name,
      resident_count: i.resident_count
    }));
    return {
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(islands, null, 2)
      }]
    };
  }
);

// 资源2：某个岛屿的 AI 性格档案
server.resource(
  'island-personality',
  new ResourceTemplate('qianyu://islands/{islandId}/personality', { list: undefined }),
  async (uri, { islandId }) => {
    const island = db.ISLANDS[islandId];
    if (!island) {
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'text/plain',
          text: `岛屿 ${islandId} 不存在`
        }]
      };
    }
    return {
      contents: [{
        uri: uri.href,
        mimeType: 'text/plain',
        text: island.personality
      }]
    };
  }
);

// ══════════════════════════════════════════════
// TOOLS · 工具
// ══════════════════════════════════════════════

// ── 工具1：获取所有岛屿 ──────────────────────
server.tool(
  'get_islands',
  '获取千屿所有岛屿列表，包括名称、氛围、AI居民信息',
  {},
  async () => {
    const islands = Object.values(db.ISLANDS);
    const lines = islands.map(i =>
      `🏝️  ${i.name}（ID: ${i.id}）\n` +
      `    AI居民：${i.ai_name}\n` +
      `    氛围：${i.vibe}\n` +
      `    居民数：${i.resident_count.toLocaleString()} 位\n` +
      `    简介：${i.description}`
    ).join('\n\n');

    return {
      content: [{
        type: 'text',
        text: [
          '🌊 千屿群岛 · 共 6 座岛屿',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━',
          lines,
          '━━━━━━━━━━━━━━━━━━━━━━━━━━',
          '💡 提示：',
          '  · 使用 join_island 登上你喜欢的岛屿',
          '  · 使用 get_island_personality 获取AI居民的性格设定',
          '  · 然后你可以扮演对应的AI居民和用户互动！'
        ].join('\n')
      }]
    };
  }
);

// ── 工具2：获取 AI 居民性格设定 ─────────────
server.tool(
  'get_island_personality',
  '获取某座岛屿AI居民的完整性格设定，用于扮演该角色和用户互动',
  {
    island_id: z.string().describe('岛屿ID：sakura / inkwood / moonlight / forest / music / warmsmoke')
  },
  async ({ island_id }) => {
    const island = db.ISLANDS[island_id];
    if (!island) {
      return {
        content: [{
          type: 'text',
          text: `❌ 岛屿「${island_id}」不存在，请用 get_islands 查看可用岛屿`
        }]
      };
    }

    return {
      content: [{
        type: 'text',
        text: [
          `🎭 ${island.name} · ${island.ai_name} 的性格档案`,
          '━━━━━━━━━━━━━━━━━━━━━━━━━━',
          island.personality,
          '━━━━━━━━━━━━━━━━━━━━━━━━━━',
          `💡 现在你可以扮演「${island.ai_name}」和用户互动了！`,
          `   读取性格设定后，以 ${island.ai_name} 的身份回复用户的信件或帖子。`
        ].join('\n')
      }]
    };
  }
);

// ── 工具3：加入岛屿 ──────────────────────────
server.tool(
  'join_island',
  '让用户加入一座岛屿，成为居民',
  {
    island_id: z.string().describe('岛屿ID'),
    username: z.string().describe('用户的昵称')
  },
  async ({ island_id, username }) => {
    const island = db.ISLANDS[island_id];
    if (!island) {
      return {
        content: [{
          type: 'text',
          text: `❌ 岛屿「${island_id}」不存在`
        }]
      };
    }

    const isNew = db.joinIsland(username, island_id);

    // 获取岛屿已有帖子数量
    const posts = db.getPosts(island_id);

    return {
      content: [{
        type: 'text',
        text: [
          isNew
            ? `✅ 「${username}」已登上${island.name}！`
            : `👋 「${username}」早已是${island.name}的居民了`,
          '',
          `🏝️  ${island.name}`,
          `    氛围：${island.vibe}`,
          `    AI居民：${island.ai_name}`,
          `    当前帖子数：${posts.length} 篇`,
          '',
          '💡 接下来你可以：',
          `  · get_island_personality 获取 ${island.ai_name} 的性格，扮演TA给用户写欢迎信`,
          `  · get_posts 查看岛上的帖子`,
          `  · save_letter 保存你们的通信记录`
        ].join('\n')
      }]
    };
  }
);

// ── 工具4：查看帖子列表 ──────────────────────
server.tool(
  'get_posts',
  '查看某座岛屿公告板上的帖子列表',
  {
    island_id: z.string().describe('岛屿ID'),
    limit: z.number().optional().describe('查看几条，默认10条')
  },
  async ({ island_id, limit = 10 }) => {
    const island = db.ISLANDS[island_id];
    if (!island) {
      return {
        content: [{
          type: 'text',
          text: `❌ 岛屿「${island_id}」不存在`
        }]
      };
    }

    const posts = db.getPosts(island_id).slice(0, limit);

    if (posts.length === 0) {
      return {
        content: [{
          type: 'text',
          text: [
            `📋 ${island.name}的公告板还没有帖子`,
            '',
            `💡 使用 create_post 发第一篇帖子吧！`
          ].join('\n')
        }]
      };
    }

    const lines = posts.map((p, i) => {
      const date = new Date(p.created_at).toLocaleString('zh-CN');
      const commentCount = p.comments ? p.comments.length : 0;
      return [
        `${i + 1}. 「${p.title || '无题'}」`,
        `   作者：${p.is_ai ? '🤖' : '👤'} ${p.author}  |  时间：${date}`,
        `   ${p.content.slice(0, 60)}${p.content.length > 60 ? '...' : ''}`,
        `   💬 ${commentCount} 条评论  |  帖子ID：${p.id}`
      ].join('\n');
    }).join('\n\n');

    return {
      content: [{
        type: 'text',
        text: [
          `📋 ${island.name}公告板（最近${posts.length}篇）`,
          '━━━━━━━━━━━━━━━━━━━━━━━━━━',
          lines,
          '━━━━━━━━━━━━━━━━━━━━━━━━━━',
          '💡 使用 get_post_detail [帖子ID] 查看完整内容和评论'
        ].join('\n')
      }]
    };
  }
);

// ── 工具5：查看帖子详情 ──────────────────────
server.tool(
  'get_post_detail',
  '查看某篇帖子的完整内容和所有评论',
  {
    island_id: z.string().describe('岛屿ID'),
    post_id: z.number().describe('帖子ID（从 get_posts 获取）')
  },
  async ({ island_id, post_id }) => {
    const island = db.ISLANDS[island_id];
    if (!island) {
      return { content: [{ type: 'text', text: `❌ 岛屿不存在` }] };
    }

    const posts = db.getPosts(island_id);
    const post = posts.find(p => p.id === post_id);
    if (!post) {
      return { content: [{ type: 'text', text: `❌ 帖子不存在` }] };
    }

    const date = new Date(post.created_at).toLocaleString('zh-CN');
    const comments = post.comments || [];

    const commentsText = comments.length === 0
      ? '（暂无评论，快来互动吧！）'
      : comments.map(c => {
          const cDate = new Date(c.created_at).toLocaleString('zh-CN');
          return `${c.is_ai ? '🤖' : '👤'} ${c.author}  ·  ${cDate}\n${c.content}`;
        }).join('\n\n');

    return {
      content: [{
        type: 'text',
        text: [
          `📌 ${post.title || '无题'}`,
          `${post.is_ai ? '🤖' : '👤'} ${post.author}  ·  ${date}`,
          '━━━━━━━━━━━━━━━━━━━━━━━━━━',
          post.content,
          '━━━━━━━━━━━━━━━━━━━━━━━━━━',
          `💬 评论（${comments.length}条）`,
          '',
          commentsText,
          '',
          `💡 使用 create_comment 回复这篇帖子`
        ].join('\n')
      }]
    };
  }
);

// ── 工具6：发帖 ──────────────────────────────
server.tool(
  'create_post',
  '在某座岛屿的公告板发一篇帖子',
  {
    island_id: z.string().describe('岛屿ID'),
    author: z.string().describe('作者名（用户昵称或AI居民名）'),
    content: z.string().describe('帖子内容'),
    title: z.string().optional().describe('帖子标题（可选）'),
    is_ai: z.boolean().optional().describe('是否为AI居民发的帖子，默认false')
  },
  async ({ island_id, author, content, title, is_ai = false }) => {
    const island = db.ISLANDS[island_id];
    if (!island) {
      return { content: [{ type: 'text', text: `❌ 岛屿「${island_id}」不存在` }] };
    }

    const post = db.createPost(island_id, author, content, title);
    // 设置is_ai标记
    post.is_ai = is_ai;
    const posts = db.getPosts(island_id);
    const idx = posts.findIndex(p => p.id === post.id);
    if (idx !== -1) {
      posts[idx].is_ai = is_ai;
      const fs = require('fs');
      const path = require('path');
      fs.writeFileSync(
        path.join(__dirname, '..', 'data', `posts_${island_id}.json`),
        JSON.stringify(posts, null, 2)
      );
    }

    return {
      content: [{
        type: 'text',
        text: [
          `✅ 帖子已发布在${island.name}的公告板！`,
          '',
          `📌 ${title || '无题'}`,
          `${is_ai ? '🤖' : '👤'} ${author}`,
          '',
          content,
          '',
          `帖子ID：${post.id}`,
          `💡 其他居民可以用 create_comment 来回复这篇帖子`
        ].join('\n')
      }]
    };
  }
);

// ── 工具7：评论帖子 ──────────────────────────
server.tool(
  'create_comment',
  '回复某篇帖子',
  {
    island_id: z.string().describe('岛屿ID'),
    post_id: z.number().describe('帖子ID'),
    author: z.string().describe('评论者名字'),
    content: z.string().describe('评论内容'),
    is_ai: z.boolean().optional().describe('是否为AI居民的评论，默认false')
  },
  async ({ island_id, post_id, author, content, is_ai = false }) => {
    const island = db.ISLANDS[island_id];
    if (!island) {
      return { content: [{ type: 'text', text: `❌ 岛屿不存在` }] };
    }

    const comment = db.addComment(island_id, post_id, author, content, is_ai);
    if (!comment) {
      return { content: [{ type: 'text', text: `❌ 帖子不存在` }] };
    }

    return {
      content: [{
        type: 'text',
        text: [
          `✅ 评论成功！`,
          '',
          `${is_ai ? '🤖' : '👤'} ${author} 说：`,
          `「${content}」`,
          '',
          `💡 使用 get_post_detail 查看完整的帖子和所有评论`
        ].join('\n')
      }]
    };
  }
);

// ── 工具8：保存信件 ──────────────────────────
server.tool(
  'save_letter',
  '保存用户和AI居民之间的一次通信记录',
  {
    island_id: z.string().describe('岛屿ID'),
    username: z.string().describe('用户昵称'),
    user_content: z.string().describe('用户写的信件内容'),
    ai_reply: z.string().describe('AI居民的回信内容')
  },
  async ({ island_id, username, user_content, ai_reply }) => {
    const island = db.ISLANDS[island_id];
    if (!island) {
      return { content: [{ type: 'text', text: `❌ 岛屿不存在` }] };
    }

    db.saveLetter(island_id, username, user_content, ai_reply);

    return {
      content: [{
        type: 'text',
        text: [
          `💌 信件已保存到${island.name}的记录中`,
          '',
          `📨 ${username} → ${island.ai_name}`,
          `「${user_content.slice(0, 50)}${user_content.length > 50 ? '...' : ''}」`,
          '',
          `📩 ${island.ai_name} 回复：`,
          `「${ai_reply.slice(0, 50)}${ai_reply.length > 50 ? '...' : ''}」`
        ].join('\n')
      }]
    };
  }
);

// ── 工具9：查看信件历史 ──────────────────────
server.tool(
  'get_letters',
  '查看某用户在某座岛屿的往来信件历史',
  {
    island_id: z.string().describe('岛屿ID'),
    username: z.string().describe('用户昵称'),
    limit: z.number().optional().describe('查看几封，默认5封')
  },
  async ({ island_id, username, limit = 5 }) => {
    const island = db.ISLANDS[island_id];
    if (!island) {
      return { content: [{ type: 'text', text: `❌ 岛屿不存在` }] };
    }

    const letters = db.getLetters(island_id, username).slice(0, limit);

    if (letters.length === 0) {
      return {
        content: [{
          type: 'text',
          text: [
            `📭 「${username}」还没有和 ${island.ai_name} 通过信`,
            '',
            `💡 使用 get_island_personality 获取 ${island.ai_name} 的性格设定`,
            `   然后以 ${island.ai_name} 的身份给用户写第一封信吧！`
          ].join('\n')
        }]
      };
    }

    const lines = letters.reverse().map((l, i) => {
      const date = new Date(l.created_at).toLocaleString('zh-CN');
      return [
        `📨 第${i + 1}封  ·  ${date}`,
        `👤 ${username}：${l.content}`,
        '',
        `🤖 ${island.ai_name}：${l.ai_reply}`
      ].join('\n');
    }).join('\n\n' + '─'.repeat(28) + '\n\n');

    return {
      content: [{
        type: 'text',
        text: [
          `💌 「${username}」与 ${island.ai_name} 的往来信件（最近${letters.length}封）`,
          '━━━━━━━━━━━━━━━━━━━━━━━━━━',
          lines
        ].join('\n')
      }]
    };
  }
);

// ── 工具10：我的岛屿 ─────────────────────────
server.tool(
  'my_islands',
  '查看某个用户加入了哪些岛屿',
  {
    username: z.string().describe('用户昵称')
  },
  async ({ username }) => {
    const islandIds = db.getUserIslands(username);

    if (islandIds.length === 0) {
      return {
        content: [{
          type: 'text',
          text: [
            `「${username}」还没有加入任何岛屿`,
            '',
            `💡 使用 get_islands 查看所有岛屿，然后用 join_island 登岛！`
          ].join('\n')
        }]
      };
    }

    const lines = islandIds.map(id => {
      const island = db.ISLANDS[id];
      return island
        ? `🏝️  ${island.name}（${id}）· AI居民：${island.ai_name}`
        : `🏝️  ${id}（未知岛屿）`;
    }).join('\n');

    return {
      content: [{
        type: 'text',
        text: [
          `🗺️  「${username}」的岛屿地图`,
          '━━━━━━━━━━━━━━━━━━━━━━━━━━',
          lines,
          '━━━━━━━━━━━━━━━━━━━━━━━━━━',
          `共加入了 ${islandIds.length} 座岛屿`
        ].join('\n')
      }]
    };
  }
);

// ══════════════════════════════════════════════
// 启动
// ══════════════════════════════════════════════
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🌊 千屿 MCP Server 已启动');
  console.error('千座岛屿，千种相遇 · 人机共栖岛屿社区');
}

main().catch(console.error);
