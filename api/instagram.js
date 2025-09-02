const { IgApiClient } = require('instagram-private-api');

export default async function handler(req, res) {
  const ig = new IgApiClient();
  ig.state.generateDevice(process.env.IG_USERNAME);

  try {
    // Login with your credentials
    await ig.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD);

    // Get your own account info
    const me = await ig.account.currentUser();
    if (!me) {
      return res.status(500).send('<p>Failed to fetch account info.</p>');
    }

    // Build a simple HTML response
    const html = `
      <html>
        <body style="font-family:sans-serif; margin:20px;">
          <h2>Your Instagram Stats</h2>
          <p><strong>Followers:</strong> ${me.follower_count || 0}</p>
          <p><strong>Following:</strong> ${me.following_count || 0}</p>
        </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);

  } catch (err) {
    console.error('Instagram API error:', err);
    res.status(500).send(`<p>Instagram API error: ${err?.message || 'Unknown error'}</p>`);
  }
}
