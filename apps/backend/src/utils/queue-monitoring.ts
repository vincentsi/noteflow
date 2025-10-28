import type { Queue, Job } from 'bullmq'
import { logger } from './logger'

/**
 * Queue Monitoring and Alerting Utility
 *
 * Provides real-time monitoring and alerting for BullMQ queues:
 * - Job completion/failure tracking
 * - Queue health metrics
 * - Performance monitoring
 * - Automatic alerting on issues
 *
 * @example
 * ```typescript
 * import { summaryQueue } from '@/queues/summary.queue'
 * import { monitorQueue } from '@/utils/queue-monitoring'
 *
 * // Start monitoring
 * monitorQueue(summaryQueue, {
 *   name: 'summary',
 *   alertOnFailure: true,
 *   maxFailureRate: 0.1, // Alert if >10% jobs fail
 * })
 * ```
 */

export interface QueueMonitoringOptions {
  name: string
  alertOnFailure?: boolean
  alertOnStalled?: boolean
  maxFailureRate?: number // 0.0 to 1.0
  maxProcessingTime?: number // milliseconds
  checkInterval?: number // milliseconds
}

export interface QueueMetrics {
  completed: number
  failed: number
  active: number
  waiting: number
  delayed: number
  stalled: number
  failureRate: number
  avgProcessingTime: number
  lastChecked: Date
}

const queueMetrics = new Map<string, QueueMetrics>()

/**
 * Monitor a queue with event listeners and periodic health checks
 */
