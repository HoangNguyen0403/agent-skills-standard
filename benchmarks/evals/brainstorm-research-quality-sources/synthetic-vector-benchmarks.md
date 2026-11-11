# SYNTHETIC BENCHMARK SOURCE FIXTURE: Vector DB Benchmarks and Pricing
# NOTICE: This document is an explicitly SYNTHETIC fixture created for offline evaluation benchmarking.
# It does NOT represent real customer data, live vendor contracts, or real pricing commitments.

## Synthetic Library: FastVectorEngine v2.4.0

### Benchmark Specifications
- Dataset: 1,000,000 vectors (1536 dimensions, float32)
- Hardware: AWS c6i.4xlarge (16 vCPU, 32 GB RAM)
- Index Build Time: 42.5 minutes
- Recall@10: 98.2%
- p95 Query Latency: 4.8 ms (single client), 18.2 ms (64 concurrent clients)
- Maximum Index Size in RAM: 8.4 GB

### Documented Limitations and Known Constraints
- Maximum vector dimension supported: 2048 dimensions.
- Does not support real-time index updates without locking query threads for up to 250ms during flush.
- Requires external persistence; process crash during uncommitted write results in WAL segment truncation.

### Pricing Structure (Managed Cloud Tier)
- Tier Starter: $49/month (up to 250k vectors, 10 RPS limit)
- Tier Standard: $199/month (up to 2M vectors, 50 RPS limit)
- Tier Enterprise: $799/month (up to 10M vectors, dedicated node, custom RPS)
- Overage: $0.15 per 10,000 additional vector queries beyond tier allocation.
