
import { ShapeData, Pt } from './types';
import { edgesOf, segProjection, intervalOverlap, clamp01, len, dot, mapPoints, localPointsFor } from './geom';

export interface SnapOptions {
  snapPx: number;
  angleEpsDeg?: number;   // default 12
  tangentSlack?: number;  // default = snapPx
}

export type PolyProvider = (s: ShapeData) => { poly: Pt[]; aabb: DOMRect };

export function snapEdgeToEdge(
  moving: ShapeData, others: ShapeData[], provide: PolyProvider,
  nx:number, ny:number, opt: SnapOptions
): { dx:number; dy:number } | null {

  const { snapPx, angleEpsDeg=12, tangentSlack=snapPx } = opt;
  const cosThresh = Math.cos((angleEpsDeg*Math.PI)/180);

  const m = { ...moving, x: nx, y: ny };
  const mGeo = provide(m);
  const mEdges = edgesOf(mGeo.poly);

  let best: {dx:number; dy:number; dist:number} | null = null;

  for (const o of others) {

    const oGeo = provide(o);

    // broad phase
    const M = snapPx*1.5;
    const far = (mGeo.aabb.x > oGeo.aabb.x + oGeo.aabb.width  + M) ||
                (oGeo.aabb.x > mGeo.aabb.x + mGeo.aabb.width  + M) ||
                (mGeo.aabb.y > oGeo.aabb.y + oGeo.aabb.height + M) ||
                (oGeo.aabb.y > mGeo.aabb.y + mGeo.aabb.height + M);
    if (far) continue;

    const oEdges = edgesOf(oGeo.poly);

    for (const me of mEdges) {

      const mtx = me.b.x - me.a.x, mty = me.b.y - me.a.y;
      const ml = len(mtx,mty); const umtx = mtx/ml, umty = mty/ml;

      for (const te of oEdges) {
        const ttx = te.b.x - te.a.x, tty = te.b.y - te.a.y;
        const tl = len(ttx,tty); const uttx = ttx/tl, utty = tty/tl;

        // paralleli
        if (Math.abs(dot(umtx,umty,uttx,utty)) < cosThresh) continue;

        const [mMin,mMax] = segProjection(me.a,me.b,uttx,utty);
        const [tMin,tMax] = segProjection(te.a,te.b,uttx,utty);
        const ov = intervalOverlap(mMin,mMax,tMin,tMax);
        if (ov <= -tangentSlack) continue;

        // distanza perpendicolare
        const npx = -utty, npy = uttx;
        const mid = { x:(me.a.x+me.b.x)/2, y:(me.a.y+me.b.y)/2 };
        const dSigned = (mid.x - te.a.x)*npx + (mid.y - te.a.y)*npy;
        const dist = Math.abs(dSigned);
        if (dist <= snapPx) {
          const dx = -dSigned * npx;
          const dy = -dSigned * npy;
          if (!best || dist < best.dist) best = { dx, dy, dist };
        }
      }
    }
  }
  return best ? { dx: best.dx, dy: best.dy } : null;
}

export function snapCornerToEdge(
  moving: ShapeData, others: ShapeData[], provide: PolyProvider,
  nx:number, ny:number, opt: SnapOptions
): { dx:number; dy:number } | null {

  const { snapPx } = opt;

  const m = { ...moving, x: nx, y: ny };
  const mGeo = provide(m);
  let best: {dx:number; dy:number; dist:number} | null = null;

  for (const o of others) {

    const oGeo = provide(o);
    const oEdges = edgesOf(oGeo.poly);

    for (const p of mGeo.poly) {
      for (const e of oEdges) {

        const vx = e.b.x - e.a.x, vy = e.b.y - e.a.y;
        const wx = p.x - e.a.x, wy = p.y - e.a.y;
        const L2 = vx*vx + vy*vy || 1;
        const t = clamp01((wx*vx + wy*vy)/L2);
        const sx = e.a.x + t*vx, sy = e.a.y + t*vy;
        const dx = p.x - sx, dy = p.y - sy;
        const dist = Math.hypot(dx,dy);

        if (dist <= snapPx) {
          if (!best || dist < best.dist) best = { dx: -dx, dy: -dy, dist };
        }
      }
    }
  }
  
  return best ? { dx: best.dx, dy: best.dy } : null;
}
