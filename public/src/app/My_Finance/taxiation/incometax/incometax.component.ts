import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-incometax',
  templateUrl: './incometax.component.html',
  styleUrls: ['./incometax.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class IncometaxComponent implements OnInit {
  months = ['APR 24', 'MAY 24', 'JUN 24', 'JUL 24', 'AUG 24', 'SEP 24', 'OCT 24', 'NOV 24', 'DEC 24', 'JAN 25', 'FEB 25', 'MAR 25'];
  
  summaryCards = [
    { label: 'NET TAXABLE INCOME', value: '₹ 9,33,680' },
    { label: 'GROSS INCOME TAX', value: '₹ 33,388' },
    { label: 'TOTAL SURCHARGE & CESS', value: '₹ 1,336' },
    { label: 'NET INCOME TAX PAYABLE', value: '₹ 34,724' },
    { label: 'TAX PAID TILL NOW', value: '₹ 0' },
  ];

  earnings = [
    { name: 'Basic', total: 320112, values: [26676, 26676, 26676, 26676, 26676, 26676, 26676, 26676, 26676, 26676, 26676, 26676] },
    { name: 'HRA', total: 128040, values: [10670, 10670, 10670, 10670, 10670, 10670, 10670, 10670, 10670, 10670, 10670, 10670] },
    { name: 'Medical Allowance', total: 15000, values: [1250, 1250, 1250, 1250, 1250, 1250, 1250, 1250, 1250, 1250, 1250, 1250] },
    { name: 'Transport Allowance', total: 19200, values: [1600, 1600, 1600, 1600, 1600, 1600, 1600, 1600, 1600, 1600, 1600, 1600] },
    { name: 'Special Allowance', total: 356528, values: [24034, 24034, 24034, 24034, 24034, 24034, 24034, 24034, 24034, 24034, 24034, 24034] },
    { name: 'PF - Employer', total: 21600, values: [1800, 1800, 1800, 1800, 1800, 1800, 1800, 1800, 1800, 1800, 1800, 1800] }
  ];

  taxSlabs = [
    { range: '0% Tax on income up to 400000', amount: 0 },
    { range: '5% Tax on income between 400001 and 800000', amount: 20000 },
    { range: '10% Tax on income between 800001 and 1200000', amount: 13388 },
    { range: '15% Tax on income between 1200001 and 1600000', amount: 0 },
    { range: '20% Tax on income between 1600001 and 2000000', amount: 0 },
    { range: '25% Tax on income between 2000001 and 2400000', amount: 0 },
    { range: '30% Tax on income above 2400000', amount: 0 },
  ];

  constructor() { }

  ngOnInit() {}
}
