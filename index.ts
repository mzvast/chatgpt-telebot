import * as dotenv from 'dotenv'
import { ChatGPTAPI } from 'chatgpt'
import TelegramBot from 'node-telegram-bot-api'
import { markdownSafe } from 'utils/StringParser'
dotenv.config()
const { token, sessionToken } = process.env

const bot = new TelegramBot(token, { polling: true });
console.log(new Date().toLocaleString(), '--Bot has been started...');

bot.on('message', (msg) => {
  console.log(new Date().toLocaleString(), '--收到来自id:', msg.chat.id, '的消息:', msg.text);
  msgHandler(msg);
});

function msgHandler(msg) {
  switch (true) {
    case msg.text.indexOf('/start') === 0:
      bot.sendMessage(msg.chat.id, '👋你好！很高兴能与您交谈。有什么我可以帮您的吗？');
      break;
    default:
      chatGpt(msg, bot);
      break;
  }
}
async function chatGpt(msg, bot) {
  try {
    const api = new ChatGPTAPI({ sessionToken })
    await api.ensureAuth()

    const conversation = api.getConversation()

    const response = await conversation.sendMessage(msg.text)
    console.log(response)
    bot.sendMessage(msg.chat.id, response, { parse_mode: 'Markdown' });
  } catch (err) {
    // console.error(err.message);
    bot.sendMessage(msg.chat.id, '出错了，我需要休息一下。');
  }
}