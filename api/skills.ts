import {
  NowRequest,
  NowResponse,
} from '@vercel/node';
import { renderToString } from 'react-dom/server';

import { Skills } from '../src/components/skills/Skills';

const SKILLS = [
  'vue',
  'react',
  'sass',
  'typescript',
  'nuxt',
  'node',
  'mongodb',
  'csharp',
  'python',
  'java',
  'c',
  'cplusplus',
  'git',
  'html',
  'javascript',
  'css',
];

/**
 * Returns an image displaying icons of skills and languages
 *
 * @param {NowRequest} req
 * @param {NowResponse} res
 */
export default async function (req: NowRequest, res: NowResponse) {
  // Hey! I'm returning an image!
  res.setHeader(
    'Content-Type',
    'image/svg+xml',
  );
  res.setHeader(
    'Cache-Control',
    's-maxage=1, stale-while-revalidate',
  );
  
  // Generating the component and rendering it
  const text: string = renderToString(
    Skills({ skills: SKILLS }),
  );

  return res.send(text);
}
