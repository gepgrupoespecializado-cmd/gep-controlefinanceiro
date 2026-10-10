import { describe, expect, it } from 'bun:test';
import { quoteNumber, padNum } from '@/lib/format';
import { photoBytes } from '@/lib/photo';

describe('formato e fotos', () => {
  it('usa quatro dígitos para orçamento sem truncar ou alterar relatório', () => {
    expect(quoteNumber(1)).toBe('0001');
    expect(quoteNumber(403)).toBe('0403');
    expect(quoteNumber(10000)).toBe('10000');
    expect(quoteNumber(0)).toBe('…');
    expect(padNum(1)).toBe('000001');
  });
  it('mede bytes JPEG considerando o preenchimento base64', () => {
    expect(photoBytes('data:image/jpeg;base64,YQ==')).toBe(1);
    expect(photoBytes('data:image/jpeg;base64,YWI=')).toBe(2);
    expect(photoBytes('data:image/jpeg;base64,YWJj')).toBe(3);
  });
});