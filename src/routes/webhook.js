const express = require('express');
const router = express.Router();
const xml2js = require('xml2js');
const weworkService = require('../services/weworkService');
const kimiService = require('../services/kimiService');

// 添加 XML 解析中间件
const xmlParser = express.text({ type: 'text/xml' });

router.get('/', (req, res) => {
  const { msg_signature, timestamp, nonce, echostr } = req.query;
  console.log('收到GET请求:', {
    msg_signature,
    timestamp,
    nonce,
    echostr
  });
  
  if (weworkService.verifySignature(msg_signature, timestamp, nonce, echostr)) {
    console.log('签名验证成功');
    res.send(echostr);
  } else {
    console.log('签名验证失败，参数:', {
      token: process.env.WEWORK_TOKEN,
      timestamp,
      nonce,
      echostr
    });
    res.status(403).send('签名验证失败');
  }
});

router.post('/', xmlParser, async (req, res) => {
  try {
    const { msg_signature, timestamp, nonce } = req.query;
    console.log('POST请求完整信息:', {
      query: req.query,
      rawBody: req.body, // 原始 XML 字符串
      headers: req.headers,
      url: req.url,
      method: req.method
    });

    // 解析 XML
    const parser = new xml2js.Parser({ explicitArray: false });
    const xmlData = await parser.parseStringPromise(req.body);
    console.log('解析后的XML数据:', xmlData);

    const Encrypt = xmlData.xml.Encrypt;
    if (!Encrypt) {
      console.error('缺少加密消息体');
      return res.status(400).send('缺少加密消息');
    }
    
    console.log('收到加密消息:', {
      msg_signature,
      timestamp,
      nonce,
      encrypt: Encrypt
    });
    
    const signResult = weworkService.verifySignature(msg_signature, timestamp, nonce, Encrypt);
    console.log('签名验证结果:', signResult);
    
    if (!signResult) {
      console.log('签名验证失败，完整参数:', {
        msg_signature,
        timestamp,
        nonce,
        encrypt: Encrypt,
        token: process.env.WEWORK_TOKEN
      });
      return res.status(403).send('签名验证失败');
    }

    try {
      // 解密消息
      console.log('开始解密消息...');
      const decryptedMsg = weworkService.decryptMsg(Encrypt);
      console.log('解密后的原始消息:', decryptedMsg);
      
      // 解析解密后的 XML 消息
      const parser = new xml2js.Parser({ explicitArray: false });
      const xmlMessage = await parser.parseStringPromise(decryptedMsg);
      console.log('解析后的XML消息:', xmlMessage);
      
      // 从 XML 中提取消息内容
      const message = {
        toUsername: xmlMessage.xml.ToUserName,
        fromUsername: xmlMessage.xml.FromUserName,
        createTime: xmlMessage.xml.CreateTime,
        msgType: xmlMessage.xml.MsgType,
        content: xmlMessage.xml.Content,
        msgId: xmlMessage.xml.MsgId,
        agentId: xmlMessage.xml.AgentID
      };
      console.log('提取的消息内容:', message);
      
      // 处理客服消息
      if (message.msgType === 'text') {
        console.log('准备处理文本消息:', {
          type: message.msgType,
          content: message.content,
          from: message.fromUsername
        });
        
        console.log('开始调用KIMI AI...');
        const aiResponse = await kimiService.chat(message.content);
        console.log('KIMI AI响应结果:', aiResponse);
        
        console.log('准备发送回复消息...');
        const sendResult = await weworkService.sendCustomerMessage(
          message.fromUsername,  // 发送给消息发送者
          'text',
          aiResponse  // 直接传递文本内容
        );
        console.log('消息发送完成，结果:', sendResult);
      } else {
        console.log('收到非文本消息:', message.msgType);
      }
    } catch (decryptError) {
      console.error('消息处理过程出错:', decryptError);
      throw decryptError;
    }

    res.send('success');
  } catch (error) {
    console.error('整体处理发生错误:', error);
    console.error('错误堆栈:', error.stack);
    res.status(500).send('内部服务器错误');
  }
});

module.exports = router; 