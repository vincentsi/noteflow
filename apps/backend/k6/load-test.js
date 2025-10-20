import http from 'k6/http'
import { check, sleep } from 'k6'

/**
 * Load Test - Normal Load
 *
 * Purpose: Test performance under normal/expected load
 * VUs: 10-100 progressive users
 * Duration: 9 minutes total
 *
 * Usage: k6 run apps/backend/k6/load-test.js
 */

export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp-up to 10 users
    { duration: '5m', target: 100 }, // Plateau at 100 users
    { duration: '2m', target: 0 }, // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% < 1s
    http_req_failed: ['rate<0.05'], // < 5% errors
    http_reqs: ['rate>5'], // At least 5 req/s
  },
}

const BASE_URL = 'http://localhost:3001'

export default function () {
  const headers = { 'Content-Type': 'application/json' }

  // Scenario 1: Register new user
  const registerPayload = JSON.stringify({
    email: `loadtest-${__VU}-${__ITER}@example.com`,
    password: 'LoadTest2024!@#',
    name: `Load Test User ${__VU}`,
  })

  let res = http.post(`${BASE_URL}/api/auth/register`, registerPayload, {
    headers,
    tags: { name: 'register' },
  })

  check(res, {
    'register status is 201': (r) => r.status === 201,
    'register returns access token': (r) => {
      try {
        const body = JSON.parse(r.body)
        return body.success && body.data && body.data.accessToken
      } catch {
        return false
      }
    },
  })

  sleep(1)

  // Scenario 2: Login
  const loginPayload = JSON.stringify({
    email: `loadtest-${__VU}-${__ITER}@example.com`,
    password: 'LoadTest2024!@#',
  })

  res = http.post(`${BASE_URL}/api/auth/login`, loginPayload, {
    headers,
    tags: { name: 'login' },
  })

  const loginSuccess = check(res, {
    'login status is 200': (r) => r.status === 200,
    'login returns token': (r) => {
      try {
        const body = JSON.parse(r.body)
        return body.success && body.data && body.data.accessToken
      } catch {
        return false
      }
    },
  })

  if (!loginSuccess) {
    sleep(2)
    return
  }

  const authData = JSON.parse(res.body)
  const token = authData.data.accessToken

  sleep(1)

  // Scenario 3: Get current user
  const authHeaders = {
    ...headers,
    Authorization: `Bearer ${token}`,
  }

  res = http.get(`${BASE_URL}/api/auth/me`, {
    headers: authHeaders,
    tags: { name: 'me' },
  })

  check(res, {
    'me status is 200': (r) => r.status === 200,
    'me returns user data': (r) => {
      try {
        const body = JSON.parse(r.body)
        return body.success && body.data && body.data.user
      } catch {
        return false
      }
    },
  })

  sleep(2)

  // Scenario 4: Refresh token
  const refreshPayload = JSON.stringify({
    refreshToken: authData.data.refreshToken,
  })

  res = http.post(`${BASE_URL}/api/auth/refresh`, refreshPayload, {
    headers,
    tags: { name: 'refresh' },
  })

  check(res, {
    'refresh status is 200': (r) => r.status === 200,
    'refresh returns new tokens': (r) => {
      try {
        const body = JSON.parse(r.body)
        return body.success && body.data && body.data.accessToken
      } catch {
        return false
      }
    },
  })

  sleep(1)
}

export function handleSummary(data) {
  console.log('\n===========================================')
  console.log('        Load Test Results')
  console.log('===========================================\n')

  // Checks
  const checks = data.metrics.checks
  if (checks) {
    const passRate = (checks.values.passes / (checks.values.passes + checks.values.fails)) * 100
    console.log(`✓ Checks: ${passRate.toFixed(2)}% (${checks.values.passes} passed, ${checks.values.fails} failed)`)
  }

  // HTTP Requests
  const httpReqs = data.metrics.http_reqs
  if (httpReqs) {
    console.log(`📊 HTTP Requests: ${httpReqs.values.count} total (${httpReqs.values.rate.toFixed(2)} req/s)`)
  }

  // Response Times
  const httpReqDuration = data.metrics.http_req_duration
  if (httpReqDuration) {
    console.log('\n⏱️  Response Times:')
    console.log(`   - Average: ${httpReqDuration.values.avg.toFixed(2)}ms`)
    console.log(`   - P50: ${httpReqDuration.values.med.toFixed(2)}ms`)
    console.log(`   - P95: ${httpReqDuration.values['p(95)'].toFixed(2)}ms`)
    console.log(`   - P99: ${httpReqDuration.values['p(99)'].toFixed(2)}ms`)
    console.log(`   - Max: ${httpReqDuration.values.max.toFixed(2)}ms`)
  }

  // Per-endpoint breakdown
  console.log('\n📍 Per-Endpoint Response Times (P95):')

  const endpoints = ['register', 'login', 'me', 'refresh']
  endpoints.forEach((endpoint) => {
    const metricKey = `http_req_duration{name:${endpoint}}`
    const metric = data.metrics[metricKey]
    if (metric) {
      const p95 = metric.values['p(95)']
      const status = p95 < 500 ? '✓' : p95 < 1000 ? '⚠' : '❌'
      console.log(`   ${status} ${endpoint.padEnd(10)}: ${p95.toFixed(2)}ms`)
    }
  })

  // Errors
  const httpReqFailed = data.metrics.http_req_failed
  if (httpReqFailed) {
    const errorRate = httpReqFailed.values.rate * 100
    console.log(`\n❌ Error Rate: ${errorRate.toFixed(2)}%`)
  }

  // VUs
  const vus = data.metrics.vus
  if (vus) {
    console.log(`\n👥 Virtual Users: ${vus.values.value} (peak)`)
  }

  console.log('\n===========================================\n')

  return {
    stdout: '',
  }
}
