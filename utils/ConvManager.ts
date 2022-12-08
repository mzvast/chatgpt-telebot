import {ChatGPTAPI, ChatGPTConversation} from 'chatgpt';
import TelegramBot from 'node-telegram-bot-api';

class ConvManager {
    _convMap: Map<number, ChatGPTConversation> = new Map();
    _pendingTimerMap: Map<number, NodeJS.Timer> = new Map();
    constructor(private _api: ChatGPTAPI, private _bot: TelegramBot) {
        this._api = _api;
        this._bot = _bot;
    }

    getConvById(chatId: number) {
        if (!this._convMap.has(chatId)) {
            this._convMap.set(chatId, this._api.getConversation());
        }
        return this._convMap.get(chatId);
    }

    async sendMessage(msg: TelegramBot.Message) {
        const chatId = msg.chat.id;
        const conversation = this.getConvById(chatId);
        this.startTyping(chatId);
        try {
            const res = await conversation.sendMessage(msg.text);
            return res;
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
