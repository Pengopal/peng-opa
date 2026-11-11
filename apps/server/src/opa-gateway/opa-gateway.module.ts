import { Global, Module } from "@nestjs/common";
import { APP_CONFIG, AppConfig } from "../config/config.js";
import { HttpOpaGateway } from "./http-opa-gateway.js";
import { OPA_GATEWAY } from "./opa-gateway.js";
import { OpaProcess } from "./opa-process.service.js";
import { OpaSyncService } from "./opa-sync.service.js";

@Global()
@Module({
  providers: [
    OpaProcess,
    OpaSyncService,
    {
      provide: OPA_GATEWAY,
      inject: [OpaProcess, APP_CONFIG],
      useFactory: (proc: OpaProcess, config: AppConfig) => new HttpOpaGateway(() => proc.baseUrl, config.opaToken),
    },
  ],
  exports: [OPA_GATEWAY, OpaProcess, OpaSyncService],
})
export class OpaGatewayModule {}
