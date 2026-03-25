import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'timeFormat',
    standalone: true
})
export class TimeFormatPipe implements PipeTransform {
    /**
     * Transforms decimal hours (e.g. 8.5) into HH:mm (e.g. 08:30)
     * or a numeric string into HH:mm.
     */
    transform(value: any): string {
        if (value === null || value === undefined || value === '') {
            return '00:00';
        }

        const numericValue = parseFloat(value);
        if (isNaN(numericValue)) {
            return value; // Return as is if not a number
        }

        const hours = Math.floor(numericValue);
        const minutes = Math.round((numericValue - hours) * 60);

        const hDisplay = hours.toString().padStart(2, '0');
        const mDisplay = minutes.toString().padStart(2, '0');

        return `${hDisplay}:${mDisplay}`;
    }
}
