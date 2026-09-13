# Cloud Architecture Diagrams

## Purpose

Show the managed infrastructure a system runs on: regions, networks, clusters, and the
services someone else operates for you.

## Key elements

- **Regions and zones** — name them (`asia-southeast1`), because latency and data residency
  arguments start here.
- **Boundaries** — VPC, cluster, environment. These become `groups` in the spec and render
  as dashed boxes behind their members.
- **Managed services** — compute, storage, database, queue. Use the `gcp:*` kinds so the
  official icon appears and the reader recognises it without reading the label.
- **Edge** — CDN and load balancer sit in their own layer above the services.

## GCP kinds

| Kind | Service |
|---|---|
| `gcp:gke` | Kubernetes Engine |
| `gcp:cloud-sql` | Cloud SQL |
| `gcp:memorystore` | Memorystore (Redis) |
| `gcp:pubsub` | Pub/Sub |
| `gcp:lb` | Cloud Load Balancing |
| `gcp:cdn` | Cloud CDN |
| `gcp:gcs` | Cloud Storage |
| `gcp:composer` | Cloud Composer (Airflow) |
| `gcp:functions` | Cloud Functions |
| `gcp:bigquery` | BigQuery |

## AWS kinds

| Kind | Service |
|---|---|
| `aws:lambda` | Lambda |
| `aws:ec2` | EC2 |
| `aws:ecs` / `aws:eks` / `aws:fargate` | ECS / EKS / Fargate |
| `aws:rds` / `aws:aurora` | RDS / Aurora |
| `aws:dynamodb` | DynamoDB |
| `aws:elasticache` | ElastiCache |
| `aws:s3` | S3 |
| `aws:sqs` / `aws:sns` / `aws:kinesis` / `aws:eventbridge` | SQS / SNS / Kinesis / EventBridge |
| `aws:api-gateway` / `aws:elb` / `aws:cloudfront` / `aws:route53` | API Gateway / ELB / CloudFront / Route 53 |
| `aws:cloudwatch` / `aws:cognito` | CloudWatch / Cognito |

## Vendor-neutral kinds

For Azure, Cloudflare, DigitalOcean, or any service above without an icon. The vendor and
product go in `sublabel`; the shape says what role it plays.

| Kind | Stands for |
|---|---|
| `cloud:compute` | VMs, app platforms |
| `cloud:serverless` | function runtimes |
| `cloud:container-platform` | managed Kubernetes or container apps |
| `cloud:managed-db` | relational or document database |
| `cloud:cache` | in-memory cache |
| `cloud:object-store` | blob storage |
| `cloud:message-bus` | queue, topic, event hub |
| `cloud:edge` | CDN, edge network |
| `cloud:gateway` | API gateway, load balancer, front door |
| `cloud:identity` | identity provider, SSO |
| `cloud:observability` | logs, metrics, tracing |

Azure specifically: draw.io Desktop carries only the 2014 stencil set, so Azure always uses
`cloud:*`. Anything that is a product rather than infrastructure (SAP, Okta, a payment
gateway) stays a `saas` or `system-ext` box. A labelled box beats a wrong logo.

## Deployment view versus container view

The container view answers "what are the parts". The deployment view answers "where do they
run". Do not merge them: pod counts and node pools in a container diagram bury the very
thing a container diagram exists to show.
