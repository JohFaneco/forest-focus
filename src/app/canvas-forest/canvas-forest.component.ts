import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { TreeImage } from '../models/treeImage';
import { Coordinate } from '../models/coordinate';
import { filter, from, of, switchMap, tap } from 'rxjs';
import { ForestControlService } from '../service/forest-control.service';
import { LocalStorageService } from '../service/local-storage.service';

@Component({
  selector: 'app-canvas-forest',
  imports: [],
  templateUrl: './canvas-forest.component.html',
  styleUrl: './canvas-forest.component.css'
})
export class CanvasForestComponent implements OnInit, OnDestroy, AfterViewInit {


  @ViewChild('forestCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasWrapper', { static: false }) canvasWrapper!: ElementRef<HTMLElement>;

  trees: Array<TreeImage> = []

  grassImg!: HTMLImageElement

  canvasWidth!: number;
  canvasHeight!: number;

  private ctx!: CanvasRenderingContext2D;

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

  private timeToGrow: number = 60 * 3

  private saveIntervalSeconds: number = 5

  constructor(private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.listenOnDestroyForest()
  }

  ngOnDestroy(): void {
  }

  ngAfterViewInit(): void {
    this.initSizeCanvas()
    this.cdr.detectChanges();
    const canvas = this.canvasRef.nativeElement;
    this.initImages()
    this.ctx = canvas.getContext('2d')!;
    this.waitImagesAndDraw()

    this.forestControlService.elapsedSeconds$
      .pipe(
        filter((seconds: number) => seconds > 0 && seconds % this.saveIntervalSeconds === 0)
      )
      .subscribe((seconds: number) => {
        this.saveInLocalStorage()
      })
  }


  /**
   * Init the width, the height and the number of tiles of the Canvas
   */
  private initSizeCanvas() {

    const wrapperTop = this.canvasWrapper.nativeElement.getBoundingClientRect().top

    const hScreen = window.innerHeight
    const wScreen = window.innerWidth

    this.canvasWidth = wScreen
    this.canvasHeight = hScreen - wrapperTop;

    this.offsetX = wScreen / 2
    this.offsetY = 0
    let maxTiles: number;

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


  }

  /**
   * Init the images for the tiles and the trees
   */
  private initImages(): void {
    this.grassImg = this.createNewImg("assets/tiles/grass3.png")
    this.trees = [
      this.createNewTree("assets/trees/evergreen_conifer_small.png", 10),
      this.createNewTree("assets/trees/evergreen_conifer_tall_autumn.png", 5),
      this.createNewTree("assets/trees/evergreen_conifer_tall.png", 10),
      this.createNewTree("assets/trees/conifer.png", 5),
      this.createNewTree("assets/trees/conifer_autumn.png", 5),
      this.createNewTree("assets/trees/dead_conifer.png", 2),
      this.createNewTree("assets/trees/dead_conifer_tall.png", 2),
    ]
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
   * Wait the tiles and the image's trees for loading, then start to listen
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
      switchMap(() => this.forestControlService.elapsedSeconds$),
      filter(seconds => seconds !== 0 && (seconds === 10 || (seconds % this.timeToGrow === 0)))
    ).subscribe((seconds: number) => {
      this.generateCoordinatesTree()
    })
  }

  /**
   * Create a new image Tree
   * @param srcImage
   * @param weight
   * @param anchorYOffset
   */
  private createNewTree(srcImage: string, weight: number, anchorYOffset: number = 0): TreeImage {
    const imgObj = this.createNewImg(srcImage) as TreeImage
    imgObj.weight = weight
    imgObj.anchorYOffset = anchorYOffset
    return imgObj
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
    const treeToPlace = this.getRandomTree()
    let coordinates = new Coordinate(tileX, tileY)
    coordinates.treeImg = treeToPlace
    this.busyCells.push(coordinates)
    this.sortArrayByCoordinates()
  }

  /**
   * Pick randomly a tree in the list according to the weights trees
   */
  private getRandomTree() {
    // retrieve the weights
    const weights = this.trees.map((tree: TreeImage) => tree.weight)

    // create accumulative weights
    const cumulativeWeights = weights.reduce((accumulative: Array<number>, current: number, currentIndex: number) => {
      const acc = accumulative[currentIndex - 1] ? accumulative[currentIndex - 1] + current : current;
      accumulative.push(acc)
      return accumulative
    }, [])


    const randomScale = this.generateInt(cumulativeWeights[cumulativeWeights.length - 1])

    const pickIndexTree = cumulativeWeights.findIndex(w => randomScale < w)

    return this.trees[pickIndexTree]
  }


  /**
   * Generate x, y randomly
  */
  private generateRandomCoordinates() {
    // all the tiles are filled, no place for a new tree
    if (this.busyCells.length === this.allCells.length) {
      return {
        x: null,
        y: null
      }
    }

    // retrieve the free Cells
    const freeCells = this.allCells.filter((cell: Coordinate) => {
      return this.busyCells.every((busyCell: Coordinate) => {
        return busyCell.x !== cell.x || busyCell.y !== cell.y
      })
    })

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
  private generateInt(max: number): number {
    return Math.floor(Math.random() * max)
  }


  /**
   * Create a promise to load the grass
   * @returns
   */
  private loadGrass(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.grassImg.addEventListener("load", () => resolve(), { once: true });
    })
  }

  /**
   * Create a promise to wait loading all the trees
   * @returns
   */
  private loadImgTrees(): Promise<void[]> {
    return Promise.all(
      this.trees.map((image) => {
        if (image.complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
          image.addEventListener("load", () => resolve(), { once: true })
        })
      })
    );
  }

  /**
   * Save the grid and the time every X seconds
   */
  private saveInLocalStorage(): void {
    this.localStorageService.set("focutTime", Date.now().toString())
    this.localStorageService.set("gridBusyTrees", this.busyCells)
  }

  /**
   * Start a new counter to place trees in the grid
   */
  private generateCoordinatesTree(): void {
    const tileTreePosition = this.generateRandomCoordinates()
    if (tileTreePosition.x !== null && tileTreePosition.y !== null) {
      this.saveCoordinatesTree(tileTreePosition.x, tileTreePosition.y)
      this.drawIsoGrid()
      this.placeAllTrees()
    } else {
      console.log("No place anymore, we stop the counter :)")
      this.forestControlService.stopTimer()
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
    })
  }
}
