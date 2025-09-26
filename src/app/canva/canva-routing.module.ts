import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MapCanvasComponent } from './component/map-canvas/map-canvas.component';

const routes: Routes = [
    {path: '', component: MapCanvasComponent}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CanvaRoutingModule { }
