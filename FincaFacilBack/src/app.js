const express = require('express');
const cors = require('cors');

const routes = require('./routes/index.routes');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');
const communityContext = require('./middlewares/communityContext'); // ✅ NUEVO

const app = express();

app.use(cors());
app.use(express.json());

app.use(communityContext); // ✅ NUEVO (antes de /api)
app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
