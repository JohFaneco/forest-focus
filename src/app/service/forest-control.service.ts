import { Injectable } from '@angular/core';
import { BehaviorSubject, interval, Observable, Subject, Subscription } from 'rxjs';
import { LocalStorageService } from './local-storage.service';
import { KeyLocalStorage } from '../models/keyLocalStorage';

@Injectable({
  providedIn: 'root'
})
export class ForestControlService {


  private _isFocusing = new BehaviorSubject<boolean>(false)
  private _isDeleteForest = new Subject<void>()
  private _elapsedSeconds = new BehaviorSubject<number>(0)
  private _isForestComplete = new BehaviorSubject<boolean>(false)

  isFocusing$ = this._isFocusing.asObservable()
  isDeleteForest$ = this._isDeleteForest.asObservable()
  elapsedSeconds$ = this._elapsedSeconds.asObservable()
  isForestComplete$ = this._isForestComplete.asObservable()

  private _timerSub: Subscription | null = null

  private dateNow: number | null = null
  private pasteDate: number | null = null

  constructor(private localStorageService: LocalStorageService) { }

  /**
   * Start the timer where it stopped
   */
  startTimer(): void {

    if (this._timerSub) return;

    this._isFocusing.next(true)

    this._timerSub = interval(1000).subscribe(() => {
      const delta = this.calculateDelta()

      const current = this._elapsedSeconds.value
      const newElapsedValue = delta < 1 ? current + 1 : current + delta
      this._elapsedSeconds.next(newElapsedValue)

      this.saveTimerDate(newElapsedValue)
    })
  }

  /**
   * Stop the timer, but not reset it
   */
  stopTimer(): void {
    this._isFocusing.next(false)
    this._timerSub?.unsubscribe()
    this._timerSub = null
  }

  /**
   * Reset the timer and the forest
   */
  deleteForest(): void {
    this.stopTimer()
    this._elapsedSeconds.next(0)
    this._isDeleteForest.next()
  }

  /**
   * Emit the timer from the last session
   * @param timerLastSession
   */
  setElapsedSecondsFromSession(timerLastSession: number): void {
    this._elapsedSeconds.next(timerLastSession)
  }

  /**
   * Emit a boolean if the forest is complete
   * @param complete
   */
  setCompleteForest(complete: boolean): void {
    this._isForestComplete.next(complete)
  }

  /**
   * Adjusts for throttled timers when the tab is inactive or in the background
   * Calculates the number of seconds that passed since the last timer.
   */
  private calculateDelta(): number {

    this.dateNow = Date.now()
    if (!this.pasteDate) {
      this.pasteDate = this.dateNow
    }

    const wasInBreak = this.localStorageService.get(KeyLocalStorage.Break)

    // The delta is 0 if the user was in a break during the last session
    if (wasInBreak === true) {
      this.localStorageService.set(KeyLocalStorage.Break, false)
      this.pasteDate = this.dateNow
      return 0
    }

    const delta = Math.floor((this.dateNow - this.pasteDate) / 1000)
    this.pasteDate = this.dateNow
    return delta
  }

  /**
   * Save the timer in the localStorage
   * @param elapsedTime
   */
  private saveTimerDate(elapsedTime: number): void {
    this.localStorageService.set(KeyLocalStorage.LastTimerValue, elapsedTime)
    this.localStorageService.set(KeyLocalStorage.LastSaveDate, Date.now().toString())
  }

  /**
   * Log the timer
   */
  private showLogsTimer(): void {
    const current = this._elapsedSeconds.value
    const minutes = Math.floor(current / 60);
    const seconds = current % 60;
    console.log(`${minutes}m ${seconds.toString().padStart(2, '0')}s`);
  }

}
