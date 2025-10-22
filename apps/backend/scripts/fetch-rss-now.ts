import { processRSSFeeds } from '../src/queues/rss.worker'

/**
 * Manually trigger RSS feed fetch
 * Use this to test RSS functionality without waiting for cron
 */
async function fetchNow() {
  console.log('📰 Starting RSS feed fetch...\n')

  try {
    await processRSSFeeds()
    console.log('\n✅ RSS fetch completed successfully!')
  } catch (error) {
    console.error('\n❌ RSS fetch failed:', error)
    process.exit(1)
  }
}

fetchNow()
