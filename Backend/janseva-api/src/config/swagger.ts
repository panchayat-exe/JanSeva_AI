import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './environment';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'JanSeva AI — API Documentation',
      version: '1.0.0',
      description:
        'Production-grade REST API for the JanSeva AI Citizen Grievance Redressal Platform. ' +
        'Built for Smart India Hackathon 2026.',
      contact: {
        name: 'JanSeva AI Team',
        email: 'api@janseva.gov.in',
      },
      license: {
        name: 'Government Open Data License',
        url: 'https://data.gov.in/government-open-data-license-version-2',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}/api/${env.API_VERSION}`,
        description: 'Development Server',
      },
      {
        url: `https://api.janseva.gov.in/api/${env.API_VERSION}`,
        description: 'Production Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT access token',
        },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object' },
            meta: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' },
              },
            },
            timestamp: { type: 'string', format: 'date-time' },
            requestId: { type: 'string' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
            code: { type: 'string' },
            statusCode: { type: 'integer' },
            timestamp: { type: 'string', format: 'date-time' },
            requestId: { type: 'string' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication & authorization' },
      { name: 'Users', description: 'User profile & settings' },
      { name: 'Complaints', description: 'Grievance management' },
      { name: 'AI', description: 'AI-powered features' },
      { name: 'Files', description: 'File upload & management' },
      { name: 'Search', description: 'Search & discovery' },
      { name: 'Dashboard', description: 'Analytics & statistics' },
      { name: 'Admin', description: 'Admin operations (restricted)' },
      { name: 'Notifications', description: 'User notifications' },
    ],
  },
  apis: ['./src/modules/**/*.routes.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
