import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HireEmployeesService {
  private candidateSource = new BehaviorSubject<any>(
    JSON.parse(sessionStorage.getItem('selectedCandidate') || 'null')
  );
  currentCandidate = this.candidateSource.asObservable();
  constructor(private http: HttpClient) { }

  setCandidate(candidate: any) {
    this.candidateSource.next(candidate);
    sessionStorage.setItem('selectedCandidate', JSON.stringify(candidate));
  }
  hireEmployyes(candidate: any) {
    this.candidateSource.next(candidate);
  }
  clearCandidate() {
    this.candidateSource.next(null);
    sessionStorage.removeItem('selectedCandidate');
  }

}
