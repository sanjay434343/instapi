const { IgApiClient } = require('instagram-private-api');

export default async function handler(req, res) {
  const ig = new IgApiClient();
  ig.state.generateDevice(process.env.IG_USERNAME);

  try {
    // Try login
    await ig.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD);

    // If login succeeds
    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <html>
        <body style="font-family:sans-serif; margin:20px;">
          <h2>Instagram Login Status</h2>
          <p style="color:green; font-weight:bold;">Logged in ✅</p>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('Login failed:', err);

    // If login fails
    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <html>
        <body style="font-family:sans-serif; margin:20px;">
          <h2>Instagram Login Status</h2>
          <p style="color:red; font-weight:bold;">Login failed ❌</p>
        </body>
      </html>
    `);
  }
}
