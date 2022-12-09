import * as dotenv from 'dotenv';
import {ChatGPTAPI, ChatGPTConversation} from 'chatgpt';
import TelegramBot from 'node-telegram-bot-api';
import {markdownSafe} from 'utils/StringParser';
import ConvManager from 'utils/ConvManager';
import {EKeyboardCommand} from 'types';
import RateLimiter from 'utils/RateLimiter';
dotenv.config();
const {token, sessionToken, superIds} = process.env;

let bot: TelegramBot;
let api: ChatGPTAPI;
let convManager: ConvManager;

const rateLimiter = new RateLimiter(superIds.split(',').map(x => +x));

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

        await convManager.sendMessage(
            msg,
            async (response, opts) => {
                // console.log(response);

                return await bot.sendMessage(msg.chat.id, response, opts);
            },
            (response, opts) => {
                // console.log(response);

                bot.editMessageText(response, opts);
            },
        );
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
            '--name:',
            msg.chat.username,
            '的消息:',
            msg.text,
        );
        if (!rateLimiter.isClientAllowed(msg.chat.id)) {
            return bot.sendMessage(msg.chat.id, '请求太频繁，请稍后再试。');
        }
        msgHandler(msg);
    });
    bot.on('callback_query', callbackQuery => {
        const {message: msg, data} = callbackQuery;
        console.log('🚀 ~ file: index.ts:60 ~ main ~ data', data);
        console.log(
            new Date().toLocaleString(),
            '--收到来自id:',
            msg.chat.id,
            '的callback_query消息:',
            data,
        );
        switch ('/' + data) {
            case EKeyboardCommand.continue:
                {
                    msg.text = EKeyboardCommand.continue;
                }
                break;
            case EKeyboardCommand.retry: {
                // todo:
            }
            default:
                break;
        }
        msgHandler(msg);
    });
}

process
    .on('unhandledRejection', (reason, p) => {
        console.error(reason.toString(), 'Unhandled Rejection at Promise'); //, p);
    })
    .on('uncaughtException', err => {
        console.error(err.message, 'Uncaught Exception thrown');
        process.exit(1);
    });

main().catch(err => {
    console.error(err);
    process.exit(1);
});
