import * as dotenv from 'dotenv';
import {ChatGPTAPI, ChatGPTConversation} from 'chatgpt';
import TelegramBot from 'node-telegram-bot-api';
import {markdownSafe} from 'utils/StringParser';
import ConvManager from 'utils/ConvManager';
dotenv.config();
const {token, sessionToken} = process.env;

let bot: TelegramBot;
let api: ChatGPTAPI;
let convManager: ConvManager;

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
    try {
        await api.ensureAuth();

        const [response, opts] = await convManager.sendMessage(msg);

        console.log(response);

        bot.sendMessage(msg.chat.id, response, opts);
    } catch (err) {
        // console.error(err.message);
        bot.sendMessage(msg.chat.id, '出错了，我需要休息一下。');
    }
}

async function main() {
    bot = new TelegramBot(token, {polling: true});
    console.log(new Date().toLocaleString(), '--Bot has been started...');
    api = new ChatGPTAPI({sessionToken});
    convManager = new ConvManager(api, bot);

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
