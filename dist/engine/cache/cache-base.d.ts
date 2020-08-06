import { Cache, AsyncCache } from './cache-interfaces';
/**
 * An in-memory LRU cache
 * @author Thomas Minier
 */
export declare class BaseLRUCache<K, T> implements Cache<K, T> {
    private readonly _content;
    /**
     * Constructor
     * @param maxSize - The maximum size of the cache
     * @param maxAge - Maximum age in ms
     * @param length - Function that is used to calculate the length of stored items
     * @param onDispose - Function that is called on items when they are dropped from the cache
     */
    constructor(maxSize: number, maxAge: number, length?: (item: T) => number, onDispose?: (key: K, item: T) => void);
    put(key: K, item: T): void;
    has(key: K): boolean;
    get(key: K): T | null;
    delete(key: K): void;
    count(): number;
}
/**
 * Data-structure used for the base implementation of an asynchronous cache.
 * @author Thomas Minier
 */
export interface AsyncCacheEntry<T, I> {
    /** The cache entry's content */
    content: Array<T>;
    /** The ID of the writer that is allowed to edit the cache entry */
    writerID: I;
    /** All reads that wait for this cache entry to be committed */
    pendingReaders: Array<(items: Array<T>) => void>;
    /** Whether the cache entry is availbale for read or not */
    isComplete: boolean;
}
/**
 * A base class for implementing an asynchronous cache.
 * It simply needs to provides a data structure used to cache items
 * @author Thomas Minier
 */
export declare abstract class BaseAsyncCache<K, T, I> implements AsyncCache<K, T, I> {
    private readonly _cache;
    /**
     * Constructor
     */
    constructor(cacheInstance: Cache<K, AsyncCacheEntry<T, I>>);
    has(key: K): boolean;
    update(key: K, item: T, writerID: I): void;
    commit(key: K, writerID: I): void;
    get(key: K): Promise<T[]> | null;
    delete(key: K, writerID: I): void;
    count(): number;
}
/**
 * An in-memory LRU implementation of an asynchronous cache.
 * @author Thomas Minier
 */
export declare class AsyncLRUCache<K, T, I> extends BaseAsyncCache<K, T, I> {
    /**
     * Constructor
     * @param maxSize - The maximum size of the cache
     * @param maxAge - Maximum age in ms
     * @param length - Function that is used to calculate the length of stored items
     * @param onDispose - Function that is called on items when they are dropped from the cache
     */
    constructor(maxSize: number, maxAge: number, length?: (item: AsyncCacheEntry<T, I>) => number, onDispose?: (key: K, item: AsyncCacheEntry<T, I>) => void);
}
