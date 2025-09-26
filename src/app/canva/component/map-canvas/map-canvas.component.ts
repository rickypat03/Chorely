import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KIND_CAPS, PALETTE } from '../utils/shapes.config';
import { ShapeData } from '../utils/types';
import { localPointsFor, mapPoints } from '../utils/geom';
import { snapCornerToEdge, snapEdgeToEdge } from '../utils/snap-engine';

@Component({
  selector: 'app-map-canvas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map-canvas.component.html',
  styleUrls: ['./map-canvas.component.scss'],
})
export class MapCanvasComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLDivElement>;

  shapes: ShapeData[] = [];
  palette = PALETTE;

  private SNAP = 8;

  private dragging?: { id: string; start:{x:number;y:number}; base:{x:number;y:number} };
  private resizing?: { id: string; corner:'tl'|'tr'|'bl'|'br'; start:{x:number;y:number}; base:ShapeData };
  private rotating?: { id: string; center:{x:number;y:number}; baseRot:number };
  private editingInset?: { id: string; side:'left'|'right'; startX:number; baseInset:number };

  ngAfterViewInit() {}
  ngOnDestroy() {}

  /* ------------- utilities view ------------- */
  toTransform(s: ShapeData) { return `translate(${s.x}px, ${s.y}px) rotate(${s.rot}deg)`; }
  caps(s: ShapeData) { return KIND_CAPS[s.kind]; }

  /* ------------- provider geometria per lo snap ------------- */
  private provide = (s: ShapeData) => {

    const m = new DOMMatrix().translate(s.x, s.y).rotate(s.rot);
    const local = localPointsFor(s);
    const poly = mapPoints(local, m);
    const el = this.getEl(s.id);
    const aabb = el ? el.getBoundingClientRect() : new DOMRect(s.x, s.y, s.w, s.h);

    return { poly, aabb };
  };

  private getEl(id:string) {
    return this.canvasRef.nativeElement.querySelector(`[data-id="${id}"]`) as HTMLElement | null;
  }

  private others(id:string) { return this.shapes.filter(s => s.id !== id); }

  /* ------------- Drag&Drop: palette → canvas ------------- */

  onPaletteDragStart(ev: DragEvent, p: typeof this.palette[number]) {

    ev.dataTransfer?.setData('application/x-shape', JSON.stringify(p));

    const img = new Image();
    img.src =
      'data:image/svg+xml;base64,' +
      btoa('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>');

    // fallback se dataTransfer o metodo non disponibili
    if (ev.dataTransfer && typeof ev.dataTransfer.setDragImage === 'function') {
      ev.dataTransfer.setDragImage(img, 0, 0);
    }
  }

  onCanvasDragOver(ev: DragEvent) {
    ev.preventDefault(); // consente drop
  }

  onCanvasDrop(ev: DragEvent) {

    ev.preventDefault();

    const json = ev.dataTransfer?.getData('application/x-shape');

    if (!json) return;

    const payload = JSON.parse(json) as typeof this.palette[number];
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = (ev.clientX - rect.left) - payload.w/2;
    const y = (ev.clientY - rect.top)  - payload.h/2;

    const s: ShapeData = {
      id: crypto.randomUUID(),
      kind: payload.kind,
      x, y,
      w: payload.w, h: payload.h,
      rot: 0,
      color: payload.color,
      topInset: payload.topInset ?? 0.2,
    };
    this.shapes.push(s);
  }

  /* ------------- Pointer interactions ------------- */

  onShapePointerDown(ev: PointerEvent, s: ShapeData) {

    if (!this.caps(s).draggable) return;

    if ((ev.target as HTMLElement).classList.contains('handle')) return;

    ev.preventDefault();

    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const start = { x: ev.clientX - rect.left, y: ev.clientY - rect.top };

    this.dragging = { id: s.id, start, base: { x: s.x, y: s.y } };

    (this.canvasRef.nativeElement as any).setPointerCapture?.(ev.pointerId);
  }

  onResize(ev: PointerEvent, s: ShapeData, corner:'tl'|'tr'|'bl'|'br') {

    if (!this.caps(s).resizable) return;

    ev.stopPropagation(); ev.preventDefault();

    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const start = { x: ev.clientX - rect.left, y: ev.clientY - rect.top };

    this.resizing = { id: s.id, corner, start, base: { ...s } };

    (this.canvasRef.nativeElement as any).setPointerCapture?.(ev.pointerId);
  }

  onRotate(ev: PointerEvent, s: ShapeData) {

    if (!this.caps(s).rotatable) return;

    ev.stopPropagation(); ev.preventDefault();

    this.rotating = {
      id: s.id,
      center: { x: s.x + s.w / 2, y: s.y + s.h / 2 },
      baseRot: s.rot,
    };

    (this.canvasRef.nativeElement as HTMLElement).setPointerCapture?.(ev.pointerId);
  }

  onTopInset(ev: PointerEvent, s: ShapeData, side:'left'|'right') {

    if (!this.caps(s).editableTopInset) return;

    ev.stopPropagation(); ev.preventDefault();

    this.editingInset = { id: s.id, side, startX: ev.clientX, baseInset: s.topInset ?? 0.2 };

    (this.canvasRef.nativeElement as any).setPointerCapture?.(ev.pointerId);
  }

  onPointerMove(ev: PointerEvent) {

    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const cur = { x: ev.clientX - rect.left, y: ev.clientY - rect.top };

    // drag
    if (this.dragging) {

      const s = this.shapes.find(x => x.id === this.dragging!.id)!;
      let nx = this.dragging.base.x + (cur.x - this.dragging.start.x);
      let ny = this.dragging.base.y + (cur.y - this.dragging.start.y);

      // snap
      const e = snapEdgeToEdge(s, this.others(s.id), this.provide, nx, ny, { snapPx: this.SNAP });
      if (e) { nx += e.dx; ny += e.dy; }
      else {
        const c = snapCornerToEdge(s, this.others(s.id), this.provide, nx, ny, { snapPx: this.SNAP });
        if (c) { nx += c.dx; ny += c.dy; }
      }

      // clamp semplice (TL-based)
      nx = Math.min(Math.max(nx, 0), rect.width  - s.w);
      ny = Math.min(Math.max(ny, 0), rect.height - s.h);

      s.x = nx; s.y = ny;
      return;
    }

    // resize
    if (this.resizing) {

      const r = this.resizing;
      const s = this.shapes.find(x => x.id === r.id)!;
      const dx = cur.x - r.start.x;
      const dy = cur.y - r.start.y;

      let nx = r.base.x, ny = r.base.y, nw = r.base.w, nh = r.base.h;
      switch (r.corner) {

        case 'tl': nx = r.base.x + dx; ny = r.base.y + dy; nw = r.base.w - dx; nh = r.base.h - dy; break;
        case 'tr': ny = r.base.y + dy; nw = r.base.w + dx; nh = r.base.h - dy; break;
        case 'bl': nx = r.base.x + dx; nw = r.base.w - dx; nh = r.base.h + dy; break;
        case 'br': nw = r.base.w + dx; nh = r.base.h + dy; break;
      }

      s.x = nx; s.y = ny;
      s.w = Math.max(24, nw); s.h = Math.max(24, nh);

      return;
    }

    // rotate
    if (this.rotating) {

      const r = this.rotating;
      const target = this.shapes.find(x => x.id === r.id)!;
      const angle = Math.atan2(cur.y - r.center.y, cur.x - r.center.x) * 180 / Math.PI;
      target.rot = r.baseRot + angle;

      return;
    }

    // top inset edit (solo trapezio)
    if (this.editingInset) {

      const r = this.editingInset;
      const s = this.shapes.find(x => x.id === r.id)!;
      const deltaPx = (ev.clientX - r.startX);
      const deltaPercent = deltaPx / s.w; // approx nel sistema locale
      const sign = r.side === 'left' ? 1 : -1;
      const newInset = Math.max(0, Math.min(0.45, (s.topInset ?? 0.2) + sign * deltaPercent));
      s.topInset = newInset;
      return;
    }
  }

  onPointerUp(_: PointerEvent) {
    
    this.dragging = undefined;
    this.resizing = undefined;
    this.rotating = undefined;
    this.editingInset = undefined;
  }
}
