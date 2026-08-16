import { Component } from '@angular/core';
import { Data } from 'data';
import {
  Avatar,
  Badge,
  Card,
  CardSection,
  Input,
  NavItem,
  Separator,
  StatusDot,
} from 'ui';

@Component({
  imports: [
    Avatar,
    Badge,
    Card,
    CardSection,
    Data,
    Input,
    NavItem,
    Separator,
    StatusDot,
  ],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = 'CodePilot';
  protected readonly preserveDataDependency = false;
}
