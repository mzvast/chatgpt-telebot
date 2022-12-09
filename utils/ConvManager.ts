import {
    ChatGPTAPI,
    ChatGPTConversation,
    ConversationResponseEvent,
} from 'chatgpt';
import TelegramBot, {
    EditMessageTextOptions,
    SendMessageOptions,
} from 'node-telegram-bot-api';
import {EKeyboardCommand} from 'types';

type ICallbackSendMsg = (
    res: string,
    opts: TelegramBot.SendMessageOptions,
) => Promise<TelegramBot.Message>;
type ICallbackEditMsg = (
    res: string,
    opts: TelegramBot.EditMessageTextOptions,
) => void;

const inlineKeyboardMarkup = {
    reply_markup: {
        inline_keyboard: [
            [
                {
                    text: '继续',
                    callback_data: 'continue',
                },
            ],
        ],
    },
};

const sendMsgOptions: SendMessageOptions = {
    parse_mode: 'Markdown',
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

const editMsgOptions: EditMessageTextOptions = {
    parse_mode: 'Markdown',
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

class ConvManager {
    _convMap: Map<number, ChatGPTConversation> = new Map();
    _pendingTimerMap: Map<number, NodeJS.Timer> = new Map();
    constructor(private _api: ChatGPTAPI, private _bot: TelegramBot) {
        this._api = _api;
        this._bot = _bot;
    }

    getConvById(chatId: number, force = false) {
        if (!this._convMap.has(chatId) || force) {
            this._convMap.set(chatId, this._api.getConversation());
        }
        return this._convMap.get(chatId);
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
                text = 'continue';
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
        async function handleUpdate(response: ConversationResponseEvent) {
            const txt = response.message.content.parts[0] ?? '..'; // 不能为空，会报错
            // console.log(response.message);
            // if(response.message.end_turn)
            // console.log('<<<out', message_id, txt);
            try {
                callbackEditMsg(txt, {
                    ...editMsgOptions,
                    message_id,
                    chat_id: chatId,
                });
            } catch (error) {
                ac.abort();
                console.error(error.message);
                // 这个error不能直接抛
                // throw error;
            }
        }
        try {
            // 1、创建初始消息
            const res = await callbackSendMsg('.', sendMsgOptions);
            message_id = res.message_id;

            await conversation.sendMessage(text, {
                onConversationResponse: handleUpdate, // 2、在基础上更新
                abortSignal: signal,
            });
        } catch (error) {
            console.error(error.message);
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
