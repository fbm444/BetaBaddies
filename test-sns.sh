#!/bin/bash

# Test SNS message publishing
# Usage: ./test-sns.sh

# Check if AWS credentials are set
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ] || [ -z "$AWS_SNS_TOPIC_ARN" ]; then
  echo "❌ Missing required environment variables:"
  echo "   Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_SNS_TOPIC_ARN"
  exit 1
fi

# Set default region if not provided
export AWS_DEFAULT_REGION=${AWS_REGION:-us-east-2}

echo "📧 Testing SNS message publishing..."
echo "📍 Region: $AWS_DEFAULT_REGION"
echo "📧 Topic ARN: $AWS_SNS_TOPIC_ARN"
echo ""

# Create test message
SUBJECT="🧪 Test Message from BetaBaddies Deployment"
MESSAGE="This is a test message from the BetaBaddies deployment workflow.

Timestamp: $(date -u +'%Y-%m-%d %H:%M:%S UTC')
Test ID: $(date +%s)

If you receive this, SNS is working correctly! ✅"

echo "📝 Subject: $SUBJECT"
echo "📄 Message:"
echo "$MESSAGE"
echo ""

# Publish to SNS
echo "🚀 Publishing to SNS topic..."
OUTPUT=$(aws sns publish \
  --region "$AWS_DEFAULT_REGION" \
  --topic-arn "$AWS_SNS_TOPIC_ARN" \
  --subject "$SUBJECT" \
  --message "$MESSAGE" 2>&1)

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ Message published successfully!"
  echo "Response: $OUTPUT"
  echo ""
  echo "📬 Check your email inbox for the test message"
else
  echo "❌ Failed to publish message"
  echo "Exit code: $EXIT_CODE"
  echo "Error: $OUTPUT"
  exit 1
fi


