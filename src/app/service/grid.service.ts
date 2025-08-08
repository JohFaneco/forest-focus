import { Injectable } from '@angular/core';
import { Coordinate } from '../models/coordinate';
import { SeasonEnum } from '../models/seasonEnum';
import { TileImage } from '../models/tileImage';

@Injectable({
  providedIn: 'root'
})
export class GridService {

  constructor() { }

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
   * Generate a random integer
   * @param max
   */
  generateInt(max: number): number {
    return Math.floor(Math.random() * max)
  }


  /**
   * Get the soil according to the selected season
   * @param season
   */
  getSoilBySeason(season: string | null, createNewImg: (src: string) => HTMLImageElement): Array<HTMLImageElement> {
    let listTilesSoil: HTMLImageElement[] = []
    switch (season) {
      case SeasonEnum.Autumn:
        listTilesSoil = this.getListSoilAutumn(createNewImg)
        break
      case SeasonEnum.Summer:
        listTilesSoil = this.getListSoilSummer(createNewImg)
        break
      default:
        listTilesSoil = this.getListSoilAutumn(createNewImg)
        break
    }
    return listTilesSoil
  }


  /**
   * Get an image for the tile, randomly or taken in the memory
   * @param xScreen
   * @param yScreen
   * @param gridSoilImages
   * @param soilSeasonImages
   * @param pushInMemory
   */
  getHtmlImageElemenSoil(xScreen: number, yScreen: number, gridSoilImages: TileImage[], soilSeasonImages: HTMLImageElement[], pushInMemory?: (tile: TileImage) => void): HTMLImageElement {
    // seach in the saved tiles
    let imgTile = gridSoilImages.find((cell: TileImage) => cell.coordinate.x === xScreen && cell.coordinate.y === yScreen)

    let htmlImageElement
    if (imgTile && imgTile.srcImg) {
      const findCellImg = soilSeasonImages.find((htmlEl: HTMLImageElement) => htmlEl.src === imgTile.srcImg)
      // take the image reference
      if (findCellImg) {
        htmlImageElement = findCellImg
      } else {
        // if not image, pick a random image for this tile
        htmlImageElement = this.generateRandomSoil(soilSeasonImages)
      }
    } else {
      // generate random soil from the season
      htmlImageElement = this.generateRandomSoil(soilSeasonImages)
    }
    let imgCoordinateToSave = {
      coordinate: { x: xScreen, y: yScreen },
      srcImg: htmlImageElement.src
    } as TileImage
    pushInMemory?.(imgCoordinateToSave)
    return htmlImageElement
  }

  /**
 * Generate a random img for the cell
 */
  private generateRandomSoil(soilSeasonImages: HTMLImageElement[]): any {
    let soilIndexRandom = this.generateInt(soilSeasonImages.length)
    return soilSeasonImages[soilIndexRandom]
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
   * Get the list of the autumn soils
   * @param createNewImg
   */
  private getListSoilAutumn(createNewImg: (src: string) => HTMLImageElement): HTMLImageElement[] {
    return [
      createNewImg("assets/tiles/autumn/autumn1.png"),
      createNewImg("assets/tiles/autumn/autumn2.png"),
      createNewImg("assets/tiles/autumn/autumn3.png"),
      createNewImg("assets/tiles/autumn/autumn4.png"),
    ]
  }

  /**
   * Get the list of the summer soils
   * @param createNewImg
   */
  private getListSoilSummer(createNewImg: (src: string) => HTMLImageElement): HTMLImageElement[] {
    return [
      createNewImg("assets/tiles/summer/grass1.png"),
      createNewImg("assets/tiles/summer/grass2.png"),
      createNewImg("assets/tiles/summer/grass3.png"),
    ]
  }

}
