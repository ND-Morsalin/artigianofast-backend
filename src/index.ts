import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import multer from "multer";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";

declare global {
  namespace Express {
    interface Request {
      mobileData?: IJWtPayload | IMobileDataTokenPayload | string | null;
      adminData?: IMobileDataTokenPayload | IJWtPayload | string | null;
      mobileSessionId?: string | string[];
    }
  }
}
// const SessionStore = MemoryStore(session);

import { registerMobileSpotEndpoints } from "./api-spots";
import { initDB } from "./db";
import {
  sendUpcomingJobReminders,
  processPlanRenewalReminders,
} from "./services/notifications";
import { IJWtPayload, IMobileDataTokenPayload, JwtInstance } from "./jwt/jwt";

const app = express();

// Enable CORS for mobile app - more permissive for mobile apps
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:4173",
      "https://artigianofast.com",
      "https://artigianofast.peakfinancetrade.com",
      "http://artigianofast.peakfinancetrade.com",

      "http://localhost", // Common for Capacitor webviews
      "https://localhost", // For secure contexts
      "capacitor://localhost", // Standard Capacitor scheme
      "ionic://localhost", // If using Ionic with Capacitor
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "x-mobile-session-id",
      "x-mobile_data_token",
      "x-refresh-token",
      "x-admin_access_token",
    ],
  })
);

// Handle preflight requests specifically for mobile
// app.use('/*', (req, res) => {
//   const origin = req.headers.origin;
//   res.header('Access-Control-Allow-Origin', origin || '*');
//   res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
//   res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, x-mobile-session-id');
//   res.header('Access-Control-Allow-Credentials', 'true');
//   res.status(204).end();
// });

// Configure JSON parsing with special handling for Stripe webhooks
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false, limit: "50mb" }));

// Configure multer for handling multipart/form-data
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

// Add multer middleware for multipart/form-data
app.use(upload.any());
app.use(
  cookieParser(
    process.env.COOKIE_SECRET || "artisan-project-manager-cookie-secret-key"
  )
);

// app.use(
//   session({
//     name: "admin.sid",
//     secret: process.env.SESSION_SECRET || "artisan-project-manager-secret-key",
//     resave: false,
//     saveUninitialized: false,

//     store: new SessionStore({
//       checkPeriod: 86400000,
//     }),

//     cookie: {
//       httpOnly: true,
//       secure: false,       // true in HTTPS
//       sameSite: "lax",     // OK for localhost WEB
//       maxAge: 24 * 60 * 60 * 1000,
//     },
//   })
// );

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    }
  });
  // set req to user data
  // console.log(req.headers)
  const mobileDataToken = req.headers["x-mobile_data_token"];
  const adminAccessToken = req.headers["x-admin_access_token"];
  const mobileSessionId = req.headers["x-mobile-session-id"];

  const mobileData = JwtInstance.verifyToken(mobileDataToken as string);
  const adminData = JwtInstance.verifyToken(adminAccessToken as string);
  // console.log({ mobileData, adminData });

  req.mobileData = mobileData;
  req.adminData = adminData;
  req.mobileSessionId = mobileSessionId;

  next();
});

(async () => {
  // Initialize database
  await initDB();

  // Registra l'endpoint dedicato per gli spot promozionali mobile
  registerMobileSpotEndpoints(app);

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes

  // Serve the app on port 3000
  // this serves both the API and the client.
  const port = process.env.PORT || 5000;
  server.listen(
    {
      port: Number(port),
      host: process.env.HOST || "0.0.0.0", // Listen on all network interfaces for mobile app
    },
    () => {
      console.log(`serving on port ${port} on all network interfaces`);
    }
  );

  // Simple in-process scheduler for job reminders (every 15 minutes)
  setInterval(() => {
    sendUpcomingJobReminders().catch((e) =>
      console.log(`reminder job failed: ${String(e)}`, "notifications")
    );
  }, 15 * 60 * 1000);

  // Plan renewal reminders once per day
  setInterval(() => {
    processPlanRenewalReminders(7).catch((e) =>
      console.log(`renewal reminders failed: ${String(e)}`, "notifications")
    );
  }, 24 * 60 * 60 * 1000);
})();
