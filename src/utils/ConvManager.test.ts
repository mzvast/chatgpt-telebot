import {describe, it, expect, vi} from 'vitest';
import ConvManager from './ConvManager';

describe('test serialize', () => {
    let uCid = 1000;
    let uPid = 0;
    const fakeApi = {
        getConversation: ({conversationId, parentMessageId}: any = {}) => {
            return {
                api: null,
                conversationId: conversationId ?? `${uCid++}`,
                parentMessageId: parentMessageId ?? `${uPid++}`,
            };
        },
    };
    const fakeDBManager = {
        _db: {
            read: () => {},
            write: () => {},
            data: {},
        },
        load: () => {},
        read: () => {},
        write: () => {},
    };
    const convManager = new ConvManager(
        fakeApi as any,
        null as any,
        fakeDBManager as any,
    );
    convManager.getConvById(1);
    convManager.getConvById(2);

    const expectedJSON = {
        1: {
            conversationId: '1000',
            parentMessageId: '0',
        },
        2: {
            conversationId: '1001',
            parentMessageId: '1',
        },
    };
    it('should serialize', () => {
        expect(convManager.serializeConvMap()).toEqual(expectedJSON);
    });

    it('should deserialize', () => {
        convManager._convMap.clear();
        convManager.loadConvMapFromJSON(expectedJSON);
        expect(convManager.serializeConvMap()).toEqual(expectedJSON);
    });
});
