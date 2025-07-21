import { Component } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FocusForestComponent } from './forest-focus/focus-forest.component';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule, FocusForestComponent],
  template: `<app-focus-forest></app-focus-forest>`
})
export class AppComponent {
  title = 'focus-forest';
}




