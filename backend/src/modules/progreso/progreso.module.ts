import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProgresoController } from './progreso.controller';
import { ProgresoService } from './progreso.service';

@Module({
  imports: [AuthModule],
  controllers: [ProgresoController],
  providers: [ProgresoService],
})
export class ProgresoModule {}
