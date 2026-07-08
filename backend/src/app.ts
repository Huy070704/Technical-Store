import express from "express";
import { Container } from "typedi";
import {
  useExpressServer,
  getMetadataArgsStorage,
  useContainer,
} from "routing-controllers";
import { routingControllersToSpec } from "routing-controllers-openapi";
import { validationMetadatasToSchemas } from "class-validator-jsonschema";
import swaggerUi from "swagger-ui-express";
import { DbConnection } from "@/database/dbConnection";
import { ResponseInterceptor } from "./utils/interceptor";
import cors from "cors";
import cookieParser from "cookie-parser";

export default class App {
  public app: express.Application;
  public port: string | number;
  public env: string;

  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeSwagger();
  }

  public async start() {
    await this.connectToDatabase();
    const { startOrderCronJobs } = await import("@/modules/order/services/order-cron.service");
    startOrderCronJobs();
    this.listen();
  }

  public getServer() {
    return this.app;
  }

  public listen() {
    console.log();
    this.app.listen(this.port, () => {
      console.log(`Backend listening on port ${this.port}`);
      console.log(`Api docs at: http://localhost:${this.port}/api-docs`);
      console.log(`Frontend running at: ${process.env.FRONTEND_URL || "http://localhost:5173"}`);
    });
  }

  private initializeMiddlewares() {
    this.app.use(
      (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        if (req.originalUrl.toString().includes("webhook")) {
          next();
        } else {
          // Better JSON parsing with error handling
          express.json({
            limit: '50mb',
            type: 'application/json'
          })(req, res, (err) => {
            if (err) {
              console.error(' JSON Parse Error:', {
                url: req.originalUrl,
                method: req.method,
                body: req.body,
                rawBody: err.body,
                error: err.message
              });
              
              res.status(400).json({
                success: false,
                message: 'Invalid JSON format in request body',
                error: err.message
              });
            } else {
              next();
            }
          });
        }
      }
    );
    const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:5173";
    this.app.use(
      cors({
        origin: (origin, callback) => {
          // Cho phép request không có Origin (mobile app, curl, Postman)
          if (!origin) return callback(null, true);
          if (origin === allowedOrigin) return callback(null, true);
          callback(new Error(`CORS blocked: ${origin}`));
        },
        credentials: true,
        methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
      })
    );
    this.app.use(express.urlencoded({ extended: true }));
    // Parse Cookie header → req.cookies (cần cho /jwt/refresh-token đọc refreshToken)
    this.app.use(cookieParser());
    this.app.use(express.static("public"));
  }

  private async connectToDatabase() {
    const connection = await DbConnection.createConnection();
    if (connection?.readyState !== 1) {
      throw new Error("Database is not initialized.");
    }
    console.log("✅ Database connection established successfully.");
    // Đồng bộ / vá index tốn nhiều round-trip tới MongoDB Atlas → chỉ chạy khi cần
    // (đặt SYNC_INDEXES=true lúc đổi schema/index). Mặc định bỏ qua để khởi động nhanh.
    if (process.env.SYNC_INDEXES === "true") {
      await this.fixPaymentIndex();
      await this.fixAccountEmailIndex();
      await this.fixAccountUsernameIndex();
    }
  }

  /**
   * Bỏ index unique cũ trên email (email_1 — áp cho cả bản ghi soft-delete) và
   * dựng lại partial unique index chỉ áp cho tài khoản còn hoạt động (deletedAt=null).
   * Nhờ vậy đăng ký lại / tạo lại cùng email sau khi soft-remove không bị E11000.
   */
  private async fixAccountEmailIndex() {
    try {
      const { Account } = await import("@/modules/auth/models/account.model");
      const indexes = await Account.collection.indexes();
      const legacy = indexes.find(
        (idx) => idx.name === "email_1" && !idx.partialFilterExpression
      );
      if (legacy) {
        await Account.collection.dropIndex("email_1");
        console.log("🔧 Dropped legacy unique index email_1 — recreating as partial (active only).");
      }
      await Account.ensureIndexes();
    } catch (err) {
      console.warn("⚠️  fixAccountEmailIndex skipped:", (err as Error).message);
    }
  }

  /**
   * Bỏ index unique sparse cũ trên username (username_1 — áp cho cả bản ghi soft-delete) và
   * dựng lại partial unique index chỉ áp cho tài khoản còn hoạt động (deletedAt=null).
   * Nhờ vậy đăng ký lại cùng username sau khi soft-remove không bị E11000.
   */
  private async fixAccountUsernameIndex() {
    try {
      const { Account } = await import("@/modules/auth/models/account.model");
      const indexes = await Account.collection.indexes();
      const legacy = indexes.find(
        (idx) => idx.name === "username_1" && !idx.partialFilterExpression
      );
      if (legacy) {
        await Account.collection.dropIndex("username_1");
        console.log("🔧 Dropped legacy sparse index username_1 — recreating as partial (active only).");
      }
      await Account.ensureIndexes();
    } catch (err) {
      console.warn("⚠️  fixAccountUsernameIndex skipped:", (err as Error).message);
    }
  }

  private async fixPaymentIndex() {
    try {
      const { Payment } = await import("@/modules/payment/models/payment.model");
      const indexes = await Payment.collection.indexes();
      const old = indexes.find((idx) => idx.name === "IDX_payments_payos_code" && !idx.sparse);
      if (old) {
        await Payment.collection.dropIndex("IDX_payments_payos_code");
        console.log("🔧 Dropped non-sparse IDX_payments_payos_code — will be recreated as sparse.");
      }
      await Payment.ensureIndexes();
    } catch (err) {
      console.warn("⚠️  fixPaymentIndex skipped:", (err as Error).message);
    }
  }

  private initializeRoutes() {
    useContainer(Container);
    useExpressServer(this.app, {
      routePrefix: "/api",
      controllers: [__dirname + "/**/*.controller.{ts,js}"],
      interceptors: [ResponseInterceptor],
      middlewares: [__dirname + "/middlewares/**/*.middleware.{ts,js}"],
      defaultErrorHandler: false,
    });
  }

  private initializeSwagger() {
    const { defaultMetadataStorage } = require("class-transformer/cjs/storage");

    const schemas = validationMetadatasToSchemas({
      classTransformerMetadataStorage: defaultMetadataStorage,
      refPointerPrefix: "#/components/schemas/",
    });

    const storage = getMetadataArgsStorage();
    const spec = routingControllersToSpec(
      storage,
      { routePrefix: "/api" },
      {
        components: {
          securitySchemes: {
            ApiKeyAuth: {
              type: "apiKey",
              name: "Authorization",
              in: "header",
              description: "API key for authorization",
            },
          },
          schemas,
        },
        security: [{ ApiKeyAuth: [] }],
        info: {
          title: "A sample API",
          version: "1.0.0",
          description: "Generated with routing-controllers-openapi",
        },
      }
    );
    this.app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(spec));
  }

}
