import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'leaves'
})
export class LeavesPipe implements PipeTransform {

  transform(value: unknown, ...args: unknown[]): unknown {
    return null;
  }

}
