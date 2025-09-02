const { IgApiClient } = require('instagram-private-api');

export default async function handler(req, res) {
  const ig = new IgApiClient();
  ig.state.generateDevice(process.env.IG_USERNAME);

  try {
    // Try logging in
    const loginResult = await ig.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD);
    if (!loginResult) {
      return res.status(500).send('<p>Login failed. Check your IG_USERNAME and IG_PASSWORD environment variables.</p>');
    }

    // Get your own account info
    const me = await ig.account.currentUser();
    if (!me) {
      return res.status(500).send('<p>Failed to fetch your account info.</p>');
    }

    // Fetch latest posts safely
    const feed = ig.feed.user(me.pk);
    const items = await feed.items() || [];

    const posts = items.slice(0, 5).map(post => {
      const imageUrl = post?.image_versions2?.candidates?.[0]?.url;
      if (!imageUrl) return null;
      return {
        caption: post?.caption?.text || '',
        imageUrl
      };
    }).filter(Boolean);

    // Render HTML safely
    let html = `
      <html>
        <body style="font-family:sans-serif; margin:20px;">
          <h2>Your Instagram Info</h2>
          <p>Logged in as: ${me.username}</p>
          <p>Full Name: ${me.full_name || 'N/A'}</p>
          <p>Bio: ${me.biography || 'N/A'}</p>
          <p>Followers: ${me.follower_count || 0}</p>
          <p>Following: ${me.following_count || 0}</p>

          <h3>Latest Posts</h3>
    `;

    if (posts.length === 0) html += '<p>No posts available</p>';
    else {
      posts.forEach(p => {
        html += `<div style="margin-bottom:15px;"><p>${p.caption}</p><img src="${p.imageUrl}" width="200"/></div>`;
      });
    }

    html += `</body></html>`;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);

  } catch (err) {
    console.error('Instagram API error:', err);
    res.status(500).send(`<p>Instagram API error: ${err.message}</p>`);
  }
}
