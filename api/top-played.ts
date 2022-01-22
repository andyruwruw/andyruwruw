import {
  VercelRequest,
  VercelResponse,
} from '@vercel/node';

import spotifyTopPlayedHandler from '../../src/handlers/spotify/top-played';

/**
 * Returns an image displaying my top five played tracks for three various time ranges.
 *
 * @param {VercelRequest} req Request for image.
 * @param {VercelResponse} res Response to request.
 */
export default async function (req: VercelRequest, res: VercelResponse) {
  return await spotifyTopPlayedHandler(req, res);
}
