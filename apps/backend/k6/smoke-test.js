import http from 'k6/http'
import { check, sleep } from 'k6'

/**
 * Smoke Test - Quick Verification
 *
 * Purpose: Verify that the application works under minimal load
 * VUs: 2 users
 * Duration: 1 minute
 *
 * Usage: k6 run apps/backend/k6/smoke-test.js
 */

export const options = {
  vus: 2,
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests < 500ms
    http_req_failed: ['rate<0.01'], // < 1% errors
  },
}

const BASE_URL = 'http://localhost:3001'

export default function () {
  // Test 1: Health Check
  let res = http.get(`${BASE_URL}/api/health`)
  check(res, {
    'health check status is 200': (r) => r.status === 200,
    'health check has status ok': (r) => JSON.parse(r.body).status === 'ok',
  })

  sleep(1)

  // Test 2: Register (with unique email per VU and iteration)
  const uniqueEmail = `smoke-test-${__VU}-${__ITER}-${Date.now()}@example.com`
  const registerPayload = JSON.stringify({
    email: uniqueEmail,
    password: 'SecureK6Test!Pass@',
    name: `Smoke Test User ${__VU}`,
  })

  const headers = { 'Content-Type': 'application/json' }

  res = http.post(`${BASE_URL}/api/auth/register`, registerPayload, { headers })
  check(res, {
    'register status is 201': (r) => r.status === 201,
    'register returns access token': (r) => {
      const body = JSON.parse(r.body)
      return body.success && body.data && body.data.accessToken
    },
  })

  sleep(1)

  // Test 3: Login (with same email as register)
  const loginPayload = JSON.stringify({
    email: uniqueEmail,
    password: 'SecureK6Test!Pass@',
  })

  res = http.post(`${BASE_URL}/api/auth/login`, loginPayload, { headers })
  check(res, {
    'login status is 200': (r) => r.status === 200,
    'login returns access token': (r) => {
      const body = JSON.parse(r.body)
      return body.success && body.data && body.data.accessToken
    },
  })

  sleep(2)
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  }
}

function textSummary(data, options = {}) {
  const indent = options.indent || ''
  const enableColors = options.enableColors || false

  const green = enableColors ? '\x1b[32m' : ''
  const red = enableColors ? '\x1b[31m' : ''
  const yellow = enableColors ? '\x1b[33m' : ''
  const reset = enableColors ? '\x1b[0m' : ''

  let summary = `\n${indent}Smoke Test Results:\n`
  summary += `${indent}==================\n\n`

  // Checks
  const checks = data.metrics.checks
  if (checks) {
    const passRate = (checks.values.passes / (checks.values.passes + checks.values.fails)) * 100
    const color = passRate === 100 ? green : passRate > 90 ? yellow : red
    summary += `${indent}✓ Checks: ${color}${passRate.toFixed(2)}%${reset} (${checks.values.passes} passed, ${checks.values.fails} failed)\n`
  }

  // HTTP Requests
  const httpReqs = data.metrics.http_reqs
  if (httpReqs) {
    summary += `${indent}📊 HTTP Requests: ${httpReqs.values.count} total (${httpReqs.values.rate.toFixed(2)} req/s)\n`
  }

  // Response Time
  const httpReqDuration = data.metrics.http_req_duration
  if (httpReqDuration) {
    const p95 = httpReqDuration.values['p(95)']
    const color = p95 < 500 ? green : p95 < 1000 ? yellow : red
    summary += `${indent}⏱️  Response Time:\n`
    summary += `${indent}   - Average: ${httpReqDuration.values.avg.toFixed(2)}ms\n`
    summary += `${indent}   - P95: ${color}${p95.toFixed(2)}ms${reset}\n`
    summary += `${indent}   - Max: ${httpReqDuration.values.max.toFixed(2)}ms\n`
  }

  // Errors
  const httpReqFailed = data.metrics.http_req_failed
  if (httpReqFailed) {
    const errorRate = httpReqFailed.values.rate * 100
    const color = errorRate < 1 ? green : errorRate < 5 ? yellow : red
    summary += `${indent}❌ Error Rate: ${color}${errorRate.toFixed(2)}%${reset}\n`
  }

  summary += `\n${indent}${green}✓ Smoke test completed!${reset}\n`

  return summary
}
