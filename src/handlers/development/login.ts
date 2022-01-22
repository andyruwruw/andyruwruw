// Packages
import {
  VercelRequest,
  VercelResponse,
} from '@vercel/node';
import querystring from 'querystring';

// Local Imports
import {
  CALLBACK_URL,
  ERROR_MESSAGE_405,
  NODE_ENV,
  SPOTIFY_AUTHORIZATION_SCOPES,
  SPOTIFY_AUTHORIZE_URL,
  SPOTIFY_CLIENT_ID,
  STATE,
} from '../../config';

/**
 * Returns Spotify authorization link, for author during development only.
 *
 * @param {VercelRequest} req Request for login URL.
 * @param {VercelResponse} res Response to request.
 */
export default async function (req: VercelRequest, res: VercelResponse) {
  // Block when not in development environment.
  if (NODE_ENV !== 'development') {
    return res.status(405).send(ERROR_MESSAGE_405);
  }

  const RESPONESE_TYPE = 'code';

  // Generating the Authorization URL.
  const url = `${SPOTIFY_AUTHORIZE_URL}?${querystring.stringify({
    client_id: SPOTIFY_CLIENT_ID,
    redirect_uri: CALLBACK_URL,
    response_type: RESPONESE_TYPE,
    scope: SPOTIFY_AUTHORIZATION_SCOPES.join('%20'),
    show_dialog: 'false',
    state: STATE,
  })}`;

  // Redirect the request to the authorization URL.
  return res.redirect(url);
}
