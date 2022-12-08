import * as dotenv from 'dotenv'
import { ChatGPTAPI, ChatGPTConversation } from 'chatgpt'
import TelegramBot from 'node-telegram-bot-api'
import { markdownSafe } from 'utils/StringParser'
dotenv.config()
const { token, sessionToken } = process.env

// 暂时复用同一个会话。
// todo: 改成多实例
let bot:TelegramBot;
let conversation:ChatGPTConversation;
let api:ChatGPTAPI;

function msgHandler(msg) {
  switch (true) {
    case msg.text.indexOf('/start') === 0:
      bot.sendMessage(msg.chat.id, '👋你好！很高兴能与您交谈。有什么我可以帮您的吗？');
      break;
    default:
      chatGpt(msg);
      break;
  }
}
async function chatGpt(msg) {
  try {
    // const api = new ChatGPTAPI({ sessionToken })
    await api.ensureAuth()

    bot.sendChatAction(msg.chat.id, 'typing');

    const response = await conversation.sendMessage(msg.text)
    console.log(response)
    bot.sendMessage(msg.chat.id, response, { parse_mode: 'Markdown' });
  } catch (err) {
    // console.error(err.message);
    bot.sendMessage(msg.chat.id, '出错了，我需要休息一下。');
  }
}

async function main(){
  bot = new TelegramBot(token, { polling: true });
  console.log(new Date().toLocaleString(), '--Bot has been started...');
  api = new ChatGPTAPI({ sessionToken });
  conversation = api.getConversation();

  bot.on('message', (msg) => {
    console.log(new Date().toLocaleString(), '--收到来自id:', msg.chat.id, '的消息:', msg.text);
    msgHandler(msg);
  });
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
