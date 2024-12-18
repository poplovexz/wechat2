const axios = require('axios');
const config = require('../config/config');

class KimiService {
  constructor() {
    this.apiKey = config.kimi.apiKey;
    this.client = axios.create({
      baseURL: 'https://api.moonshot.cn/v1',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async chat(message) {
    try {
      console.log('开始调用 KIMI API, 发送消息:', message);
      const response = await this.client.post('/chat/completions', {
        model: 'moonshot-v1-8k',
        messages: [{
          role: 'user',
          content: message
        }],
        temperature: 0.7
      });
      console.log('KIMI API 响应成功:', response.data);
      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('KIMI API 调用失败:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = new KimiService(); 