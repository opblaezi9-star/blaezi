import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

import authRoutes from './server/routes/auth.routes';
import medicineRoutes from './server/routes/medicines.routes';
import batchRoutes from './server/routes/batches.routes';
import inventoryRoutes from './server/routes/inventory.routes';
import purchaseRoutes from './server/routes/purchases.routes';
import dispensingRoutes from './server/routes/dispensing.routes';
import returnRoutes from './server/routes/returns.routes';
import supplierRoutes from './server/routes/suppliers.routes';
import patientRoutes from './server/routes/patients.routes';
import notificationRoutes from './server/routes/notifications.routes';
import reportRoutes from './server/routes/reports.routes';
import auditRoutes from './server/routes/audit.routes';
import userRoutes from './server/routes/users.routes';
import dashboardRoutes from './server/routes/dashboard.routes';
import shiftRoutes from './server/routes/shifts.routes';
import reagentRoutes from './server/routes/reagents.routes';
import { startExpiryMonitorBackgroundService } from './server/services/expiryAlertService';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body Parser
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Clinical & Healthcare Security Headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api', medicineRoutes); // /api/medicines, /api/categories
  app.use('/api/batches', batchRoutes);
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/purchases', purchaseRoutes);
  app.use('/api/dispensing', dispensingRoutes);
  app.use('/api/returns', returnRoutes);
  app.use('/api/suppliers', supplierRoutes);
  app.use('/api/patients', patientRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/audit', auditRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/shifts', shiftRoutes);
  app.use('/api/reagents', reagentRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  // Health Check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'SmartPharmacy Hospital Management Backend',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  });

  // Global Error Handler for API routes
  app.use('/api', (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('API Error:', err);
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Internal server error occurred.',
    });
  });

  // Vite Middleware for Development / Static serving for Production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🏥 SmartPharmacy Server running on http://0.0.0.0:${PORT}`);
    startExpiryMonitorBackgroundService();
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
