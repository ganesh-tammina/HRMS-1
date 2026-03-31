import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AttendanceApiService } from '../../../core/services/attendance-api.service';
import { TimeFormatPipe } from '../../pipes/time-format.pipe';

interface CalendarDay {
  day: number | '';
  timing: string;
  isOff: boolean;
  date?: Date;
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [IonicModule, CommonModule, TimeFormatPipe],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
})
export class CalendarComponent implements OnInit {
  calendarDays: CalendarDay[] = [];
  today: Date = new Date();
  weekDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  currentMonth: Date = new Date();

  selectedDate: CalendarDay | null = null;
  attendanceDetails: any = null;
  loadingDetails = false;

  constructor(private attendanceApi: AttendanceApiService) { }

  ngOnInit() {
    this.generateCalendar(new Date());
    setTimeout(() => {
      const todayDay = this.calendarDays.find(d => d.date && this.isToday(d.date));
      if (todayDay) this.selectDate(todayDay);
    }, 100);
  }

  selectDate(cd: CalendarDay) {
    if (!cd.date) return;
    this.selectedDate = cd;
    this.loadDateDetails(cd.date);
  }

  loadDateDetails(date: Date) {
    this.loadingDetails = true;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    this.attendanceApi.getAttendanceDetailsByDate(dateStr).subscribe({
      next: (res) => { this.attendanceDetails = res; this.loadingDetails = false; },
      error: () => { this.attendanceDetails = null; this.loadingDetails = false; }
    });
  }

  prevMonth() {
    this.currentMonth = new Date(this.currentMonth.setMonth(this.currentMonth.getMonth() - 1));
    this.generateCalendar(this.currentMonth);
  }

  nextMonth() {
    this.currentMonth = new Date(this.currentMonth.setMonth(this.currentMonth.getMonth() + 1));
    this.generateCalendar(this.currentMonth);
  }

  generateCalendar(date: Date) {
    this.calendarDays = [];
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) {
      this.calendarDays.push({ day: '', timing: '', isOff: false });
    }

    for (let day = 1; day <= lastDate; day++) {
      let timing = '9:30 AM - 6:30 PM';
      let isOff = false;
      const d = new Date(year, month, day).getDay();
      if (d === 0 || d === 6) { timing = ''; isOff = true; }
      this.calendarDays.push({ day, timing, isOff, date: new Date(year, month, day) });
    }
  }

  isTodayCalendarDay(cd: CalendarDay): boolean {
    if (!cd.date) return false;
    return cd.date.getDate() === this.today.getDate() && cd.date.getMonth() === this.today.getMonth() && cd.date.getFullYear() === this.today.getFullYear();
  }

  isToday(day: Date): boolean {
    return day.getDate() === this.today.getDate() && day.getMonth() === this.today.getMonth() && day.getFullYear() === this.today.getFullYear();
  }

  getArrivalStatus(att: any): string {
    if (!att) return 'Unknown';
    const statusMap: { [key: string]: string } = { present: 'Present', absent: 'Absent', 'half-day': 'Half Day', late: 'Late Arrival', 'on-leave': 'On Leave' };
    return statusMap[att.status] || 'Unknown';
  }
}
