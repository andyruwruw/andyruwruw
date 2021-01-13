import {
  NowRequest,
  NowResponse,
} from '@vercel/node';
import querystring from 'querystring';

const redirectURL: string = 'http://localhost:3000/api/auth';

const {
  SPOTIFY_CLIENT_ID: client_id,
  STATE: state,
} = process.env;

/**
 * Returns Spotify authorization link, for repo owner only
 *
 * @param {NowRequest} req
 * @param {NowResponse} res
 */
export default async function (req: NowRequest, res: NowResponse) {
  const scopes: Array<string> = [
    'user-read-currently-playing',
    'user-top-read',
  ];

  const url: string = `https://accounts.spotify.com/authorize?${querystring.stringify({
    client_id,
    redirect_uri: redirectURL,
    response_type: 'code',
    scope: scopes.join('%20'),
    show_dialog: 'false',
    state,
  })}`;

  return res.send(url);
};
