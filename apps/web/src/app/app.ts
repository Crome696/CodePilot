import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Data } from 'data';
import { Ui } from 'ui';
import { NxWelcome } from './nx-welcome';

@Component({
  imports: [NxWelcome, RouterModule, Ui, Data],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected title = 'web';
}
