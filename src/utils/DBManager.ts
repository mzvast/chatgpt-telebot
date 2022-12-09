import {LowSync} from 'lowdb';
import {JSONFileSync} from 'lowdb/node';
import {TConvJSON} from './ConvManager';

class DBManager<T> {
    _db: LowSync<T>;
    constructor(private _filePath: string) {
        this._filePath = _filePath;
        const adapter = new JSONFileSync<T>(this._filePath);
        this._db = new LowSync(adapter);
        this.load();
    }

    load() {
        this._db.read();
        this._db.data = this._db.data || ({} as T);
    }

    read() {
        return this._db.data;
    }

    write(data: T) {
        this._db.data = data;
        this._db.write();
    }
}

export default DBManager;

// // test
// const db = new DBManager<TConvJSON>('db.json');
// const toSave = {
//     1: {
//         conversationId: '1000',
//         parentMessageId: '0',
//     },
//     2: {
//         conversationId: '1001',
//         parentMessageId: '1',
//     },
// };
// db.write(toSave);
