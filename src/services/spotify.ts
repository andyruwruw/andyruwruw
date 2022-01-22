// Packages
import fetch from 'node-fetch';
import { stringify } from 'querystring';

// Local Imports
import {
  SPOTIFY_AUTHORIZATION,
  SPOTIFY_AUTHORIZATION_URL,
  SPOTIFY_CURRENT_PLAYING_URL,
  SPOTIFY_GET_TRACK_AUDIO_FEATURES_URL,
  SPOTIFY_GET_TRACK_URL,
  SPOTIFY_GET_TOP_PLAYED_URL,
  SPOTIFY_RECENTLY_PLAYED_URL,
  SPOTIFY_REFRESH_TOKEN,
} from '../config';
import { getImageData } from './general';

// Types
import {
  IAudioFeaturesResponse,
  IAuthorizationTokenResponse,
  IConvertedTrackObject,
  ICurrentlyPlayingResponse,
  ICursorBasedPagingObject,
  IPagingObject,
  IPlayHistoryObject,
  ITrackObject,
} from '../types/spotify';

let AuthorizationToken: null | string = null;

/**
 * Uses my refresh token to get a brand new spotify auth token!
 *
 * @returns {Promise<string>} Authorization header for Spotify requests.
 */
const getAuthorizationToken = async (): Promise<string> => {
  if (AuthorizationToken !== null) {
    return AuthorizationToken;
  }

  const GRANT_TYPE = 'refresh_token';
  const CONTENT_TYPE = 'application/x-www-form-urlencoded';

  const body: string = stringify({
    grant_type: GRANT_TYPE,
    refresh_token: SPOTIFY_REFRESH_TOKEN,
  });

  const response: IAuthorizationTokenResponse = await fetch(`${SPOTIFY_AUTHORIZATION_URL}`, {
    method: 'POST',
    headers: {
      'Authorization': SPOTIFY_AUTHORIZATION,
      'Content-Type': CONTENT_TYPE,
    },
    body,
  }).then((r) => r.json());

  AuthorizationToken = `Bearer ${response.access_token}`

  return AuthorizationToken;
}

/**
 * Generates a Currently Playing response for edge cases.
 *
 * @param {string} Authorization Authorization header for Spotify requests.
 * @param {ITrackObject | null} [track = null] Track object to use for response.
 * @returns {ICurrentlyPlayingResponse} Currently playing response.
 */
const defaultCurrentlyPlayingResponse = (Authorization: string, track: ITrackObject = null): ICurrentlyPlayingResponse => ({
  context: null,
  timestamp: 0,
  progress_ms: 0,
  is_playing: false,
  item: track,
  currently_playing_type: '',
  actions: {},
  Authorization,
});

/**
 * Requests currently playing track from Spotify.
 *
 * @returns {Promise<ICurrentlyPlayingResponse | object>} Currently Playing Spotify Object.
 */
export const getNowPlaying = async (): Promise<ICurrentlyPlayingResponse> => {
  const Authorization: string = await getAuthorizationToken();

  const response: Response = await fetch(SPOTIFY_CURRENT_PLAYING_URL, {
    headers: {
      Authorization,
    },
  });

  const { status } = response;

  if (status === 200) {
    const data: ICurrentlyPlayingResponse = await response.json();
    data.Authorization = Authorization;

    return data;
  } else {
    return defaultCurrentlyPlayingResponse(Authorization);
  }
};

/**
 * Requests last played track from Spotify
 *
 * @returns {Promise<ICursorBasedPagingObject | object>} Currently Playing Spotify Object
 */
export const getLastPlayed = async (): Promise<ICurrentlyPlayingResponse> => {
  const Authorization: string = await getAuthorizationToken();

  const response: Response = await fetch(SPOTIFY_RECENTLY_PLAYED_URL, {
    headers: {
      Authorization,
    },
  });

  const { status } = response;

  if (status === 200) {
    const data: ICursorBasedPagingObject<IPlayHistoryObject> = await response.json();

    const trackResponse: Response = await fetch(`${SPOTIFY_GET_TRACK_URL}/${ data.items[0].track.id }`, {
      headers: {
        Authorization,
      },
    });

    const track: ITrackObject = await trackResponse.json();

    return defaultCurrentlyPlayingResponse(Authorization, track);
  }
  return defaultCurrentlyPlayingResponse(Authorization);
};

/**
 * Requests a track's audio features from Spotify.
 *
 * @param {string} id Spotify track id.
 * @returns {Promise<IAudioFeaturesResponse | object>} Audio features object.
 */
export const getTracksAudioFeatures = async (id: string): Promise<IAudioFeaturesResponse | object> => {
  const Authorization: string = await getAuthorizationToken();

  const response: Response = await fetch(`${SPOTIFY_GET_TRACK_AUDIO_FEATURES_URL}/${id}`, {
    headers: {
      Authorization,
    },
  });

  const { status } = response;

  if (status === 200) {
    return await response.json();
  } else {
    return {};
  }
};

/**
 * Requests top played tracks from Spotify.
 *
 * @param {string} timeRange Spotify parameter for top played time range.
 * @returns {Promise<ITrackObject[]>} Array of Spotify track objects.
 */
export const getTopPlayed = async (timeRange: string): Promise<ITrackObject[]> => {
  const Authorization: string = await getAuthorizationToken();

  const response: Response = await fetch(`${SPOTIFY_GET_TOP_PLAYED_URL}${timeRange}`, {
    headers: {
      Authorization,
    },
  });

  const { status } = response;

  if (status === 200) {
    const data: IPagingObject<ITrackObject> = await response.json();
    return data.items;
  } else {
    return [];
  }
};

/**
 * Removes data and simplifies track object.
 *
 * @param {ITrackObject} track Track object to be converted.
 * @returns {Promise<IConvertedTrackObject>} Converted track object.
 */
export const convertTrackToMinimumData = async (track: ITrackObject): Promise<IConvertedTrackObject> => {
  let albumArtUrl = 'https://raw.githubusercontent.com/andyruwruw/andyruwruw/master/src/assets/images/default-album-art.png';
  if ('album' in track && 'images' in track.album && track.album.images.length) {
    albumArtUrl = track.album.images[0].url;
  }
  const image = await getImageData(albumArtUrl);

  let artist = 'Unknown Artist';
  if ('artists' in track && track.artists.length) {
    artist = track.artists.map((artist) => artist.name).join(', ');
  }

  let name = 'Unknown Track';
  if ('name' in track) {
    name = track.name;
  }

  let href = '#';
  if ('external_urls' in track && 'spotify' in track.external_urls) {
    href = track.external_urls.spotify;
  }

  return {
    image,
    artist,
    name,
    href,
  };
};
