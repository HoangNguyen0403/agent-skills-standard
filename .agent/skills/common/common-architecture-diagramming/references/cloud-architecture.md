# Cloud Architecture Diagram Reference

## Purpose

To visualize the virtualized infrastructure and resources provided by cloud providers (AWS, GCP, Azure).

## Key Elements

- **Regions & Zones**: Physical locations of data centers (e.g., `us-central1`, `us-central1-a`).
- **VPCs & Subnets**: Virtual networks and their segmentations.
- **Resources**: Compute (VMs, Functions), Storage (Buckets), Databases.
- **Security Groups/Firewalls**: Network access controls.
- **Gateways**: Internet Gateways, NAT Gateways, Load Balancers.

## vs. C4 Deployment

- **C4 Deployment**: Focuses on _software containers_ mapped to nodes.
- **Cloud Architecture**: Focuses on _cloud resources_ and networking.

## Syntax (Mermaid)

Use `C4Deployment` or standard `graph TD` with specific provider icons if available, or clear labeling.
For high-fidelity, use Draw.io with official Cloud Provider Icon Sets.
