import {
    ChatGPTAPI,
    ChatGPTConversation,
    ConversationResponseEvent,
} from 'chatgpt';
import TelegramBot, {
    EditMessageTextOptions,
    SendMessageOptions,
} from 'node-telegram-bot-api';
import {EKeyboardCommand} from '@/types';
import DBManager from './DBManager';

type ICallbackSendMsg = (
    res: string,
    opts: TelegramBot.SendMessageOptions,
) => Promise<TelegramBot.Message>;
type ICallbackEditMsg = (
    res: string,
    opts: TelegramBot.EditMessageTextOptions,
) => void;

// const inlineKeyboardMarkup = {
//     reply_markup: {
//         inline_keyboard: [
//             [
//                 {
//                     text: '继续',
//                     callback_data: 'continue',
//                 },
//             ],
//         ],
//     },
// };

// const sendMsgOptions: SendMessageOptions = {
//     parse_mode: 'HTML',
//     reply_markup: {
//         inline_keyboard: [
//             [
//                 {
//                     text: '继续',
//                     callback_data: EKeyboardCommand.continue,
//                 },
//             ],
//             // todo: not supported yet
//             // [
//             //     {
//             //         text: '重试',
//             //         callback_data: EKeyboardCommand.retry,
//             //     },
//             // ],
//         ],
//     },
// };

const streamingMsgOptions: EditMessageTextOptions = {
    parse_mode: 'Markdown', // 因为markdown会被telegram invalid导致消息发不出去 fixme:
    reply_markup: {
        inline_keyboard: [],
    },
};

const finalMsgOptions: EditMessageTextOptions = {
    parse_mode: 'Markdown', // 因为markdown会被telegram invalid导致消息发不出去 fixme:
    reply_markup: {
        inline_keyboard: [
            [
                {
                    text: '继续',
                    callback_data: EKeyboardCommand.continue,
                },
            ],
            // todo: not supported yet
            // [
            //     {
            //         text: '重试',
            //         callback_data: EKeyboardCommand.retry,
            //     },
            // ],
        ],
    },
};

type TConvItem = {conversationId: string; parentMessageId: string};

export type TConvJSON = Record<number, TConvItem>;

const DBPath = 'db.json';

class ConvManager {
    _convMap: Map<number, ChatGPTConversation> = new Map();
    _pendingTimerMap: Map<number, NodeJS.Timer> = new Map();
    constructor(
        private _api: ChatGPTAPI,
        private _bot: TelegramBot,
        private _dbManager?: DBManager<TConvJSON>,
    ) {
        this._api = _api;
        this._bot = _bot;
        this._dbManager = _dbManager ?? new DBManager(DBPath);
    }

    loadDB() {
        // recover
        this._dbManager.load();
        const data = this._dbManager.read();
        this.loadConvMapFromJSON(data);
    }

    saveDB() {
        this._dbManager.write(this.serializeConvMap());
    }

    getConvById(chatId: number, force = false) {
        if (!this._convMap.has(chatId) || force) {
            this._convMap.set(chatId, this._api.getConversation());
        }
        return this._convMap.get(chatId);
    }

    serializeConvMap(): TConvJSON {
        const ans = {};
        this._convMap.forEach((v, k) => {
            ans[k] = {
                conversationId: v.conversationId,
                parentMessageId: v.parentMessageId,
            };
        });
        return ans;
    }

    loadConvMapFromJSON(data) {
        this._convMap = new Map();
        for (const k in data) {
            if (data.hasOwnProperty(k)) {
                const v = data[k];
                this._convMap.set(
                    parseInt(k),
                    this._api.getConversation({
                        conversationId: v.conversationId,
                        parentMessageId: v.parentMessageId,
                    }),
                );
            }
        }
    }

    async sendMessage(
        msg: TelegramBot.Message,
        callbackSendMsg: ICallbackSendMsg,
        callbackEditMsg: ICallbackEditMsg,
    ) {
        const chatId = msg.chat.id;
        let text = msg.text;
        let forceNewConv = false;
        switch (text) {
            case EKeyboardCommand.continue:
                text = '继续';
                break;
            case EKeyboardCommand.reset:
                forceNewConv = true;
                text = '你好';
                break;
            default:
                break;
        }
        const conversation = this.getConvById(chatId, forceNewConv);

        // cancel tokens
        const ac = new AbortController();
        const signal = ac.signal;

        this.startTyping(chatId);
        let message_id;
        let timer;
        let doneTimer;
        let cacheText = '';
        async function handleUpdate(response: ConversationResponseEvent) {
            const txt = response.message.content.parts[0] ?? '..'; // 不能为空，会报错
            // console.log(response.message);
            // if(response.message.end_turn)
            // console.log('<<<out', message_id, txt);

            // debounce，结束后设置《继续按钮》
            if (doneTimer) {
                clearTimeout(doneTimer);
                doneTimer = null;
            }
            doneTimer = setTimeout(() => {
                callbackEditMsg(null, {
                    ...finalMsgOptions,
                    message_id,
                    chat_id: chatId,
                });
            }, 2000);

            if (timer) {
                // 节流2秒，减少对单个用户的请求压力，避免被429
                cacheText = txt;
                return;
            }
            timer = setTimeout(() => {
                clearTimeout(timer);
                timer = null;
                try {
                    // console.log('>>' + cacheText);

                    callbackEditMsg(cacheText, {
                        ...streamingMsgOptions,
                        message_id,
                        chat_id: chatId,
                    });
                } catch (error) {
                    ac.abort();
                    console.error(error.message);
                    // 这个error不能直接抛
                    // throw error;
                }
            }, 2000);
        }
        try {
            // 1、创建初始消息
            const res = await callbackSendMsg('...🤔', streamingMsgOptions);
            message_id = res.message_id;

            await conversation.sendMessage(text, {
                onConversationResponse: handleUpdate, // 2、在基础上更新
                abortSignal: signal,
            });
        } catch (error) {
            console.error(error.message);
            callbackEditMsg('出错了' + error.message, {
                ...finalMsgOptions,
                message_id,
                chat_id: chatId,
            });
            // 这个error不能直接抛
        } finally {
            console.log('回复完成');

            this.stopTyping(chatId);
        }
    }

    startTyping(chatId: number) {
        this.stopTyping(chatId);
        this._pendingTimerMap.set(
            chatId,
            setInterval(() => {
                this._bot.sendChatAction(chatId, 'typing');
            }, 5000),
        );
    }

    stopTyping(chatId: number) {
        if (this._pendingTimerMap.has(chatId)) {
            clearInterval(this._pendingTimerMap.get(chatId));
        }
    }
}

export default ConvManager;
