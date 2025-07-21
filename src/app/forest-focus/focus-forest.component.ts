import { Component, inject, OnDestroy, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { HostListener } from '@angular/core'
import { CanvasForestComponent } from "../canvas-forest/canvas-forest.component"
import { ForestControlService } from '../service/forest-control.service'


@Component({
  selector: 'app-focus-forest',
  standalone: true,
  imports: [CommonModule, FormsModule, CanvasForestComponent],
  templateUrl: './focus-forest.component.html',
  styleUrls: ['./focus-forest.component.scss'],
})
export class FocusForestComponent implements OnInit, OnDestroy {

  listActivated: boolean = false
  forestType = 'autumn'
  forestTypes = ['autumn', 'summer']
  nextId = 1

  focusActive: boolean = false
  firstFocusActivated: boolean = false
  formattedTimer: string = ""

  private forestControlService: ForestControlService = inject(ForestControlService)

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement
    const clickedInside = target.closest('.dropdown')

    if (!clickedInside) {
      this.listActivated = false
    }
  }


  ngOnInit(): void {
  }

  ngOnDestroy(): void {
  }


  // Starts a new focus session and adds a tree to the forest
  startFocus(): void {
    if (this.focusActive) return

    if (!this.firstFocusActivated) {
      this.firstFocusActivated = true
    }

    this.focusActive = true

    this.forestControlService.startTimer()

    this.forestControlService.elapsedSeconds$.subscribe((seconds: number) => {
      console.log(seconds)
      this.formattedTimer = this.getFormattedTime(seconds)
    })

  }

  // Stops focus session and timers
  stopFocus(): void {
    this.focusActive = false
    this.forestControlService.stopTimer()
  }

  /**
   * Hide the list of the forest Type
   */
  showHideList() {
    this.listActivated = !this.listActivated
  }


  /**
   * Show the timer in format HH:mm:ss
   * @param seconds
   * @returns
   */
  getFormattedTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    const parts = []
    if (hours > 0) parts.push(`${hours}h`)
    if (minutes > 0 || hours > 0) parts.push(`${minutes}m`)
    parts.push(`${s}s`)
    return parts.join(' ')
  }


  deleteForest(): void {
    this.forestControlService.deleteForest()
    this.firstFocusActivated = false
    this.stopFocus()
  }

}
