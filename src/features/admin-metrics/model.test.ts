import { describe, expect, it } from 'vitest';

import {
  buildChartScale,
  formatDayShort,
  getDateRange,
  mapMetricsRow,
  mapRevenueRows,
  mapTopCourseRows,
  saoPauloDate,
} from './model';
import { parsePeriod } from './schemas';

describe('parsePeriod', () => {
  it.each([
    ['7', 7],
    ['30', 30],
    ['90', 90],
    [undefined, 30],
    ['15', 30],
    ['abc', 30],
    [['90', '7'], 90],
  ])('%j -> %j', (input, expected) => {
    expect(parsePeriod(input as string | string[] | undefined)).toBe(expected);
  });
});

describe('saoPauloDate', () => {
  it('usa o dia civil de São Paulo (UTC-3), não o de UTC', () => {
    expect(saoPauloDate(new Date('2026-10-08T02:30:00Z'))).toBe('2026-10-07');
    expect(saoPauloDate(new Date('2026-10-08T03:00:00Z'))).toBe('2026-10-08');
  });
});

describe('getDateRange', () => {
  it('7 dias incluindo hoje, p_to exclusivo = início de amanhã em SP', () => {
    const r = getDateRange(7, new Date('2026-10-08T15:00:00Z'));
    expect(r.firstDay).toBe('2026-10-02');
    expect(r.lastDay).toBe('2026-10-08');
    expect(r.from).toBe('2026-10-02T00:00:00-03:00');
    expect(r.to).toBe('2026-10-09T00:00:00-03:00');
  });

  it('de madrugada em UTC ainda é "ontem" em SP', () => {
    const r = getDateRange(30, new Date('2026-10-08T01:00:00Z'));
    expect(r.lastDay).toBe('2026-10-07');
    expect(r.to).toBe('2026-10-08T00:00:00-03:00');
    expect(r.firstDay).toBe('2026-09-08');
  });

  it('cruza virada de mês/ano e o intervalo tem exatamente N dias', () => {
    const r = getDateRange(90, new Date('2027-01-05T12:00:00Z'));
    expect(r.firstDay).toBe('2026-10-08');
    const days = (Date.parse(r.to) - Date.parse(r.from)) / 86_400_000;
    expect(days).toBe(90);
  });

  it('respeita o limite de 366 dias do banco', () => {
    const r = getDateRange(90);
    expect((Date.parse(r.to) - Date.parse(r.from)) / 86_400_000).toBeLessThanOrEqual(366);
  });
});

describe('mapeamento bigint -> number', () => {
  const raw = {
    revenue_cents: '1248000',
    sales_count: 64,
    avg_ticket_cents: '19500',
    students_total: 212,
    students_new: '18',
    enrollments_purchase: 60,
    enrollments_admin_grant: 5,
    refunds_count: 2,
    pending_refund_requests: 1,
  };

  it('converte strings e soma matrículas', () => {
    const m = mapMetricsRow(raw);
    expect(m.revenueCents).toBe(1_248_000);
    expect(m.avgTicketCents).toBe(19_500);
    expect(m.studentsNew).toBe(18);
    expect(m.enrollmentsTotal).toBe(65);
  });

  it('rejeita linha inválida', () => {
    expect(() => mapMetricsRow({ ...raw, revenue_cents: 'x' })).toThrow();
  });

  it('mapeia série diária e top cursos', () => {
    expect(mapRevenueRows([{ day: '2026-10-08', revenue_cents: '-500', sales: 0 }])).toEqual([
      { day: '2026-10-08', revenueCents: -500, sales: 0 },
    ]);
    expect(
      mapTopCourseRows([
        { course_id: 'c1', slug: 'godot', title: 'Godot', sales: '3', revenue_cents: '59100' },
      ]),
    ).toEqual([{ courseId: 'c1', slug: 'godot', title: 'Godot', sales: 3, revenueCents: 59_100 }]);
  });
});

describe('formatDayShort', () => {
  it('dd/MM', () => expect(formatDayShort('2026-10-08')).toBe('08/10'));
});

describe('buildChartScale', () => {
  const day = (d: number, v: number) => ({
    day: `2026-10-${String(d).padStart(2, '0')}`,
    revenueCents: v,
    sales: 1,
  });

  it('só positivos: zero no rodapé do plot, maior barra ocupa a altura toda', () => {
    const s = buildChartScale([day(1, 100), day(2, 50)]);
    const plotBottom = s.height - 26;
    expect(s.zeroY).toBeCloseTo(plotBottom);
    expect(s.bars[0]!.y).toBeCloseTo(12);
    expect(s.bars[1]!.height).toBeCloseTo(s.bars[0]!.height / 2);
    expect(s.bars.every((b) => !b.negative)).toBe(true);
  });

  it('negativos descem abaixo da linha zero', () => {
    const s = buildChartScale([day(1, 100), day(2, -50)]);
    const neg = s.bars[1]!;
    expect(neg.negative).toBe(true);
    expect(neg.y).toBeCloseTo(s.zeroY); // começa no zero e desce
    expect(neg.y + neg.height).toBeGreaterThan(s.zeroY);
    expect(s.bars[0]!.y + s.bars[0]!.height).toBeCloseTo(s.zeroY); // positiva termina no zero
    expect(s.min).toBe(-50);
    expect(s.ticks.map((t) => t.value)).toEqual([100, 0, -50]);
    // zero dentro do plot
    expect(s.zeroY).toBeGreaterThan(12);
    expect(s.zeroY).toBeLessThan(s.height - 26);
  });

  it('só negativos: zero no topo', () => {
    const s = buildChartScale([day(1, -10)]);
    expect(s.zeroY).toBeCloseTo(12);
    expect(s.bars[0]!.height).toBeGreaterThan(0);
  });

  it('sem vendas ou lista vazia: barras de altura 0, sem NaN', () => {
    for (const input of [[day(1, 0), day(2, 0)], []]) {
      const s = buildChartScale(input);
      expect(s.ticks.map((t) => t.value)).toEqual([0]);
      for (const b of s.bars) {
        expect(b.height).toBe(0);
        expect(Number.isFinite(b.x) && Number.isFinite(b.y)).toBe(true);
      }
      expect(Number.isFinite(s.zeroY)).toBe(true);
    }
  });

  it('barras ficam dentro da área do gráfico, em ordem', () => {
    const s = buildChartScale(Array.from({ length: 90 }, (_, i) => day((i % 28) + 1, i * 10)));
    for (let i = 0; i < s.bars.length; i++) {
      const b = s.bars[i]!;
      expect(b.x).toBeGreaterThanOrEqual(52);
      expect(b.x + b.width).toBeLessThanOrEqual(s.width - 8 + 0.001);
      if (i > 0) expect(b.x).toBeGreaterThan(s.bars[i - 1]!.x);
    }
  });
});
