import * as dotenv from 'dotenv';
import {ChatGPTAPI, ChatGPTConversation} from 'chatgpt';
import TelegramBot from 'node-telegram-bot-api';
import {markdownSafe} from 'utils/StringParser';
import ConvManager from 'utils/ConvManager';
dotenv.config();
const {token, sessionToken} = process.env;

let bot: TelegramBot;
let api: ChatGPTAPI;
let convManager:ConvManager;

function msgHandler(msg: TelegramBot.Message) {
    switch (true) {
        case msg.text.indexOf('/start') === 0:
            bot.sendMessage(
                msg.chat.id,
                '👋你好！很高兴能与您交谈。有什么我可以帮您的吗？',
            );
            break;
        default:
            chatGpt(msg);
            break;
    }
}

async function chatGpt(msg: TelegramBot.Message) {
    let timer;
    try {
        await api.ensureAuth();

        bot.sendChatAction(msg.chat.id, 'typing');

        // 保持typing状态
        timer = setInterval(() => {
            bot.sendChatAction(msg.chat.id, 'typing');
        }, 5000);

        const conversation = convManager.getConvById(msg.chat.id);

        const response = await conversation.sendMessage(msg.text);
        console.log(response);

        bot.sendMessage(msg.chat.id, response, {parse_mode: 'Markdown'});
    } catch (err) {
        // console.error(err.message);
        bot.sendMessage(msg.chat.id, '出错了，我需要休息一下。');
    } finally {
        clearInterval(timer);
    }
}

async function main() {
    bot = new TelegramBot(token, {polling: true});
    console.log(new Date().toLocaleString(), '--Bot has been started...');
    api = new ChatGPTAPI({sessionToken});
    convManager = new ConvManager(api);

    bot.on('message', msg => {
        console.log(
            new Date().toLocaleString(),
            '--收到来自id:',
            msg.chat.id,
            '的消息:',
            msg.text,
        );
        msgHandler(msg);
    });
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
