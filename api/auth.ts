import { NowRequest, NowResponse } from '@vercel/node';
import axios from 'axios';
import querystring from 'querystring';

const {
  SPOTIFY_CLIENT_ID: client_id,
  SPOTIFY_CLIENT_SECRET: client_secret,
  STATE,
} = process.env;
import { redirectURL } from '../src/config/index';

export default async function (req: NowRequest, res: NowResponse) {
  const {
    code,
    state,
  } = req.query;

  if (code && state && state === STATE) {
    const url = 'https://accounts.spotify.com/api/token';
    const data = {
      code,
      redirect_uri: redirectURL,
      grant_type: 'authorization_code',
    };

    const options = {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${client_id}:${client_secret}`).toString('base64')}`,
      },
    };

    const response = await axios.post(
      url, 
      querystring.stringify(data),
      options,
    );

    return res.send({
      refresh_token: response.data.refresh_token,
      access_token: response.data.access_token,
    });
  }

  return res.send(false);
};
