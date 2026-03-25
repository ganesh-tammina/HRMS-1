import { Component, OnInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-radial-time-graph',
  standalone: true, // ✅ makes it easy to import directly
  templateUrl: './radial-time-graph.component.html',
  styleUrls: ['./radial-time-graph.component.scss']
})
export class RadialTimeGraphComponent implements OnInit, OnDestroy {
  hourAngle: number = 0;
  minuteAngle: number = 0;
  secondAngle: number = 0;
  private timer: any;

  ngOnInit() {
    this.updateTime();
    this.timer = setInterval(() => this.updateTime(), 1000); // update every second
  }

  ngOnDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  updateTime() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    this.hourAngle = (hours % 24) * 15 + minutes * 0.25; // 360/24 = 15
    this.minuteAngle = minutes * 6 + seconds * 0.1; // 360/60 = 6
    this.secondAngle = seconds * 6; // 360/60 = 6
  }
  computeDashArray(angle: number): string {
    const circumference = 2 * Math.PI * 45; // 2πr
    const dash = (angle / 360) * circumference;
    return `${dash} ${circumference}`;
  }

  get currentTime(): string {
    const now = new Date();
    return now.toLocaleTimeString();
  }
}
