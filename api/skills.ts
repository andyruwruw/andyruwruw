import {
  VercelRequest,
  VercelResponse,
} from '@vercel/node';

import skillsHandler from '../src/handlers/general/skills';

/**
 * Returns an image displaying icons of skills and languages.
 *
 * @param {VercelRequest} req Request for image.
 * @param {VercelResponse} res Response to request.
 */
export default async function (req: VercelRequest, res: VercelResponse) {
  await skillsHandler(req, res);
}
