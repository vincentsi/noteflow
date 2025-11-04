export const errorResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    error: { type: 'string' },
    message: { type: 'string' },
  },
  required: ['success', 'error'],
} as const

export const successResponse = (dataSchema: object) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: dataSchema,
  },
  required: ['success', 'data'],
})

export const paginatedResponse = (itemSchema: object) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: itemSchema,
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  },
})

export const standardResponses = (dataSchema: object) => ({
  200: successResponse(dataSchema),
  401: errorResponse,
  403: errorResponse,
  404: errorResponse,
  500: errorResponse,
})

export const createResponses = (dataSchema: object) => ({
  201: successResponse(dataSchema),
  400: errorResponse,
  401: errorResponse,
  403: errorResponse,
  500: errorResponse,
})

export const deleteResponses = {
  200: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      message: { type: 'string' },
    },
  },
  401: errorResponse,
  403: errorResponse,
  404: errorResponse,
  500: errorResponse,
}
