const mongoose = require('mongoose');
const fs = require('node:fs');
const path = require('node:path');

// Read-only export. Never export users, contact messages, or authentication data.
async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/portfolio_db', { serverSelectionTimeoutMS: 5000 });
  const db = mongoose.connection.db;
  const user = await db.collection('users').findOne({ token: 'missou' });
  if (!user) throw new Error('Portfolio profile not found; existing snapshot preserved.');
  const clean = value => JSON.parse(JSON.stringify(value), (key, item) => ['_id', 'userId', '__v', 'createdAt', 'updatedAt'].includes(key) ? undefined : item);
  const data = { name: `${user.first_name} ${user.last_name}`, websites: clean(user.websites || []) };
  const collections = { sections: 'usersectioncontents', skills: 'userskills', experience: 'userexperiences', education: 'usereducations', features: 'userfeatures', projects: 'userprojects' };
  for (const [key, collection] of Object.entries(collections)) {
    data[key] = clean(await db.collection(collection).find({ userId: user._id }, { projection: { userId: 0 } }).toArray());
  }
  fs.mkdirSync(path.join(__dirname, '../src/data'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, '../src/data/portfolio.json'), JSON.stringify(data, null, 2) + '\n');
  console.log('Public portfolio snapshot saved:', Object.fromEntries(Object.entries(data).filter(([, value]) => Array.isArray(value)).map(([key, value]) => [key, value.length])));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
