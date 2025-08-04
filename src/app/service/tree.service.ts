import { Injectable } from '@angular/core';
import { TreeImage } from '../models/treeImage';
import { Coordinate } from '../models/coordinate';

@Injectable({
  providedIn: 'root'
})
export class TreeService {

  constructor() { }

  /**
  * Get the number of trees that are missing from the last session
  */
  getNumberMissingTrees(timeTreeToGrow: number, dateSavedStorage: string | null): number {
    const lastDateSaved = dateSavedStorage
    if (!lastDateSaved) return 0
    const nowMs = Date.now()
    const lastDateSavedMs = Number(lastDateSaved)
    const elapsedMs = nowMs - lastDateSavedMs
    const elapsedSeconds = Math.floor(elapsedMs / 1000)
    const numberTreesMissing = Math.floor(elapsedSeconds / timeTreeToGrow)
    return numberTreesMissing
  }

  /**
   * Create the trees placed on the cells from the last session
   * @param trees
   * @param treesLastSession
   */
  createBusyCellsFromLastSession(trees: TreeImage[], treesLastSession: Array<any>): any {
    let busyCells: Coordinate[] = []
    const busyCellsLocalStorage =
      treesLastSession && treesLastSession.forEach(busyCellSaved => {
        const treeToLoad = trees.find(tree => busyCellSaved.src === tree.src)
        let coordinates = new Coordinate(busyCellSaved.x, busyCellSaved.y)
        coordinates.treeImg = treeToLoad ? treeToLoad : this.getRandomTree(trees)
        busyCells.push(coordinates)
      })
    return busyCells
  }

  /**
    * Pick randomly a tree in the list according to the weights trees
    */
  getRandomTree(trees: TreeImage[]): TreeImage {
    // retrieve the weights
    const weights = trees.map((tree: TreeImage) => tree.weight)

    // create accumulative weights
    const cumulativeWeights = weights.reduce((accumulative: Array<number>, current: number, currentIndex: number) => {
      const acc = accumulative[currentIndex - 1] ? accumulative[currentIndex - 1] + current : current;
      accumulative.push(acc)
      return accumulative
    }, [])


    const randomScale = this.generateInt(cumulativeWeights[cumulativeWeights.length - 1])

    const pickIndexTree = cumulativeWeights.findIndex(w => randomScale < w)

    return trees[pickIndexTree]
  }

  /**
   * Check if the coordinates of a tree are null
   * @param tileTreePosition
   */
  isCoordinatesNotNull(tileTreePosition: { x: number | null, y: number | null }): boolean {
    return tileTreePosition.x !== null && tileTreePosition.y !== null
  }

  /**
   * Create the trees of the application that will be inserted
   * @param createNewImg function for creating a new Image
   */
  createTrees(createNewImg: (src: string) => HTMLImageElement): TreeImage[] {
    return [
      this.createNewTree(createNewImg, "assets/trees/evergreen_conifer_small.png", 10),
      this.createNewTree(createNewImg, "assets/trees/evergreen_conifer_tall_autumn.png", 10),
      // this.createNewTree(createNewImg, "assets/trees/evergreen_conifer_tall.png", 10),
      // this.createNewTree(createNewImg, "assets/trees/conifer.png", 5),
      this.createNewTree(createNewImg, "assets/trees/conifer_custom.png", 15),
      this.createNewTree(createNewImg, "assets/trees/conifer_custom_autumn.png", 15),
      this.createNewTree(createNewImg, "assets/trees/tree_birch.png", 10),
      this.createNewTree(createNewImg, "assets/trees/tree_birch_autumn.png", 10),
      // this.createNewTree(createNewImg, "assets/trees/conifer_autumn.png", 5),
      this.createNewTree(createNewImg, "assets/trees/dead_conifer.png", 2),
      this.createNewTree(createNewImg, "assets/trees/dead_conifer_tall.png", 2),
    ]
  }

  /**
   * Create new coordinates for a random tree
   * @param trees
   * @param tileX
   * @param tileY
   */
  createNewCoordinateTree(trees: TreeImage[], tileX: number, tileY: number): any {
    const treeToPlace = this.getRandomTree(trees)
    let coordinates = new Coordinate(tileX, tileY)
    coordinates.treeImg = treeToPlace
    return coordinates
  }

  /**
   * Generate a random integer
   * @param max
   */
  private generateInt(max: number): number {
    return Math.floor(Math.random() * max)
  }

  /**
   * Create a new image Tree
   * @param srcImage
   * @param weight
   * @param anchorYOffset
   */
  private createNewTree(createNewImg: (src: string) => HTMLImageElement, srcImage: string, weight: number, anchorYOffset: number = 0): TreeImage {
    const imgObj = createNewImg(srcImage) as TreeImage
    imgObj.weight = weight
    imgObj.anchorYOffset = anchorYOffset
    return imgObj
  }
}
