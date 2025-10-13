import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { GlobalSpinnerComponent } from './shared/components/global-spinner/global-spinner.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastModule, GlobalSpinnerComponent],
  template: `
    <p-toast key="top-right" position="top-right"></p-toast>
    <app-global-spinner></app-global-spinner>
    <router-outlet></router-outlet>
  `,
  styles: [],
})
export class AppComponent {
  title = 'kiriu-weighing-frontend';
}
