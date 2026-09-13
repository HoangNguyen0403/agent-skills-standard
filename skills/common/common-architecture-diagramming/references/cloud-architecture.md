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

Anything without an icon — SAP, Okta, a payment gateway, Datadog — is a `saas` or
`system-ext` box. A labelled box beats a wrong logo.

Other clouds have no kinds yet. Add them to the catalogue only after verifying the stencil
name renders; see [style-catalog.md](style-catalog.md).

## Deployment view versus container view

The container view answers "what are the parts". The deployment view answers "where do they
run". Do not merge them: pod counts and node pools in a container diagram bury the very
thing a container diagram exists to show.
