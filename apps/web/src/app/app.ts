import { Component } from '@angular/core';
import { OverviewPage } from './pages/overview/overview';

@Component({
  imports: [OverviewPage],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
