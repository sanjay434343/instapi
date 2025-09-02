const { IgApiClient } = require('instagram-private-api');

export default async function handler(req, res) {
  const ig = new IgApiClient();
  ig.state.generateDevice(process.env.IG_USERNAME);

  if (req.method === 'GET' && !req.query.username) {
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
    const targetUsername = req.query.username;

    if (!targetUsername) {
      return res.status(400).send('<p>Username is required</p><a href="/api/instagram">Go Back</a>');
    }

    await ig.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD);

    const userId = await ig.user.getIdByUsername(targetUsername);
    const targetUser = await ig.user.info(userId);

    // Posts
    let posts = [];
    try {
      const userFeed = ig.feed.user(userId);
      const postsItems = await userFeed.items() || [];
      posts = postsItems.slice(0, 5)
        .map(p => {
          const imageUrl = p?.image_versions2?.candidates?.[0]?.url;
          if (!imageUrl) return null;
          return { caption: p?.caption?.text || '', imageUrl };
        })
        .filter(Boolean);
    } catch { posts = []; }

    // Reels
    let reels = [];
    try {
      const reelsFeed = ig.feed.reelsMedia({ userIds: [userId] });
      const reelsItems = await reelsFeed.items() || [];
      reels = reelsItems.slice(0, 5)
        .map(r => {
          const videoUrl = r?.video_versions?.[0]?.url;
          if (!videoUrl) return null;
          return { takenAt: new Date(r.taken_at * 1000), videoUrl };
        })
        .filter(Boolean);
    } catch { reels = []; }

    // Stories
    let stories = [];
    try {
      const storiesItems = await ig.feed.userStory(userId).items() || [];
      stories = storiesItems.slice(0, 5)
        .map(s => {
          const imageUrl = s?.image_versions2?.candidates?.[0]?.url;
          const videoUrl = s?.video_versions?.[0]?.url;
          if (imageUrl) return { type: 'image', url: imageUrl };
          if (videoUrl) return { type: 'video', url: videoUrl };
          return null;
        })
        .filter(Boolean);
    } catch { stories = []; }

    // Render HTML safely
    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <html>
        <body style="font-family:sans-serif; margin:20px;">
          <h2>Instagram Info for: ${targetUsername}</h2>
          <p>Full Name: ${targetUser.full_name || 'N/A'}</p>
          <p>Bio: ${targetUser.biography || 'N/A'}</p>
          <p>Followers: ${targetUser.follower_count || 0}</p>
          <p>Following: ${targetUser.following_count || 0}</p>

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
    res.status(500).send(`<p>Error: ${err?.message || 'Unknown error'}</p><a href="/api/instagram">Go Back</a>`);
  }
}
