const axios = require('axios');
const crypto = require('crypto');
const config = require('../config/config');

class WeworkService {
  constructor() {
    this.config = config.wework;
    this.accessToken = null;
    this.tokenExpireTime = 0;
  }

  // 获取访问令牌
  async getAccessToken() {
    if (this.accessToken && Date.now() < this.tokenExpireTime) {
      console.log('使用缓存的访问令牌');
      return this.accessToken;
    }

    try {
      console.log('开始获取新的访问令牌');
      const response = await axios.get(
        `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${this.config.corpId}&corpsecret=${this.config.secret}`
      );

      if (response.data.errcode === 0) {
        this.accessToken = response.data.access_token;
        this.tokenExpireTime = Date.now() + (response.data.expires_in - 300) * 1000;
        console.log('成功获取新的访问令牌');
        return this.accessToken;
      }
      throw new Error('获取访问令牌失败');
    } catch (error) {
      console.error('获取企业微信访问令牌错误:', error.response?.data || error.message);
      throw error;
    }
  }

  // 发送应用消息
  async sendCustomerMessage(toUser, msgType, content) {
    try {
      const token = await this.getAccessToken();
      console.log('准备发送应用消息:', {
        toUser,
        msgType,
        content
      });

      const messageData = {
        touser: toUser,
        msgtype: msgType,
        agentid: parseInt(this.config.agentId),
        text: {
          content: content
        }
      };

      console.log('发送的消息数据:', messageData);

      const response = await axios.post(
        `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${token}`,
        messageData
      );

      console.log('应用消息发送结果:', response.data);
      return response.data;
    } catch (error) {
      console.error('发送应用消息失败:', error.response?.data || error.message);
      throw error;
    }
  }

  // 验证消息签名
  verifySignature(msg_signature, timestamp, nonce, encrypt = '') {
    try {
      console.log('验证签名开始，完整参数:', {
        msg_signature,
        timestamp,
        nonce,
        encrypt,
        token: this.config.token
      });
      
      if (!msg_signature || !timestamp || !nonce) {
        console.error('缺少必要的签名参数');
        return false;
      }

      // 1. 将token、timestamp、nonce、encrypt四个参数进行字典序排序
      const arr = [this.config.token, timestamp, nonce];
      if (encrypt) {
        arr.push(encrypt);
      }
      arr.sort();
      
      console.log('排序后的数组:', arr);
      
      // 2. 将四个参数字符串拼接成一个字符串进行sha1加密
      const str = arr.join('');
      console.log('拼接后的字符串:', str);
      
      const sha1 = crypto.createHash('sha1');
      sha1.update(str);
      const calculatedSignature = sha1.digest('hex');
      
      console.log('签名计算结果:', {
        calculated: calculatedSignature,
        received: msg_signature,
        isMatch: calculatedSignature === msg_signature
      });
      
      return calculatedSignature === msg_signature;
    } catch (error) {
      console.error('验证签名过程发生错误:', error);
      console.error('错误堆栈:', error.stack);
      return false;
    }
  }

  // 添加解密方法
  decryptMsg(msgEncrypt) {
    try {
      console.log('开始解密消息，参数:', {
        msgEncrypt: msgEncrypt.substring(0, 20) + '...',  // 只显示前20个字符
        encodingAESKey: this.config.encodingAESKey.substring(0, 10) + '...'  // 只显示前10个字符
      });

      const aesKey = Buffer.from(this.config.encodingAESKey + '=', 'base64');
      console.log('AES密钥长度:', aesKey.length);

      const iv = aesKey.slice(0, 16);
      console.log('IV向量长度:', iv.length);

      const decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, iv);
      decipher.setAutoPadding(false);

      let decrypted;
      try {
        decrypted = Buffer.concat([
          decipher.update(msgEncrypt, 'base64'),
          decipher.final()
        ]);
        console.log('解密后的Buffer长度:', decrypted.length);
      } catch (decryptError) {
        console.error('解密过程错误:', decryptError);
        throw decryptError;
      }

      decrypted = this.PKCS7Decode(decrypted);
      console.log('PKCS7解码后的长度:', decrypted.length);

      const content = decrypted.slice(16);
      const length = content.slice(0, 4).readUInt32BE(0);
      console.log('消息长度:', length);

      const message = content.slice(4, length + 4).toString();
      console.log('最终解析的消息:', message.substring(0, 100) + '...');  // 只显示前100个字符

      return message;
    } catch (error) {
      console.error('解密消息过程发生错误:', error);
      console.error('错误堆栈:', error.stack);
      throw error;
    }
  }

  // PKCS7 解码
  PKCS7Decode(buff) {
    let pad = buff[buff.length - 1];
    if (pad < 1 || pad > 32) {
      pad = 0;
    }
    return buff.slice(0, buff.length - pad);
  }
}

module.exports = new WeworkService(); 