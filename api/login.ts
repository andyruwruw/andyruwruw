import {
  NowRequest,
  NowResponse,
} from '@vercel/node';
import querystring from 'querystring';
import opener from 'opener';

import { redirectURL } from '../src/config/index';
const {
  SPOTIFY_CLIENT_ID: client_id,
  STATE: state,
} = process.env;

export default async function (req: NowRequest, res: NowResponse) {
  const scopes = [
    'user-read-currently-playing',
    'user-top-read',
  ];

  const url = `https://accounts.spotify.com/authorize?${querystring.stringify({
    response_type: 'code',
    client_id,
    scope: scopes.join('%20'),
    redirect_uri: redirectURL,
    state,
    show_dialog: 'false',
  })}`;

  opener(url);
  return res.send(url);
};  