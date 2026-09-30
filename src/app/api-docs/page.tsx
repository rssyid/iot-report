"use client";

import dynamic from "next/dynamic";
import { openApiSpec } from "./openapi";
import "swagger-ui-react/swagger-ui.css";
import { Code2 } from "lucide-react";

// Swagger UI hanya bisa di client-side karena bergantung pada window/document
const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export default function ApiDocsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#FFFDF5]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#FFE600] border-b-[3px] border-black px-6 py-4 shadow-[0px_4px_0px_0px_#000]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black border-2 border-black shadow-[3px_3px_0px_0px_#000]">
            <Code2 className="h-5 w-5 text-[#FFE600] stroke-[2.5]" />
          </div>
          <div>
            <h1 className="font-black text-xl uppercase tracking-tight text-black leading-none">
              API Documentation
            </h1>
            <p className="text-[11px] font-bold text-black/60 uppercase tracking-widest mt-0.5">
              IoT Telemetry Portal — REST API Reference
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="bg-black text-[#FFE600] text-[11px] font-black px-3 py-1 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_#333] uppercase tracking-wider">
              OpenAPI 3.0
            </span>
            <span className="bg-[#86EFAC] text-black text-[11px] font-black px-3 py-1 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_#333] uppercase tracking-wider">
              v1.0
            </span>
          </div>
        </div>
      </div>

      {/* Swagger UI Container */}
      <div className="flex-1 px-0">
        <style>{`
          /* ========== Neobrutalism Swagger UI Override ========== */

          /* Base layout */
          .swagger-ui {
            font-family: inherit !important;
          }

          /* Hide default swagger topbar if any */
          .swagger-ui .topbar {
            display: none !important;
          }

          /* Info block */
          .swagger-ui .info {
            margin: 24px 24px 16px !important;
            padding: 20px !important;
            background: #fff !important;
            border: 3px solid #000 !important;
            border-radius: 12px !important;
            box-shadow: 4px 4px 0px 0px #000 !important;
          }

          .swagger-ui .info .title {
            font-size: 24px !important;
            font-weight: 900 !important;
            color: #000 !important;
            letter-spacing: -0.5px !important;
          }

          .swagger-ui .info .description p {
            font-size: 14px !important;
            color: #333 !important;
          }

          /* Tag section headers */
          .swagger-ui .opblock-tag {
            font-size: 14px !important;
            font-weight: 900 !important;
            text-transform: uppercase !important;
            letter-spacing: 1px !important;
            color: #000 !important;
            border-bottom: 2px solid #000 !important;
            padding: 12px 0 !important;
            margin: 0 24px !important;
          }

          .swagger-ui .opblock-tag:hover {
            background: #FFF9C4 !important;
          }

          /* Operation blocks */
          .swagger-ui .opblock {
            margin: 8px 24px !important;
            border: 2px solid #000 !important;
            border-radius: 10px !important;
            box-shadow: 3px 3px 0px 0px #000 !important;
            overflow: hidden !important;
          }

          .swagger-ui .opblock:hover {
            box-shadow: 4px 4px 0px 0px #000 !important;
            transform: translate(-1px, -1px) !important;
            transition: all 0.1s !important;
          }

          /* GET */
          .swagger-ui .opblock.opblock-get {
            background: #EFF6FF !important;
            border-color: #000 !important;
          }
          .swagger-ui .opblock.opblock-get .opblock-summary {
            background: #DBEAFE !important;
          }
          .swagger-ui .opblock.opblock-get .opblock-summary-method {
            background: #2563EB !important;
          }

          /* POST */
          .swagger-ui .opblock.opblock-post {
            background: #F0FDF4 !important;
            border-color: #000 !important;
          }
          .swagger-ui .opblock.opblock-post .opblock-summary {
            background: #DCFCE7 !important;
          }
          .swagger-ui .opblock.opblock-post .opblock-summary-method {
            background: #16A34A !important;
          }

          /* PUT */
          .swagger-ui .opblock.opblock-put {
            background: #FFFBEB !important;
            border-color: #000 !important;
          }
          .swagger-ui .opblock.opblock-put .opblock-summary {
            background: #FEF3C7 !important;
          }
          .swagger-ui .opblock.opblock-put .opblock-summary-method {
            background: #D97706 !important;
          }

          /* DELETE */
          .swagger-ui .opblock.opblock-delete {
            background: #FFF1F2 !important;
            border-color: #000 !important;
          }
          .swagger-ui .opblock.opblock-delete .opblock-summary {
            background: #FFE4E6 !important;
          }
          .swagger-ui .opblock.opblock-delete .opblock-summary-method {
            background: #DC2626 !important;
          }

          /* Method badge */
          .swagger-ui .opblock-summary-method {
            font-size: 11px !important;
            font-weight: 900 !important;
            letter-spacing: 1px !important;
            border-radius: 6px !important;
            border: 2px solid #000 !important;
            min-width: 64px !important;
            padding: 4px 8px !important;
            box-shadow: 2px 2px 0px 0px #000 !important;
          }

          /* Summary path */
          .swagger-ui .opblock-summary-path {
            font-size: 13px !important;
            font-weight: 700 !important;
            font-family: "Courier New", monospace !important;
            color: #000 !important;
          }

          /* Summary description */
          .swagger-ui .opblock-summary-description {
            font-size: 12px !important;
            color: #555 !important;
            font-weight: 500 !important;
          }

          /* Buttons */
          .swagger-ui .btn {
            font-weight: 800 !important;
            border: 2px solid #000 !important;
            border-radius: 6px !important;
            box-shadow: 2px 2px 0px 0px #000 !important;
            transition: all 0.1s !important;
          }

          .swagger-ui .btn:hover {
            box-shadow: 3px 3px 0px 0px #000 !important;
            transform: translate(-1px, -1px) !important;
          }

          .swagger-ui .btn:active {
            box-shadow: none !important;
            transform: translate(0px, 0px) !important;
          }

          .swagger-ui .btn.execute {
            background: #FFE600 !important;
            color: #000 !important;
            border-color: #000 !important;
          }

          .swagger-ui .btn.execute:hover {
            background: #FFD600 !important;
          }

          /* Try-it-out button */
          .swagger-ui .try-out__btn {
            background: #E9D5FF !important;
            color: #000 !important;
          }

          /* Parameters table */
          .swagger-ui table thead tr td,
          .swagger-ui table thead tr th {
            font-size: 12px !important;
            font-weight: 900 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.5px !important;
            color: #000 !important;
            background: #F4F0EA !important;
            border-bottom: 2px solid #000 !important;
            padding: 8px 12px !important;
          }

          .swagger-ui .parameter__name {
            font-size: 13px !important;
            font-weight: 700 !important;
            font-family: "Courier New", monospace !important;
          }

          .swagger-ui .parameter__type {
            font-size: 11px !important;
            color: #2563EB !important;
            font-weight: 600 !important;
          }

          /* Required badge */
          .swagger-ui .parameter__name.required::after {
            content: " *" !important;
            color: #DC2626 !important;
            font-weight: 900 !important;
          }

          /* Response codes */
          .swagger-ui .responses-inner h4 {
            font-size: 13px !important;
            font-weight: 800 !important;
          }

          .swagger-ui .response-col_status {
            font-size: 13px !important;
            font-weight: 900 !important;
          }

          /* Code blocks / JSON response */
          .swagger-ui .highlight-code {
            border: 2px solid #000 !important;
            border-radius: 8px !important;
            box-shadow: 2px 2px 0px 0px #000 !important;
          }

          .swagger-ui .microlight {
            font-size: 12px !important;
            font-family: "Courier New", monospace !important;
          }

          /* Input fields */
          .swagger-ui input[type="text"],
          .swagger-ui input[type="number"],
          .swagger-ui select,
          .swagger-ui textarea {
            border: 2px solid #000 !important;
            border-radius: 6px !important;
            font-size: 13px !important;
            padding: 6px 10px !important;
            box-shadow: 2px 2px 0px 0px #000 !important;
          }

          .swagger-ui input[type="text"]:focus,
          .swagger-ui select:focus,
          .swagger-ui textarea:focus {
            outline: none !important;
            box-shadow: 3px 3px 0px 0px #000 !important;
          }

          /* Model / schema section */
          .swagger-ui section.models {
            margin: 0 24px 24px !important;
            border: 2px solid #000 !important;
            border-radius: 10px !important;
            box-shadow: 3px 3px 0px 0px #000 !important;
            overflow: hidden !important;
          }

          .swagger-ui section.models h4 {
            font-size: 14px !important;
            font-weight: 900 !important;
            text-transform: uppercase !important;
            background: #F4F0EA !important;
            padding: 12px 16px !important;
            border-bottom: 2px solid #000 !important;
          }

          /* Servers / base URL selector */
          .swagger-ui .scheme-container {
            background: #FFF9C4 !important;
            border: 2px solid #000 !important;
            border-radius: 8px !important;
            margin: 0 24px 16px !important;
            padding: 12px 16px !important;
            box-shadow: 2px 2px 0px 0px #000 !important;
          }

          /* Loading spinner area */
          .swagger-ui .loading-container {
            padding: 60px !important;
          }
        `}</style>

        <SwaggerUI
          spec={openApiSpec}
          docExpansion="list"
          defaultModelsExpandDepth={-1}
          displayRequestDuration={true}
          filter={true}
          tryItOutEnabled={false}
        />
      </div>
    </div>
  );
}
