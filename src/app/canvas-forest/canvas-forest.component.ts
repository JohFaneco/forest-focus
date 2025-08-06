import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { TreeImage } from '../models/treeImage';
import { Coordinate } from '../models/coordinate';
import { filter, from, of, switchMap, tap } from 'rxjs';
import { ForestControlService } from '../service/forest-control.service';
import { LocalStorageService } from '../service/local-storage.service';
import { KeyLocalStorage } from '../models/keyLocalStorage';
import { TreeService } from '../service/tree.service';
import { GridService } from '../service/grid.service';

@Component({
  selector: 'app-canvas-forest',
  imports: [],
  templateUrl: './canvas-forest.component.html',
  styleUrl: './canvas-forest.component.css'
})
export class CanvasForestComponent implements OnInit, OnDestroy, AfterViewInit {


  @ViewChild('forestCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>
  @ViewChild('canvasWrapper', { static: false }) canvasWrapper!: ElementRef<HTMLElement>

  trees: Array<TreeImage> = []

  grassImg!: HTMLImageElement

  canvasWidth!: number
  canvasHeight!: number

  private ctx!: CanvasRenderingContext2D

  private tileWidth: number = 64
  private tileHeight: number = 32

  private mapCols!: number
  private mapRows!: number

  private offsetX!: number
  private offsetY!: number

  private allCells: Array<Coordinate> = []
  private busyCells: Array<Coordinate> = []

  private forestControlService: ForestControlService = inject(ForestControlService)

  private localStorageService: LocalStorageService = inject(LocalStorageService)

  private treeService: TreeService = inject(TreeService)

  private gridService: GridService = inject(GridService)

  private timeToGrow: number = 60 * 2
  private timeFirstTree: number = 10

  private loadGridFromLocalStorage: boolean = false

  constructor(private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.listenOnDestroyForest()
  }

  ngOnDestroy(): void {
  }

  ngAfterViewInit(): void {

    // get from the localStorage or init a new grid configuration
    if (this.localStorageService.get("mapCols")) {
      this.initSiveCanvasFromStorage()
    } else {
      this.initSizeCanvas()
    }

    this.cdr.detectChanges()
    const canvas = this.canvasRef.nativeElement
    this.initImages()
    this.ctx = canvas.getContext('2d')!
    this.waitImagesAndDraw()
  }



  /**
   * Init the configuration of the grid from the localStorage
   */
  private initSiveCanvasFromStorage(): void {
    this.mapCols = this.localStorageService.get("mapCols")!
    this.mapRows = this.localStorageService.get("mapRows")!
    this.offsetX = this.localStorageService.get("offsetX")!
    this.offsetY = this.localStorageService.get("offsetY")!
    this.canvasWidth = this.localStorageService.get("canvasWidth")!
    this.canvasHeight = this.localStorageService.get("canvasHeight")!
    this.loadGridFromLocalStorage = true
  }

  /**
   * Init the width, the height and the number of tiles of the Canvas
   */
  private initSizeCanvas() {

    const wrapperTop = this.canvasWrapper.nativeElement.getBoundingClientRect().top

    const hScreen = window.innerHeight
    const wScreen = window.innerWidth

    this.canvasWidth = wScreen
    this.canvasHeight = hScreen - wrapperTop

    this.offsetX = wScreen / 2
    this.offsetY = 0
    let maxTiles: number

    // let a space for wide screens, enough to show the images
    if (wScreen > hScreen) {
      this.offsetY = this.tileHeight * 4
    }

    const maxTilesHeight = Math.floor((hScreen - wrapperTop - this.offsetY) / this.tileHeight)
    const maxTilesWidth = Math.floor(wScreen / this.tileWidth)

    // define the tiles we can configure
    maxTiles = Math.min(maxTilesHeight, maxTilesWidth)
    const gridPixelHeight = (maxTiles * 2) * (this.tileHeight / 2)
    this.offsetY = (this.canvasHeight / 2) - (gridPixelHeight / 2)

    this.mapCols = this.mapRows = maxTiles

    this.localStorageService.saveCanvas(this.mapCols, this.mapRows, this.offsetX, this.offsetY, this.canvasWidth, this.canvasHeight)
  }

  /**
   * Init the images for the tiles and the trees
   */
  private initImages(): void {
    this.grassImg = this.createNewImg("assets/tiles/grass3.png")
    this.treeService.seasonTrees$.subscribe((season: string | null) => {
      this.trees = this.treeService.createTrees(this.createNewImg)
    })
  }

  /**
   * Create a new image
   * @param srcImg
   * @returns
   */
  private createNewImg(srcImg: string): HTMLImageElement {
    const imgObj = new Image()
    imgObj.src = srcImg
    return imgObj
  }

  /**
   * Wait the tiles and the images trees for loading, then start to listen
   */
  private waitImagesAndDraw(): void {
    from(this.loadGrass()).pipe(
      tap(() => this.drawIsoGrid()),
      switchMap(() => {
        if (this.trees && this.trees.length > 0) {
          return from(this.loadImgTrees())
        } else {
          return from(of())
        }
      }),
      tap(() => {
        this.drawTreesFromLastSession()
      }),
      switchMap(() => this.forestControlService.elapsedSeconds$),
    ).subscribe((seconds: number) => {
      this.addAdditionalTreesIfMissing(seconds)
    })
  }

  /**
   * Draw the entire grid based on the number of cols and rows, then place the grass tiles
   */
  private drawIsoGrid(): void {
    this.allCells.length = 0
    this.allCells = []
    for (let y = 0; y < this.mapRows; y++) {
      for (let x = 0; x < this.mapCols; x++) {
        this.allCells.push(new Coordinate(x, y))
        const screen = this.isoToScreen(x, y)
        this.drawTile(screen.x, screen.y)
        this.placeGrass(screen.x, screen.y)
      }
    }
  }

  /**
   * Draw all the sorted trees in the grid
   */
  private placeAllTrees(): void {
    this.busyCells.forEach((coordinate: Coordinate) => {
      if (!coordinate.treeImg) return

      const tileX = coordinate.x
      const tileY = coordinate.y
      const pos = this.isoToScreen(tileX, tileY)

      const treeOffsetY = coordinate.treeImg.height - this.tileHeight - coordinate.treeImg.anchorYOffset
      this.ctx.drawImage(coordinate.treeImg, pos.x - (coordinate.treeImg.width / 2), pos.y - treeOffsetY)
    })
  }



  /**
   * Create an isometric tile based on x and y
   * @param x
   * @param y
   */
  private drawTile(x: number, y: number): void {
    this.ctx.strokeStyle = "transparent"
    this.ctx.beginPath()
    this.ctx.moveTo(x, y)
    this.ctx.lineTo(x + this.tileWidth / 2, y + this.tileHeight / 2)
    this.ctx.lineTo(x, y + this.tileHeight)
    this.ctx.lineTo(x - this.tileWidth / 2, y + this.tileHeight / 2)
    this.ctx.closePath()
    this.ctx.stroke()
  }

  /**
   * Transform the coordinates x and y into pixel coordinates
   * @param x
   * @param y
   * @returns
   */
  private isoToScreen(x: number, y: number) {
    return {
      x: this.offsetX + (x - y) * (this.tileWidth / 2),
      y: this.offsetY + (x + y) * (this.tileHeight / 2)
    }
  }

  /**
   * sort busyCells by coordinates
   */
  private sortArrayByCoordinates(): void {
    this.busyCells.sort((a: Coordinate, b: Coordinate) => {
      if (a.y !== b.y) {
        return a.y - b.y
      }
      return a.x - b.x
    })
  }

  /**
   * Draw the grass tile
   * @param xScreen
   * @param yScreen
   */
  private placeGrass(xScreen: number, yScreen: number): void {
    const grassImgOffsetY = this.grassImg.height - this.tileHeight
    this.ctx.drawImage(this.grassImg, xScreen - this.tileWidth / 2, yScreen - grassImgOffsetY)
  }

  /**
   * Save the coordinates of a new generated tree
   * @param tileX
   * @param tileY
   */
  private saveCoordinatesTree(tileX: number, tileY: number) {
    this.busyCells.push(this.treeService.createNewCoordinateTree(this.trees, tileX, tileY))
    this.sortArrayByCoordinates()
  }

  /**
   * Create a promise to load the grass
   * @returns
   */
  private loadGrass(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.grassImg.addEventListener("load", () => resolve(), { once: true })
    })
  }

  /**
   * Create a promise to wait loading all the trees
   * @returns
   */
  private loadImgTrees(): Promise<void[]> {
    return Promise.all(
      this.trees.map((image) => {
        if (image.complete) return Promise.resolve()
        return new Promise<void>((resolve) => {
          image.addEventListener("load", () => resolve(), { once: true })
        })
      })
    )
  }

  /**
   * Generate all the coordinates of the missing trees since the last session
   * @param numberTreesMissing
   */
  private generateAndSaveCoordinatedMissingTrees(numberTreesMissing: number): void {
    if (numberTreesMissing === 0) return
    for (let i = 0; i < numberTreesMissing; i++) {
      const tileTreePosition = this.gridService.generateRandomCoordinates(this.allCells, this.busyCells)
      if (this.treeService.isCoordinatesNotNull(tileTreePosition)) {
        this.saveCoordinatesTree(tileTreePosition.x!, tileTreePosition.y!)
      } else {
        break
      }
    }
  }

  /**
   * When the forest is destroyed, draw the tiles and reset the trees
   */
  private listenOnDestroyForest(): void {
    this.forestControlService.isDeleteForest$.subscribe(() => {
      this.ctx.clearRect(0, 0, this.canvasRef.nativeElement.width, this.canvasRef.nativeElement.height);
      this.drawIsoGrid()
      this.busyCells.length = 0
      this.busyCells = []
      this.localStorageService.clearAll()
    })
  }

  /**
   * Place the trees saved in the localStorage, if a session exist
   */
  private drawTreesFromLastSession(): void {
    if (this.loadGridFromLocalStorage) {
      const treesLastSession = this.localStorageService.get(KeyLocalStorage.GridTrees) as Array<any>
      this.busyCells = this.treeService.createBusyCellsFromLastSession(this.trees, treesLastSession)
      const wasInBreak = this.localStorageService.get(KeyLocalStorage.Break)
      let missingTrees = 0
      if (wasInBreak === false) {
        missingTrees = this.treeService.getNumberMissingTrees(this.timeToGrow, this.localStorageService.get(KeyLocalStorage.LastSaveDate))
      }
      console.log(missingTrees)
      this.syncForestState(missingTrees)
      this.loadGridFromLocalStorage = false
    }
  }

  /**
   * Regenerate the grid and the trees in the right order
   */
  private regenerateGridAndTrees(): void {
    this.drawIsoGrid()
    this.placeAllTrees()
  }

  /**
   * Add missing trees due to the throttling of the timer
   * @param seconds
   */
  private addAdditionalTreesIfMissing(seconds: number): void {
    // Determine expected tree count, including the first one after `timeFirstTree`
    const nbTreeExpected = seconds < this.timeFirstTree ? 0 : Math.floor(seconds / this.timeToGrow) + 1
    if (nbTreeExpected > this.busyCells.length) {
      this.syncForestState(nbTreeExpected - this.busyCells.length)
    }
  }

  /**
   * Synchronise the forest when there was a throttle or a reboot sesssion
   * @param nbTreeExpected
   */
  private syncForestState(missingTrees: number): void {
    this.generateAndSaveCoordinatedMissingTrees(missingTrees)
    this.regenerateGridAndTrees()
    this.localStorageService.saveTreeTiles(this.busyCells)
    this.isFullForestAndStop()
  }

  /**
   * Check if the forest is full, then stop the timer and clean the localStorage
   */
  private isFullForestAndStop(): void {
    if (this.busyCells.length === this.allCells.length) {
      console.log("No place anymore, we stop the counter :)")
      this.forestControlService.stopTimer()
      this.localStorageService.clearAll()
      this.forestControlService.setCompleteForest(true)
    }
  }

}
