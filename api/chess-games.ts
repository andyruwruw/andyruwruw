import { NowRequest, NowResponse } from '@vercel/node';
import { renderToString } from 'react-dom/server';
import { decode } from 'querystring';

import { CurrentGames } from '../components/chess/CurrentGames';
import { currentGames, convertFen } from '../services/chesscom';

export default async function (req: NowRequest, res: NowResponse) {
  const {
    games = [],
  } = await currentGames();

  console.log(games);

  games.length = Math.min(games.length, 3);
  const convertedGames = await Promise.all(games.map(async (game) => {
    const isWhite = game.white.includes('andyruwruw');
    const white = (game.white.split('/').reverse())[0];
    const black = (game.black.split('/').reverse())[0];
    return {
      position: await convertFen(isWhite, game.fen),
      isWhite,
      white,
      black,
    };
  }));

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate');

  const text = renderToString(
    CurrentGames({ games: convertedGames })
  );
  return res.status(200).send(text);
}