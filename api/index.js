// Импортируем скомпилированный сервер
// Vercel сначала запускает npm run build, который создает папку server/dist
const app = require('../server/dist/index.js');

// Экспортируем его (учитывая особенности компиляции TS)
module.exports = app.default || app;
