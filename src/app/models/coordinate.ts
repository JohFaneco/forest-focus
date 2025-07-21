import type { TreeImage } from "./treeImage"

export class Coordinate {
  x: number
  y: number
  treeImg: TreeImage | null = null

  constructor(_x: number, _y: number) {
    this.x = _x
    this.y = _y
  }
}
