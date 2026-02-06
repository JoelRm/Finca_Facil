const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// opcional: ping de prueba
app.get('/api/ping', (req, res) => {
  res.json({ ok: true, message: 'pong' });
});

// 🔹 AQUI se montan las rutas del dashboard
const dashboardRoutes = require('./src/routes/dashboard.routes');
app.use('/api', dashboardRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`API escuchando en http://localhost:${PORT}`);
});
