import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EconomiaController } from './economia.controller';
import { EconomiaService } from './economia.service';

@Module({
  imports: [AuthModule],
  controllers: [EconomiaController],
  providers: [EconomiaService],
  exports: [EconomiaService],
})
export class EconomiaModule {}
