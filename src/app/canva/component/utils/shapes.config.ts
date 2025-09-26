import { KindCapabilities, ShapeData, ShapeKind } from './types';

export const KIND_CAPS: Record<ShapeKind, KindCapabilities> = {

  rect:       { resizable: true,  rotatable: true, draggable: true },
  trapezoid:  { resizable: true,  rotatable: true, draggable: true, editableTopInset: true },
  tileHex:    { resizable: false, rotatable: true, draggable: true },
};

export const PALETTE: Array<Pick<ShapeData, 'kind'|'w'|'h'|'color'|'topInset'>> = [
    
  { kind: 'rect',      w: 180, h: 120, color: '#60a5fa' },
  { kind: 'trapezoid', w: 180, h: 120, color: '#f59e0b', topInset: 0.2 },
  { kind: 'tileHex',   w: 140, h: 120, color: '#34d399' },
];
