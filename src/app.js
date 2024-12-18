const express = require('express');
const webhookRouter = require('./routes/webhook');
const config = require('./config/config');

const app = express();

app.use('/webhook', webhookRouter);

app.listen(config.port, () => {
  console.log(`服务器运行在端口 ${config.port}`);
}); 