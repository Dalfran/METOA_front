import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Messagerie } from './messagerie';

describe('Messagerie', () => {
  let component: Messagerie;
  let fixture: ComponentFixture<Messagerie>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Messagerie],
    }).compileComponents();

    fixture = TestBed.createComponent(Messagerie);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
