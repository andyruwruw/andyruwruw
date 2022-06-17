// Types
import { ICurrentDailyGames } from '../types/chess';

/**
 * Mocked response from Chess.com for a player's current daily chess.
 * 
 * @returns {object} Mocked response.
 */
export const MOCKED_CHESS_PLAYER_CURRENT_DAILY_CHESS_RESPONSE: ICurrentDailyGames = {
    games: [
      {
        "url": "https://www.chess.com/game/daily/387915105",
        "move_by":0,
        "pgn":"[Event \"Let's Play!\"]\n[Site \"Chess.com\"]\n[Date \"2022.02.25\"]\n[Round \"2\"]\n[White \"andyruwruw\"]\n[Black \"aidan\"]\n[Result \"*\"]\n[CurrentPosition \"rnbq1rk1/pp2ppbp/3p1np1/2pP4/2B1P3/2N2N2/PPP2PPP/R1BQ1RK1 b - - 5 7\"]\n[Timezone \"UTC\"]\n[ECO \"B06\"]\n[ECOUrl \"https://www.chess.com/openings/Modern-Defense-with-1-e4-2.d4-Bg7-3.Nf3-d6\"]\n[UTCDate \"2022.02.25\"]\n[UTCTime \"22:28:18\"]\n[WhiteElo \"899\"]\n[BlackElo \"1066\"]\n[TimeControl \"1/1209600\"]\n[StartTime \"22:28:18\"]\n[Link \"https://www.chess.com/game/daily/387915105\"]\n\n1. e4 {[%clk 335:59:58]} 1... g6 {[%clk 335:50:10]} 2. d4 {[%clk 216:41:01]} 2... Bg7 {[%clk 7:04:51]} 3. Nf3 {[%clk 256:27:02]} 3... d6 {[%clk 8:59:36]} 4. d5 {[%clk 226:37:28]} 4... c5 {[%clk 274:02:57]} 5. Bc4 {[%clk 328:10:38]} 5... Nf6 {[%clk 81:25:29]} 6. Nc3 {[%clk 86:25:48]} 6... O-O {[%clk 335:56:54]} 7. O-O {[%clk 287:02:32]} *\n",
        "time_control":"1/1209600",
        "last_activity":1654708697,
        "turn":"black",
        "fen":"rnbq1rk1/pp2ppbp/3p1np1/2pP4/2B1P3/2N2N2/PPP2PPP/R1BQ1RK1 b - - 5 7",
        "start_time":1645828098,
        "time_class":"daily",
        "rules":"chess",
        "white":"https://api.chess.com/pub/player/andyruwruw",
        "black":"https://api.chess.com/pub/player/aidan",
      },
      {
        "url":"https://www.chess.com/game/daily/409257219",
        "move_by":1655880297,
        "pgn":"[Event \"Let's Play!\"]\n[Site \"Chess.com\"]\n[Date \"2022.06.15\"]\n[Round \"2\"]\n[White \"garglethismarble\"]\n[Black \"andyruwruw\"]\n[Result \"*\"]\n[SetUp \"1\"]\n[FEN \"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNB1KBNR w KQkq - 0 1\"]\n[CurrentPosition \"rn1q1rk1/pbp2pp1/1p2pn1p/3p4/2P5/2PP2PN/P2BPPBP/R3K2R b KQ - 2 10\"]\n[Timezone \"UTC\"]\n[ECO \"A00\"]\n[ECOUrl \"https://www.chess.com/openings/Kings-Fianchetto-Opening-1...d5-2.Bg2\"]\n[UTCDate \"2022.06.15\"]\n[UTCTime \"14:18:19\"]\n[WhiteElo \"1189\"]\n[BlackElo \"899\"]\n[TimeControl \"1/432000\"]\n[StartTime \"14:18:19\"]\n[Link \"https://www.chess.com/game/daily/409257219\"]\n\n1. g3 {[%clk 119:59:49]} 1... d5 {[%clk 111:58:24]} 2. Bg2 {[%clk 118:57:11]} 2... Nf6 {[%clk 119:15:57]} 3. d3 {[%clk 119:53:58]} 3... b6 {[%clk 119:10:36]} 4. c4 {[%clk 119:55:45]} 4... Bb7 {[%clk 114:40:17]} 5. Nc3 {[%clk 114:42:20]} 5... e6 {[%clk 113:38:08]} 6. Bg5 {[%clk 119:59:42]} 6... h6 {[%clk 119:59:25]} 7. Bf4 {[%clk 119:54:36]} 7... Bb4 {[%clk 115:54:11]} 8. Bd2 {[%clk 119:59:37]} 8... Bxc3 {[%clk 117:48:14]} 9. bxc3 {[%clk 119:28:50]} 9... O-O {[%clk 114:17:07]} 10. Nh3 {[%clk 119:59:15]} *\n",
        "time_control":"1/432000",
        "last_activity":1655448297,
        "turn":"black",
        "fen":"rn1q1rk1/pbp2pp1/1p2pn1p/3p4/2P5/2PP2PN/P2BPPBP/R3K2R b KQ - 2 10",
        "start_time":1655302699,
        "time_class":"daily",
        "rules":"chess",
        "white":"https://api.chess.com/pub/player/garglethismarble",
        "black":"https://api.chess.com/pub/player/andyruwruw",
      },
      {
        "url":"https://www.chess.com/game/daily/389144511",
        "move_by":0,
        "pgn":"[Event \"Let's Play!\"]\n[Site \"Chess.com\"]\n[Date \"2022.03.04\"]\n[Round \"1\"]\n[White \"andyruwruw\"]\n[Black \"cyficowley\"]\n[Result \"*\"]\n[CurrentPosition \"2r2rk1/1q2ppb1/pp2b1pp/4P3/3P1n2/PQN2N2/1P1R1BPP/2R3K1 w - - 2 27\"]\n[Timezone \"UTC\"]\n[ECO \"B09\"]\n[ECOUrl \"https://www.chess.com/openings/Pirc-Defense-Main-Line-Austrian-Attack-4...Bg7-5.Nf3\"]\n[UTCDate \"2022.03.04\"]\n[UTCTime \"18:56:26\"]\n[WhiteElo \"1066\"]\n[BlackElo \"1652\"]\n[TimeControl \"1/259200\"]\n[StartTime \"18:56:26\"]\n[Link \"https://www.chess.com/game/daily/389144511\"]\n\n1. e4 {[%clk 6:30:24]} 1... d6 {[%clk 71:59:46]} 2. d4 {[%clk 23:29:30]} 2... Nf6 {[%clk 71:40:41]} 3. Nc3 {[%clk 23:20:31]} 3... g6 {[%clk 71:49:08]} 4. f4 {[%clk 20:21:52]} 4... Bg7 {[%clk 71:59:47]} 5. Nf3 {[%clk 3:55:57]} 5... O-O {[%clk 71:58:40]} 6. Bd3 {[%clk 21:51:58]} 6... Nc6 {[%clk 69:49:33]} 7. e5 {[%clk 9:42:10]} 7... Nd7 {[%clk 69:55:49]} 8. Ne4 {[%clk 8:55:27]} 8... dxe5 {[%clk 71:51:21]} 9. fxe5 {[%clk 17:27:10]} 9... Nb4 {[%clk 71:58:45]} 10. Bc4 {[%clk 7:08:55]} 10... c5 {[%clk 69:34:59]} 11. c3 {[%clk 23:25:11]} 11... Nc6 {[%clk 70:32:59]} 12. O-O {[%clk 3:59:49]} 12... cxd4 {[%clk 68:03:35]} 13. cxd4 {[%clk 6:56:27]} 13... Nb6 {[%clk 71:59:39]} 14. Bb3 {[%clk 3:59:46]} 14... Na5 {[%clk 69:06:42]} 15. Be3 {[%clk 26:34:19]} 15... Nxb3 {[%clk 70:47:57]} 16. Qxb3 {[%clk 72:00:00]} 16... Nd5 {[%clk 71:59:47]} 17. Bf2 {[%clk 23:03:01]} 17... h6 {[%clk 71:13:10]} 18. Rfd1 {[%clk 15:38:14]} 18... Be6 {[%clk 71:42:10]} 19. Rd2 {[%clk 33:26:21]} 19... b6 {[%clk 68:37:20]} 20. Rc1 {[%clk 7:26:15]} 20... Qd7 {[%clk 70:18:34]} 21. Nc3 {[%clk 2:31:13]} 21... Rac8 {[%clk 71:44:46]} 22. Rdc2 {[%clk 21:10:06]} 22... Nf4 {[%clk 69:04:47]} 23. Qb5 {[%clk 3:58:48]} 23... Qb7 {[%clk 71:39:41]} 24. a3 {[%clk 21:37:13]} 24... Bf5 {[%clk 71:20:18]} 25. Rd2 {[%clk 25:35:03]} 25... a6 {[%clk 70:56:26]} 26. Qb3 {[%clk 6:27:48]} 26... Be6 {[%clk 69:16:24]} *\n",
        "time_control":"1/259200",
        "last_activity":1655194385,
        "turn":"white",
        "fen":"2r2rk1/1q2ppb1/pp2b1pp/4P3/3P1n2/PQN2N2/1P1R1BPP/2R3K1 w - - 2 27",
        "start_time":1646420186,
        "time_class":"daily",
        "rules":"chess",
        "white":"https://api.chess.com/pub/player/andyruwruw",
        "black":"https://api.chess.com/pub/player/cyficowley",
      },
    ],
};
