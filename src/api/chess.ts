// Packages
import ChessWebAPI from 'chess-web-api';

// Types
import {
  ICurrentDailyGame,
  ICurrentDailyGames,
  ICurrentDailyGamesResponse,
} from '../types/chess';
import { Environment } from '../helpers/environment';
import { MOCKED_CHESS_PLAYER_CURRENT_DAILY_CHESS_RESPONSE } from '../data/chess';

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
const getCurrentGames = async (): Promise<ICurrentDailyGames> =>{
  if (Environment.useMockData()) {
    return MOCKED_CHESS_PLAYER_CURRENT_DAILY_CHESS_RESPONSE;
  }

  const response: ICurrentDailyGamesResponse = await chessAPI.getPlayerCurrentDailyChess(Environment.getChessUsername());

  const { statusCode } = response;

  if (statusCode === 200) {
    return response.body;
  } else {
    return defaultCurrentDailyGames;
  }
};

export default {
  getCurrentGames,
};
