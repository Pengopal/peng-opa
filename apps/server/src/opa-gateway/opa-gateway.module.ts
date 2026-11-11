import { Global, Module } from "@nestjs/common";
import { APP_CONFIG, AppConfig } from "../config/config";
import { HttpOpaGateway } from "./http-opa-gateway";
import { OPA_GATEWAY } from "./opa-gateway";
import { OpaProcess } from "./opa-process.service";

@Global()
@Module({
  providers: [
    OpaProcess,
    {
      provide: OPA_GATEWAY,
      inject: [OpaProcess, APP_CONFIG],
      useFactory: (proc: OpaProcess, config: AppConfig) => new HttpOpaGateway(() => proc.baseUrl, config.opaToken),
    },
  ],
  exports: [OPA_GATEWAY, OpaProcess],
})
export class OpaGatewayModule {}
