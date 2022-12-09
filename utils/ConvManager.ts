import {ChatGPTAPI, ChatGPTConversation} from 'chatgpt';
import TelegramBot, {SendMessageOptions} from 'node-telegram-bot-api';

enum ECMD {
    continue = '/continue',
    reset = '/reset',
}

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

const normalReplayOptions: SendMessageOptions = {
    parse_mode: 'Markdown',
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

    async sendMessage(msg: TelegramBot.Message) {
        const chatId = msg.chat.id;
        let text = msg.text;
        let forceNewConv = false;
        switch (text) {
            case ECMD.continue:
                text = 'continue';
                break;
            case ECMD.reset:
                forceNewConv = true;
                text = '你好';
                break;
            default:
                break;
        }
        const conversation = this.getConvById(chatId, forceNewConv);
        this.startTyping(chatId);
        try {
            const res = await conversation.sendMessage(text);
            return [res, normalReplayOptions] as const;
        } catch (error) {
            throw error;
        } finally {
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
