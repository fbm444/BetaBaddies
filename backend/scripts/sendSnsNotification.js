#!/usr/bin/env node
/**
 * Send deployment notification via AWS SNS SMS
 * Usage: node scripts/sendSnsNotification.js <status> <message>
 * 
 * Environment variables required:
 * - AWS_ACCESS_KEY_ID
 * - AWS_SECRET_ACCESS_KEY
 * - AWS_REGION (defaults to us-east-1)
 * - AWS_SNS_PHONE_NUMBER (phone number in E.164 format, e.g., +1234567890)
 */

import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const status = process.argv[2] || "unknown";
const message = process.argv[3] || "Deployment notification";

// Get AWS credentials from environment
const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const awsRegion = process.env.AWS_REGION || "us-east-2";
const phoneNumber = process.env.AWS_SNS_PHONE_NUMBER;

if (!awsAccessKeyId || !awsSecretAccessKey) {
  console.error("❌ AWS credentials not found. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY");
  process.exit(1);
}

if (!phoneNumber) {
  console.error("❌ Phone number not configured. Set AWS_SNS_PHONE_NUMBER");
  process.exit(1);
}

// Validate phone number format (E.164 format: +1234567890)
if (!phoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
  console.error(`❌ Invalid phone number format: ${phoneNumber}`);
  console.error("Phone number must be in E.164 format (e.g., +1234567890)");
  process.exit(1);
}

// Create SNS client
const snsClient = new SNSClient({
  region: awsRegion,
  credentials: {
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey,
  },
});

// Format message with emoji based on status
const statusEmoji = {
  success: "✅",
  failure: "❌",
  cancelled: "⚠️",
  unknown: "ℹ️",
};

const emoji = statusEmoji[status.toLowerCase()] || statusEmoji.unknown;

// SMS messages are limited to 160 characters, so keep it concise
const smsMessage = `${emoji} ${message}`.substring(0, 160);

async function sendSMS() {
  try {
    const command = new PublishCommand({
      PhoneNumber: phoneNumber,
      Message: smsMessage,
      MessageAttributes: {
        "AWS.SNS.SMS.SMSType": {
          DataType: "String",
          StringValue: "Transactional", // Use Transactional for important notifications
        },
      },
    });

    const response = await snsClient.send(command);
    console.log(`✅ SMS sent successfully. MessageId: ${response.MessageId}`);
    return response;
  } catch (error) {
    console.error("❌ Failed to send SMS:", error.message);
    if (error.name === "InvalidParameterException") {
      console.error("Check that the phone number is in E.164 format (e.g., +1234567890)");
    }
    process.exit(1);
  }
}

sendSMS();

