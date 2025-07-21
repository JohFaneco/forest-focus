import { Injectable } from '@angular/core';
import { BehaviorSubject, interval, Observable, Subject, Subscription } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ForestControlService {


  private _isFocusing = new BehaviorSubject<boolean>(false)
  private _isDeleteForest = new Subject<void>()
  private _elapsedSeconds = new BehaviorSubject<number>(0)

  isFocusing$ = this._isFocusing.asObservable()
  isDeleteForest$ = this._isDeleteForest.asObservable()
  elapsedSeconds$ = this._elapsedSeconds.asObservable()

  private _timerSub: Subscription | null = null

  constructor() { }



  /**
   * Start the timer where it stopped
   */
  startTimer(): void {

    if (this._timerSub) return;

    this._isFocusing.next(true)

    this._timerSub = interval(1000).subscribe(() => {
      const current = this._elapsedSeconds.value
      this._elapsedSeconds.next(current + 1)
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

}
