import { MongoClient, Collection, UpdateResult } from 'mongodb';
import MongoStore from "connect-mongo";

import { DatabaseConnectionConfig } from "lib/config";
import { TTSMessage } from "lib/microsoft-tts";

const DATABASE_NAME = "Chiwawa";

/**
 * 接口 MessageTemplate 定義了消息模板的結構。
 * @property {string} prefix - 消息前綴
 * @property {string} content - 消息內容
 * @property {string} [suffix] - 消息後綴（可選）
 * @property {string} [language] - 語言（可選）
 * @property {string} [voice] - 語音模型（可選）
 */
interface MessageTemplate {
    prefix: string;
    content: string;
    suffix?: string;
    language?: string;
    voice?: string;
}

class MessageTemplate {
    constructor(template: MessageTemplate) {
        Object.assign(this, template);
    }

    public ToString(userName: string, defaultSuffix: string, j?: MessageTemplate): TTSMessage {
        const { language, voice } = this;
        const prefix = this.prefix || j?.prefix || "";
        const content = this.content || j?.content || userName;
        const suffix = (this.suffix === undefined) ? "" :
            this.suffix || j?.suffix || defaultSuffix;

        return {
            content: prefix + content + suffix,
            language: language || j?.language || "",
            voiceActor: voice || j?.voice || ""
        };
    }
}

/**
 * 接口 Notification 定義了通知設定的結構。
 * @property {boolean} inheritGlobal - 是否繼承全域設定
 * @property {boolean} muted - 是否靜音
 * @property {MessageTemplate} joinMessage - 加入頻道的消息模板
 * @property {MessageTemplate} leaveMessage - 離開頻道的消息模板
 */
interface Notification {
    inheritGlobal: boolean;
    muted: boolean;
    joinMessage: MessageTemplate;
    leaveMessage: MessageTemplate;
}

/**
 * 接口 Notifications 定義了User設定的結構。
 * @property {string} id - 使用者的 Discord ID
 * @property {Notification} globalSettings - 全域設定
 * @property {{ [guildId: string]: Notification }} guildSettings - 每個 Guild 的設定
 */
interface Notifications {
    id: string;
    globalSettings: Notification;
    guildSettings: { [guildId: string]: Notification };
}

/**
 * 接口 StoreValue 定義了存儲值的基本結構，要求包含 ID。
 * @property {string} id - ID
 */
interface StoreValue {
    id: string;
}

/**
 * 類 Store 提供了與 MongoDB Collection交互的泛型存儲解決方案。
 */
class Store<T extends StoreValue> {
    private collection?: Collection; // MongoDB Collection

    /**
     * 初始化存儲，設定 MongoDB Collection。
     * @param {Collection} collection - MongoDB Collection
     * @returns {Store<T>} 當前 Store 
     */
    public Init(collection: Collection): Store<T> {
        this.collection = collection;
        collection.createIndex({ id: 1 });
        return this;
    }

    /**
     * 根據 ID 獲取存儲的值。
     * @param id - 要查找的 ID
     * @returns {Promise<T | null>} 查找到的值或 null
     */
    public async Get(id: string): Promise<T | null> {
        const { collection } = this;

        if (!collection) {
            throw new Error("collection is not initialized");
        }

        return collection.findOne({ id }, { projection: { _id: 0 } }).then((value) => {
            if (value) {
                return value as any as T;
            } else {
                return null;
            }
        });
    }

    /**
     * 設定存儲的值。
     * @param data - 要存儲的資料
     * @returns 更新結果
     */
    public Set(data: T): Promise<UpdateResult<Document>> {
        const { collection } = this;

        if (!collection) {
            throw new Error("collection is not initialized");
        }

        return collection.updateOne(
            { id: data.id },
            { $set: data },
            { upsert: true }
        );
    }

    public Del(id: string): Promise<void> {
        const { collection } = this;

        if (!collection) {
            throw new Error("collection is not initialized");
        }

        return new Promise(async (resolve, reject) => {
            const { acknowledged } = await collection.deleteOne({ id });
            if (acknowledged) resolve();
            else reject();
        });
    }
}

/**
 * 接口 MongoDB 定義了 MongoDB 的存儲結構。
 */
interface MongoDB {
    user: Store<Notifications>; // User通知設定的存儲
    session: MongoStore; // Sessions Collection
}

/**
 * 類 MongoDB 提供了初始化和管理 MongoDB 連接和存儲的功能。
 */
class MongoDB {

    /**
     * 創建一個空的User通知設定。
     * @param id - User ID
     * @returns 空的通知設定
     */
    public static EmptyUser(id: string): Notifications {
        return {
            id,
            globalSettings: {
                inheritGlobal: false,
                muted: false,
                joinMessage: {
                    prefix: "",
                    content: "",
                    suffix: "",
                },
                leaveMessage: {
                    prefix: "",
                    content: "",
                    suffix: ""
                }
            },
            guildSettings: {}
        } as Notifications;
    }

    /**
     * 初始化 MongoDB 連接和存儲。
     * @param config - 資料庫連接設定
     * @returns 當前 MongoDB 
     */
    public async Init(config: DatabaseConnectionConfig): Promise<MongoDB> {
        const client = new MongoClient(config.uri);
        this.session = MongoStore.create({
            mongoUrl: config.uri,
            collectionName: "Sessions",
            ttl: 604800 * 1000
        });

        await client.connect();

        const db = client.db(DATABASE_NAME);

        this.user = new Store<Notifications>().Init(db.collection("Users"));

        return this;
    }

}

export {
    Notifications,
    Notification,
    MessageTemplate,
    Store
}

export default MongoDB;
