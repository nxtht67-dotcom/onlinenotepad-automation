import { Page } from '@playwright/test';

export interface IDBNote {
  unique_id: string;
  id: string;
  userID: number | null;
  syncStatus: number;
  lastSyncedAt: string | null;
  created_at: string;
  deleted_at: string | null;
  title: string;
  content?: string;
  contentSize?: number;
}

export interface IndexedDBStoreSnapshot {
  storeName: string;
  keyPath: string | string[] | null;
  autoIncrement: boolean;
  indexes: string[];
  recordCount: number;
  sampleRecords: Record<string, unknown>[];
}

export interface IndexedDBDatabaseSnapshot {
  databaseName: string;
  capturedAt: string;
  stores: IndexedDBStoreSnapshot[];
}

export class IndexedDBHelper {
  /**
   * Retrieves all notes stored in IndexedDB.
   */
  static async getAllNotes(page: Page): Promise<IDBNote[]> {
    return await page.evaluate(() => {
      return new Promise<IDBNote[]>((resolve, reject) => {
        const req = indexedDB.open('OnlineNotepadDB');
        req.onerror = () => reject(new Error('Failed to open OnlineNotepadDB database'));
        req.onsuccess = () => {
          const db = req.result;
          try {
            if (!db.objectStoreNames.contains('notes')) {
              resolve([]);
              return;
            }
            const tx = db.transaction('notes', 'readonly');
            const store = tx.objectStore('notes');
            const getAllReq = store.getAll();
            getAllReq.onsuccess = () => resolve(getAllReq.result || []);
            getAllReq.onerror = () => reject(getAllReq.error);
          } catch (e) {
            reject(e);
          }
        };
      });
    });
  }

  /**
   * Retrieves a single note by unique_id from IndexedDB.
   */
  static async getNoteById(page: Page, uniqueId: string): Promise<IDBNote | null> {
    return await page.evaluate((id) => {
      return new Promise<IDBNote | null>((resolve, reject) => {
        const req = indexedDB.open('OnlineNotepadDB');
        req.onerror = () => reject(new Error('Failed to open OnlineNotepadDB database'));
        req.onsuccess = () => {
          const db = req.result;
          try {
            if (!db.objectStoreNames.contains('notes')) {
              resolve(null);
              return;
            }
            const tx = db.transaction('notes', 'readonly');
            const store = tx.objectStore('notes');
            const getReq = store.get(id);
            getReq.onsuccess = () => resolve(getReq.result || null);
            getReq.onerror = () => reject(getReq.error);
          } catch (e) {
            reject(e);
          }
        };
      });
    }, uniqueId);
  }

  /**
   * Verifies the userID of a note in IndexedDB.
   */
  static async verifyUserId(page: Page, uniqueId: string, expectedUserId: number | null): Promise<boolean> {
    const note = await this.getNoteById(page, uniqueId);
    if (!note) return false;
    return note.userID === expectedUserId;
  }

  /**
   * Verifies the syncStatus of a note in IndexedDB.
   */
  static async verifySyncStatus(page: Page, uniqueId: string, expectedSyncStatus: number): Promise<boolean> {
    const note = await this.getNoteById(page, uniqueId);
    if (!note) return false;
    return note.syncStatus === expectedSyncStatus;
  }

  static async getDatabaseSnapshot(
    page: Page,
    databaseName = 'OnlineNotepadDB',
    sampleLimit = 15
  ): Promise<IndexedDBDatabaseSnapshot> {
    return await page.evaluate(
      ({ databaseName, sampleLimit }) => {
        const summarizeRecord = (record: Record<string, unknown>) => {
          const summary: Record<string, unknown> = {};
          const importantFields = [
            'unique_id',
            'id',
            'userID',
            'syncStatus',
            'lastSyncedAt',
            'created_at',
            'updated_at',
            'deleted_at',
            'title',
            'labelId',
            'name',
            'color',
            'notedId',
            'cachedAt',
          ];

          for (const field of importantFields) {
            if (field in record) {
              summary[field] = record[field];
            }
          }

          if ('content' in record && typeof record.content === 'string') {
            summary.contentLength = record.content.length;
            summary.contentPreview = record.content.slice(0, 120);
          }

          return Object.keys(summary).length > 0 ? summary : record;
        };

        return new Promise<IndexedDBDatabaseSnapshot>((resolve, reject) => {
          const request = indexedDB.open(databaseName);

          request.onerror = () => reject(new Error(`Failed to open ${databaseName}`));
          request.onsuccess = () => {
            const db = request.result;
            const storeNames = Array.from(db.objectStoreNames);
            const snapshot: IndexedDBDatabaseSnapshot = {
              databaseName,
              capturedAt: new Date().toISOString(),
              stores: [],
            };

            if (storeNames.length === 0) {
              db.close();
              resolve(snapshot);
              return;
            }

            let pending = storeNames.length;
            const done = () => {
              pending -= 1;
              if (pending === 0) {
                db.close();
                resolve(snapshot);
              }
            };

            for (const storeName of storeNames) {
              const transaction = db.transaction(storeName, 'readonly');
              const store = transaction.objectStore(storeName);
              const storeSnapshot: IndexedDBStoreSnapshot = {
                storeName,
                keyPath: store.keyPath as string | string[] | null,
                autoIncrement: store.autoIncrement,
                indexes: Array.from(store.indexNames),
                recordCount: 0,
                sampleRecords: [],
              };

              const countRequest = store.count();
              countRequest.onsuccess = () => {
                storeSnapshot.recordCount = countRequest.result;
              };

              const cursorRequest = store.openCursor();
              cursorRequest.onsuccess = () => {
                const cursor = cursorRequest.result;
                if (cursor && storeSnapshot.sampleRecords.length < sampleLimit) {
                  storeSnapshot.sampleRecords.push(summarizeRecord(cursor.value));
                  cursor.continue();
                }
              };

              transaction.oncomplete = () => {
                snapshot.stores.push(storeSnapshot);
                done();
              };
              transaction.onerror = () => {
                snapshot.stores.push(storeSnapshot);
                done();
              };
            }
          };
        });
      },
      { databaseName, sampleLimit }
    );
  }
}
