import { NowRequest, NowResponse } from '@vercel/node';
import { renderToString } from 'react-dom/server';
import fetch from 'node-fetch';

import { CurrentGames } from '../components/chess/CurrentGames';
import { currentGames, convertFen } from '../services/chesscom';

let pieceImages = {};

/**
 * Get Pieces
 * Loads the images into a buffer. Only does this once.
 */
const getPieces = async () => {
  let pieces = [ 'b', 'k', 'n', 'p', 'q', 'r' ];
  let colors = ['white', 'black'];

  for (const color of colors) {
    for (const piece of pieces) {
      const buff = await (await fetch(`https://raw.githubusercontent.com/andyruwruw/andyruwruw/master/assets/${color}-${piece}.png`)).arrayBuffer();
      pieceImages[`${color}-${piece}`] = `data:image/jpeg;base64,${Buffer.from(buff).toString('base64')}`;
    }
  }
};

/**
 * Current Chess Games
 * Returns an image displaying 3 of my current chess games from chess.com.
 * @param {NowRequest} req Request for Image
 * @param {NowResponse} res Response to request.
 */
export default async function (req: NowRequest, res: NowResponse) {
  // Using an awesome library called chess-web-api to get our data ;)
  const {
    games = [],
  } = await currentGames();

  // Converting the piece images if nessisary.
  if (Object.keys(pieceImages).length == 0) {
    await getPieces();
  }

  // Limiting the width of the games.
  games.length = Math.min(games.length, 3);

  // There's a lot of data we don't need! Converting the FEN to an array
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

  // Hey! I'm returning an image!
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate');

  // Generating the component and rendering it
  const text = renderToString(
    CurrentGames({ games: convertedGames, pieceImages })
  );
  return res.status(200).send(text);
}