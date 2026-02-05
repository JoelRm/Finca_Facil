const express = require('express');
require('dotenv').config();
const cors = require('cors');  

const dashboardRoutes = require('./routes/dashboard.routes');

const app = express();
app.use(cors()); 
app.use(express.json());
app.use('/api', dashboardRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 API corriendo en http://localhost:${PORT}`);
});
