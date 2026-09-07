/**
 * Every failure reaching the Spine, in our own words — undici's errors and HTTP status
 * codes stop at a gateway. Shared by the join and events gateways: one Spine, one error.
 */
export class SpineGatewayError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "SpineGatewayError";
  }
}
