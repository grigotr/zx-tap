import { NextResponse } from "next/server";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

export const runtime = "edge";
export const dynamic = "force-dynamic";

interface PayoutInput {
  paidAt: string;
  recipientLabel: string;
  amount: string;
  currency: string;
  paymentMethod: string;
  transactionReference: string;
  proofUrl: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readPayoutInput(value: unknown): PayoutInput | null {
  if (!isRecord(value)) return null;

  const {
    paidAt,
    recipientLabel,
    amount,
    currency,
    paymentMethod,
    transactionReference,
    proofUrl,
  } = value;

  if (
    typeof paidAt !== "string" ||
    Number.isNaN(Date.parse(paidAt)) ||
    Date.parse(paidAt) > Date.now() ||
    typeof recipientLabel !== "string" ||
    recipientLabel.trim().length === 0 ||
    recipientLabel.length > 80 ||
    typeof amount !== "string" ||
    !/^\d{1,16}(?:\.\d{1,8})?$/.test(amount) ||
    !Number.isFinite(Number(amount)) ||
    Number(amount) <= 0 ||
    typeof currency !== "string" ||
    !/^[A-Z0-9]{2,12}$/.test(currency) ||
    typeof paymentMethod !== "string" ||
    paymentMethod.trim().length === 0 ||
    paymentMethod.length > 40 ||
    typeof transactionReference !== "string" ||
    transactionReference.trim().length === 0 ||
    transactionReference.length > 255 ||
    typeof proofUrl !== "string" ||
    proofUrl.length > 2048
  ) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(proofUrl);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" || url.username || url.password) return null;

  return {
    paidAt: new Date(paidAt).toISOString(),
    recipientLabel: recipientLabel.trim(),
    amount,
    currency,
    paymentMethod: paymentMethod.trim(),
    transactionReference: transactionReference.trim(),
    proofUrl: url.toString(),
  };
}

function hasValidAdminSecret(request: Request): boolean {
  const configuredSecret = process.env.PAYOUT_ADMIN_SECRET;
  if (!configuredSecret || configuredSecret.length < 32) return false;

  const authorization = request.headers.get("authorization") || "";
  const providedSecret = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  if (providedSecret.length !== configuredSecret.length) return false;

  let difference = 0;
  for (let index = 0; index < configuredSecret.length; index += 1) {
    difference |= configuredSecret.charCodeAt(index) ^ providedSecret.charCodeAt(index);
  }
  return difference === 0;
}

async function ensurePayoutTable(sql: NeonQueryFunction<false, false>) {
  await sql`
    CREATE TABLE IF NOT EXISTS payout_confirmations (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      paid_at TIMESTAMPTZ NOT NULL,
      recipient_label TEXT NOT NULL,
      amount NUMERIC(24, 8) NOT NULL CHECK (amount > 0),
      currency TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      transaction_reference TEXT NOT NULL,
      proof_url TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS payout_confirmations_reference_idx
    ON payout_confirmations (LOWER(transaction_reference));
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS payout_confirmations_paid_at_idx
    ON payout_confirmations (paid_at DESC);
  `;
}

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: "Payout records are not configured." }, { status: 503 });
  }

  try {
    const sql = neon(databaseUrl);
    await ensurePayoutTable(sql);
    const payouts = await sql`
      SELECT id, paid_at, recipient_label, amount, currency, payment_method,
             transaction_reference, proof_url
      FROM payout_confirmations
      ORDER BY paid_at DESC, id DESC
      LIMIT 100;
    `;

    return NextResponse.json(
      { payouts },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Payout confirmations read error:", error);
    return NextResponse.json({ error: "Payout confirmations could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!process.env.PAYOUT_ADMIN_SECRET || process.env.PAYOUT_ADMIN_SECRET.length < 32) {
    return NextResponse.json({ error: "Payout publishing is not configured." }, { status: 503 });
  }
  if (!hasValidAdminSecret(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: "Payout records are not configured." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const payout = readPayoutInput(body);
  if (!payout) {
    return NextResponse.json(
      { error: "Provide valid payout details and an HTTPS link to public evidence." },
      { status: 400 },
    );
  }

  try {
    const sql = neon(databaseUrl);
    await ensurePayoutTable(sql);
    const rows = await sql`
      INSERT INTO payout_confirmations (
        paid_at, recipient_label, amount, currency, payment_method,
        transaction_reference, proof_url
      )
      VALUES (
        ${payout.paidAt},
        ${payout.recipientLabel},
        ${payout.amount},
        ${payout.currency},
        ${payout.paymentMethod},
        ${payout.transactionReference},
        ${payout.proofUrl}
      )
      RETURNING id, paid_at, recipient_label, amount, currency, payment_method,
                transaction_reference, proof_url;
    `;

    return NextResponse.json({ payout: rows[0] }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return NextResponse.json(
        { error: "That transaction reference is already published." },
        { status: 409 },
      );
    }

    console.error("Payout confirmation write error:", error);
    return NextResponse.json({ error: "Payout confirmation could not be published." }, { status: 500 });
  }
}
