// api/spotify.ts

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return Response.json({ playing: false, error: 'Spotify credentials not configured' });
  }

  // Step 1: Exchange refresh token for access token
  let accessToken: string;
  try {
    const credentials = btoa(`${clientId}:${clientSecret}`);
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('Spotify token exchange failed:', errText);
      return Response.json({ playing: false, error: 'Token exchange failed' });
    }

    const tokenData = await tokenRes.json() as { access_token?: string; error?: string };

    if (!tokenData.access_token) {
      console.error('Spotify token exchange returned no access_token:', tokenData);
      return Response.json({ playing: false, error: 'No access token returned' });
    }

    accessToken = tokenData.access_token;
  } catch (err) {
    console.error('Spotify token exchange error:', err);
    return Response.json({ playing: false, error: 'Token exchange request failed' });
  }

  // Step 2: Fetch currently playing track
  try {
    const nowPlayingRes = await fetch(
      'https://api.spotify.com/v1/me/player/currently-playing',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    // 204 = no active playback, 404 = no device found
    if (nowPlayingRes.status === 204 || nowPlayingRes.status === 404) {
      return Response.json({ playing: false });
    }

    if (!nowPlayingRes.ok) {
      console.error('Spotify currently-playing error:', nowPlayingRes.status);
      return Response.json({ playing: false, error: `Spotify API error: ${nowPlayingRes.status}` });
    }

    type SpotifyCurrentlyPlayingResponse = {
      is_playing: boolean;
      item: {
        name: string;
        artists: { name: string }[];
        album: {
          images: { url: string; width: number; height: number }[];
        };
        external_urls: { spotify: string };
      } | null;
    };

    const data = await nowPlayingRes.json() as SpotifyCurrentlyPlayingResponse;

    // item can be null if playing a podcast or if no track info available
    if (!data.item) {
      return Response.json({ playing: false });
    }

    return Response.json({
      playing: true,
      track: {
        name: data.item.name,
        artist: data.item.artists[0]?.name ?? 'Unknown Artist',
        albumArt: data.item.album.images[0]?.url ?? '',
        spotifyUrl: data.item.external_urls.spotify,
      },
    });
  } catch (err) {
    console.error('Spotify currently-playing fetch error:', err);
    return Response.json({ playing: false, error: 'Failed to fetch currently playing' });
  }
}