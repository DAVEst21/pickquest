import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { crearApp } from './ayudas-e2e';

/** El documento de Swagger se arma al arrancar (main.ts): un DTO mal declarado tumbaría el servidor. */
describe('Swagger (e2e)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    ({ app } = await crearApp());
  });
  afterAll(async () => {
    await app.close();
  });

  it('construye el documento con los endpoints del Sprint 3', () => {
    const documento = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('PickQuest').build(),
    );
    for (const ruta of [
      '/tienda',
      '/estudio/temas',
      '/plan/diagnosticos',
      '/reto-diario/hoy',
      '/duelos',
      '/clasificacion',
      '/perfil',
    ]) {
      expect(Object.keys(documento.paths)).toContain(ruta);
    }
  });
});
