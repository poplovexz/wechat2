require('dotenv').config();

module.exports = {
  kimi: {
    apiKey: process.env.KIMI_API_KEY,
  },
  wework: {
    corpId: process.env.WEWORK_CORP_ID,
    agentId: process.env.WEWORK_AGENT_ID,
    secret: process.env.WEWORK_SECRET,
    token: process.env.WEWORK_TOKEN,
    encodingAESKey: process.env.WEWORK_ENCODING_AES_KEY
  },
  port: process.env.PORT || 5001
}; 