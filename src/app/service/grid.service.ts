import { Injectable } from '@angular/core';
import { Coordinate } from '../models/coordinate';

@Injectable({
  providedIn: 'root'
})
export class GridService {

  constructor() { }


  /**
  * Generate x, y randomly
 */
  /**
   * Generate x and y randomly on the cells that are empty
   * @param allCells
   * @param busyCells
   * @returns
   */
  generateRandomCoordinates(allCells: Coordinate[], busyCells: Coordinate[]) {
    // all the tiles are filled, no place for a new tree
    if (busyCells.length === allCells.length) {
      return {
        x: null,
        y: null
      }
    }

    // retrieve the free Cells
    const freeCells = this.getFreeCells(allCells, busyCells)

    // among the freeCells, pick randomly an index
    const iGenerated = this.generateInt(freeCells.length)
    return {
      x: freeCells[iGenerated].x,
      y: freeCells[iGenerated].y
    }
  }

  /**
   * Get the free cells in the grid
   * @param allCells
   * @param busyCells
   */
  private getFreeCells(allCells: Coordinate[], busyCells: Coordinate[]): Coordinate[] {
    return allCells.filter((cell: Coordinate) => {
      return busyCells.every((busyCell: Coordinate) => {
        return busyCell.x !== cell.x || busyCell.y !== cell.y
      })
    })
  }

  /**
   * Generate a random integer
   * @param max
   */
  private generateInt(max: number): number {
    return Math.floor(Math.random() * max)
  }
}
