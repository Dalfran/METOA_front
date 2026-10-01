import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailsTrajet } from './details-trajet';

describe('DetailsTrajet', () => {
  let component: DetailsTrajet;
  let fixture: ComponentFixture<DetailsTrajet>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetailsTrajet],
    }).compileComponents();

    fixture = TestBed.createComponent(DetailsTrajet);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
