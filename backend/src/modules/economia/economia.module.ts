import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EconomiaController } from './economia.controller';
import { EconomiaService } from './economia.service';
import { TiendaService } from './tienda.service';

@Module({
  imports: [AuthModule],
  controllers: [EconomiaController],
  providers: [EconomiaService, TiendaService],
  exports: [EconomiaService, TiendaService],
})
export class EconomiaModule {}
