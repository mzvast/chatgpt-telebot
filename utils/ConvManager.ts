import {ChatGPTAPI, ChatGPTConversation} from 'chatgpt';

class ConvManager {
    _convMap: Map<number, ChatGPTConversation> = new Map();
    constructor(private _api: ChatGPTAPI) {
        this._api = _api;
    }

    getConvById(chatId: number) {
        if (!this._convMap.has(chatId)) {
            this._convMap.set(chatId, this._api.getConversation());
        }
	return this._convMap.get(chatId);
    }
}

export default ConvManager;
