import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AprendizajeController } from './aprendizaje.controller';
import { AprendizajeService } from './aprendizaje.service';

@Module({
  imports: [AuthModule],
  controllers: [AprendizajeController],
  providers: [AprendizajeService],
})
export class AprendizajeModule {}
