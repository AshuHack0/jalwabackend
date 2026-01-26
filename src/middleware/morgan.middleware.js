import { Elysia } from "elysia";

// Morgan-like HTTP request logger middleware for Elysia
export const morganMiddleware = new Elysia()
  .derive(({ request }) => {
    // Store start time for the request
    return {
      startTime: Date.now(),
    };
  })
  .onAfterHandle(({ request, set, startTime }) => {
    const method = request.method;
    const url = new URL(request.url);
    const path = url.pathname;
    const status = set.status || 200;
    const responseTime = Date.now() - (startTime || Date.now());
    
    // Get status color for terminal output
    const statusColor = getStatusColor(status);
    
    // Format: METHOD PATH STATUS RESPONSE_TIME (similar to Morgan's 'dev' format)
    const logMessage = `\x1b[36m${method}\x1b[0m ${path} \x1b[${statusColor}m${status}\x1b[0m ${responseTime}ms`;
    
    if (status >= 400) {
      console.error(logMessage);
    } else {
      console.log(logMessage);
    }
  });

// Helper function to get ANSI color codes for status codes
function getStatusColor(status) {
  if (status >= 500) return "31"; // Red
  if (status >= 400) return "33"; // Yellow
  if (status >= 300) return "36"; // Cyan
  return "32"; // Green
}

// Alternative: Combined format (like Morgan's 'combined' format)
export const morganCombined = new Elysia()
  .derive(({ request }) => {
    return {
      startTime: Date.now(),
    };
  })
  .onAfterHandle(({ request, set, startTime }) => {
    const method = request.method;
    const url = new URL(request.url);
    const path = url.pathname;
    const status = set.status || 200;
    const responseTime = Date.now() - (startTime || Date.now());
    const userAgent = request.headers.get("user-agent") || "-";
    const referer = request.headers.get("referer") || "-";
    const remoteAddr = request.headers.get("x-forwarded-for") || 
                       request.headers.get("x-real-ip") || 
                       "-";
    
    const timestamp = new Date().toISOString();
    
    console.log(
      `${remoteAddr} - - [${timestamp}] "${method} ${path} HTTP/1.1" ${status} ${responseTime}ms "${referer}" "${userAgent}"`
    );
  });

// Alternative: Tiny format (minimal logging)
export const morganTiny = new Elysia()
  .onAfterHandle(({ request, set }) => {
    const method = request.method;
    const url = new URL(request.url);
    const path = url.pathname;
    const status = set.status || 200;
    
    console.log(`${method} ${path} ${status}`);
  });

// Alternative: Short format
export const morganShort = new Elysia()
  .derive(({ request }) => {
    return {
      startTime: Date.now(),
    };
  })
  .onAfterHandle(({ request, set, startTime }) => {
    const method = request.method;
    const url = new URL(request.url);
    const path = url.pathname;
    const status = set.status || 200;
    const responseTime = Date.now() - (startTime || Date.now());
    const contentLength = set.headers?.["content-length"] || "-";
    
    console.log(
      `${method} ${path} ${status} ${contentLength} - ${responseTime}ms`
    );
  });
