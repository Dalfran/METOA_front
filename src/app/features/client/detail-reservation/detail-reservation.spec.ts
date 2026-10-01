import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailReservation } from './detail-reservation';

describe('DetailReservation', () => {
  let component: DetailReservation;
  let fixture: ComponentFixture<DetailReservation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetailReservation],
    }).compileComponents();

    fixture = TestBed.createComponent(DetailReservation);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
