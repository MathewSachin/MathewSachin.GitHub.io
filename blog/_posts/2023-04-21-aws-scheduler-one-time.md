---
title: One-time schedules using AWS EventBridge Scheduler
tags: [aws, scheduler, eventbridge, kotlin]
highlight: true
disqus: true
related:
  - /blog/2023/04/14/dependency-injection-extension-functions-kotlin
  - /blog/2016/11/05/chrome-dino-hack
---

EventBridge Scheduler is a fully managed service that allows you to schedule events that are triggered at specific times or intervals.
With EventBridge Scheduler, you can set up rules that define when to trigger events, based on a cron expression or a rate expression. For example, you could create a rule that triggers an event every 30 minutes, or a rule that triggers an event at 8:00 AM every weekday.
EventBridge Scheduler is useful for a wide range of use cases, including triggering regular data processing tasks, running batch jobs at specific intervals, and sending periodic notifications. It can be integrated with various AWS services, such as AWS Lambda, AWS Batch, Amazon SNS, and Amazon SQS, to perform these tasks.  
In this post, we're going to try out One-Time schedules in Kotlin via AWS Java SDK 2.0, which invokes a target only once at given date and time.

### Setting up the target and role
- First off, you need to use a user or role (recommended) that has permissions to Create and Delete schedules. The easiest way is to attach the `AmazonEventBridgeSchedulerFullAccess` managed policy to your role.
- Create an SNS topic. We're creating with the name `SchedulerTargetTopic` for this example.
- Next, you need an IAM role that EventBridge scheduler can assume to invoke the target service like SNS or SQS. For this example, we'll use an SNS.
- Here's how you can configure the trust policy for the role to allow EventBridge scheduler to assume the role: 

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "scheduler.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
```

- Since, we want to use an SNS topic as target, attach an inline policy to the role that allows publishing to the SNS topic. Replace the `Resource` value with your SNS topic ARN.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Action": "sns:Publish",
            "Resource": "arn:aws:sns:us-west-2:1234567890:SchedulerTargetTopic", // <--- Put your SNS topic ARN here
            "Effect": "Allow"
        }
    ]
}
```

### Start coding!
Create EventBridge Scheduler client:

```kotlin
val eventBridgeScheduler = SchedulerClient.builder()
    .credentialsProvider(DefaultCredentialsProvider.create())
    .region(Region.US_WEST_2)
    .build()
```

Create an SNS target:

```kotlin
val snsTarget = Target.builder()
    .roleArn("<ROLE ARN>")
    .arn("<SNS ARN>")
    .input(message)
    .build()
```

Call `createSchedule`:

```kotlin
val createScheduleRequest = CreateScheduleRequest.builder()
    .name("<TIMER ID>")
    .scheduleExpression("at(2023-02-14T18:30:00)")
    .target(sqsTarget)
    .flexibleTimeWindow(
        FlexibleTimeWindow.builder()
            .mode(FlexibleTimeWindowMode.OFF)
            .build()
    )
    .build()

eventBridgeScheduler.createSchedule(createScheduleRequest)
```

### Deleting schedules [IMPORTANT]

A one-time schedule still counts against your account quota after it has completed running and invoking it's target.
You should delete a one-time schedule after it has completed running.

```kotlin
val deleteScheduleRequest = DeleteScheduleRequest.builder()
    .name("<TIMER ID>")
    .build()

eventBridgeScheduler.deleteSchedule(deleteScheduleRequest)
```
