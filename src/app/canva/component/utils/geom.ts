
import { Pt, ShapeData } from './types';

export function rectLocalPoints(w:number, h:number): Pt[] {
  return [ {x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h} ];
}

export function trapezoidLocalPoints(w:number, h:number, inset=0.2): Pt[] {

  const dx = Math.max(0, Math.min(0.45, inset)) * w;

  return [ {x:dx,y:0},{x:w-dx,y:0},{x:w,y:h},{x:0,y:h} ];
}

export function hexLocalPoints(w:number, h:number): Pt[] {

  const a = w/4;
  return [
    {x:a/2,y:0},{x:w-a/2,y:0},{x:w,y:h/2},
    {x:w-a/2,y:h},{x:a/2,y:h},{x:0,y:h/2}
  ];
}

export function localPointsFor(s: ShapeData): Pt[] {
  switch (s.kind) {
    case 'trapezoid': return trapezoidLocalPoints(s.w, s.h, s.topInset ?? 0.2);
    case 'tileHex':   return hexLocalPoints(s.w, s.h);
    default:          return rectLocalPoints(s.w, s.h);
  }
}

// mappa punti locali → mondo (DOMMatrix translate+rotate)
export function mapPoints(points: Pt[], m: DOMMatrix): Pt[] {

  return points.map(p => {

    const q = new DOMPoint(p.x, p.y).matrixTransform(m);
    return { x: q.x, y: q.y };
  });
}

export function edgesOf(poly: Pt[]): { a: Pt; b: Pt }[] {

  const out = [];
  for (let i=0;i<poly.length;i++) out.push({ a: poly[i], b: poly[(i+1) % poly.length] });

  return out;
}

// util snap/overlap
export const dot = (ax:number,ay:number,bx:number,by:number) => ax * bx + ay * by;

export const len = (x:number,y:number)=>Math.hypot(x,y)||1;

export const clamp01 = (t:number)=>Math.max(0,Math.min(1,t));

export function segProjection(a:Pt,b:Pt, ux:number,uy:number) {

  const p1 = dot(a.x,a.y,ux,uy), p2 = dot(b.x,b.y,ux,uy);
  return [Math.min(p1,p2), Math.max(p1,p2)];
}

export function intervalOverlap(aMin:number,aMax:number,bMin:number,bMax:number) {
    
  return Math.min(aMax,bMax) - Math.max(aMin,bMin);
}
