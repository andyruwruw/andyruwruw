import fetch from 'isomorphic-unfetch';
import { stringify } from 'querystring';

// Secret secrets :)
const {
  SPOTIFY_CLIENT_ID: client_id,
  SPOTIFY_CLIENT_SECRET: client_secret,
  SPOTIFY_REFRESH_TOKEN: refresh_token,
} = process.env;

// Some request header stuff
const basic = Buffer.from(`${client_id}:${client_secret}`).toString('base64');
const Authorization = `Basic ${basic}`;

/**
 * Get Authorization Tokens
 * Uses my refresh token to get a brand new spotify auth token!
 * @returns {String} Authorization Header for Spotify Requests.
 */
async function getAuthorizationToken() {
  const url = new URL('https://accounts.spotify.com/api/token');
  const body = stringify({
    grant_type: 'refresh_token',
    refresh_token,
  });
  const response = await fetch(`${url}`, {
    method: 'POST',
    headers: {
      Authorization,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  }).then((r) => r.json());

  return `Bearer ${response.access_token}`;
}

/**
 * Retrieve Now Playing
 * Requests currently playing track from spotify.
 * @returns {Object} Currently Playing Spotify Object
 */
export async function nowPlaying() {
  const Authorization = await getAuthorizationToken();
  const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: {
      Authorization,
    },
  });
  const { status } = response;
  if (status === 204) {
    return {};
  } else if (status === 200) {
    const data = await response.json();
    data.Authorization = Authorization;
    return data;
  }
};

/**
 * Retrieve Audio Features
 * Requests a track's audio features from spotify
 * @returns {Object} Audio Features Object
 */
export async function trackAudioFeatures(id, Authorization) {
  const response = await fetch(`https://api.spotify.com/v1/audio-features/${id}`, {
    headers: {
      Authorization,
    },
  });
  const { status } = response;
  if (status === 204) {
    return {};
  } else if (status === 200) {
    const data = await response.json();
    return data;
  }
};

/**
 * Retrieve Top Played
 * Requests top played tracks from spotify.
 * @param {String} timeRange Spotify Param for top played time range
 * @returns {Array} Array of Spotify Track Objects
 */
export async function topPlayed(timeRange) {
  const Authorization = await getAuthorizationToken();
  const response = await fetch(`https://api.spotify.com/v1/me/top/tracks?limit=5&time_range=${timeRange}`, {
    headers: {
      Authorization,
    },
  });
  const { status } = response;
  if (status === 204) {
    return [];
  } else if (status === 200) {
    const data = await response.json();
    return data.items;
  }
};