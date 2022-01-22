/**
 * Style for CurrentGames component.
 */
export const CURRENT_GAMES_CSS = `
.games-wrapper {
  display: flex;
  justify-content: space-around;
}

#title {
  margin: .5rem;
  text-align: center;
}

.board {
  border-radius: .5rem;
  overflow: hidden;
}

.row {
  display: flex;
}

.col {
  align-items: center;
  background: #B58863;
  display: flex;
  height: 22px;
  justify-content: center;
  width: 22px;
}

.col.empty {
  background: #DDDDDDAA;
}

.col.light {
  background: #F0D9B5;
}

.col.light.empty {
  background: #EEEEEEAA;
}

.col img {
  width: 90%;
}

.username {
  text-align: center;
  margin-top: 6px;
}
`;
