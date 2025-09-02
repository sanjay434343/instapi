const { IgApiClient } = require('instagram-private-api');

export default async function handler(req, res) {
  const ig = new IgApiClient();
  ig.state.generateDevice(process.env.IG_USERNAME);

  if (!req.query.username) {
    // Simple HTML form
    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <html>
        <body style="font-family:sans-serif; display:flex; flex-direction:column; align-items:center; margin-top:50px;">
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
    const username = req.query.username;

    // Login
    await ig.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD);

    // Get user info
    const userId = await ig.user.getIdByUsername(username);
    const userInfo = await ig.user.info(userId);

    // Get latest posts
    const feed = ig.feed.user(userId);
    const items = await feed.items() || [];

    const posts = items.slice(0, 5).map(post => {
      const imageUrl = post?.image_versions2?.candidates?.[0]?.url;
      if (!imageUrl) return null; // skip if no image
      return {
        caption: post?.caption?.text || '',
        imageUrl
      };
    }).filter(Boolean); // remove nulls

    // Send simple HTML response
    res.setHeader('Content-Type', 'text/html');
    let html = `
      <html>
        <body style="font-family:sans-serif; margin:20px;">
          <h2>Instagram Info for: ${username}</h2>
          <p>Full Name: ${userInfo.full_name || 'N/A'}</p>
          <p>Bio: ${userInfo.biography || 'N/A'}</p>
          <p>Followers: ${userInfo.follower_count || 0}</p>
          <p>Following: ${userInfo.following_count || 0}</p>

          <h3>Posts</h3>
    `;

    if (posts.length === 0) html += '<p>No posts available</p>';
    else {
      posts.forEach(p => {
        html += `<div><p>${p.caption}</p><img src="${p.imageUrl}" width="200"/></div>`;
      });
    }

    html += `<br><a href="/api/instagram">Search another user</a></body></html>`;

    res.send(html);

  } catch (err) {
    console.error(err);
    res.status(500).send(`<p>Error: ${err?.message || 'Unknown error'}</p><a href="/api/instagram">Go Back</a>`);
  }
}
