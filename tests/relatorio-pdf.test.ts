import { describe, expect, it } from 'bun:test';
import { jsPDF } from 'jspdf';
import { gerarRelatorioPDF } from '@/lib/relatorio-pdf';
import type { Relatorio } from '@/types/models';

const report: Relatorio = {
  id: 'report-test', numero: 12, agendamentoId: '', clienteId: '',
  servicoExecutado: 'Limpeza', descricao: 'Serviço executado', status: 'sucesso',
  dataExecucao: '2026-10-11', criadoEm: '2026-10-11',
  fotosAntes: [], fotosDurante: [], fotosDepois: [],
  valorOrcamento: 850, valorRecebido: 300, formasPagamentoRecebimento: ['pix'],
};

// Small synthetic RGB images, independent of customer records or browser APIs.
function image(width: number, height: number) {
  const doc = new jsPDF();
  doc.addImage({ imageData: { data: new Uint8ClampedArray(width * height * 4).fill(255), width, height }, format: 'RGBA', x: 0, y: 0, width, height });
  const images = (doc.internal as unknown as { collections: { addImage_images: Record<string, { data: string }> } }).collections.addImage_images;
  // A minimal uncompressed BMP is accepted by jsPDF and retains the dimensions.
  void images;
  const stride = Math.ceil(width * 3 / 4) * 4;
  const bytes = Buffer.alloc(54 + stride * height, 255);
  bytes.write('BM'); bytes.writeUInt32LE(bytes.length, 2); bytes.writeUInt32LE(54, 10);
  bytes.writeUInt32LE(40, 14); bytes.writeInt32LE(width, 18); bytes.writeInt32LE(height, 22);
  bytes.writeUInt16LE(1, 26); bytes.writeUInt16LE(24, 28); bytes.writeUInt32LE(0, 30);
  bytes.writeUInt32LE(stride * height, 34);
  return `data:image/bmp;base64,${bytes.toString('base64')}`;
}

const photos = [image(40, 80), image(80, 40), image(120, 18)];
function operations(doc: jsPDF) {
  return (doc.internal as unknown as { pages: string[][] }).pages.slice(1);
}

describe('fotos do relatório sem redesenhar o modelo', () => {
  for (const count of [0, 1, 3, 15]) {
    it(`preserva pagamento e limites com ${count} fotos`, () => {
      const doc = gerarRelatorioPDF({ ...report, fotosAntes: Array.from({ length: count }, (_, i) => photos[i % photos.length]) }, undefined, { nome: 'Empresa Teste' });
      const pages = operations(doc);
      const content = pages.flat().join('\n');
      expect(content).toContain('PAGAMENTO');
      expect(content).toContain('850,00');
      expect(content).toContain('300,00');
      expect(content).toContain('RELAT');
      let found = 0;
      for (const page of pages) {
        const text = page.join('\n');
        const placements = [...text.matchAll(/([\d.]+) 0 0 ([\d.]+) ([\d.]+) ([\d.]+) cm\n\/I\d+ Do/g)];
        for (const match of placements) {
          const [width, height, x, bottom] = match.slice(1).map(Number);
          expect(x).toBeGreaterThanOrEqual(57 - 0.01);
          expect(x + width).toBeLessThanOrEqual(538.29 + 0.01);
          expect(bottom).toBeGreaterThanOrEqual(87 - 0.01);
          expect(height).toBeLessThanOrEqual(169);
          expect(width / height).toBeCloseTo([0.5, 2, 120 / 18][found % 3], 3);
          found++;
        }
      }
      expect(found).toBe(count);
      if (count === 15) expect(pages.length).toBeGreaterThan(1);
    });
  }
  it('mantém fotos e pagamentos após descrição de múltiplas páginas', () => {
    const doc = gerarRelatorioPDF({ ...report, descricao: 'Conteúdo original do serviço. '.repeat(300), fotosAntes: photos, fotosDurante: photos, fotosDepois: photos }, undefined, { nome: 'Empresa Teste' });
    expect(doc.getNumberOfPages()).toBeGreaterThan(2);
    expect(operations(doc).flat().join('\n')).toContain('PAGAMENTO');
  });
  it('não preenche valores ausentes com dados fictícios', () => {
    const doc = gerarRelatorioPDF({ ...report, valorOrcamento: undefined, valorRecebido: undefined }, undefined, { nome: 'Empresa Teste' });
    const content = operations(doc).flat().join('\n');
    expect(content).not.toContain('850,00');
    expect(content).not.toContain('300,00');
    expect(content).toContain('Valor do Or');
  });
});