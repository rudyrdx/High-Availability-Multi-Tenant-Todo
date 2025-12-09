import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Multi-Tenant Todo API',
            version: '1.0.0',
            description: 'A multi-tenant todo application API with JWT authentication and Neo4j graph database',
            contact: {
                name: 'API Support',
                email: 'support@example.com'
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT'
            }
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development server'
            },
            {
                url: 'https://api.production.com',
                description: 'Production server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter your JWT token in the format: Bearer <token>'
                }
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: false
                        },
                        message: {
                            type: 'string',
                            example: 'Error message'
                        },
                        error: {
                            type: 'string',
                            example: 'Detailed error information'
                        }
                    }
                },
                ValidationError: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: false
                        },
                        errors: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    path: {
                                        type: 'array',
                                        items: { type: 'string' }
                                    },
                                    message: {
                                        type: 'string'
                                    }
                                }
                            }
                        }
                    }
                },
                Tenant: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            example: '123e4567-e89b-12d3-a456-426614174000'
                        },
                        name: {
                            type: 'string',
                            example: 'Acme Corp'
                        },
                        slug: {
                            type: 'string',
                            example: 'acme'
                        },
                        isActive: {
                            type: 'boolean',
                            example: true
                        }
                    }
                },
                User: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            example: '123e4567-e89b-12d3-a456-426614174001'
                        },
                        tenant_id: {
                            type: 'string',
                            format: 'uuid'
                        },
                        username: {
                            type: 'string',
                            example: 'john_doe'
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            example: 'john@acme.com'
                        },
                        full_name: {
                            type: 'string',
                            example: 'John Doe'
                        },
                        role: {
                            type: 'string',
                            enum: ['admin', 'member'],
                            example: 'member'
                        },
                        created_at: {
                            type: 'integer',
                            format: 'int64',
                            example: 1638360000000
                        }
                    }
                },
                Todo: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            example: '123e4567-e89b-12d3-a456-426614174002'
                        },
                        title: {
                            type: 'string',
                            example: 'Complete project documentation'
                        },
                        description: {
                            type: 'string',
                            nullable: true,
                            example: 'Write comprehensive API documentation'
                        },
                        is_completed: {
                            type: 'boolean',
                            example: false
                        },
                        due_date: {
                            type: 'string',
                            format: 'date-time',
                            nullable: true,
                            example: '2024-12-31T23:59:59Z'
                        },
                        priority: {
                            type: 'string',
                            enum: ['low', 'medium', 'high'],
                            example: 'high'
                        },
                        category_id: {
                            type: 'string',
                            format: 'uuid',
                            nullable: true
                        },
                        completed_at: {
                            type: 'string',
                            format: 'date-time',
                            nullable: true
                        },
                        created_at: {
                            type: 'string',
                            format: 'date-time',
                            example: '2024-01-01T00:00:00Z'
                        },
                        updated_at: {
                            type: 'string',
                            format: 'date-time',
                            example: '2024-01-01T00:00:00Z'
                        },
                        user_id: {
                            type: 'string',
                            format: 'uuid'
                        },
                        tenant_id: {
                            type: 'string',
                            format: 'uuid'
                        }
                    }
                },
                Category: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            example: '123e4567-e89b-12d3-a456-426614174003'
                        },
                        user_id: {
                            type: 'string',
                            format: 'uuid'
                        },
                        tenant_id: {
                            type: 'string',
                            format: 'uuid'
                        },
                        name: {
                            type: 'string',
                            example: 'Work'
                        },
                        color: {
                            type: 'string',
                            pattern: '^#[0-9A-Fa-f]{6}$',
                            example: '#3B82F6'
                        },
                        icon: {
                            type: 'string',
                            nullable: true,
                            example: 'briefcase'
                        },
                        created_at: {
                            type: 'string',
                            format: 'date-time',
                            example: '2024-01-01T00:00:00Z'
                        }
                    }
                }
            }
        },
        tags: [
            {
                name: 'Tenant',
                description: 'Tenant management endpoints'
            },
            {
                name: 'User',
                description: 'User authentication and management'
            },
            {
                name: 'Todo',
                description: 'Todo CRUD operations'
            },
            {
                name: 'Category',
                description: 'Category CRUD operations'
            }
        ]
    },
    apis: ['./src/routes/**/*.js'] // Path to the API routes
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
