import fetch from 'isomorphic-unfetch';
import ChessWebAPI from 'chess-web-api';

const chessAPI = new ChessWebAPI();

/**
 * Retrieve Current Games
 * Requests current daily games from chess.com
 * @returns {Array} Array of game objects
 */
export async function currentGames() {
  let response = await chessAPI.getPlayerCurrentDailyChess('andyruwruw');
  const { statusCode } = response;
  if (statusCode === 204) {
    return {};
  } else if (statusCode === 200) {
    const data = await response.body;
    return data;
  }
};

/**
 * Convert Fen
 * Returns an nice lil array of the position.
 * @param {Boolean} isWhite Is andyruwruw playing the white pieces?
 * @param {String} fen The Fen string
 * @returns {Array} Array of positon
 */
export function convertFen(isWhite, fen) {
  let finalPosition = [];

  let position = fen.slice(0, fen.indexOf(' '));
  let rows = position.split("/");

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