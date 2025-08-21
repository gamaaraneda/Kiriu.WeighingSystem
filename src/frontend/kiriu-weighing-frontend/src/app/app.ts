import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastModule],
  template: `
    <p-toast key="top-right" position="top-right"></p-toast>
    <router-outlet></router-outlet>
  `,
  styles: [],
})
export class AppComponent {
  title = 'kiriu-weighing-frontend';
}
