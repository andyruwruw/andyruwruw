import {
  VercelRequest,
  VercelResponse,
} from '@vercel/node';

import spotifyNowPlayingHandler from '../src/handlers/spotify/now-playing';

/**
 * Returns an image displaying my current playback state, with nice music bars.
 *
 * @param {VercelRequest} req Request for image.
 * @param {VercelResponse} res Response to request.
 */
export default async function (req: VercelRequest, res: VercelResponse) {
  return await spotifyNowPlayingHandler(req, res);
}
