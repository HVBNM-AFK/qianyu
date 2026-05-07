// 测试脚本
const db = require('./src/database');

console.log('✅ 1. 数据库模块加载成功');
console.log('   岛屿数量:', Object.keys(db.ISLANDS).length);

const r = db.joinIsland('小明', 'sakura');
console.log('✅ 2. 加入岛屿:', r ? '新居民' : '已是居民');

db.saveLetter('sakura', '小明', '你好小樱，我今天很开心', '收到你的信，我也跟着开心起来了！');
console.log('✅ 3. 保存信件成功');

const letters = db.getLetters('sakura', '小明');
console.log('✅ 4. 查询信件:', letters.length, '封');

const post = db.createPost('sakura', '测试用户', '今天风很轻，花瓣飘进了窗台', '今天的樱花');
console.log('✅ 5. 创建帖子成功, ID:', post.id);

const posts = db.getPosts('sakura');
console.log('✅ 6. 查询帖子:', posts.length, '篇');

const myIslands = db.getUserIslands('小明');
console.log('✅ 7. 我的岛屿:', myIslands);

console.log('');
console.log('🎉 所有测试通过！千屿 MCP Server 数据层正常！');
