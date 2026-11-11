// Announces app events to the SNS topic in SNS_TOPIC_ARN (in .env), for example
// "a new agent asked to join". The app doesn't know who's listening: whatever is
// subscribed to the topic reacts (right now, an email to the Director).
//
// AWS permission comes from the server's instance role, so there's no key here.
// Off when SNS_TOPIC_ARN isn't set. A failure is logged and never breaks the request.
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");
const config = require("./config");

const topic = config.SNS_TOPIC_ARN;
const sns = topic ? new SNSClient({ region: topic.split(":")[3] }) : null; // the region is part of the ARN

async function announce(event, subject, message) {
  if (!sns) return;
  try {
    await sns.send(new PublishCommand({
      TopicArn: topic,
      Subject: subject.slice(0, 100),
      Message: message,
      // A label subscribers can filter on, so each one only gets the events it cares about.
      MessageAttributes: { event: { DataType: "String", StringValue: event } },
    }));
  } catch (e) {
    console.warn("⚠️  Couldn't announce " + event + ":", e.message);
  }
}

module.exports = { announce };