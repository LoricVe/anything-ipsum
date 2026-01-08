/**
 * Tests API pour Anything Ipsum
 *
 * Ces tests vérifient les endpoints de l'API Express
 */

const request = require('supertest');

// Configuration des variables d'environnement pour les tests
process.env.MISTRAL_API_KEY = 'test_api_key_mock';
process.env.APP_URL = 'http://localhost:4000';
process.env.NODE_ENV = 'test';

// Import du serveur de test
const app = require('./test-server.js');

describe('API Anything Ipsum', () => {

  test('GET /api/health doit retourner le statut healthy', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('timestamp');
  });

  test('GET /api/health doit contenir uptime et ai_connection', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('uptime');
    expect(response.body).toHaveProperty('ai_connection');
    expect(typeof response.body.uptime).toBe('number');
    expect(typeof response.body.ai_connection).toBe('boolean');
  });

  test('POST /api/generate-lorem doit retourner du contenu avec paramètres valides', async () => {
    // Mock de l'API Mistral
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: 'Space pirates naviguer galactique trésor astéroïde. Vaisseau spatial combat laser. Équipage rebelle planète lointaine aventure cosmos.'
          }
        }]
      })
    });

    const response = await request(app)
      .post('/api/generate-lorem')
      .send({
        theme: 'Space pirates',
        paragraphs: 1,
        paragraphLength: 'court',
        stream: false
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('text');
    expect(response.body.text.length).toBeGreaterThan(0);
  });

  test('POST /api/generate-lorem avec theme vide doit retourner 400', async () => {
    const response = await request(app)
      .post('/api/generate-lorem')
      .send({
        theme: '',
        paragraphs: 1,
        paragraphLength: 'court'
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
  });

  test('POST /api/generate-lorem avec length «long» doit générer plus de contenu', async () => {
    // Mock avec un contenu plus long
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: 'Space pirates naviguer galactique trésor astéroïde vaisseau spatial combat laser équipage rebelle planète lointaine aventure cosmos. ' +
                     'Capitaine corsaire interstellaire butin étoile filante. Abordage station spatiale fusil plasma armure exosquelette. ' +
                     'Traîtrise mutinerie code honneur pirate galaxie bordure. Alliance flotte mystère ancient alien technologie perdue. ' +
                     'Navigation hyperdrive saut quantique dimension parallèle. Légende trésor cosmique carte stellaire secret enfoui.'
          }
        }]
      })
    });

    const response = await request(app)
      .post('/api/generate-lorem')
      .send({
        theme: 'Space pirates',
        paragraphs: 1,
        paragraphLength: 'long',
        stream: false
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.text.length).toBeGreaterThan(100);
  });

  test('POST /api/generate-lorem sans paragraphs doit retourner 400', async () => {
    const response = await request(app)
      .post('/api/generate-lorem')
      .send({
        theme: 'Test theme',
        paragraphLength: 'moyen'
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('success', false);
  });

  test('POST /api/generate-lorem avec paragraphLength invalide doit retourner 400', async () => {
    const response = await request(app)
      .post('/api/generate-lorem')
      .send({
        theme: 'Test theme',
        paragraphs: 2,
        paragraphLength: 'tres-long' // Invalide
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body.error).toContain('court, moyen, long ou variable');
  });

});
