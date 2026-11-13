/**
 * PropertyPro - Stripe Webhook Handler
 * Handle Stripe webhook events for payment processing
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { connectToDatabase } from "@/lib/mongodb";
import {
  claimStripeEvent,
  markStripeEventProcessed,
  releaseStripeEvent,
} from "@/lib/stripe-events";
import { ObjectId } from "mongodb";
import { triggerPaymentUpdate } from "../../payments/stream/route";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      console.error("Missing Stripe signature");
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (error) {
      console.error("Webhook signature verification failed:", error);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }


    // Claim the event so a redelivery (Stripe is at-least-once) is skipped.
    await connectToDatabase();
    const claim = await claimStripeEvent(event, "payments");
    if (claim === "duplicate") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    if (claim === "in_progress") {
      return NextResponse.json(
        { error: "Event is already being processed" },
        { status: 409 }
      );
    }

    try {
    // Handle the event
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(
          event.data.object as Stripe.PaymentIntent
        );
        break;

      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(
          event.data.object as Stripe.PaymentIntent
        );
        break;

      case "payment_intent.processing":
        await handlePaymentIntentProcessing(
          event.data.object as Stripe.PaymentIntent
        );
        break;

      case "payment_intent.requires_action":
        await handlePaymentIntentRequiresAction(
          event.data.object as Stripe.PaymentIntent
        );
        break;

      case "payment_method.attached":
        await handlePaymentMethodAttached(
          event.data.object as Stripe.PaymentMethod
        );
        break;

      case "customer.created":
        await handleCustomerCreated(event.data.object as Stripe.Customer);
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(
          event.data.object as Stripe.Invoice
        );
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:

    }
      await markStripeEventProcessed(event.id);
    } catch (handlerError) {
      // Forget the claim so Stripe's retry is processed rather than skipped.
      await releaseStripeEvent(event.id);
      throw handlerError;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent
) {
  try {
    await connectToDatabase();

    const { Payment, Invoice } = await import("@/models");

    // Find payment by Stripe payment intent ID using Mongoose model
    const payment = await Payment.findOne({
      stripePaymentIntentId: paymentIntent.id,
    });

    if (!payment) {
      console.warn("Payment not found for payment intent:", paymentIntent.id);
      return;
    }


    // Validate amount matches
    const stripeAmount = paymentIntent.amount / 100;
    if (Math.abs(stripeAmount - payment.amount) > 0.01) {
      console.error("Amount mismatch detected:", {
        paymentId: payment._id,
        stripeAmount,
        databaseAmount: payment.amount,
      });
      // Log security event but still process payment
    }

    // Update payment status using model (triggers hooks and validation)
    payment.status = "completed"; // Will be normalized by model
    payment.amountPaid = stripeAmount;
    payment.paidDate = new Date();
    payment.stripeChargeId = paymentIntent.latest_charge as string;

    // Add to payment history
    if (!payment.paymentHistory) {
      payment.paymentHistory = [];
    }
    payment.paymentHistory.push({
      amount: stripeAmount,
      paymentMethod: payment.paymentMethod || "credit_card",
      paidDate: new Date(),
      transactionId: paymentIntent.id,
      notes: "Payment confirmed via Stripe webhook",
    });

    await payment.save(); // This triggers post-save hooks for lease synchronization


    // Sync with invoice if linked
    if (payment.invoiceId) {
      try {
        const invoice = await Invoice.findById(payment.invoiceId);
        if (invoice) {

          await invoice.addPayment(payment._id, stripeAmount);

        } else {
          console.error("Webhook: Invoice not found:", payment.invoiceId);
        }
      } catch (invoiceError) {
        console.error("Webhook: Error updating invoice:", invoiceError);
      }
    } else {

    }

    // Trigger real-time update
    triggerPaymentUpdate(payment.toObject());


  } catch (error) {
    console.error("Error handling payment intent succeeded:", error);
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    await connectToDatabase();

    const { Payment } = await import("@/models");

    // Find payment by Stripe payment intent ID using Mongoose model
    const payment = await Payment.findOne({
      stripePaymentIntentId: paymentIntent.id,
    });

    if (!payment) {
      console.warn("Payment not found for payment intent:", paymentIntent.id);
      return;
    }

    // Update payment status using model (triggers hooks and validation)
    payment.status = "failed"; // Will be normalized by model
    payment.failureReason =
      paymentIntent.last_payment_error?.message || "Payment failed";

    await payment.save(); // This triggers post-save hooks

    // Trigger real-time update
    triggerPaymentUpdate(payment.toObject());


  } catch (error) {
    console.error("Error handling payment intent failed:", error);
  }
}

async function handlePaymentIntentProcessing(
  paymentIntent: Stripe.PaymentIntent
) {
  try {
    const { db } = await connectToDatabase();

    // Find payment by Stripe payment intent ID
    const payment = await db.collection("payments").findOne({
      stripePaymentIntentId: paymentIntent.id,
    });

    if (!payment) {
      console.warn("Payment not found for payment intent:", paymentIntent.id);
      return;
    }

    // Update payment status
    const updatedPayment = await db.collection("payments").findOneAndUpdate(
      { _id: payment._id },
      {
        $set: {
          status: "processing",
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    // Trigger real-time update
    if (updatedPayment.value) {
      triggerPaymentUpdate(updatedPayment.value);
    }


  } catch (error) {
    console.error("Error handling payment intent processing:", error);
  }
}

async function handlePaymentIntentRequiresAction(
  paymentIntent: Stripe.PaymentIntent
) {
  try {
    const { db } = await connectToDatabase();

    // Find payment by Stripe payment intent ID
    const payment = await db.collection("payments").findOne({
      stripePaymentIntentId: paymentIntent.id,
    });

    if (!payment) {
      console.warn("Payment not found for payment intent:", paymentIntent.id);
      return;
    }

    // Update payment status
    const updatedPayment = await db.collection("payments").findOneAndUpdate(
      { _id: payment._id },
      {
        $set: {
          status: "requires_action",
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    // Trigger real-time update
    if (updatedPayment.value) {
      triggerPaymentUpdate(updatedPayment.value);
    }


  } catch (error) {
    console.error("Error handling payment intent requires action:", error);
  }
}

async function handlePaymentMethodAttached(
  paymentMethod: Stripe.PaymentMethod
) {
  try {

    // Additional logic for payment method attachment can be added here
  } catch (error) {
    console.error("Error handling payment method attached:", error);
  }
}

async function handleCustomerCreated(customer: Stripe.Customer) {
  try {

    // Additional logic for customer creation can be added here
  } catch (error) {
    console.error("Error handling customer created:", error);
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  try {

    // Additional logic for invoice payment success can be added here
  } catch (error) {
    console.error("Error handling invoice payment succeeded:", error);
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  try {

    // Additional logic for invoice payment failure can be added here
  } catch (error) {
    console.error("Error handling invoice payment failed:", error);
  }
}
