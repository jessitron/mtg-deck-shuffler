import { Request, Response } from "express";

// A5 lands here: POST /api/tables/:tableName/cards — the seam the Spine absorbs.
export function handleCardArrival(_req: Request, res: Response): void {
  res.status(501).json({ error: "card arrival not implemented yet (A5)" });
}
