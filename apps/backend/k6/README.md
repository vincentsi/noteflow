# k6 Load Testing Scripts

Load testing scripts for the backend API.

## Prerequisites

Install k6: https://k6.io/docs/get-started/installation/

```bash
# Windows (Chocolatey)
choco install k6

# Windows (winget)
winget install k6

# macOS
brew install k6

# Linux
sudo apt install k6
```

## Available Scripts

### 1. Smoke Test
**Quick verification that the application works**

```bash
k6 run smoke-test.js
```

- VUs: 2
- Duration: 1 minute
- Tests: Health check, register, login

### 2. Load Test
**Tests performance under normal load**

```bash
k6 run load-test.js
```

- VUs: 10 → 100
- Duration: 9 minutes
- Tests: Register, login, me, refresh token

## Interpreting Results

### ✅ Good (Production Ready)
- P95 < 500ms
- Error rate < 1%
- Throughput > 10 req/s

### ⚠️ Acceptable (Optimizations Recommended)
- P95 < 1000ms
- Error rate < 5%
- Throughput > 5 req/s

### ❌ Problematic (Optimizations Required)
- P95 > 1000ms
- Error rate > 5%
- Throughput < 5 req/s

## Example Results

### Smoke Test (2 VUs)
```
✓ Checks: 100.00% (120 passed, 0 failed)
📊 HTTP Requests: 120 total (2.00 req/s)
⏱️  Response Time:
   - Average: 45.32ms
   - P95: 120.54ms
   - Max: 256.12ms
❌ Error Rate: 0.00%
```

### Load Test (100 VUs)
```
✓ Checks: 98.50% (5910 passed, 90 failed)
📊 HTTP Requests: 6000 total (20.00 req/s)
⏱️  Response Times:
   - Average: 250.45ms
   - P95: 850.23ms
   - P99: 1205.67ms
❌ Error Rate: 1.50%
```

## Notes

- **Never** run in production
- Use a staging environment
- Gradually increase VUs
- Monitor CPU/RAM/DB during tests

## Resources

- k6 Documentation: https://k6.io/docs/
- Complete guide: see `/LOAD-TESTING.md`
