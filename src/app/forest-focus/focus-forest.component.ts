import { Component, inject, OnDestroy, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { HostListener } from '@angular/core'
import { CanvasForestComponent } from "../canvas-forest/canvas-forest.component"
import { ForestControlService } from '../service/forest-control.service'
import { LocalStorageService } from '../service/local-storage.service'
import { KeyLocalStorage } from '../models/keyLocalStorage'


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
  forestTypes = ['autumn']
  nextId = 1

  focusActive: boolean = false
  firstFocusActivated: boolean = false
  formattedTimer: string = ""

  private forestControlService: ForestControlService = inject(ForestControlService)
  private localStorageService: LocalStorageService = inject(LocalStorageService)

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement
    const clickedInside = target.closest('.dropdown')

    if (!clickedInside) {
      this.listActivated = false
    }
  }


  ngOnInit(): void {
    this.checkSavedSessionTimer()
    this.listenForestComplete()
  }

  ngOnDestroy(): void {
  }


  /**
   * Starts a new focus session
   */
  startFocus(): void {
    if (this.focusActive) return

    if (!this.firstFocusActivated) {
      this.firstFocusActivated = true
    }

    this.focusActive = true

    this.forestControlService.startTimer()

    this.forestControlService.elapsedSeconds$.subscribe((seconds: number) => {
      this.formattedTimer = this.getFormattedTime(seconds)
    })

    this.localStorageService.set(KeyLocalStorage.Break, false)
  }

  /**
   * Stops the focus session and timers
   */
  stopFocus(): void {
    this.focusActive = false
    this.forestControlService.stopTimer()
    this.localStorageService.set(KeyLocalStorage.Break, true)
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

  /**
   * Check if the last session had a timer saved and if the user was in focus/break mode
   */
  private checkSavedSessionTimer(): void {
    const wasInBreak = this.localStorageService.get(KeyLocalStorage.Break)
    const timerLastSession = this.localStorageService.get(KeyLocalStorage.LastTimerValue)
    this.forestControlService.setElapsedSecondsFromSession(Number(timerLastSession))
    if (timerLastSession) {
      this.firstFocusActivated = true
      this.formattedTimer = this.getFormattedTime(Number(timerLastSession))
    }
    if (wasInBreak === false) {
      this.startFocus()
    }
  }

  /**
   * Listen the observable when the forest is complete
   */
  private listenForestComplete(): void {
    this.forestControlService.isForestComplete$.subscribe((forestComplete: boolean) => {
      if (forestComplete) {
        this.focusActive = false
      }
    })
  }

}
