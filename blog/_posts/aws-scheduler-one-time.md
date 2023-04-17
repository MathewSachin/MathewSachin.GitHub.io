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

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": [
                "scheduler:CreateSchedule",
                "scheduler:DeleteSchedule"
            ],
            "Resource": "*"
        }
    ]
}
```

```kotlin
val eventBridgeScheduler = SchedulerClient.builder()
    .credentialsProvider(DefaultCredentialsProvider.create())
    .region(Region.US_WEST_2)
    .build()
```

```kotlin
val sqsTarget = Target.builder()
    .roleArn("<ROLE ARN>")
    .arn("<SQS ARN>")
    .input(message)
    .build()

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

```kotlin
val deleteScheduleRequest = DeleteScheduleRequest.builder()
    .name("<TIMER ID>")
    .build()

eventBridgeScheduler.deleteSchedule(deleteScheduleRequest)
```
