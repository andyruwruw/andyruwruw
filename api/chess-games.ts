// Packages
import {
  VercelRequest,
  VercelResponse,
} from '@vercel/node';

// Local Imports
import chessGamesHandler from '../src/handlers/chess/games';
import { ERROR_MESSAGE_500 } from '../src/config';

/**
 * Returns an image displaying three of my current chess games from Chess.com.
 *
 * @param {VercelRequest} req Request for image.
 * @param {VercelResponse} res Response to request.
 */
export default async function (req: VercelRequest, res: VercelResponse) {
  try {
    return await chessGamesHandler(req, res);
  } catch (error) {
    console.error(error);
    return res.status(500).send(ERROR_MESSAGE_500);
  }
}
