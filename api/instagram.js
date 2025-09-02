const { IgApiClient } = require('instagram-private-api');

export default async function handler(req, res) {
  const ig = new IgApiClient();
  ig.state.generateDevice(process.env.IG_USERNAME);

  if (req.method === 'GET' && !req.query.username) {
    // Serve a small HTML UI for input
    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <html>
        <body style="font-family:sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; margin-top:50px;">
          <h2>Instagram User Info</h2>
          <form method="GET">
            <input name="username" placeholder="Enter Instagram username" required style="padding:8px; font-size:16px"/>
            <button type="submit" style="padding:8px 12px; font-size:16px; margin-left:5px;">Fetch</button>
          </form>
        </body>
      </html>
    `);
    return;
  }

  try {
    // Username from query
    const targetUsername = req.query.username;

    if (!targetUsername) {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Login
    await ig.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD);

    // Get user info
    const userId = await ig.user.getIdByUsername(targetUsername);
    const targetUser = await ig.user.info(userId);

    // Fetch latest posts safely
    const userFeed = ig.feed.user(userId);
    const postsItems = await userFeed.items();
    const posts = postsItems.slice(0, 5).map(p => {
      const imageUrl = p.image_versions2?.candidates?.[0]?.url;
      if (!imageUrl) return null;
      return {
        caption: p.caption?.text || '',
        imageUrl
      };
    }).filter(Boolean);

    // Fetch reels safely
    const reelsFeed = ig.feed.reelsMedia({ userIds: [userId] });
    const reelsItems = await reelsFeed.items();
    const reels = reelsItems.slice(0, 5).map(r => {
      const videoUrl = r.video_versions?.[0]?.url;
      if (!videoUrl) return null;
      return {
        takenAt: new Date(r.taken_at * 1000),
        videoUrl
      };
    }).filter(Boolean);

    // Fetch stories safely
    const storiesItems = await ig.feed.userStory(userId).items();
    const stories = storiesItems.slice(0, 5).map(s => {
      if (s.image_versions2?.candidates?.[0]?.url) return { type: 'image', url: s.image_versions2.candidates[0].url };
      if (s.video_versions?.[0]?.url) return { type: 'video', url: s.video_versions[0].url };
      return null;
    }).filter(Boolean);

    // Render results in HTML
    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <html>
        <body style="font-family:sans-serif; margin:20px;">
          <h2>Instagram Info for: ${targetUsername}</h2>
          <p>Full Name: ${targetUser.full_name}</p>
          <p>Bio: ${targetUser.biography}</p>
          <p>Followers: ${targetUser.follower_count}</p>
          <p>Following: ${targetUser.following_count}</p>

          <h3>Posts</h3>
          ${posts.length > 0 ? posts.map(p => `<div><p>${p.caption}</p><img src="${p.imageUrl}" width="200"/></div>`).join('') : '<p>No posts available</p>'}

          <h3>Reels</h3>
          ${reels.length > 0 ? reels.map(r => `<div><p>Uploaded at: ${r.takenAt}</p><video src="${r.videoUrl}" width="300" controls></video></div>`).join('') : '<p>No reels available</p>'}

          <h3>Stories</h3>
          ${stories.length > 0 ? stories.map(s => s.type === 'image' ? `<img src="${s.url}" width="150"/>` : `<video src="${s.url}" width="200" controls></video>`).join('') : '<p>No stories available</p>'}

          <br><a href="/api/instagram">Search another user</a>
        </body>
      </html>
    `);

  } catch (err) {
    console.error(err);
    res.status(500).send(`<p>Error: ${err.message}</p><a href="/api/instagram">Go Back</a>`);
  }
}
