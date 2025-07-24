import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {

  constructor() { }

  /**
   * Save a new item in the locaStorage
   * @param key
   * @param value
   */
  set<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value))
  }

  /**
   * Get an item from the localStorage
   * @param key
   * @returns
   */
  get<T>(key: string): T | null {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  }

  /**
   * Remove an item in the localStorage
   * @param key
   */
  remove(key: string): void {
    localStorage.removeItem(key)
  }
}