export function monitorQueue(queue: Queue, options: QueueMonitoringOptions): void {
  const {
    name,
    alertOnFailure = true,
    alertOnStalled = true,
    maxFailureRate = 0.2,
    maxProcessingTime = 60000,
    checkInterval = 60000,
  } = options

  logger.info(`📊 Starting queue monitoring for: ${name}`)

  // Initialize metrics
  queueMetrics.set(name, {
    completed: 0,
    failed: 0,
    active: 0,
    waiting: 0,
    delayed: 0,
    stalled: 0,
    failureRate: 0,
    avgProcessingTime: 0,
    lastChecked: new Date(),
  })

  // Listen to job completion
  // @ts-expect-error - BullMQ event types are not properly exported
  queue.on('completed', async (job: Job, result: unknown) => {
    const metrics = queueMetrics.get(name)!
    metrics.completed++

    const processingTime = (job.finishedOn || 0) - (job.processedOn || 0)
    metrics.avgProcessingTime =
      (metrics.avgProcessingTime * (metrics.completed - 1) + processingTime) / metrics.completed

    logger.debug({
      queue: name,
      jobId: job.id,
      processingTime,
      result,
    }, `✅ Job completed`)

    // Alert on slow jobs
    if (processingTime > maxProcessingTime) {
      logger.warn({
        queue: name,
        jobId: job.id,
        processingTime,
        maxProcessingTime,
      }, `⚠️  Slow job detected`)
    }
  })

  // Listen to job failures
  // @ts-expect-error - BullMQ event types are not properly exported
  queue.on('failed', async (job: Job | undefined, error: Error) => {
    const metrics = queueMetrics.get(name)!
    metrics.failed++
    metrics.failureRate = metrics.failed / (metrics.completed + metrics.failed)

    logger.error({
      queue: name,
      jobId: job?.id,
      error: error.message,
      stack: error.stack,
      attemptsMade: job?.attemptsMade,
      failureRate: metrics.failureRate,
    }, `❌ Job failed`)

    if (alertOnFailure) {
      // Alert if failure rate exceeds threshold
      if (metrics.failureRate > maxFailureRate && (metrics.completed + metrics.failed) > 10) {
        logger.error({
          queue: name,
          failureRate: metrics.failureRate,
          maxFailureRate,
          totalJobs: metrics.completed + metrics.failed,
        }, `🚨 HIGH FAILURE RATE ALERT`)
      }
    }
  })

  // Listen to stalled jobs
  // @ts-expect-error - BullMQ event types are not properly exported
  queue.on('stalled', async (jobId: string) => {
    const metrics = queueMetrics.get(name)!
    metrics.stalled++

    logger.warn({
      queue: name,
      jobId,
      stalledCount: metrics.stalled,
    }, `⏸️  Job stalled`)

    if (alertOnStalled) {
      logger.error({
        queue: name,
        jobId,
      }, `🚨 STALLED JOB ALERT`)
    }
  })

  // Listen to queue errors
  queue.on('error', (error) => {
    logger.error({
      queue: name,
      error: error.message,
      stack: error.stack,
    }, `🚨 Queue error`)
  })

  // Periodic health check
  const healthCheckInterval = setInterval(async () => {
    try {
      const counts = await queue.getJobCounts('completed', 'failed', 'active', 'waiting', 'delayed')
      const metrics = queueMetrics.get(name)!

      metrics.active = counts.active || 0
      metrics.waiting = counts.waiting || 0
      metrics.delayed = counts.delayed || 0
      metrics.lastChecked = new Date()

      logger.info({
        queue: name,
        metrics: {
          active: counts.active || 0,
          waiting: counts.waiting || 0,
          delayed: counts.delayed || 0,
          completed: metrics.completed,
          failed: metrics.failed,
          failureRate: metrics.failureRate.toFixed(2),
          avgProcessingTime: `${metrics.avgProcessingTime.toFixed(0)}ms`,
        },
      }, `📊 Queue health check`)

      // Alert on queue backlog
      if ((counts.waiting || 0) > 100) {
        logger.warn({
          queue: name,
          waiting: counts.waiting,
        }, `⚠️  Large queue backlog detected`)
      }

      // Alert on too many active jobs (possible worker issue)
      if ((counts.active || 0) > 50) {
        logger.warn({
          queue: name,
          active: counts.active,
        }, `⚠️  High number of active jobs`)
      }
    } catch (error) {
      logger.error({
        queue: name,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, `❌ Health check failed`)
    }
  }, checkInterval)

  // Clean up on process exit
  process.on('SIGTERM', () => {
    clearInterval(healthCheckInterval)
    logger.info(`Stopped monitoring queue: ${name}`)
  })
}

/**
 * Get current metrics for a queue
 */
export function getQueueMetrics(queueName: string): QueueMetrics | null {
  return queueMetrics.get(queueName) || null
}

/**
 * Get metrics for all monitored queues
 */
export function getAllQueueMetrics(): Map<string, QueueMetrics> {
  return new Map(queueMetrics)
}

/**
 * Reset metrics for a queue (useful for testing)
 */
export function resetQueueMetrics(queueName: string): void {
  queueMetrics.delete(queueName)
}

/**
 * Prometheus-style metrics exporter
 * Useful for integrating with monitoring systems
 */
export function getPrometheusMetrics(): string {
  let metrics = ''

  queueMetrics.forEach((data, queueName) => {
    metrics += `# HELP queue_jobs_completed_total Total completed jobs\n`
    metrics += `# TYPE queue_jobs_completed_total counter\n`
    metrics += `queue_jobs_completed_total{queue="${queueName}"} ${data.completed}\n\n`

    metrics += `# HELP queue_jobs_failed_total Total failed jobs\n`
    metrics += `# TYPE queue_jobs_failed_total counter\n`
    metrics += `queue_jobs_failed_total{queue="${queueName}"} ${data.failed}\n\n`

    metrics += `# HELP queue_jobs_active Current active jobs\n`
    metrics += `# TYPE queue_jobs_active gauge\n`
    metrics += `queue_jobs_active{queue="${queueName}"} ${data.active}\n\n`

    metrics += `# HELP queue_jobs_waiting Current waiting jobs\n`
    metrics += `# TYPE queue_jobs_waiting gauge\n`
    metrics += `queue_jobs_waiting{queue="${queueName}"} ${data.waiting}\n\n`

    metrics += `# HELP queue_jobs_delayed Current delayed jobs\n`
    metrics += `# TYPE queue_jobs_delayed gauge\n`
    metrics += `queue_jobs_delayed{queue="${queueName}"} ${data.delayed}\n\n`

    metrics += `# HELP queue_failure_rate Job failure rate (0-1)\n`
    metrics += `# TYPE queue_failure_rate gauge\n`
    metrics += `queue_failure_rate{queue="${queueName}"} ${data.failureRate}\n\n`

    metrics += `# HELP queue_avg_processing_time_ms Average job processing time in milliseconds\n`
    metrics += `# TYPE queue_avg_processing_time_ms gauge\n`
    metrics += `queue_avg_processing_time_ms{queue="${queueName}"} ${data.avgProcessingTime}\n\n`
  })

  return metrics
}

/**
 * Example integration with summary queue:
 *
 * ```typescript
 * // In summary.queue.ts or app startup
 * import { summaryQueue } from '@/queues/summary.queue'
 * import { monitorQueue } from '@/utils/queue-monitoring'
 *
 * monitorQueue(summaryQueue, {
 *   name: 'summary',
 *   alertOnFailure: true,
 *   maxFailureRate: 0.1, // Alert if >10% fail
 *   maxProcessingTime: 30000, // Alert if job takes >30s
 *   checkInterval: 60000, // Health check every minute
 * })
 * ```
 *
 * Example metrics endpoint:
 *
 * ```typescript
 * // In routes/metrics.route.ts
 * fastify.get('/metrics/queues', async (request, reply) => {
 *   const metrics = getPrometheusMetrics()
 *   return reply.type('text/plain').send(metrics)
 * })
 * ```
 */
