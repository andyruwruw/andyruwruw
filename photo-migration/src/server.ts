/**
 * Entry point.
 *
 *   npm run dev     # tsx watch, http://127.0.0.1:8000
 *   npm run build && npm start
 */
import { createApp } from "./api";
import * as config from "./config";
import { initDb } from "./db";

initDb();

const app = createApp();
app.listen(config.PORT, config.HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`photo-migration listening on http://${config.HOST}:${config.PORT}`);
});
