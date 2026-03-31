import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'replace',
    standalone: true
})
export class ReplaceCharacterPipe implements PipeTransform {
    transform(value: string, search: string, replacement: string): string {
        if (!value) return value;
        return value.replace(new RegExp(search, 'g'), replacement);
    }
}
