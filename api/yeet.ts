import {
  VercelRequest,
  VercelResponse,
} from '@vercel/node';

const handler = async (req: VercelRequest, res: VercelResponse) => {
  try {
    console.log('i ran');
    return res.send('yeet');
  } catch (error) {
    console.log(error);
    return res.send('yeet 2');
  }
}

export default handler;
