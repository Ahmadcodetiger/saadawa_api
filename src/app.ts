import cors from "cors";
import dotenv from "dotenv";
import express, { NextFunction, Request, Response } from "express";

import adminRoutes from "./routes/admin.routes.ts";
import authRoutes from "./routes/auth.routes.ts";
import billpaymentRoutes from "./routes/billpayment.routes.ts";
import notificationsRoutes from "./routes/notifications.routes.ts";
import paymentRoutes from "./routes/payment.routes.ts";
import paymentPointRoutes from './routes/paymentPoint.routes.ts';
import promotionsRoutes from "./routes/promotions.routes.ts";
import supportRoutes from "./routes/support.routes.ts";
import supportContentRoutes from "./routes/support_content.routes.ts";
import transactionsRoutes from "./routes/transactions.routes.ts";
import usersRoutes from "./routes/users.routes.ts";
import walletRoutes from "./routes/wallet.routes.ts";

// Import logging middleware
import { logger } from "./config/bootstrap.js";
import { detailedRequestLogger, errorLogger, requestLogger } from "./middleware/logger.middleware.ts";

dotenv.config();

const app = express();

// CORS Configuration - Allow ALL origins
app.use(cors()); // Allow all origins (default)

// Add PaymentPoint webhook to the raw body parser
app.use(
  ['/api/payment/webhook', '/api/payment/payrant/webhook', '/api/payment-point/webhook'], 
  express.raw({ type: 'application/json' })
);

// Parse JSON for all other routes
app.use(express.json());

// ============================================
// LOGGING MIDDLEWARE
// ============================================
// Log all incoming requests with details
app.use(detailedRequestLogger);

// Morgan logger for standard HTTP request logging
app.use(requestLogger);

logger.info('🚀 VTU App Backend Starting...', {
  environment: process.env.NODE_ENV || 'development',
  nodeVersion: process.version
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/transactions", transactionsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/promotions", promotionsRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/payment-point", paymentPointRoutes); // ADD THIS ROUTE
app.use("/api/billpayment", billpaymentRoutes);
app.use("/api/support-content", supportContentRoutes);


// Root route
app.get("/", (req: Request, res: Response) => {
  res.send("✅ SAADAWA Backend (MongoDB) is running...");
});

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok", message: "Server is running" });
});

// Test TopUpMate service
app.get("/api/test-topupmate", async (req: Request, res: Response) => {
  try {
    const { default: topupmateService } = await import("./services/topupmate.service.ts");
    const networks = await topupmateService.getNetworks();
    res.json({ success: true, message: "TopUpMate service is working!", data: networks });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "TopUpMate service error", error: error.message });
  }
});

// ============================================
// ERROR HANDLING
// ============================================
// Log errors
app.use(errorLogger);

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error("❌ Unhandled Error:", {
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack
    },
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  // Log to console for immediate visibility
  console.error('\n🔴 ERROR DETAILS:');
  console.error('Message:', err.message);
  console.error('Stack:', err.stack);
  console.error('\n');

  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    error: err.message, // Always show error message for debugging
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

export default app;
