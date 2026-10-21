import { Module } from '@nestjs/common';
import { ProgresoService } from './progreso.service';

@Module({
  providers: [ProgresoService],
  exports: [ProgresoService],
})
export class ProgresoModule {}
