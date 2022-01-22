// Packages
import ChessWebAPI from 'chess-web-api';

// Local Imports
import {
  CHESS_COLORS,
  CHESS_COM_USERNAME,
  CHESS_PIECES,
  EMPTY_CHESS_BOARD_FEN,
  GITHUB_CHESS_IMAGES_DIRECTORY_URL,
} from '../config';
import { getImageData } from './general';

// Types
import {
  IConvertedGameObject,
  ICurrentDailyGame,
  ICurrentDailyGames,
  ICurrentDailyGamesResponse,
} from '../types/chess';

/**
 * Instance of chess-web-api.
 */
const chessAPI = new ChessWebAPI();

/**
 * Default value for current daily games with no available games.
 */
const defaultCurrentDailyGames: ICurrentDailyGames = {
  games: [] as ICurrentDailyGame[],
};

/**
 * Requests current daily games from Chess.com.
 *
 * @returns {Promise<ICurrentDailyGames>} Object with array of game objects.
 */
export const getCurrentGames = async (): Promise<ICurrentDailyGames> =>{
  const response: ICurrentDailyGamesResponse = await chessAPI.getPlayerCurrentDailyChess(CHESS_COM_USERNAME);

  const { statusCode } = response;

  if (statusCode === 200) {
    return response.body;
  } else {
    return defaultCurrentDailyGames;
  }
};

export const convertGameObject = (game: ICurrentDailyGame): IConvertedGameObject => {
  const isWhite: boolean = game.white.includes(CHESS_COM_USERNAME);
  const white: string = (game.white.split('/').reverse())[0];
  const black: string = (game.black.split('/').reverse())[0];

  return {
    black,
    isWhite,
    noGame: false,
    position: convertFenToArray(isWhite, game.fen),
    white,
  };
};

export const createEmptyGameObject = (): IConvertedGameObject => ({
  black: null,
  isWhite: true,
  noGame: true,
  position: convertFenToArray(true, EMPTY_CHESS_BOARD_FEN),
  white: null,
});

/**
 * Returns an nice lil' array of the position.
 *
 * @param {boolean} isWhite Is main player playing the white pieces?
 * @param {string} fen The FEN string.
 * @returns {(string | null)[][]} Array of positon.
 */
export const convertFenToArray = (isWhite: boolean, fen: string): (string | null)[][] => {
  const finalPosition: (string | null)[][] = [];

  const position: string = fen.slice(0, fen.indexOf(' '));
  const rows: string[] = position.split('/');

  if (!isWhite) {
    rows.reverse();
  }

  for (let i = 0; i < rows.length; i++) {
    finalPosition.push([]);
    for (let j = 0; j < rows[i].length; j++) {
      if (rows[i][j] >= '1' && rows[i][j] <= '9') {
        for (let k = 0; k < parseInt(rows[i][j], 10); k++) {
          finalPosition[i].push(null);
        }
      } else {
        finalPosition[i].push(rows[i][j]);
      }
    }
    if (!isWhite) {
      finalPosition[i].reverse();
    }
  }

  return finalPosition;
}

/**
 * Loads the images into a buffer, only does this once per image.
 */
export const getPieces = async (): Promise<object> => {
  const pieceImages = {};

  for (const color of CHESS_COLORS) {
    for (const piece of CHESS_PIECES) {
      pieceImages[`${color}-${piece}`] = await getImageData(`${GITHUB_CHESS_IMAGES_DIRECTORY_URL}${color}-${piece}.png`);
    }
  }

  return pieceImages;
};
