
export type Pt = { x: number; y: number };

export type ShapeKind = 'rect' | 'trapezoid' | 'tileHex';

export interface ShapeData {
  id: string;
  kind: ShapeKind;
  x: number;   // top-left locale
  y: number;
  w: number;
  h: number;
  rot: number; // deg
  color: string;
  // parametri specifici (es. trapezio)
  topInset?: number; // 0..0.45 (percentuale del w su ciascun lato)
}

export interface KindCapabilities {
  resizable: boolean;
  rotatable: boolean;
  draggable: boolean;
  
  // manipolazioni speciali
  editableTopInset?: boolean; // mostra 2 handle sul lato superiore (solo trapezio)
}
