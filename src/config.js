import dotenv from 'dotenv'

/**
 * Load environment variables from .env file
 */
dotenv.config()

/**
 * Payload CMS backup tool configuration
 * Environment variables are loaded from .env file
 */
export const CONFIG = {
  test: {
    api_base: process.env.TEST_API_BASE,
    api_key: process.env.TEST_API_KEY
  },
  prod: {
    api_base: process.env.PROD_API_BASE,
    api_key: process.env.PROD_API_KEY
  }
}

export const RATE_LIMIT_CONFIG = {
  /**
   * Maximum number of concurrent requests
   * Prevents overwhelming the server
   */
  concurrency: parseInt(process.env.RATE_LIMIT_CONCURRENCY) || 6,
  
  /**
   * Delay between requests in milliseconds
   * Additional rate limiting control
   */
  delay: parseInt(process.env.RATE_LIMIT_DELAY) || 500,
  
  /**
   * Number of documents to process per batch
   * For handling large collections efficiently
   */
  batchSize: parseInt(process.env.RATE_LIMIT_BATCH_SIZE) || 100,
  
  /**
   * Request timeout in milliseconds
   */
  timeout: parseInt(process.env.RATE_LIMIT_TIMEOUT) || 45000
}

export const BACKUP_CONFIG = {
  /**
   * Directory for storing backup files
   */
  outputDir: process.env.BACKUP_OUTPUT_DIR || './backup',
  
  /**
   * Whether to save collection schema information
   */
  saveCollectionSchema: true,
  
  /**
   * Whether to save detailed backup logs
   */
  saveDetailedLogs: true,
  
  /**
   * Data depth level
   * Controls the depth of related data retrieval
   */
  depth: parseInt(process.env.BACKUP_DEPTH) || 2
}

/**
 * Get configuration for specified environment
 * @param {string} env - Environment name (test|prod)
 * @returns {object} Environment configuration
 */
export function getEnvConfig(env = 'test') {
  if (!CONFIG[env]) {
    throw new Error(`Unknown environment: ${env}. Available: ${Object.keys(CONFIG).join(', ')}`)
  }
  
  const config = CONFIG[env]
  if (!config.api_base || !config.api_key) {
    throw new Error(`Missing required environment variables for ${env} environment. Please check your .env file.`)
  }
  
  return config
}

/**
 * Check if environment is production
 * @param {string} env - Environment name
 * @returns {boolean}
 */
export function isProductionEnv(env) {
  return env === 'prod'
} 