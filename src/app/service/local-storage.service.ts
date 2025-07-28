import { Injectable } from '@angular/core';
import { KeyLocalStorage } from '../models/keyLocalStorage';
import { Coordinate } from '../models/coordinate';

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

  clearAll(): void {
    localStorage.clear()
  }

  /**
   * Save the canvas properties
   */
  saveCanvas(mapCols: number, mapRows: number, offsetX: number, offsetY: number, canvasWidth: number, canvasHeight: number): void {
    this.set(KeyLocalStorage.MapCols, mapCols)
    this.set(KeyLocalStorage.MapRows, mapRows)
    this.set(KeyLocalStorage.OffsetX, offsetX)
    this.set(KeyLocalStorage.OffsetY, offsetY)
    this.set(KeyLocalStorage.CanvasWidth, canvasWidth)
    this.set(KeyLocalStorage.CanvasHeight, canvasHeight)
  }

  /**
  * Save the trees in the grid and the time every X seconds
  */
  saveTimeAndTreeTiles(busyCells: Coordinate[]): void {
    this.set(KeyLocalStorage.FocusTime, Date.now().toString())
    this.saveTreesLocalStorage(busyCells)
  }

  /**
   * Create an array of serializable properties and save it in the localStorage
   */
  private saveTreesLocalStorage(busyCells: Coordinate[]): void {
    const serializableBusyCells = busyCells.map((cell: Coordinate) => {
      return {
        x: cell.x,
        y: cell.y,
        src: cell.treeImg?.src
      }
    })
    this.set(KeyLocalStorage.GridTrees, serializableBusyCells)
  }

}
