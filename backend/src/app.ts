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
import { ResponseInterceptor } from "./utils/interceptor/interceptor";
import cors from "cors";

export default class App {
  public app: express.Application;
  public port: string | number;
  public env: string;

  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.connectToDatabase();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeSwagger();
  }

  public getServer() {
    return this.app;
  }

  public listen() {
    console.log();
    this.app.listen(this.port, () => {
      console.log(`🚀 Backend listening on port ${this.port}`);
      console.log(`📘 Api docs at: http://localhost:${this.port}/api-docs`);
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
              console.error('🔴 JSON Parse Error:', {
                url: req.originalUrl,
                method: req.method,
                body: req.body,
                rawBody: err.body,
                error: err.message
              });
              
              // If it's a JSON parse error for endpoints that don't need body, ignore it
              if (err.type === 'entity.parse.failed' && 
                  (req.originalUrl.includes('/assign-shipper') || 
                   req.originalUrl.includes('/bulk-assign-shipper'))) {
                console.log('⚠️ Ignoring JSON parse error for assignment endpoint');
                req.body = {}; // Set empty body
                next();
              } else {
                res.status(400).json({
                  success: false,
                  message: 'Invalid JSON format in request body',
                  error: err.message
                });
              }
            } else {
              next();
            }
          });
        }
      }
    );
    this.app.use(cors());
    
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(express.static("public"));
  }

  private async connectToDatabase() {
    const connection = await DbConnection.createConnection();
    if (!connection?.isInitialized) {
      throw new Error("Database is not initialized.");
    }
    console.log("✅ Database connection established successfully.");
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
