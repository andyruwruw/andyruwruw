import React from 'react';

import ReadMeImg from '../ReadMeImg';
import Text from '../Text';

export interface Props {
  games: Array<Object>;
};

export const CurrentGames: React.FC<Props> = ({
  games,
}) => {
  return (
    <ReadMeImg
      width="600"
      height="263">
      <style>
        {`
          #title {
            margin: .5rem;
            text-align: center;
          }
          .games-wrapper {
            display: flex;
            justify-content: space-around;
          }
          .board {
            border: 1px solid rgb(0, 0, 0, .3);
          }
          .row {
            display: flex;
          }
          .col {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 22px;
            height: 22px;
            background: rgb(192,192,192);
          }
          .col.light {
            background: rgb(255, 255, 255);
          }
          .col img {
            width: 90%;
          }
          .username {
            text-align: center;
          }
        `}
      </style>
      <Text
        id="title"
        weight="bold"
        size="title">
        current games
      </Text>
      
      <div className="games-wrapper">
        {games.map((game, gameIndex) => (
          <div
            key={`chess-game-${gameIndex}`}
            className="game">
            <Text
              className="username"
              color="gray">
              {game.isWhite ? game.black : game.white}
            </Text>

            <div className="board">
              {game.position.map((row, rowIndex) => (
              <div
                key={`chess-game-${gameIndex}=row-${rowIndex}`}
                className="row">
                {row.map((col, colIndex) => (
                <div
                  key={`chess-game-${gameIndex}=row-${rowIndex}-col-${colIndex}`}
                  className={(rowIndex + colIndex) % 2 === (game.isWhite ? 0 : 1) ? 'col light' : 'col'}>
                  {col && <img src={`https://raw.githubusercontent.com/andyruwruw/andyruwruw/master/assets/${col === col.toUpperCase() ? 'white' : 'black'}-${col.toLowerCase()}.png`}></img>}
                </div>
                ))}
              </div>
              ))}
            </div>

            <Text
              className="username"
              color="gray">
              {game.isWhite ? game.white : game.black}
            </Text>
          </div>
        ))}
      </div>
    </ReadMeImg>
  );
};