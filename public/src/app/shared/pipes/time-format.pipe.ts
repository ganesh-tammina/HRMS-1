import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'timeFormat', standalone: true })
export class TimeFormatPipe implements PipeTransform {
  transform(value: any): string {
    if (value === null || value === undefined || value === '') return '00:00';
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return value;
    const hours = Math.floor(numericValue);
    const minutes = Math.round((numericValue - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
}
