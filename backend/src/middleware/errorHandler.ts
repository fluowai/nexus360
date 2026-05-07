import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('--- [SERVER_ERROR_LOG] ---');
  console.error('Timestamp:', new Date().toISOString());
  console.error('Method:', req.method);
  console.error('Path:', req.path);
  console.error('Message:', err.message);
  
  // Erros do Prisma (Banco de Dados)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002: Unique constraint failed
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[]) || ['campo'];
      return res.status(409).json({
        success: false,
        error: `Conflito de dados: O valor para '${target.join(', ')}' já está em uso.`,
        code: 'DB_DUPLICATE_ENTRY'
      });
    }
    
    // P2003: Foreign key constraint failed
    if (err.code === 'P2003') {
      return res.status(400).json({
        success: false,
        error: 'Erro de relacionamento: O registro pai não foi encontrado.',
        code: 'DB_RELATION_ERROR'
      });
    }

    // P2025: Record not found
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Registro não encontrado no banco de dados.',
        code: 'DB_NOT_FOUND'
      });
    }
  }

  // Erros de Validação (Simulando Zod futuramente)
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Dados inválidos enviados na requisição.',
      details: err.details,
      code: 'VALIDATION_ERROR'
    });
  }

  // Erro Padrão (Fallback)
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: status === 500 ? 'Erro interno no servidor Nexus360.' : err.message,
    code: err.code || 'INTERNAL_ERROR',
    // stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};
