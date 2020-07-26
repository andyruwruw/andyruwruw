import { NowRequest, NowResponse } from '@vercel/node';
import { renderToString } from 'react-dom/server';
import fetch from 'node-fetch';

import { CurrentGames } from '../components/chess/CurrentGames';
import { currentGames, convertFen } from '../services/chesscom';

let pieceImages = {};

const getPieces = async () => {
  let pieces = [ 'b', 'k', 'n', 'p', 'q', 'r' ];
  let colors = ['white', 'black'];

  for (let i = 0; i < colors.length; i++) {
    for (let j = 0; j < pieces.length; j++) {
      const buff = await (await fetch(`https://raw.githubusercontent.com/andyruwruw/andyruwruw/master/assets/${colors[i]}-${pieces[j]}.png`)).arrayBuffer();
      pieceImages[`${colors[i]}-${pieces[j]}`] = `data:image/jpeg;base64,${Buffer.from(buff).toString('base64')}`;
    }
  }
};

export default async function (req: NowRequest, res: NowResponse) {
  const {
    games = [],
  } = await currentGames();

  if (Object.keys(pieceImages).length == 0) {
    await getPieces();
  }

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
    CurrentGames({ games: convertedGames, pieceImages })
  );
  return res.status(200).send(text);
}